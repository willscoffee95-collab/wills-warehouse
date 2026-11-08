'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');

function segment(a,b){
  const start=app.indexOf(a),end=app.indexOf(b,start+a.length);
  assert.ok(start>=0&&end>start,'missing '+a);
  return app.slice(start,end);
}
const source=segment('  const WW_SO0811_TARGET_V15216=Object.freeze([',
                     '  async function directSO0811V15216(){');
function ownerFixture(){
  const context={Map,Set,String,Number,Object,Error,Array};
  return vm.runInNewContext(source+
    '\n({wwSo0811PreparedV15216,WW_SO0811_TARGET_V15216,WW_SO0811_POST_KEY_V15216})',context);
}
const factor={
  B01:1000,B02:490,B03:1000,B04:975,B05:1000,B06:1000,B21:1000,
  'B-EVP':500,'B-LMN':300,'B-ORG':300,'B-SAR':330,
  B07:30,B08:20,B09:8,B10:10,B11:15,
  'WH-RAW-CREAMER':500,'WH-RAW-MATCHA':1000,'WH-RAW-COKLAT':1000,
  'WH-RAW-MANGGA':11,'WH-RAW-CHOCO-DILO':14,
  B14:250,B15:100,B16:100,B17:500,B22:10,'WH-BATERAI-AAA':2,
  'WH-PLASTIK-KLIP-5X8':10,'WH-PLASTIK-KLIP-6X10':10,
  'WH-PLASTIK-TOMAT':1000
};

test('Owner supplied exactly 42 physical counts including all six last revisions',()=>{
  const {WW_SO0811_TARGET_V15216:data}=ownerFixture();
  assert.equal(data.length,42);
  const entries=new Map(data);
  assert.equal(entries.size,42,'no duplicate material');
  const expected={
    B07:142,'WH-RAW-CREAMER':38,'WH-RAW-MATCHA':7,
    'WH-RAW-COKLAT':7,'WH-RAW-MANGGA':640,
    'WH-RAW-CHOCO-DILO':750
  };
  for(const [code,value] of Object.entries(expected))
    assert.equal(entries.get(code),value,code);
  for(const zero of ['B-EVP','B-SAR','B15','B23','B25','B26',
    'WH-PLASTIK-KLIP-5X8','WH-PLASTIK-KLIP-6X10','WH-PLASTIK-TOMAT',
    'WH-TALI-TIES','WH-STIK-MIXER-HAND'])assert.equal(entries.get(zero),0);
});

test('Physical counts converted to base units with live master factors',()=>{
  const {WW_SO0811_TARGET_V15216:source,wwSo0811PreparedV15216:prepare}=ownerFixture();
  const master=source.map(([code])=>({code,name:code,receiveUnit:'pcs',
    factor:factor[code]||1,active:'YA'}));
  const stock=source.map(([code])=>({code,qty:0,avgCost:12}));
  const rows=prepare({stock,materials:master});
  assert.equal(rows.length,42);
  const byCode=new Map(rows.map(x=>[x.code,x]));
  assert.equal(byCode.get('B01').target,299000);
  assert.equal(byCode.get('B07').target,4260);
  assert.equal(byCode.get('WH-RAW-CREAMER').target,19000);
  assert.equal(byCode.get('WH-RAW-CHOCO-DILO').target,10500);
  assert.equal(byCode.get('WH-RAW-MANGGA').target,7040);
  assert.equal(byCode.get('WH-RAW-MATCHA').target,7000);
  assert.equal(byCode.get('B02').target,22050);
  assert.equal(byCode.get('B22').target,60);
  assert.equal(byCode.get('B14').target,1250);
});

test('Guard rejects missing or inactive master, negative stock and incomplete bootstrap',()=>{
  const {WW_SO0811_TARGET_V15216:source,wwSo0811PreparedV15216:prepare}=ownerFixture();
  const materials=source.map(([code])=>({code,name:code,factor:1,active:'YA'}));
  const stock=source.map(([code])=>({code,qty:10,avgCost:1}));
  assert.throws(()=>prepare({stock:[],materials}),/Master\/stok tidak valid/);
  const inactive=materials.map(x=>x.code==='B01'?{...x,active:'TIDAK'}:x);
  assert.throws(()=>prepare({stock,materials:inactive}),/Master\/stok tidak valid: B01/);
  const neg=stock.map(x=>x.code==='B01'?{...x,qty:-1}:x);
  assert.throws(()=>prepare({stock:neg,materials}),/Nilai stok invalid: B01/);
  assert.throws(()=>prepare(null),/Data master\/stok belum lengkap/);
});

test('Owner-only one-shot PWA workflow posts via official backend with unique idempotency',()=>{
  const code=segment('  async function directSO0811V15216(){','  // SO fisik 31 Oktober 2026');
  assert.match(code,/if\(currentRole\(\)!=='OWNER'\)/);
  assert.match(code,/getAppBootstrap/g);
  assert.match(code,/if\(rows\[i\]\.code!==fresh\[i\]\.code\|\|rows\[i\]\.factor!==fresh\[i\]\.factor/);
  assert.match(code,/localStorage\.setItem\(WW_SO0811_PENDING_V15216/);
  assert.match(code,/ownerPostStockAdjustmentV1527/);
  assert.match(code,/WW_SO0811_POST_KEY_V15216/);
  assert.match(code,/reason:'SELISIH_OPNAME'/);
  assert.match(code,/physicalQtyBase:x\.target/);
  assert.match(code,/stock|stok/i);
  assert.doesNotMatch(code,/sheet_\(|SpreadsheetApp|Ledger\.appendRow|executePlan_/);
  assert.doesNotMatch(code,/ownerPostStockAdjustmentV1527[\s\S]*?ownerPostStockAdjustmentV1527/);
});

test('After POSTED response, independently verify all 42 real stock balances',()=>{
  const code=segment('  async function directSO0811V15216(){','  // SO fisik 31 Oktober 2026');
  assert.match(code,/const verification=await withBusy/);
  assert.match(code,/const checked=wwSo0811PreparedV15216\(verification\)/);
  assert.match(code,/mismatches=checked\.filter\(x=>Math\.abs\(x\.delta\)>1e-8\)/);
  assert.match(code,/JANGAN posting ulang/);
  assert.match(code,/status:'CONFIRMED'/);
});

test('Existing original 31 October SO actions remain untouched and 8 Nov separated',()=>{
  assert.match(app,/Rekonsiliasi SO Fisik 31 Oktober · Owner/);
  assert.match(app,/Terapkan SO Fisik 8 November · 42 Bahan/);
  assert.match(app,/wwSo0811Open'\)\.onclick=directSO0811V15216/);
  assert.match(app,/wwSo3110Open'\)\.onclick=directSO3110V1527/);
});

test('Version is identical across app, HTML and service worker',()=>{
  const v='1.5.2.16-so-fisik-0811';
  assert.ok(app.includes("WW_FRONTEND_BUILD='2026-11-07."+v+"'"));
  assert.ok(index.includes('app.js?v='+v));
  assert.ok(sw.includes('app.js?v='+v));
  assert.ok(sw.includes('wills-warehouse-shell-v'+v));
});
