const http = require('http');
const fs = require('fs');
const path = require('path');
const { parsePSD } = require('./psd-parser');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // API: parse PSD
  if (req.method === 'POST' && url.pathname === '/api/parse-psd') {
    try {
      const chunks = [];
      let totalSize = 0;
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
        totalSize += chunk.length;
        if (totalSize > 200 * 1024 * 1024) { // 200MB limit
          res.writeHead(413); res.end(JSON.stringify({ error: 'Archivo demasiado grande (máx 200MB)' })); return;
        }
      }
      const body = Buffer.concat(chunks);
      const ct = req.headers['content-type'] || '';
      const boundary = ct.split('boundary=')[1];

      let psdBuf = body;
      if (boundary) {
        // Parse multipart
        const em = Buffer.from('\r\n--' + boundary);
        let hdrEnd = -1;
        for (let i = 0; i < Math.min(body.length, 2000); i++) {
          if (body[i]===13&&body[i+1]===10&&body[i+2]===13&&body[i+3]===10) {
            hdrEnd = i + 4; break;
          }
        }
        if (hdrEnd < 0) throw new Error('Bad multipart format');
        let dataEnd = body.length;
        for (let i = hdrEnd; i < body.length - em.length; i++) {
          if (body.slice(i, i + em.length).equals(em)) { dataEnd = i; break; }
        }
        psdBuf = body.slice(hdrEnd, dataEnd);
      }

      console.log(`Processing PSD: ${(psdBuf.length / 1024 / 1024).toFixed(1)}MB`);
      const result = parsePSD(psdBuf);
      console.log(`Done: ${result.layers.length} text layers found`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('PSD error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(__dirname, 'public', filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Try index.html as fallback
      fs.readFile(path.join(__dirname, 'public', 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`✦ TemplateStudio server running on port ${PORT}`));
