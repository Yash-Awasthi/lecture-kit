// Serves this folder on localhost and opens a deck in the default browser.
// usage: node serve.mjs [file.html] [slide number | workshop]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join, extname, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const html = readdirSync(root).filter(f => f.endsWith('.html'));
const file = process.argv[2] || html.find(f => f.endsWith('-offline.html')) || html[0];
const hash = '#' + (process.argv[3] || '1');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.wasm': 'application/wasm', '.md': 'text/markdown; charset=utf-8' };

const server = createServer(async (req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).split('/').filter(Boolean).join('/'); } catch { res.writeHead(400).end(); return; }
  const path = normalize(join(root, rel || file));
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
});

let port = +(process.env.PORT || 8000);
server.on('error', e => { if (e.code === 'EADDRINUSE' && port < 8030) server.listen(++port, '127.0.0.1'); else throw e; });
server.on('listening', () => {
  const url = `http://localhost:${port}/${file}${hash}`;
  console.log(`Serving ${root}\nOpen ${url}\nKeep this window open while presenting; close it (or Ctrl+C) to stop.`);
  const open = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  if (!process.env.NO_OPEN) exec(open);
});
server.listen(port, '127.0.0.1');
