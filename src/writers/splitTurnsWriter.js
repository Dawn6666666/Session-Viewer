import fs from 'fs';
import path from 'path';
import { formatTime, truncateText } from '../utils/formatters.js';
import { parseUserMessage } from '../utils/messageParser.js';

/**
 * Writes the individual dialogue turns as separate text files in the output directory.
 * @param {Array} turns - Dialogue turns aggregated by the parser
 * @param {object} config - Configuration object with paths and options
 */
export function writeSplitTurnsOutput(turns, config) {
  const { splitTurnsDir } = config;

  if (!fs.existsSync(splitTurnsDir)) {
    fs.mkdirSync(splitTurnsDir, { recursive: true });
  } else {
    // Clean up older split files if they exist in the target directory
    const oldFiles = fs.readdirSync(splitTurnsDir);
    oldFiles.forEach(f => {
      try {
        fs.unlinkSync(path.join(splitTurnsDir, f));
      } catch (err) {
        // Ignore files that are directories or can't be deleted
      }
    });
  }
  
  turns.forEach((turn, index) => {
    const turnNum = String(index + 1).padStart(2, '0');
    const parsedUser = parseUserMessage(turn.user.text);
    
    let turnText = `================================================================================\n`;
    turnText += `👤 [Turn #${turnNum}] USER QUESTION\n`;
    turnText += `================================================================================\n`;
    if (parsedUser.hasIdeContext) {
      turnText += `💻 IDE Context:\n`;
      if (parsedUser.activeFile) turnText += `  Active File: ${parsedUser.activeFile}\n`;
      if (parsedUser.openTabs.length > 0) turnText += `  Open Tabs:   [ ${parsedUser.openTabs.join(', ')} ]\n`;
      turnText += `\n`;
    }
    turnText += `${parsedUser.query}\n\n`;
    
    // Output tool usage inside this turn if any
    if (turn.tools.length > 0) {
      turnText += `================================================================================\n`;
      turnText += `⚙️ INTERMEDIATE ACTIONS (${turn.tools.filter(t => t.type === 'tool_call').length} Tool Calls)\n`;
      turnText += `================================================================================\n`;
      
      turn.tools.forEach(item => {
        const timeStr = formatTime(item.timestamp);
        if (item.type === 'tool_call') {
          turnText += `🛠️ [${timeStr}] CALL: ${item.name}\n`;
          try {
            turnText += `Arguments: ${JSON.stringify(JSON.parse(item.args), null, 2)}\n`;
          } catch (e) {
            turnText += `Arguments: ${item.args}\n`;
          }
        } else if (item.type === 'tool_output') {
          turnText += `📥 [${timeStr}] RESULT:\n`;
          turnText += `${truncateText(item.output, 20)}\n`;
          turnText += `--------------------------------------------------\n`;
        }
      });
      turnText += `\n`;
    }
    
    // Output assistant answers
    turn.assistantElements.forEach(asst => {
      const label = asst.phase === 'commentary' ? '🤖 THINKING / INTERIM' : '🤖 CODEX ANSWER';
      turnText += `================================================================================\n`;
      turnText += `${label}\n`;
      turnText += `================================================================================\n`;
      turnText += `${asst.text}\n\n`;
    });
    
    const turnFileName = `turn_${turnNum}.txt`;
    fs.writeFileSync(path.join(splitTurnsDir, turnFileName), turnText, 'utf-8');
  });
  
  console.log(`📁 Split Turns Folder:         ${path.basename(splitTurnsDir)}/ (${turns.length} files inside)`);
}
