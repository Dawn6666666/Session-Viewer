import fs from 'fs';
import readline from 'readline';

/**
 * Asynchronously parses a JSONL log file of dialogue sessions.
 * Extracts events, sorts them chronologically, and aggregates them into dialogue turns.
 * @param {string} filePath - Path to the target JSONL log file
 * @returns {Promise<{events: Array, turns: Array, uniqueToolsCount: number}>} Parsed logs metadata
 */
export function parseLogFile(filePath) {
  return new Promise((resolve, reject) => {
    const events = [];
    const seenCallIds = new Set();
    const seenOutputCallIds = new Set();

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      try {
        const data = JSON.parse(line);
        const timestamp = new Date(data.timestamp).getTime();
        
        if (data.type === 'event_msg' && data.payload) {
          const payload = data.payload;
          if (payload.type === 'user_message' && payload.message) {
            events.push({
              type: 'user',
              timestamp,
              text: payload.message
            });
          } else if (payload.type === 'agent_message' && payload.message) {
            events.push({
              type: 'assistant',
              timestamp,
              text: payload.message,
              phase: payload.phase
            });
          }
        } else if (data.type === 'response_item' && data.payload) {
          const payload = data.payload;
          if (payload.type === 'function_call') {
            const callId = payload.call_id;
            if (callId && !seenCallIds.has(callId)) {
              seenCallIds.add(callId);
              events.push({
                type: 'tool_call',
                timestamp,
                callId,
                name: payload.name,
                args: payload.arguments
              });
            }
          } else if (payload.type === 'function_call_output') {
            const callId = payload.call_id;
            if (callId && !seenOutputCallIds.has(callId)) {
              seenOutputCallIds.add(callId);
              events.push({
                type: 'tool_output',
                timestamp,
                callId,
                output: payload.output
              });
            }
          }
        }
      } catch (err) {
        // Skip malformed lines silently
      }
    });

    rl.on('error', (err) => {
      reject(err);
    });

    rl.on('close', () => {
      // Sort events strictly by timestamp to maintain chronological order
      events.sort((a, b) => a.timestamp - b.timestamp);
      
      // Group events into distinct dialogue "turns"
      const turns = [];
      let currentTurn = null;
      
      for (const ev of events) {
        if (ev.type === 'user') {
          if (currentTurn) {
            turns.push(currentTurn);
          }
          currentTurn = {
            timestamp: ev.timestamp,
            user: ev,
            assistantElements: [],
            tools: []
          };
        } else if (currentTurn) {
          if (ev.type === 'assistant') {
            currentTurn.assistantElements.push(ev);
          } else if (ev.type === 'tool_call' || ev.type === 'tool_output') {
            currentTurn.tools.push(ev);
          }
        }
      }
      
      if (currentTurn) {
        turns.push(currentTurn);
      }

      resolve({
        events,
        turns,
        uniqueToolsCount: seenCallIds.size
      });
    });
  });
}
