// Foreground static server for dist/, used by Playwright's webServer.
// (`astro preview` detaches into the background when stdout isn't a TTY, which Playwright treats as a crash.)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../dist');
const PORT = Number(process.env.PORT ?? 4321);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

if (!fs.existsSync(ROOT)) {
  console.error('dist/ not found — run `npm run build` first');
  process.exit(1);
}

http
  .createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('Bad request');
      return;
    }
    let file = path.join(ROOT, pathname);
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`Serving dist/ at http://localhost:${PORT}`));
