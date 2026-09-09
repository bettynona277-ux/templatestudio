const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../core');
const future = '2099-12-31';
const config = extra => C.sanitize({ name:'Tienda de prueba', whatsapp:'51999123456', showPrices:true,
  products:[{ platform:'Netflix', mode:'profile', enabled:true, name:'Netflix', price:15 }], ...extra });
const inv = { a:{ platform:'Netflix', profile:true, full:true, due:future } };

test('frontend and backend use identical rules', () => {
  assert.equal(fs.readFileSync(path.join(__dirname,'../../public/js/landing/core.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../core.js'),'utf8'));
});
test('public payload contains no inventory counts or private credentials even when injected', () => {
  const input = { ...config(), password:'SECRET', capacity:50, stock:49, freeSlots:49, clients:[{pin:'1234'}] };
  input.products[0] = { ...input.products[0], stock:49, password:'SECRET', accountId:'private-id', quantity:49 };
  const result = C.publicCatalog(input, { a:{...inv.a, capacity:50, used:1, email:'private@test', password:'SECRET'} }, {Netflix:{salePrice:15,purchaseCost:4}});
  assert.deepEqual(Object.keys(result).sort(), ['schemaVersion','published','name','description','logo','cover','whatsapp','cta','template','color','font','currency','products'].sort());
  assert.deepEqual(Object.keys(result.products[0]).sort(), ['id','name','description','duration','image','mode','featured','price'].sort());
  assert.doesNotMatch(JSON.stringify(result), /SECRET|private-id|private@test|quantity|capacity|freeSlots|purchaseCost|accountId|clients|stock/);
});
test('global and per-product price hiding removes the field, not just the display', () => {
  assert.equal('price' in C.publicCatalog(config({showPrices:false}),inv,{}).products[0],false);
  const c = config(); c.products[0].showPrice = false;
  assert.equal('price' in C.publicCatalog(c,inv,{}).products[0],false);
});
test('all six layouts survive publication without revealing hidden prices or stock', () => {
  for (const template of ['catalog','elegant','compact','spotlight','neon','magazine']) {
    const result = C.publicCatalog(config({template,showPrices:false}),inv,{});
    assert.equal(result.template,template);
    assert.equal(result.products.length,1);
    assert.equal('price' in result.products[0],false);
    assert.doesNotMatch(JSON.stringify(result), /quantity|capacity|freeSlots|stock/);
  }
  assert.equal(C.sanitize({template:'unknown'}).template,'catalog');
});
test('whole-account sales occupy all profiles, expired clients remain occupied until archived', () => {
  const a = {platform:'Netflix',capacity:5,dueDate:future};
  assert.deepEqual(C.accountSummary(a,[{fullAccountSale:true}]),{platform:'Netflix',profile:false,full:false,due:future});
  assert.equal(C.accountSummary({...a,capacity:1},[{state:'Vencido'}]).profile,false);
  assert.equal(C.accountSummary({...a,capacity:1},[{state:'No renovó'}]).profile,true);
  assert.equal(C.accountSummary({...a,capacity:1},[{state:'Retirado del combo'}]).full,true);
});
test('availability excludes exhausted, expired and undated accounts', () => {
  for (const row of [{...inv.a,profile:false},{...inv.a,due:'2020-01-01'},{...inv.a,due:''},{...inv.a,due:'2026-02-30'}]) assert.equal(C.publicCatalog(config(),{a:row},{},'2026-09-08').products.length,0);
  assert.equal(C.publicCatalog(config(),{a:{...inv.a,due:'2026-09-08'}},{},'2026-09-08').products.length,1);
});
test('shared pool makes complete-account offering disappear after one profile sale', () => {
  const c = config({products:[{name:'Perfil',platform:'Netflix',mode:'profile',enabled:true},{name:'Completa',platform:'Netflix',mode:'full',enabled:true}]});
  const summary = C.accountSummary({platform:'Netflix',capacity:5,dueDate:future},[{state:'Activo'}]);
  assert.deepEqual(C.publicCatalog(c,{a:summary},{}).products.map(p=>p.mode),['profile']);
});
test('gestor sale price resolves platform aliases, never purchase or renewal prices', () => {
  const c = config(); c.products[0].priceSource = 'gestor';
  assert.equal(C.publicCatalog(c,inv,{Netflix:{salePrice:20,renewalPrice:11,purchaseCost:2}}).products[0].price,20);
  assert.equal('price' in C.publicCatalog(c,inv,{Netflix:{purchaseCost:2}}).products[0],false);
  assert.equal(C.platformKey('Disney+'),C.platformKey('Disney Plus'));
});
test('sanitization bounds payloads and rejects unsafe assets', () => {
  const c = config({logo:'javascript:alert(1)',cover:'data:text/html,bad',color:'red;position:fixed',name:'n'.repeat(200),products:Array.from({length:500},(_,i)=>({platform:`P${i}`}))});
  assert.equal(c.logo,'');assert.equal(c.cover,'');assert.equal(c.color,'#146c60');assert.equal(c.name.length,80);assert.equal(c.products.length,120);
  assert.equal(C.safeImage('https://user:pass@example.com/a.png'),'');
  assert.equal(C.platformKey('constructor'),'constructor');
  assert.equal(C.accountSummary({capacity:Infinity},[]).profile,false);
});
test('WhatsApp uses seller contact and encodes the product message', () => {
  const url = new URL(C.whatsappUrl('+51 999 123 456','Nova',{name:'Series & Cine',duration:'30 días'}));
  assert.equal(url.hostname,'wa.me'); assert.equal(url.pathname,'/51999123456'); assert.match(url.searchParams.get('text'),/Series & Cine \(30 días\)/);
  assert.equal(C.whatsappUrl('123','Nova'), '');
});
test('publication validates name, seller phone, slug and product selection', () => {
  assert.doesNotThrow(()=>C.validate(config(),'tienda-test'));
  assert.throws(()=>C.validate(config({whatsapp:''}),'tienda-test'));
  assert.throws(()=>C.validate(config(),'../admin'));
  assert.throws(()=>C.validate(config({products:[]}),'tienda-test'));
});
