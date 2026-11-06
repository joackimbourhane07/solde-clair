// Imite GitHub Pages en local : site servi sous /<dépôt>/, compression gzip, 404.html pour toute adresse inconnue.
// Usage : node serveur_pages.cjs <dossier-dist> <port> /<nom-du-depot>
// Construire avant avec BASE_PATH=/<nom-du-depot>/ et copier dist/index.html en dist/404.html.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIST = path.resolve(process.argv[2] || 'dist');
const PORT = Number(process.argv[3] || 4323);
const BASE = (process.argv[4] || '/site').replace(/\/+$/, '');
if (!fs.existsSync(DIST)) {
  console.error(`Dossier introuvable : ${DIST}`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url === BASE) {
      res.writeHead(301, { Location: `${BASE}/` });
      return res.end();
    }
    if (!url.startsWith(`${BASE}/`)) {
      res.writeHead(404);
      return res.end('hors site');
    }
    let rel = url.slice(BASE.length) || '/';
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(DIST, rel);
    if (file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      const type = TYPES[path.extname(file)] || 'application/octet-stream';
      if (/text|javascript|svg|json/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
        res.writeHead(200, { 'Content-Type': type, 'Content-Encoding': 'gzip', 'Cache-Control': 'max-age=600' });
        return fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
      }
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'max-age=600' });
      return fs.createReadStream(file).pipe(res);
    }
    const page404 = path.join(DIST, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    if (fs.existsSync(page404)) return fs.createReadStream(page404).pipe(res);
    res.end('introuvable');
  })
  .listen(PORT, () => console.log(`Site servi sur http://localhost:${PORT}${BASE}/`));
