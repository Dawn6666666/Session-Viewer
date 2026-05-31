import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { resolveConfig } from './config.js';
import { parseLogFile } from './parser/logParser.js';
import { writeDialogueOutputs } from './writers/dialogueWriter.js';
import { writeFullHistoryOutput } from './writers/historyWriter.js';
import { writeSplitTurnsOutput } from './writers/splitTurnsWriter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/**
 * Recursively find a file with exact filename in a directory.
 * @param {string} dir - Directory to search in
 * @param {string} filename - Filename to find
 * @returns {string|null} Full path of the found file, or null
 */
function findFileRecursive(dir, filename) {
  if (!fs.existsSync(dir)) return null;
  let items = [];
  try {
    items = fs.readdirSync(dir);
  } catch (e) {
    return null;
  }
  for (const item of items) {
    const fullPath = path.join(dir, item);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      continue; // Skip inaccessible paths
    }
    if (stat.isDirectory()) {
      const found = findFileRecursive(fullPath, filename);
      if (found) return found;
    } else if (item === filename) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Boots the lightweight HTTP server.
 * @param {number} port - Port to run the server on
 */
export function startServer(port = 3000) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // --- API: List all processed sessions ---
    if (pathname === '/api/sessions' && req.method === 'GET') {
      const outputsDir = path.join(projectRootDir, 'outputs');
      if (!fs.existsSync(outputsDir)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify([]));
      }

      try {
        const items = fs.readdirSync(outputsDir);
        const sessions = [];

        items.forEach((item) => {
          const itemPath = path.join(outputsDir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            const jsonPath = path.join(itemPath, 'session.json');
            let meta = { id: item, turnsCount: 0, toolsCount: 0, date: null, sizeMB: 0 };
            
            if (fs.existsSync(jsonPath)) {
              try {
                const sessionData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
                meta.turnsCount = sessionData.turns?.length || 0;
                // Count unique tool calls
                const toolCalls = new Set();
                sessionData.events?.forEach(e => {
                  if (e.type === 'tool_call' && e.callId) toolCalls.add(e.callId);
                });
                meta.toolsCount = toolCalls.size;
                meta.date = fs.statSync(jsonPath).mtime;
              } catch (e) {
                // Ignore corrupt JSON
              }
            } else {
              // Read text files for backup
              const cleanPath = path.join(itemPath, 'dialogue_clean.txt');
              if (fs.existsSync(cleanPath)) {
                meta.date = fs.statSync(cleanPath).mtime;
              }
            }
            sessions.push(meta);
          }
        });

        // Sort by date descending
        sessions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(sessions));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // --- API: Download output text files ---
    if (pathname.startsWith('/api/download/') && req.method === 'GET') {
      const parts = pathname.split('/');
      const type = parts[parts.length - 2]; // 'clean', 'super_clean', or 'full_history'
      const sessionId = parts[parts.length - 1];
      const sessionDir = path.join(projectRootDir, 'outputs', sessionId);
      
      let filePath = '';
      let downloadName = '';
      
      if (type === 'clean') {
        filePath = path.join(sessionDir, 'dialogue_clean.txt');
        downloadName = `${sessionId}_clean.txt`;
      } else if (type === 'super_clean') {
        filePath = path.join(sessionDir, 'dialogue_super_clean.txt');
        downloadName = `${sessionId}_super_clean.txt`;
      } else if (type === 'full_history') {
        filePath = path.join(sessionDir, 'full_history.txt');
        downloadName = `${sessionId}_full_history.txt`;
      }
      
      if (!filePath || !fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('File not found');
      }
      
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadName)}"`
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    // --- API: Get preview of dialogue_clean.txt ---
    if (pathname.startsWith('/api/preview/') && req.method === 'GET') {
      const sessionId = pathname.split('/').pop();
      const filePath = path.join(projectRootDir, 'outputs', sessionId, 'dialogue_clean.txt');
      
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Preview not found');
      }
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(content);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(err.message);
      }
    }

    // --- API: Get detailed session JSON ---
    if (pathname.startsWith('/api/session/') && req.method === 'GET') {
      const sessionId = pathname.split('/').pop();
      const sessionDir = path.join(projectRootDir, 'outputs', sessionId);
      const jsonPath = path.join(sessionDir, 'session.json');

      if (!fs.existsSync(jsonPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Session not found or not parsed yet.' }));
      }

      try {
        const content = fs.readFileSync(jsonPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(content);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // --- API: Upload new raw .jsonl file ---
    if (pathname === '/api/upload' && req.method === 'POST') {
      const filename = url.searchParams.get('filename') || `upload-${Date.now()}.jsonl`;
      const tempPath = path.join(projectRootDir, filename);
      const writeStream = fs.createWriteStream(tempPath);

      req.pipe(writeStream);

      req.on('end', async () => {
        try {
          // Resolve config for this newly uploaded log file
          const config = resolveConfig(tempPath);

          // Create the outputs folder
          if (!fs.existsSync(config.sessionOutputDir)) {
            fs.mkdirSync(config.sessionOutputDir, { recursive: true });
          }

          // Parse and extract
          const { events, turns, uniqueToolsCount } = await parseLogFile(config.targetFilePath);

          // Write output documents
          writeDialogueOutputs(turns, config);
          writeFullHistoryOutput(events, config);
          writeSplitTurnsOutput(turns, config);

          // Save structured session.json for the frontend client
          fs.writeFileSync(
            path.join(config.sessionOutputDir, 'session.json'),
            JSON.stringify({ events, turns, uniqueToolsCount, fileBaseName: config.fileBaseName, targetFilePath: null }, null, 2),
            'utf-8'
          );

          // Clean up the temporary uploaded file in the root
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, sessionId: config.fileBaseName }));
        } catch (err) {
          // Cleanup temp file in case of crash
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
          }
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      req.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    // --- API: Delete session (and optionally local file) ---
    if (pathname === '/api/delete' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { sessionId, deleteSource } = JSON.parse(body);
          if (!sessionId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Missing sessionId' }));
          }

          const sessionDir = path.join(projectRootDir, 'outputs', sessionId);
          const jsonPath = path.join(sessionDir, 'session.json');
          
          let targetFilePath = null;
          if (fs.existsSync(jsonPath)) {
            try {
              const sessionData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
              targetFilePath = sessionData.targetFilePath || null;
            } catch (e) {
              // Ignore parse errors
            }
          }

          let deletedSource = false;
          let sourceDeletedPath = null;

          if (deleteSource) {
            // 1. Try saved targetFilePath
            if (targetFilePath && fs.existsSync(targetFilePath)) {
              try {
                fs.unlinkSync(targetFilePath);
                deletedSource = true;
                sourceDeletedPath = targetFilePath;
              } catch (err) {
                console.error(`Failed to delete original file at ${targetFilePath}:`, err.message);
              }
            }

            // 2. Fallback recursive search under os.homedir()/.codex/sessions
            if (!deletedSource) {
              const searchDir = path.join(os.homedir(), '.codex', 'sessions');
              const foundPath = findFileRecursive(searchDir, `${sessionId}.jsonl`);
              if (foundPath && fs.existsSync(foundPath)) {
                try {
                  fs.unlinkSync(foundPath);
                  deletedSource = true;
                  sourceDeletedPath = foundPath;
                } catch (err) {
                  console.error(`Failed to delete searched original file at ${foundPath}:`, err.message);
                }
              }
            }
          }

          // Delete the entire outputs/sessionId folder recursively
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            deletedSource, 
            sourceDeletedPath 
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // --- Serve static assets ---
    let safePath = pathname;
    if (safePath === '/' || safePath === '') {
      safePath = '/index.html';
    }

    const publicDir = path.join(__dirname, 'public');
    const fullStaticPath = path.join(publicDir, safePath);

    // Security check: ensure path is inside publicDir
    if (!fullStaticPath.startsWith(publicDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden');
    }

    if (fs.existsSync(fullStaticPath) && fs.statSync(fullStaticPath).isFile()) {
      const ext = path.extname(fullStaticPath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      return fs.createReadStream(fullStaticPath).pipe(res);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(port, () => {
    console.log(`\n🚀 Web Server running at http://localhost:${port}/`);
    console.log(`📂 Drag and drop new .jsonl files in your browser to parse them instantly!\n`);
  });
}
