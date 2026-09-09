// Handler integration with deterministic Firestore/Storage/Auth doubles. No production access.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const C = require('../core');
function harness() {
  const docs = new Map(), files = new Map(), reads = [], writes = [];
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function snapshot(path) { const data = clone(docs.get(path)); return { id:path.split('/').pop(),exists:data!==undefined,ref:ref(path),data:()=>clone(data) }; }
  function ref(path) { return { path, get:async()=>{reads.push(path);return snapshot(path);} }; }
  function collection(path, filter) { return { path,filter,doc:id=>ref(`${path}/${id}`),where:(key,op,value)=>collection(path,{key,value}) }; }
  async function get(target) {
    reads.push(target.path);
    if (!target.doc) return snapshot(target.path);
    const rows = [...docs].filter(([p,v])=>p.startsWith(target.path+'/') && p.split('/').length===target.path.split('/').length+1 && (!target.filter || v[target.filter.key]===target.filter.value)).map(([p])=>snapshot(p));
    return { docs:rows,size:rows.length,forEach:fn=>rows.forEach(fn) };
  }
  const db = { doc:ref,collection,runTransaction:async fn=> {
    const pending = [];
    const tx = { get,set:(r,d)=>pending.push(['set',r.path,clone(d)]),create:(r,d)=>pending.push(['create',r.path,clone(d)]),update:(r,d)=>pending.push(['update',r.path,clone(d)]) };
    const result = await fn(tx);
    for (const [kind,path,data] of pending) { if(kind==='create'&&docs.has(path)) throw new Error('exists'); docs.set(path,kind==='update'?{...docs.get(path),...data}:data); writes.push(path); }
    return result;
  }};
  let generation = 0, race = null;
  const storage = { bucket:()=>({file:path=>({
    getMetadata:async()=> { const f=files.get(path);if(!f)throw Object.assign(new Error('missing'),{code:404});return [{generation:f.generation,metadata:{revision:String(f.revision)}}]; },
    save:async(data,opts)=> { if(race){const fn=race;race=null;fn();throw Object.assign(new Error('race'),{code:412});}const existing=files.get(path);if(Number(opts.preconditionOpts.ifGenerationMatch)!==Number(existing?.generation||0))throw Object.assign(new Error('race'),{code:412});files.set(path,{data,generation:++generation,revision:Number(opts.metadata.metadata.revision)}); },
    download:async()=>{const f=files.get(path);if(!f)throw Object.assign(new Error('missing'),{code:404});return [Buffer.from(f.data)];}
  })}) };
  const handlers = {};
  const modules = {
    'firebase-admin/app':{initializeApp(){}},'firebase-admin/firestore':{getFirestore:()=>db},'firebase-admin/storage':{getStorage:()=>storage},
    'firebase-admin/auth':{getAuth:()=>({verifyIdToken:async token=>{if(!token.startsWith('test:'))throw new Error('invalid');return {uid:token.slice(5)};}})},
    'firebase-functions/v2/https':{onRequest:(_,fn)=>fn},'firebase-functions/v2/firestore':{onDocumentWritten:(_,fn)=>fn},'firebase-functions/v2/scheduler':{onSchedule:(_,fn)=>fn},'./core':C,'node:crypto':require('node:crypto')
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../index.js'),'utf8'),{require:name=>modules[name],exports:handlers,process:{env:{}},Buffer,console});
  async function request(route,body,uid='alice',extra={}) {
    const headers={authorization:`Bearer test:${uid}`,origin:'https://disenosstreaming.com',...extra};
    const req={path:`/${route}`,method:body?'POST':'GET',body,get:key=>headers[key],is:()=>true};
    const res={code:200,headers:{},set(k,v){this.headers[k]=v;return this;},status(v){this.code=v;return this;},json(v){this.body=clone(v);return this;},end(){return this;}};
    await handlers.landingApi(req,res);return res;
  }
  function seed(uid='alice') { docs.set(`users/${uid}`,{active:true});docs.set(`users/${uid}/gestor_accounts/a`,{platform:'Netflix',capacity:2,dueDate:'2099-12-31',email:'PRIVATE',password:'SECRET'});docs.set(`users/${uid}/gestor_config/settings`,{platformPrices:{Netflix:{salePrice:15,purchaseCost:1}}}); }
  const event = (uid,id,before,after) => ({params:{uid,accountId:id,clientId:id,slug:id},data:{before:{data:()=>before},after:{data:()=>after}}});
  return {docs,files,reads,writes,handlers,request,seed,event,setRace:fn=>{race=fn;}};
}
const config = {name:'Nova',whatsapp:'51999123456',showPrices:false,products:[{platform:'Netflix',mode:'profile',name:'Netflix',enabled:true,price:15}]};
async function publish(h,uid='alice',slug='tienda-alice') { h.seed(uid);await h.request('editor',null,uid);return h.request('publish',{config,slug,expectedVersion:0},uid); }

test('public requests read only the storage object and contain no hidden price or quantity', async()=> {
  const h=harness();assert.equal((await publish(h)).code,200);
  await h.handlers.landingCatalogExport({params:{slug:'tienda-alice'}});
  h.reads.length=0;const response=await h.request('catalog/tienda-alice');
  assert.equal(response.code,200);assert.equal(h.reads.length,0);assert.equal(response.body.products.length,1);
  assert.doesNotMatch(JSON.stringify(response.body),/price|stock|quantity|capacity|SECRET|PRIVATE/);
  assert.equal(response.headers['Cache-Control'],'public, max-age=0, s-maxage=30');
});
test('private endpoints require authentication, active ownership and allowed origins', async()=> {
  const h=harness();h.seed();
  assert.equal((await h.request('editor',null,'alice',{authorization:''})).code,401);
  assert.equal((await h.request('editor',null,'alice',{origin:'https://untrusted.test'})).code,403);
  assert.equal((await h.request('editor',null,'stranger')).code,403);
  h.docs.set('users/alice',{active:false});assert.equal((await h.request('editor')).code,403);
});
test('slug collision and stale version fail without altering the first shop', async()=> {
  const h=harness();await publish(h);assert.equal((await publish(h,'bob','tienda-alice')).code,409);
  assert.equal((await h.request('draft',{config:{...config,name:'Overwrite'},expectedVersion:0})).code,409);
  assert.equal(h.docs.get('landing_private/alice').draft.name,'Nova');
  assert.equal(h.docs.get('landing_catalogs/tienda-alice').owner,'alice');
});
test('draft saves do not publish edits; pause exports an unavailable response', async()=> {
  const h=harness();await publish(h);const before=JSON.stringify(h.docs.get('landing_catalogs/tienda-alice'));
  await h.request('draft',{config:{...config,name:'New draft'},expectedVersion:1});assert.equal(JSON.stringify(h.docs.get('landing_catalogs/tienda-alice')),before);
  assert.equal((await h.request('pause',{expectedVersion:2})).code,200);
  await h.handlers.landingCatalogExport({params:{slug:'tienda-alice'}});assert.equal((await h.request('catalog/tienda-alice')).code,404);
});
test('client events update only affected account and do not export hidden quantity changes', async()=> {
  const h=harness();await publish(h);const before=h.docs.get('landing_catalogs/tienda-alice').revision;
  const row={accountId:'a',state:'Activo'};h.docs.set('users/alice/gestor_clients/c1',row);h.reads.length=0;
  await h.handlers.landingClientChanged(h.event('alice','c1',undefined,row));
  assert.equal(h.docs.get('landing_catalogs/tienda-alice').revision,before);
  assert.ok(!h.reads.includes('users/alice/gestor_accounts'));
  h.docs.set('users/alice/gestor_clients/c2',row);await h.handlers.landingClientChanged(h.event('alice','c2',undefined,row));
  assert.equal(h.docs.get('landing_catalogs/tienda-alice').payload.products.length,0);
  const revision=h.docs.get('landing_catalogs/tienda-alice').revision;
  await h.handlers.landingClientChanged(h.event('alice','c1',undefined,row));assert.equal(h.docs.get('landing_catalogs/tienda-alice').revision,revision);
});
test('account deletion and late events cannot restore deleted inventory', async()=> {
  const h=harness();await publish(h);const old=h.docs.get('users/alice/gestor_accounts/a');h.docs.delete('users/alice/gestor_accounts/a');
  await h.handlers.landingAccountChanged(h.event('alice','a',old,undefined));
  await h.handlers.landingAccountChanged(h.event('alice','a',undefined,old));
  assert.equal(h.docs.get('landing_catalogs/tienda-alice').payload.products.length,0);
});
test('irrelevant private edits require no Firestore reads', async()=> {
  const h=harness();const a={platform:'Netflix',capacity:5,dueDate:'2099-12-31',password:'old'};
  await h.handlers.landingAccountChanged(h.event('alice','a',a,{...a,password:'new'}));assert.equal(h.reads.length,0);
});
test('export retries storage precondition races and keeps the latest revision', async()=> {
  const h=harness();await publish(h);
  h.setRace(()=> {const next={...h.docs.get('landing_catalogs/tienda-alice'),revision:2,payload:{schemaVersion:1,published:false}};h.docs.set('landing_catalogs/tienda-alice',next);h.files.set('landing-catalogs/tienda-alice.json',{generation:1,revision:2,data:JSON.stringify(next.payload)});});
  await h.handlers.landingCatalogExport({params:{slug:'tienda-alice'}});
  assert.equal((await h.request('catalog/tienda-alice')).code,404);
});
