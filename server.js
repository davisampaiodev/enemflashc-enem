const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DEFAULT_PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function createServer() {
  return http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(PUBLIC_DIR, reqPath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Access Denied');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo não encontrado');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro interno do servidor');
      } else {
        const isHtml = ext === '.html';
        const isCompressible = ['.html', '.css', '.js', '.json', '.svg'].includes(ext);
        const cacheControl = isHtml
          ? 'public, max-age=0, must-revalidate'
          : 'public, max-age=31536000, immutable';
        const headers = {
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
          'Vary': 'Accept-Encoding'
        };

        const acceptedEncoding = req.headers['accept-encoding'] || '';
        if (isCompressible && acceptedEncoding.includes('br')) {
          zlib.brotliCompress(content, (compressionError, compressed) => {
            if (compressionError) {
              res.writeHead(200, headers);
              return res.end(content);
            }
            res.writeHead(200, { ...headers, 'Content-Encoding': 'br' });
            res.end(compressed);
          });
        } else if (isCompressible && acceptedEncoding.includes('gzip')) {
          zlib.gzip(content, (compressionError, compressed) => {
            if (compressionError) {
              res.writeHead(200, headers);
              return res.end(content);
            }
            res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip' });
            res.end(compressed);
          });
        } else {
          res.writeHead(200, headers);
          res.end(content);
        }
      }
    });
  });
}

function startOnPort(port) {
  const s = createServer();
  s.listen(port, () => {
    console.log(`🚀 Servidor local rodando em: http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      startOnPort(port + 1);
    }
  });
}

startOnPort(DEFAULT_PORT);
startOnPort(5173);
