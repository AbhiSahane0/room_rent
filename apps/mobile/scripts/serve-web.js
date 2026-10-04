#!/usr/bin/env node
/**
 * Serves the built web app (apps/mobile/dist) on http://localhost:8081, like a static host would:
 * real files first, then /route.html, then index.html for deep links. No dependencies.
 *   npm run web:preview     (builds first, then serves)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 8081);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('No build found. Run: npm run web:build   (or use: npm run web:preview)');
  process.exit(1);
}

const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();
http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(root, urlPath);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (!isFile(file)) {
      const html = `${file.replace(/\/$/, '')}.html`;
      file = isFile(html) ? html : path.join(root, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`\nRent Manager web app: http://localhost:${port}\nAPI expected at: ${process.env.EXPO_PUBLIC_API_URL || '(set when building)'}\n`));
