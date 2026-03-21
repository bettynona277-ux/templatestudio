const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.svg':'image/svg+xml','.ico':'image/x-icon'
};

function rawRGBAtoPNG(pixelData, width, height) {
  const data = Buffer.isBuffer(pixelData) ? pixelData : Buffer.from(pixelData);
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (1 + width * 4) + 1 + x * 4;
      raw[di]=data[si]; raw[di+1]=data[si+1]; raw[di+2]=data[si+2]; raw[di+3]=data[si+3];
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 6 });
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = crc32.table || (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c;}
      return t;
    })());
    for (let i=0;i<buf.length;i++) crc=table[(crc^buf[i])&0xFF]^(crc>>>8);
    return (crc^0xFFFFFFFF)>>>0;
  }
  function chunk(type, data) {
    const t=Buffer.from(type), len=Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf=Buffer.concat([t,data]), c=Buffer.alloc(4); c.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len,t,data,c]);
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; ihdr[9]=6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr), chunk('IDAT',compressed), chunk('IEND',Buffer.alloc(0))
  ]);
}

async function parsePSDBuffer(psdBuf) {
  const agPsd = require('ag-psd');
  const { createCanvas } = require('canvas');
  agPsd.initializeCanvas(createCanvas);
  const psd = agPsd.readPsd(psdBuf, {
    skipLayerImageData: false,
    skipCompositeImageData: true,
    skipThumbnail: true,
  });
  const width = psd.width, height = psd.height;
  const layers = [];

  function hexColor(r,g,b){
    return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  }

  function processLayer(layer) {
    if (layer.children) { layer.children.forEach(processLayer); return; }
    const name = layer.name || 'Layer';
    if (name === '<group>' || name.startsWith('//')) return;

    const x=layer.left||0, y=layer.top||0;
    const w=(layer.right||0)-(layer.left||0), h=(layer.bottom||0)-(layer.top||0);
    const visible = layer.hidden !== true;
    const rawOpacity = layer.opacity !== undefined ? layer.opacity : 255;
    const opacity = rawOpacity <= 1 ? rawOpacity : rawOpacity / 255;
    const isText = !!layer.text;

    let src=null, textContent=null, fontSize=24, fontColor='#ffffff', fontWeight='400', textAlign='left';

    if (isText) {
      const t = layer.text;
      textContent = (t.text||name).replace(/\r/g,'\n').trim();
      const style = t.style||{};
      const firstRun = (t.styleRuns&&t.styleRuns[0]) ? t.styleRuns[0].style : {};
      const ms = {...style,...firstRun};
      if (ms.fontSize) fontSize = Math.round(ms.fontSize);
      if (ms.bold||ms.fauxBold) fontWeight='700';
      if (ms.fillColor) { const c=ms.fillColor; if(c.r!==undefined) fontColor=hexColor(c.r,c.g,c.b); }
      else if (ms.color) { const c=ms.color; if(c.r!==undefined) fontColor=hexColor(c.r,c.g,c.b); }
      const para = t.paragraphStyle||(t.paragraphStyleRuns&&t.paragraphStyleRuns[0]?.style)||{};
      if (para.justification==='right') textAlign='right';
      else if (para.justification==='center') textAlign='center';
    } else {
      try {
        if (w > 0 && h > 0 && layer.canvas) {
          // ag-psd renders layer to canvas when initializeCanvas is set
          src = 'data:image/png;base64,' + layer.canvas.toBuffer('image/png').toString('base64');
        } else if (w > 0 && h > 0 && layer.imageData) {
          const img = layer.imageData;
          const png = rawRGBAtoPNG(img.data, img.width||w, img.height||h);
          src = 'data:image/png;base64,' + png.toString('base64');
        }
      } catch(e) { console.warn('Layer export failed:', name, e.message); }
    }

    if (src !== null || isText) {
      layers.push({ id:layers.length, name, isText, visible, x, y, width:w||200, height:h||50, w:w||200, h:h||50, opacity, src, textContent, fontSize, fontColor, fontWeight, textAlign });
    }
  }

  if (psd.children) psd.children.forEach(processLayer);
  // Assign z-index: first layer in array = bottom, last = top (matches Photoshop order)
  layers.forEach((l, i) => { l.zIndex = i; });
  console.log(`ag-psd: ${layers.length} layers from ${width}x${height}`);
  return { width, height, layers };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.method==='POST' && url.pathname==='/api/parse-psd') {
    try {
      const chunks=[]; let total=0;
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
        total += chunk.length;
        if (total > 200*1024*1024) { res.writeHead(413); res.end(JSON.stringify({error:'Max 200MB'})); return; }
      }
      const body = Buffer.concat(chunks);
      const ct = req.headers['content-type']||'';
      const boundary = ct.split('boundary=')[1];
      let psdBuf = body;
      if (boundary) {
        const em = Buffer.from('\r\n--'+boundary);
        let hdrEnd=-1;
        for (let i=0;i<Math.min(body.length,4000);i++) {
          if (body[i]===13&&body[i+1]===10&&body[i+2]===13&&body[i+3]===10){hdrEnd=i+4;break;}
        }
        if (hdrEnd<0) throw new Error('Bad multipart');
        let dataEnd=body.length;
        for (let i=hdrEnd;i<body.length-em.length;i++) {
          if (body.slice(i,i+em.length).equals(em)){dataEnd=i;break;}
        }
        psdBuf = body.slice(hdrEnd,dataEnd);
      }
      console.log(`Processing PSD: ${(psdBuf.length/1024/1024).toFixed(1)}MB`);
      const result = await parsePSDBuffer(psdBuf);
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify(result));
    } catch(err) {
      console.error('PSD error:',err.message);
      res.writeHead(500,{'Content-Type':'application/json'});
      res.end(JSON.stringify({error:err.message}));
    }
    return;
  }

  let filePath = url.pathname==='/' ? '/index.html' : url.pathname;
  filePath = path.join(__dirname,'public',filePath);
  fs.readFile(filePath,(err,data)=>{
    if (err) {
      fs.readFile(path.join(__dirname,'public','index.html'),(e2,d2)=>{
        if (e2){res.writeHead(404);res.end('Not found');return;}
        res.writeHead(200,{'Content-Type':'text/html'});res.end(d2);
      });
      return;
    }
    const ext=path.extname(filePath);
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream'});
    res.end(data);
  });
});

server.listen(PORT,()=>console.log(`✦ TemplateStudio on port ${PORT} (ag-psd)`));
