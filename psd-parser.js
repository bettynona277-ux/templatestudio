function readU32(buf, off) {
  return ((buf[off]<<24)|(buf[off+1]<<16)|(buf[off+2]<<8)|buf[off+3]) >>> 0;
}
function readI32(buf, off) {
  const v = readU32(buf, off);
  return v > 0x7fffffff ? v - 0x100000000 : v;
}
function readU16(buf, off) { return (buf[off]<<8)|buf[off+1]; }

function parsePSD(buf) {
  const sig = String.fromCharCode(buf[0],buf[1],buf[2],buf[3]);
  if (sig !== '8BPS') throw new Error('No es un PSD válido (firma incorrecta)');

  const width  = readU32(buf, 18);
  const height = readU32(buf, 14);

  // Extract thumbnail from image resources
  let thumbDataUrl = null;
  try {
    let pos = 26;
    const colorLen = readU32(buf, pos); pos += 4 + colorLen;
    const imgResLen = readU32(buf, pos); pos += 4;
    const imgResEnd = pos + imgResLen;
    while (pos + 10 < imgResEnd) {
      const rSig = String.fromCharCode(buf[pos],buf[pos+1],buf[pos+2],buf[pos+3]);
      if (rSig !== '8BIM') break;
      const resId = readU16(buf, pos + 4);
      const namLen = buf[pos + 6];
      const pad = namLen + 1 + ((namLen + 1) % 2);
      if (pos + 6 + pad + 4 > imgResEnd) break;
      const dLen = readU32(buf, pos + 6 + pad);
      const dOff = pos + 6 + pad + 4;
      if ((resId === 1036 || resId === 1033) && dLen > 28) {
        const fmt = readU32(buf, dOff);
        if (fmt === 1 && dOff + 28 + dLen - 28 <= buf.length) {
          const jpgOff = dOff + 28;
          const jpgLen = dLen - 28;
          thumbDataUrl = 'data:image/jpeg;base64,' +
            buf.slice(jpgOff, jpgOff + jpgLen).toString('base64');
        }
      }
      pos = dOff + dLen + (dLen % 2);
    }
  } catch(e) { console.warn('Thumbnail:', e.message); }

  // Find TySh markers (text layers)
  const tyshOffsets = [];
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf[i]===0x54&&buf[i+1]===0x79&&buf[i+2]===0x53&&buf[i+3]===0x68)
      tyshOffsets.push(i);
  }

  // Find luni markers (unicode layer names)
  const luniMap = new Map();
  for (let i = 0; i < buf.length - 12; i++) {
    if (buf[i]===0x6C&&buf[i+1]===0x75&&buf[i+2]===0x6E&&buf[i+3]===0x69) {
      try {
        const ulen = readU32(buf, i + 8);
        if (ulen > 0 && ulen < 200 && i + 12 + ulen*2 <= buf.length) {
          let name = '';
          for (let c = 0; c < ulen; c++)
            name += String.fromCodePoint(readU16(buf, i + 12 + c*2));
          name = name.trim();
          if (name) luniMap.set(i, name);
        }
      } catch(e) {}
    }
  }
  const luniOffsets = [...luniMap.keys()].sort((a,b) => a-b);

  // Build text layers
  const layers = tyshOffsets.map((tyshOff, idx) => {
    // Find nearest luni before this TySh
    let name = 'Texto ' + (idx + 1);
    for (let k = luniOffsets.length - 1; k >= 0; k--) {
      const lo = luniOffsets[k];
      if (lo < tyshOff && tyshOff - lo < 30000) {
        name = luniMap.get(lo) || name; break;
      }
    }

    // Estimate position from layer record
    let x = 50, y = 50 + idx * 100, w = Math.round(width * 0.6), h = 60;
    for (let back = tyshOff - 50; back > Math.max(0, tyshOff - 3000); back -= 2) {
      try {
        const top    = readI32(buf, back);
        const left   = readI32(buf, back + 4);
        const bottom = readI32(buf, back + 8);
        const right  = readI32(buf, back + 12);
        const pw = right - left, ph = bottom - top;
        if (pw > 5 && pw < width * 1.2 && ph > 5 && ph < height * 1.2 &&
            top >= -50 && left >= -50 && bottom <= height * 1.2 && right <= width * 1.2) {
          x = Math.max(0, left);
          y = Math.max(0, top);
          w = pw; h = ph; break;
        }
      } catch(e) {}
    }

    return {
      id: idx, name, isText: true, visible: true,
      x, y, w, h, opacity: 1,
      textContent: name,
      fontSize: Math.round(Math.min(h * 0.7, 72)),
      fontColor: '#ffffff',
      fontWeight: '700',
      src: null
    };
  });

  return { width, height, thumbDataUrl, layers };
}

module.exports = { parsePSD };
