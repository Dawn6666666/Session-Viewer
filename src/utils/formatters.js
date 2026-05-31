/**
 * Formats a millisecond timestamp into a human-readable HH:MM:SS format.
 * @param {number} timestampMs - Timestamp in milliseconds
 * @returns {string} Formatted time string
 */
export function formatTime(timestampMs) {
  const d = new Date(timestampMs);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Truncates long text content with an elegant banner.
 * @param {string} text - The input text to truncate
 * @param {number} maxLines - Max lines allowed before truncation
 * @returns {string} Truncated text with banner or original text if short enough
 */
export function truncateText(text, maxLines) {
  if (!text) return '';
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  
  const truncatedCount = lines.length - maxLines;
  const firstHalf = lines.slice(0, maxLines - 10).join('\n');
  const lastHalf = lines.slice(lines.length - 10).join('\n');
  
  return `${firstHalf}\n\n... [ ✂️ TRUNCATED ${truncatedCount} LINES OF OUTPUT FOR READABILITY. SEE RAW JSONL FOR COMPLETE LOGS ] ...\n\n${lastHalf}`;
}
