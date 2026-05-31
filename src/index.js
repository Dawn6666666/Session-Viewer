import path from 'path';
import fs from 'fs';
import { resolveConfig } from './config.js';
import { parseLogFile } from './parser/logParser.js';
import { writeDialogueOutputs } from './writers/dialogueWriter.js';
import { writeFullHistoryOutput } from './writers/historyWriter.js';
import { writeSplitTurnsOutput } from './writers/splitTurnsWriter.js';

async function main() {
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
    
    console.log(`\n🎉 Conversion complete! All outputs have been written to files.`);
  } catch (error) {
    console.error(`❌ Error during conversion: ${error.message}`);
    process.exit(1);
  }
}

main();
