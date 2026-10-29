/**
 * Wills Warehouse V1.5.2.5.1 — STAFF PICKING / KETERSEDIAAN PERMINTAAN OUTLET
 * Isolated Apps Script add-on. DO NOT replace existing Code.gs or install triggers.
 * Compatible with canonical DRAFT SJ + Penyesuaian Pemenuhan SJ (V1261).
 * Every reviewed line is appended to the existing fulfillment log (including qty 0).
 * No STOCK/BANK/CASH/AP/AR ledger effects and no delivery dispatch.
 *
 * Bridge ALLOWED_METHODS: getWarehouseRequestAvailabilityV1525,
 *                          saveWarehouseRequestAvailabilityV1525.
 */
var WW1525_PICK_BUILD = '2026-10-29.1.5.2.5.1-staff-picking-partial-zero';

function ww1525FindRequestDraft_(ss,requestId) {
  const id=cleanText_(requestId,120);
  if(!id)throw new Error('ID permintaan tidak valid.');
  const sh=sheet_(ss,WW.S.REQUEST_SYNC),row=findRowByExact_(sh,1,id);
  if(!row)throw new Error('Permintaan tidak ditemukan. Sinkronkan permintaan outlet dahulu.');
  const r=sh.getRange(row,1,1,WW.H.REQUEST_SYNC.length).getValues()[0];
  const sjId=cleanText_(r[13],100),outletCode=normalizeCode_(r[2]);
  if(!sjId)throw new Error('Permintaan belum memiliki DRAFT Surat Jalan. Sinkronkan permintaan terlebih dahulu.');
  const d=findDelivery_(ss,sjId);
  if(!d||normalizeCode_(d.outletCode)!==outletCode)throw new Error('Link permintaan dan Surat Jalan tidak cocok.');
  if(String(r[14]||'')!==d.noSj)throw new Error('Nomor Surat Jalan dan permintaan belum sinkron.');
  if(String(r[9]||'').toUpperCase()==='DIBATALKAN'||d.status==='DIBATALKAN')
    throw new Error('Permintaan / Surat Jalan telah dibatalkan.');
  const lines=deliveryLines_(ss,sjId).sort(function(a,b){return Number(a.lineNo)-Number(b.lineNo);});
  if(!lines.length)throw new Error('DRAFT SJ belum memiliki rincian bahan.');
  return {requestId:id,delivery:d,lines:lines,outletCode:outletCode};
}
function ww1525ReadReview_(ss,linked) {
  const sh=ss.getSheetByName(WW.S.FULFILLMENT_ADJUSTMENTS);
  const latest={},prefix='FCHK-',lines=linked.lines;
  if(sh&&sh.getLastRow()>1) {
    const vals=sh.getRange(2,1,sh.getLastRow()-1,WW.H.FULFILLMENT_ADJUSTMENTS.length).getValues();
    vals.forEach(function(r){
      if(String(r[3]||'')!==linked.delivery.sjId)return;
      latest[Number(r[5])] = r;
    });
  }
  let idem='',checked=lines.length>0,reviewedAt='',reviewedBy='';
  lines.forEach(function(l){
    const row=latest[Number(l.lineNo)];
    if(!row||String(row[0]||'').indexOf(prefix)!==0){checked=false;return;}
    const key=String(row[1]||'');
    if(idem&&key!==idem)checked=false;
    idem=idem||key;
    if(Math.abs(Number(row[8]||0)-Number(l.qtyUnit||0))>0.000001||
       String(row[11]||'')!==String(l.fulfillmentReason||''))checked=false;
    reviewedAt=row[2] instanceof Date?serializeDateTime_(row[2]):String(row[2]||'');
    reviewedBy=String(row[13]||'');
  });
  return {checked:checked,reviewId:checked?idem:'',reviewedAt:checked?reviewedAt:'',reviewedBy:checked?reviewedBy:''};
}
function getWarehouseRequestAvailabilityV1525(token,requestId) {
  const ss=warehouseSs_(),user=requireSessionReadOnlyFastV1360_(ss,token);
  if(!roleHasPermission_(user.role,'DELIVERY_PREPARE')&&!roleHasPermission_(user.role,'DELIVERY_DISPATCH'))
    throw new Error('Akses pemeriksaan bahan ditolak.');
  const linked=ww1525FindRequestDraft_(ss,requestId),review=ww1525ReadReview_(ss,linked);
  return {ok:true,readOnly:true,build:WW1525_PICK_BUILD,
    requestId:linked.requestId,outletCode:linked.outletCode,sjId:linked.delivery.sjId,
    noSj:linked.delivery.noSj,status:linked.delivery.status,
    checked:review.checked,reviewId:review.reviewId,reviewedAt:review.reviewedAt,reviewedBy:review.reviewedBy,
    lines:linked.lines.map(function(l){return{
      lineNo:l.lineNo,code:l.code,name:l.name,sendUnit:l.sendUnit,
      requestedQtyUnit:Number(l.requestedQtyUnit||0),approvedQtyUnit:Number(l.qtyUnit||0),
      status:l.fulfillmentStatus||'DIPENUHI',reason:l.fulfillmentReason||''
    };})};
}
function saveWarehouseRequestAvailabilityV1525(token,payload,idem) {
  return withWriteLock_(function() {
    const ss=warehouseSs_(),user=requirePermission_(ss,token,'DELIVERY_PREPARE');
    assertNoPendingRecovery_(ss);assertIdem_(idem);
    payload=payload||{};
    const linked=ww1525FindRequestDraft_(ss,payload.requestId),d=linked.delivery,lines=linked.lines;
    if(d.status!=='DRAFT')throw new Error('Pemeriksaan hanya bisa disimpan untuk SJ DRAFT. Status: '+d.status);
    if(cleanText_(payload.sjId,100)!==d.sjId)throw new Error('SJ berubah. Muat ulang pemeriksaan.');
    const inputs=Array.isArray(payload.items)?payload.items:[];
    if(inputs.length!==lines.length||inputs.length>50)
      throw new Error('Semua baris bahan wajib diperiksa sebelum disimpan.');
    const byLine={},seen={},changes=[],result=[];
    inputs.forEach(function(x){
      const n=Number(x.lineNo);
      if(!Number.isInteger(n)||seen[n])throw new Error('Nomor baris pemeriksaan duplikat/tidak valid.');
      seen[n]=true;byLine[n]=x;
    });
    lines.forEach(function(l){
      const x=byLine[Number(l.lineNo)];
      if(!x||normalizeCode_(x.code)!==normalizeCode_(l.code))
        throw new Error('Baris '+l.lineNo+' tidak cocok dengan DRAFT SJ.');
      const raw=String(x.approvedQtyUnit==null?'':x.approvedQtyUnit).trim();
      if(!/^\d+(?:\.\d{1,6})?$/.test(raw))throw new Error('Isi qty disiapkan '+l.name+' (0 diperbolehkan).');
      const approved=roundQty_(Number(raw)),requested=Number(l.requestedQtyUnit||0);
      if(!Number.isFinite(approved)||approved<0||approved-requested>0.000001)
        throw new Error('Qty disiapkan '+l.name+' harus antara 0 dan '+requested+' '+l.sendUnit+'.');
      const status=approved<=0?'TIDAK TERSEDIA':Math.abs(approved-requested)<=0.000001?'DIPENUHI':'DIPENUHI SEBAGIAN';
      const reason=status==='DIPENUHI'?'':cleanText_(x.reason,300);
      if(status!=='DIPENUHI'&&reason.length<3)
        throw new Error('Alasan minimal 3 karakter untuk '+l.name+' yang kurang/kosong.');
      const base=roundQty_(approved*Number(l.factor||0));
      result.push({lineNo:l.lineNo,code:l.code,name:l.name,
        requestedQtyUnit:requested,approvedQtyUnit:approved,approvedQtyBase:base,
        sendUnit:l.sendUnit,status:status,reason:reason});
    });
    const sh=fulfillmentSheetV1261_(ss),last=sh.getLastRow();
    if(last>1) {
      const existing=sh.getRange(2,2,last-1,1).createTextFinder(idem).matchEntireCell(true).findNext();
      if(existing) {
        const checked=ww1525ReadReview_(ss,ww1525FindRequestDraft_(ss,linked.requestId));
        return {ok:true,idempotent:true,requestId:linked.requestId,sjId:d.sjId,
          checked:checked.checked,reviewId:idem,noSj:d.noSj};
      }
    }
    const now=new Date(),records=result.map(function(x){
      const eid='FCHK-'+sha256Hex_(idem+'|'+d.sjId+'|'+x.lineNo).slice(0,24);
      return [eid,idem,now,d.sjId,d.noSj,x.lineNo,x.code,x.requestedQtyUnit,
        x.approvedQtyUnit,x.approvedQtyBase,x.status,x.reason,user.id,user.name,user.role];
    });
    sh.getRange(sh.getLastRow()+1,1,records.length,WW.H.FULFILLMENT_ADJUSTMENTS.length).setValues(records);
    updateDeliveryFields_(ss,d.sjId,{updatedAt:now});
    const shortage=result.filter(function(x){return x.status!=='DIPENUHI';});
    auditLog_(ss,user,'DISTRIBUTION','REVIEW_OUTLET_REQUEST_AVAILABILITY',d.noSj,'SUCCESS',
      null,{requestId:linked.requestId,sjId:d.sjId,items:result,shortageCount:shortage.length},
      'Pemeriksaan fisik sebelum cetak, bukan pengiriman; qty 0 diperbolehkan.');
    return {ok:true,requestId:linked.requestId,sjId:d.sjId,noSj:d.noSj,
      status:'DRAFT',checked:true,reviewId:idem,reviewedBy:user.name,
      reviewedAt:serializeDateTime_(now),shortageCount:shortage.length,
      allUnavailable:result.every(function(x){return x.approvedQtyUnit===0;}),
      rows:result};
  });
}
function ww1525PickingAuditReadOnly(){
  const ss=warehouseSs_(),ful=ss.getSheetByName(WW.S.FULFILLMENT_ADJUSTMENTS),
        requests=ss.getSheetByName(WW.S.REQUEST_SYNC),sj=ss.getSheetByName(WW.S.DELIVERIES);
  const out={ok:!!(ful&&requests&&sj),readOnly:true,build:WW1525_PICK_BUILD,
    sheetFulfillment:!!ful,fulfillmentColumns:ful?ful.getLastColumn():0,
    requestMirrorPresent:!!requests,suratJalanPresent:!!sj,
    physicalPickingCanRecordZero:true,allZeroDispatchCoreGuard:true,
    financeLedgerChanged:false,stockLedgerChanged:false,workerChanged:false};
  Logger.log('WW1525_PICKING_AUDIT_READONLY '+JSON.stringify(out));return out;
}
