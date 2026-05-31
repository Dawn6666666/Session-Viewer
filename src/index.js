import path from 'path';
import fs from 'fs';
import { resolveConfig } from './config.js';
import { parseLogFile } from './parser/logParser.js';
import { writeDialogueOutputs } from './writers/dialogueWriter.js';
import { writeFullHistoryOutput } from './writers/historyWriter.js';
import { writeSplitTurnsOutput } from './writers/splitTurnsWriter.js';
import { startServer } from './server.js';

async function main() {
  // Check if CLI flags contain --server or -s
  if (process.argv.includes('--server') || process.argv.includes('-s')) {
    const portIndex = process.argv.findIndex(arg => arg === '--server' || arg === '-s') + 1;
    let port = 3000;
    if (portIndex < process.argv.length) {
      const parsedPort = parseInt(process.argv[portIndex], 10);
      if (!isNaN(parsedPort)) port = parsedPort;
    }
    startServer(port);
    return;
  }

  // Resolve configuration from CLI arguments
  const config = resolveConfig(process.argv[2]);
  
  console.log(`🤖 File Selected: ${path.basename(config.targetFilePath)}`);
  console.log(`📏 Size: ${config.sizeMB.toFixed(2)} MB`);
  console.log(`📂 Output Directory: ${config.sessionOutputDir}`);
  console.log(`⌛ Parsing and extracting conversation logs...`);

  try {
    // Parse the JSONL log file asynchronously
    const { events, turns, uniqueToolsCount } = await parseLogFile(config.targetFilePath);
    
    console.log(`✅ Chronological sorting complete.`);
    console.log(`📊 Found ${turns.length} user-AI dialogue turns.`);
    console.log(`🛠️ Found ${uniqueToolsCount} unique tool execution steps.`);
    
    // Ensure dedicated output directory exists
    if (!fs.existsSync(config.sessionOutputDir)) {
      fs.mkdirSync(config.sessionOutputDir, { recursive: true });
    }

    // Write formatted output files
    writeDialogueOutputs(turns, config);
    writeFullHistoryOutput(events, config);
    writeSplitTurnsOutput(turns, config);

    // Save structured session.json for the web server frontend
    fs.writeFileSync(
      path.join(config.sessionOutputDir, 'session.json'),
      JSON.stringify({ events, turns, uniqueToolsCount, fileBaseName: config.fileBaseName }, null, 2),
      'utf-8'
    );
    
    console.log(`\n🎉 Conversion complete! All outputs have been written to files.`);
  } catch (error) {
    console.error(`❌ Error during conversion: ${error.message}`);
    process.exit(1);
  }
}

main();
