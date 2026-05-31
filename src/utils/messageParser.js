/**
 * Extracts clean query and IDE context (active file, open tabs) from typical IDE session user messages.
 * @param {string} messageText - The raw user message text
 * @returns {object} Parsed user message details
 */
export function parseUserMessage(messageText) {
  if (!messageText) {
    return { hasIdeContext: false, activeFile: null, openTabs: [], query: '' };
  }
  
  const activeFileMatch = messageText.match(/## Active file:\s*(.*)/i);
  const openTabsMatch = messageText.match(/## Open tabs:\s*\n((?:-.*\n?)*)/i);
  
  // Detect standard "## My request for Codex/Antigravity/Agent:" header
  const queryHeaderMatch = messageText.match(/## My request for \w+:\s*\n([\s\S]*)/i);
  
  const activeFile = activeFileMatch ? activeFileMatch[1].trim() : null;
  let openTabs = [];
  if (openTabsMatch) {
    openTabs = openTabsMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
  }
  
  let query = messageText;
  let hasIdeContext = false;
  
  if (queryHeaderMatch) {
    query = queryHeaderMatch[1].trim();
    hasIdeContext = true;
  } else if (messageText.includes('# Context from my IDE setup:')) {
    const parts = messageText.split(/## My request for \w+:/i);
    if (parts.length > 1) {
      query = parts[1].trim();
      hasIdeContext = true;
    } else {
      // Strip headers if we can't find a direct request block
      query = messageText.replace(/# Context from my IDE setup:[\s\S]*?(?=##|$)/gi, '').trim();
    }
  }
  
  return {
    hasIdeContext,
    activeFile,
    openTabs,
    query: query.trim()
  };
}
