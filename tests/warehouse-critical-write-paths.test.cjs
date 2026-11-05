'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
function part(a,b){
  const s=source.indexOf(a),e=source.indexOf(b,s+a.length);
  assert.ok(s>=0&&e>s,'Missing code markers: '+a);
  return source.slice(s,e);
}
const verifyCode=part('  function verifySavedPickingV160(','  function opsPrintRequestThermalV43(');
const verify=vm.runInNewContext(verifyCode+'\nverifySavedPickingV160');
const materials=[
  {lineNo:1,code:'B01',approvedQtyUnit:'0',reason:'stok kosong'},
  {lineNo:2,code:'B03',approvedQtyUnit:'2.5',reason:''}
];
const current={
  checked:true,sjId:'SJID-1',
  lines:[{lineNo:1,code:'B01',approvedQtyUnit:0},{lineNo:2,code:'B03',approvedQtyUnit:2.5}]
};

test('fresh readback with exact picked quantities is accepted, including explicit zero',()=>{
  assert.equal(verify(current,{sjId:'SJID-1'},materials),current);
});

test('fresh readback with a different quantity is rejected',()=>{
  const changed={...current,lines:[current.lines[0],{lineNo:2,code:'B03',approvedQtyUnit:3}]};
  assert.throws(()=>verify(changed,{sjId:'SJID-1'},materials),/Jumlah picking/);
});

test('different SJ identity or an incomplete readback is rejected',()=>{
  assert.throws(()=>verify({...current,sjId:'SJID-2'},{sjId:'SJID-1'},materials),/Referensi Surat Jalan/);
  assert.throws(()=>verify(null,{sjId:'SJID-1'},materials),/belum terverifikasi/);
  assert.throws(()=>verify({checked:false,lines:[]},{sjId:'SJID-1'},materials),/belum terverifikasi/);
});

test('picking write keeps idempotency key until fresh server state is validated',()=>{
  const handler=part('    form.onsubmit=async e=>{','  function verifySavedPickingV160(');
  const start=handler.lastIndexOf("const safePickAction='pick_'");
  assert.ok(start>0,'picking handler exists');
  const body=handler.slice(start);
  const checks=[
    "lockedMutationIdemV160(safePickAction,method,pickPayload)",
    "requireConfirmedWarehouseWriteV160(result,'Pemeriksaan bahan gudang')",
    "verifySavedPickingV160(fresh,source,items)",
    "localStorage.removeItem('ww_gh_idem_'+safePickAction)"
  ];
  const offsets=checks.map(s=>body.indexOf(s));
  assert.ok(offsets.every(x=>x>=0),'all safety checks are present');
  assert.ok(offsets.every((x,i)=>i===0||x>offsets[i-1]),'audit readback occurs before key removal');
});

test('finance actual uses the same safe write path and no direct idempotency expiry',()=>{
  const body=part('  async function directFinanceActualV1300()','  let lastStockReportV1300=');
  assert.match(body,/writeDirect\('finance_actual','saveFinancialPositionActualV1300',payload\)/);
  assert.doesNotMatch(body,/idemKey\('finance_actual'\)/);
});

test('SO correction must verify backend response before success notification',()=>{
  const body=part("    $('#wwSoPost').onclick=async()=>{",'  // V1.6 safety guard');
  const i=body.indexOf("requireConfirmedWarehouseWriteV160(output,'Koreksi SO 31 Oktober')");
  const success=body.indexOf("toast('Koreksi SO telah dikirim");
  assert.ok(i>=0&&success>i,'SO success message is behind acknowledgement guard');
});
