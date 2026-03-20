const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.svg':'image/svg+xml','.ico':'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // API: parse PSD
  if (req.method === 'POST' && url.pathname === '/api/parse-psd') {
    try {
      const chunks = [];
      let total = 0;
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
        total += chunk.length;
        if (total > 200 * 1024 * 1024) {
          res.writeHead(413); res.end(JSON.stringify({error:'Máx 200MB'})); return;
        }
      }
      const body = Buffer.concat(chunks);
      const ct = req.headers['content-type'] || '';
      const boundary = ct.split('boundary=')[1];
      let psdBuf = body;
      if (boundary) {
        const em = Buffer.from('\r\n--' + boundary);
        let hdrEnd = -1;
        for (let i = 0; i < Math.min(body.length, 4000); i++) {
          if (body[i]===13&&body[i+1]===10&&body[i+2]===13&&body[i+3]===10) {
            hdrEnd = i + 4; break;
          }
        }
        if (hdrEnd < 0) throw new Error('Bad multipart');
        let dataEnd = body.length;
        for (let i = hdrEnd; i < body.length - em.length; i++) {
          if (body.slice(i, i + em.length).equals(em)) { dataEnd = i; break; }
        }
        psdBuf = body.slice(hdrEnd, dataEnd);
      }

      console.log(`Processing PSD: ${(psdBuf.length/1024/1024).toFixed(1)}MB`);

      // Write to temp file (psd library needs file path)
      const tmpPath = `/tmp/upload_${Date.now()}.psd`;
      fs.writeFileSync(tmpPath, psdBuf);

      const PSD = require('psd');
      const psd = PSD.fromFile(tmpPath);
      psd.parse();

      const tree = psd.tree();
      const width = psd.header.width;
      const height = psd.header.height;

      const layers = [];

      function processNode(node) {
        if (node.isGroup()) {
          node.children().forEach(processNode);
          return;
        }
        const layer = node.layer;
        const name = node.name || 'Layer';
        if (name === '<group>' || name.startsWith('//')) return;

        const isText = !!(layer.typeTool && layer.typeTool());
        const x = layer.left || 0;
        const y = layer.top || 0;
        const w = (layer.right || 0) - (layer.left || 0);
        const h = (layer.bottom || 0) - (layer.top || 0);
        const visible = !layer.hidden;
        const opacity = (layer.opacity !== undefined ? layer.opacity : 255) / 255;

        let src = null;
        let textContent = null;
        let fontSize = 24;
        let fontColor = '#ffffff';
        let fontWeight = '400';

        if (isText) {
          try {
            const tt = layer.typeTool();
            textContent = tt.data.Txt ? tt.data.Txt.replace(/\r/g, '\n').trim() : name;
            const styleRun = tt.data.EngineData?.EngineDict?.StyleRun?.RunArray?.[0]?.StyleSheet?.StyleSheetData;
            if (styleRun) {
              fontSize = styleRun.FontSize ? Math.round(styleRun.FontSize) : 24;
              fontWeight = styleRun.FauxBold ? '700' : '400';
              if (styleRun.FillColor?.Values) {
                const [,r,g,b] = styleRun.FillColor.Values;
                fontColor = '#' + [r,g,b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
              }
            }
          } catch(e) {
            textContent = name;
          }
        } else {
          // Export layer image
          try {
            if (w > 0 && h > 0 && node.export) {
              const exported = node.export();
              if (exported?.pixelData && exported.width > 0 && exported.height > 0) {
                // Convert RGBA pixel data to PNG using pure JS
                const png = rawRGBAtoPNG(exported.pixelData, exported.width, exported.height);
                src = 'data:image/png;base64,' + png.toString('base64');
              }
            }
          } catch(e) {
            console.warn('Layer export failed:', name, e.message);
          }
        }

        if (src !== null || isText) {
          layers.push({
            id: layers.length, name, isText, visible,
            x, y, w: w || 200, h: h || 50,
            opacity, src, textContent,
            fontSize, fontColor, fontWeight,
            textAlign: 'left'
          });
        }
      }

      tree.children().forEach(processNode);
      layers.reverse();

      // Cleanup temp file
      try { fs.unlinkSync(tmpPath); } catch(e) {}

      console.log(`Done: ${layers.length} layers`);
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ width, height, layers }));

    } catch(err) {
      console.error('PSD error:', err.message);
      res.writeHead(500, {'Content-Type':'application/json'});
      res.end(JSON.stringify({error: err.message}));
    }
    return;
  }

  // Static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(__dirname, 'public', filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'public', 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, {'Content-Type':'text/html'}); res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {'Content-Type': MIME[ext]||'application/octet-stream'});
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`✦ TemplateStudio on port ${PORT}`));

// Pure JS RGBA -> PNG encoder (no canvas needed)
function rawRGBAtoPNG(pixelData, width, height) {
  const zlib = require('zlib');
  const data = Buffer.from(pixelData);

  // Build raw image data with filter bytes
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (1 + width * 4) + 1 + x * 4;
      raw[di] = data[si];     // R
      raw[di+1] = data[si+1]; // G
      raw[di+2] = data[si+2]; // B
      raw[di+3] = data[si+3]; // A
    }
  }

  const compressed = zlib.deflateSync(raw, {level:6});

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = crc32.table || (crc32.table = (() => {
      const t = new Uint32Array(256);
      for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c;}
      return t;
    })());
    for(let i=0;i<buf.length;i++) crc=table[(crc^buf[i])&0xFF]^(crc>>>8);
    return (crc^0xFFFFFFFF)>>>0;
  }

  function chunk(type, data) {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf = Buffer.concat([t, data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, t, data, c]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
