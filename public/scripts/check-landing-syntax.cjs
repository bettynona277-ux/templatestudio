const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const htmlFiles = ['public/mi-landing.html','public/tienda.html','public/gestor.html','public/gestor-mobile.html','public/gestor-login.html'];
const jsFiles = ['server.js','public/server.js','public/sw.js','functions/index.js', ...fs.readdirSync(path.join(root,'public/js/landing')).filter(f=>f.endsWith('.js')).map(f=>`public/js/landing/${f}`)];
let checked = 0, failed = false;
function check(source, label, module = false) {
  const result = spawnSync(process.execPath, [...(module ? ['--input-type=module'] : []),'--check'],{input:source,encoding:'utf8'});
  checked++;
  if(result.status !== 0){failed=true;console.error(label+'\n'+result.stderr);}
}
for(const name of jsFiles) check(fs.readFileSync(path.join(root,name),'utf8'),name);
for(const name of htmlFiles){
  const html=fs.readFileSync(path.join(root,name),'utf8');let index=0;
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    index++; if(/\bsrc\s*=/.test(match[1]) || !match[2].trim() || /application\/(ld\+)?json/.test(match[1]))continue;
    check(match[2],`${name} script ${index}`,/type\s*=\s*["']module["']/.test(match[1]));
  }
}
console.log(`${checked} scripts checked; ${failed?'errors found':'syntax OK'}.`);
process.exitCode = failed ? 1 : 0;
