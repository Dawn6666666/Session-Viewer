import fs from 'fs';
import path from 'path';

const DEFAULT_FILE = "rollout-2026-05-19T10-55-15-019e3e28-b5ac-7972-84b9-0ddcfcd41e54.jsonl";
const TRUNCATE_LINES = 60; // Max lines to display in tool output

/**
 * Resolves the configuration and paths needed for session log conversion.
 * @param {string} [cliArg] Optional CLI argument specifying the target .jsonl path
 * @returns {object} Config object containing paths and configurations
 */
export function resolveConfig(cliArg) {
  let targetFilePath = cliArg;
  const callerDir = process.cwd();

  if (!targetFilePath) {
    // Check if the default file exists in the current working directory
    const defaultPath = path.join(callerDir, DEFAULT_FILE);
    if (fs.existsSync(defaultPath)) {
      targetFilePath = defaultPath;
    } else {
      // Fallback: search current directory for all .jsonl files
      const files = fs.readdirSync(callerDir).filter(f => f.endsWith('.jsonl'));
      if (files.length > 0) {
        // Sort by size descending to pick the largest one
        files.sort((a, b) => {
          const sizeA = fs.statSync(path.join(callerDir, a)).size;
          const sizeB = fs.statSync(path.join(callerDir, b)).size;
          return sizeB - sizeA;
        });
        targetFilePath = path.join(callerDir, files[0]);
      } else {
        console.error("❌ No .jsonl files found in the current working directory!");
        console.error("💡 Usage: npm run convert -- <path_to_jsonl_file>");
        process.exit(1);
      }
    }
  } else {
    targetFilePath = path.resolve(targetFilePath);
  }

  // Double check existence
  if (!fs.existsSync(targetFilePath)) {
    console.error(`❌ Target file not found: ${targetFilePath}`);
    process.exit(1);
  }

  const fileDir = path.dirname(targetFilePath);
  const fileBaseName = path.basename(targetFilePath, '.jsonl');
  const stats = fs.statSync(targetFilePath);
  const sizeMB = stats.size / (1024 * 1024);

  return {
    targetFilePath,
    fileDir,
    fileBaseName,
    sizeMB,
    truncateLines: TRUNCATE_LINES,
    // Output paths
    cleanDialoguePath: path.join(fileDir, `${fileBaseName}_dialogue_clean.txt`),
    superCleanDialoguePath: path.join(fileDir, `${fileBaseName}_dialogue_super_clean.txt`),
    fullHistoryPath: path.join(fileDir, `${fileBaseName}_full_history.txt`),
    splitTurnsDir: path.join(fileDir, `${fileBaseName}_split_turns`),
  };
}
