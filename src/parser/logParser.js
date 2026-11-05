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
        
        // Normalize content blocks ({type:"text"|"Text", text}) into plain text
        const flattenContent = (content) => {
          if (typeof content === 'string') return content;
          if (Array.isArray(content)) {
            return content
              .map(block => (typeof block === 'string' ? block : block && block.text) || '')
              .filter(Boolean)
              .join('\n');
          }
          return null;
        };

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
          } else if (payload.type === 'item_completed' && payload.item) {
            // Newer Codex format (>=0.16x): messages and tool runs arrive as completed items
            const item = payload.item;
            if (item.type === 'UserMessage') {
              const text = flattenContent(item.content);
              if (text) {
                events.push({ type: 'user', timestamp, text });
              }
            } else if (item.type === 'AgentMessage') {
              const text = flattenContent(item.content);
              if (text) {
                events.push({ type: 'assistant', timestamp, text, phase: item.phase });
              }
            } else if (item.type === 'CommandExecution') {
              const callId = item.id;
              if (callId && !seenCallIds.has(callId)) {
                seenCallIds.add(callId);
                events.push({
                  type: 'tool_call',
                  timestamp,
                  callId,
                  name: 'CommandExecution',
                  args: JSON.stringify({ command: item.command, cwd: item.cwd }),
                  status: item.status,
                  exitCode: item.exit_code
                });
                if (item.aggregated_output != null) {
                  seenOutputCallIds.add(callId);
                  events.push({
                    type: 'tool_output',
                    timestamp,
                    callId,
                    output: String(item.aggregated_output)
                  });
                }
              }
            } else if (item.type === 'McpToolCall') {
              const callId = item.id;
              if (callId && !seenCallIds.has(callId)) {
                seenCallIds.add(callId);
                events.push({
                  type: 'tool_call',
                  timestamp,
                  callId,
                  name: `MCP: ${item.server || ''} ${item.tool || ''}`.trim(),
                  args: JSON.stringify(item.arguments ?? item.input ?? null)
                });
                if (item.output != null) {
                  seenOutputCallIds.add(callId);
                  events.push({
                    type: 'tool_output',
                    timestamp,
                    callId,
                    output: typeof item.output === 'string' ? item.output : JSON.stringify(item.output)
                  });
                }
              }
            }
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
