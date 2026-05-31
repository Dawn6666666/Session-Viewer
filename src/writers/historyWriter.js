import fs from 'fs';
import path from 'path';
import { formatTime, truncateText } from '../utils/formatters.js';
import { parseUserMessage } from '../utils/messageParser.js';

/**
 * Writes the complete execution and dialogue history log file.
 * Includes detailed trace of all tool calls and truncated tool outputs.
 * @param {Array} events - Chronological array of all interaction events
 * @param {object} config - Configuration object with paths and options
 */
export function writeFullHistoryOutput(events, config) {
  const { fileBaseName, fullHistoryPath, truncateLines } = config;

  let fullText = `================================================================================
📜 COMPLETE EXECUTION & DIALOGUE LOG (WITH TOOL CALLS)
Session ID: ${fileBaseName}
================================================================================\n\n`;

  let turnIndex = 0;
  
  // Group and format all events chronologically
  events.forEach(ev => {
    const timeStr = formatTime(ev.timestamp);
    
    if (ev.type === 'user') {
      turnIndex++;
      const parsedUser = parseUserMessage(ev.text);
      fullText += `\n================================================================================\n`;
      fullText += `👤 [Turn #${turnIndex}] [${timeStr}] USER\n`;
      fullText += `================================================================================\n`;
      if (parsedUser.hasIdeContext) {
        fullText += `💻 IDE Context: \n`;
        if (parsedUser.activeFile) fullText += `  Active File: ${parsedUser.activeFile}\n`;
        if (parsedUser.openTabs.length > 0) fullText += `  Open Tabs:   [ ${parsedUser.openTabs.join(', ')} ]\n`;
        fullText += `\n`;
      }
      fullText += `${parsedUser.query}\n\n`;
      
    } else if (ev.type === 'assistant') {
      const label = ev.phase === 'commentary' ? '🤖 THINKING / COMMENTARY' : '🤖 FINAL ANSWER';
      fullText += `================================================================================\n`;
      fullText += `${label} [${timeStr}]\n`;
      fullText += `================================================================================\n`;
      fullText += `${ev.text}\n\n`;
      
    } else if (ev.type === 'tool_call') {
      fullText += `🛠️ [${timeStr}] TOOL CALL: ${ev.name} [ID: ${ev.callId}]\n`;
      try {
        const argsObj = JSON.parse(ev.args);
        fullText += `Arguments:\n${JSON.stringify(argsObj, null, 2)}\n`;
      } catch (err) {
        fullText += `Arguments: ${ev.args}\n`;
      }
      fullText += `\n`;
      
    } else if (ev.type === 'tool_output') {
      fullText += `📥 [${timeStr}] TOOL OUTPUT: [ID: ${ev.callId}]\n`;
      fullText += `--------------------------------------------------------------------------------\n`;
      if (ev.output) {
        fullText += `${truncateText(ev.output, truncateLines)}\n`;
      } else {
        fullText += `[Empty Output or Exit Code 0]\n`;
      }
      fullText += `--------------------------------------------------------------------------------\n\n`;
    }
  });
  
  fs.writeFileSync(fullHistoryPath, fullText, 'utf-8');
  console.log(`📁 Complete History Log:       ${path.basename(fullHistoryPath)}`);
}
