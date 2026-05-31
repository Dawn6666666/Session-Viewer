import fs from 'fs';
import path from 'path';
import { formatTime } from '../utils/formatters.js';
import { parseUserMessage } from '../utils/messageParser.js';

/**
 * Writes the Clean and Super Clean dialogue log files.
 * @param {Array} turns - Dialogue turns aggregated by the parser
 * @param {object} config - Configuration object with paths and options
 */
export function writeDialogueOutputs(turns, config) {
  const { fileBaseName, cleanDialoguePath, superCleanDialoguePath } = config;

  let cleanText = `================================================================================
📜 USER & AI DIALOGUE SESSION LOG (CLEAN VERSION)
Session ID: ${fileBaseName}
Total Turns: ${turns.length}
================================================================================\n\n`;

  let superCleanText = `================================================================================
📜 USER & AI DIALOGUE SESSION LOG (SUPER CLEAN CHAT VERSION)
Session ID: ${fileBaseName}
Total Turns: ${turns.length}
================================================================================\n\n`;

  turns.forEach((turn, index) => {
    const turnNum = index + 1;
    const timeStr = formatTime(turn.timestamp);
    const parsedUser = parseUserMessage(turn.user.text);
    
    // ------------------ Clean Version formatting ------------------
    cleanText += `================================================================================\n`;
    cleanText += `👤 [Turn #${turnNum}] [${timeStr}] USER\n`;
    cleanText += `================================================================================\n`;
    if (parsedUser.hasIdeContext) {
      cleanText += `💻 IDE Context:\n`;
      if (parsedUser.activeFile) cleanText += `  Active File: ${parsedUser.activeFile}\n`;
      if (parsedUser.openTabs.length > 0) cleanText += `  Open Tabs:   [ ${parsedUser.openTabs.join(', ')} ]\n`;
      cleanText += `\n`;
    }
    cleanText += `${parsedUser.query}\n\n`;
    
    // ------------------ Super Clean formatting ------------------
    superCleanText += `================================================================================\n`;
    superCleanText += `👤 [Turn #${turnNum}] [${timeStr}] USER\n`;
    superCleanText += `================================================================================\n`;
    superCleanText += `${parsedUser.query}\n\n`;
    
    // Assistant responses in this turn
    turn.assistantElements.forEach(asst => {
      const asstTime = formatTime(asst.timestamp);
      const label = asst.phase === 'commentary' ? '🤖 THINKING / INTERIM' : '🤖 CODEX RESPONSE';
      
      cleanText += `================================================================================\n`;
      cleanText += `${label} [${asstTime}]\n`;
      cleanText += `================================================================================\n`;
      cleanText += `${asst.text}\n\n`;
      
      // In super clean, we only output the final answer or combine them neatly
      superCleanText += `================================================================================\n`;
      superCleanText += `${label} [${asstTime}]\n`;
      superCleanText += `================================================================================\n`;
      superCleanText += `${asst.text}\n\n`;
    });
  });
  
  fs.writeFileSync(cleanDialoguePath, cleanText, 'utf-8');
  fs.writeFileSync(superCleanDialoguePath, superCleanText, 'utf-8');
  console.log(`📁 Dialogue Log (Clean):       ${path.basename(cleanDialoguePath)}`);
  console.log(`📁 Dialogue Log (Super Clean): ${path.basename(superCleanDialoguePath)}`);
}
