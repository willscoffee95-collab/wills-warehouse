/**
 * Wills Warehouse V1.5.2.6 — canonical outlet-request lifecycle, picking receipt
 * and READ-ONLY SJ unit-price reporting. No finance, stock or delivery-ledger edits.
 * Requires the separately deployed V1.5.2.5 picking addon.
 * Bridge allowlist (additive):
 *  getWarehouseRequestLifecycleV1526
 *  getWarehousePickingPricesV1526
 *  markWarehousePickingPrintRequestedV1526
 */
var WW1526_REQUEST_BUILD='2026-10-29.1.5.2.6-request-lifecycle';

function ww1526RequestPrintEvents_(ss) {
  const sh=sheet_(ss,WW.S.AUDIT),last=sh.getLastRow(),result={};
  if(last<2)return result;
  // Only a bounded tail of immutable audit events, to keep page load light.
  const start=Math.max(2,last-1499),rows=sh.getRange(start,1,last-start+1,11).getValues();
  rows.forEach(function(row) {
    if(String(row[5]||'')!=='REQUEST_PICKING_PRINT_ISSUED')return;
    const sj=String(row[6]||'');
    let meta={};try{meta=JSON.parse(String(row[9]||'{}'))||{}}catch(e){}
    result[sj]={eventAt:serializeDateTime_(row[0]),user:String(row[2]||''),
      reviewId:String(meta.reviewId||''),
      format:String(row[10]||'').indexOf('THERMAL')>=0?'THERMAL':'A4'};
  });
  return result;
}
function ww1526Stage_(d,reviewed,printEvent) {
  if(!d)return{stage:'MENUNGGU SJ',group:'PREPARE'};
  const status=String(d.status||'').toUpperCase();
  if(status==='DRAFT')return {
    stage:printEvent&&reviewed?'STRUK DIMINTA CETAK':reviewed?'SUDAH DIPERIKSA':'MENUNGGU DISIAPKAN',
    group:'PREPARE'};
  const map={
    DIKIRIM:'DIKIRIM',DITERIMA_SEBAGIAN:'DITERIMA SEBAGIAN',DITERIMA:'DITERIMA OUTLET',
    SELISIH:'SELISIH PENERIMAAN',SELESAI:'SELESAI',DIBATALKAN:'DIBATALKAN'};
  return {stage:map[status]||status,group:status==='SELESAI'||status==='DIBATALKAN'?'HISTORY':'IN_TRANSIT'};
}
function getWarehouseRequestLifecycleV1526(token) {
  const ss=warehouseSs_(),user=requireSessionReadOnlyFastV1360_(ss,token);
  if(!roleHasPermission_(user.role,'DELIVERY_PREPARE')&&!roleHasPermission_(user.role,'DELIVERY_DISPATCH')&&user.role!=='OWNER')
    throw new Error('Akses status permintaan ditolak.');
  const reqs=outletRequestSyncList_(ss,0),deliveries=deliveryListRaw_(ss),
    byId={},byNo={},printEvents=ww1526RequestPrintEvents_(ss),rows=[];
  deliveries.forEach(function(d){byId[String(d.sjId||'')]=d;byNo[String(d.noSj||'')]=d;});
  reqs.forEach(function(req) {
    const linkedId=String(req.linkedSjId||''),linkedNo=String(req.linkedNoSj||''),
      d=byId[linkedId]||byNo[linkedNo]||null;
    let reviewed=false;
    if(d&&d.status==='DRAFT'){
      try{reviewed=ww1525ReadReview_(ss,ww1525FindRequestDraft_(ss,req.requestId)).checked}
      catch(e){reviewed=false;}
    }
    const recordedEvent=d?printEvents[d.noSj]||null:null,
      reviewInfo=d&&d.status==='DRAFT'?ww1525ReadReview_(ss,ww1525FindRequestDraft_(ss,req.requestId)):null,
      printEvent=recordedEvent&&reviewInfo&&reviewInfo.checked&&recordedEvent.reviewId===reviewInfo.reviewId?recordedEvent:null,
      terminalSource=['DIBATALKAN','SELESAI'].includes(String(req.sourceStatus||'').toUpperCase()),
      phase=d?ww1526Stage_(d,reviewed,printEvent):
        terminalSource?{stage:String(req.sourceStatus).toUpperCase(),group:'HISTORY'}:
        ww1526Stage_(d,false,null);
    rows.push({
      requestId:req.requestId,outletCode:req.outletCode,outletName:req.outletName,
      requestDate:req.requestDate,needDate:req.needDate,createdAt:req.createdAt,
      itemCount:req.itemCount,note:req.note,sourceStatus:req.sourceStatus,items:phase.group==='PREPARE'?req.items||[]:[],
      sjId:d?d.sjId:linkedId,noSj:d?d.noSj:linkedNo,
      sjStatus:d?d.status:'MISSING_SJ',warehouseStatus:phase.stage,group:phase.group,
      reviewed:reviewed,printRequested:!!printEvent,
      lastPrintedAt:printEvent&&printEvent.eventAt||'',
      receiptFirst:d&&d.receivedAt||'',completedAt:d&&d.completedAt||''
    });
  });
  const counts={PREPARE:0,IN_TRANSIT:0,HISTORY:0};
  rows.forEach(function(x){counts[x.group]++;});
  rows.sort(function(a,b){return String(b.requestDate||b.createdAt||'').localeCompare(String(a.requestDate||a.createdAt||''));});
  const active=rows.filter(function(x){return x.group!=='HISTORY';}),
    recent=rows.filter(function(x){return x.group==='HISTORY';}).slice(0,60);
  return {ok:true,readOnly:true,build:WW1526_REQUEST_BUILD,counts:counts,
    rows:active.concat(recent),totalRequests:rows.length,source:'CANONICAL_SURAT_JALAN'};
}
function getWarehousePickingPricesV1526(token,requestId) {
  const ss=warehouseSs_(),user=requireSessionReadOnlyFastV1360_(ss,token);
  if(!roleHasPermission_(user.role,'DELIVERY_PREPARE')&&!roleHasPermission_(user.role,'DELIVERY_DISPATCH')&&user.role!=='OWNER')
    throw new Error('Akses harga internal SJ ditolak.');
  const linked=ww1525FindRequestDraft_(ss,requestId),d=linked.delivery;
  if(d.status!=='DRAFT')throw new Error('Cetak pemeriksaan hanya untuk SJ DRAFT.');
  const today=centralPriceTodayV1282_(),res={},items=[],mm=materialMap_(ss),central=centralPriceStateV1282_(ss,today);
  linked.lines.forEach(function(l) {
    const m=mm[normalizeCode_(l.code)]||null,z=central[normalizeCode_(l.code)]||{},
      ov=z.overrides&&z.overrides[normalizeCode_(d.outletCode)],
      rule=(ov&&ov.action==='SET'&&Number(ov.price)>0)?ov:(z.defaultRule&&z.defaultRule.action==='SET'&&Number(z.defaultRule.price)>0?z.defaultRule:null);
    const priceSJ=Number(l.internalPrice||0),
      effective=rule?Number(rule.price||0):Number(m&&m.internalPrice||0),
      current=roundMoney_(effective);
    // Historical/created SJ snapshots are intentional. Never silently reprice a SJ.
    const price=roundMoney_(priceSJ),changed=current>0&&price>0&&Math.abs(price-current)>0.01;
    items.push({lineNo:l.lineNo,code:l.code,name:l.name,unit:l.sendUnit,
      unitPrice:price,effectiveMasterPrice:current,changed:changed,
      priceStatus:price>0?changed?'SNAPSHOT_BERBEDA_DARI_PUSAT':'SESUAI_SNAPSHOT':'HARGA_SJ_BELUM_TERISI',
      ruleId:rule?String(rule.ruleId||''):'',source:rule?rule.scope:'MASTER_BAHAN'});
  });
  return {ok:true,readOnly:true,requestId:linked.requestId,sjId:d.sjId,noSj:d.noSj,
    priceBasis:'HARGA_INTERNAL_SNAPSHOT_SJ',asOf:today,
    note:'Harga pada struk mengikuti snapshot SJ, bukan HPP atau saldo piutang. Perubahan harga supplier perlu diperbarui di Pusat Harga Bahan sebelum membuat SJ baru. SJ lama tidak diubah otomatis.',
    lines:items,hasMissing:items.some(function(x){return!(x.unitPrice>0);}),
    hasChanged:items.some(function(x){return x.changed;})};
}
function markWarehousePickingPrintRequestedV1526(token,payload,idem) {
  return withWriteLock_(function() {
    const ss=warehouseSs_(),user=requirePermission_(ss,token,'DELIVERY_PREPARE');
    assertNoPendingRecovery_(ss);assertIdem_(idem);
    payload=payload||{};
    const req=ww1525FindRequestDraft_(ss,payload.requestId),d=req.delivery;
    if(d.status!=='DRAFT'||String(payload.sjId||'')!==d.sjId)
      throw new Error('Surat Jalan sudah berubah; cetak ditolak.');
    const checked=ww1525ReadReview_(ss,req);
    if(!checked.checked||!checked.reviewId||checked.reviewId!==String(payload.reviewId||''))
      throw new Error('Versi hasil cek sudah berubah. Buka kembali rincian, simpan dan cetak ulang.');
    const fmt=String(payload.format||'').toUpperCase();
    if(fmt!=='THERMAL'&&fmt!=='A4')throw new Error('Format cetak tidak valid.');
    const existing=ww1526RequestPrintEvents_(ss)[d.noSj];
    // One acknowledged print request is enough to move the UI status; subsequent
    // reprints are allowed, without incorrectly resetting the SJ lifecycle.
    if(!existing||existing.reviewId!==checked.reviewId) {
      auditLog_(ss,user,'DISTRIBUTION','REQUEST_PICKING_PRINT_ISSUED',d.noSj,
        'SUCCESS',null,{requestId:req.requestId,sjId:d.sjId,format:fmt,reviewId:checked.reviewId},
        'PERINTAH_CETAK_'+fmt+'; BUKAN KONFIRMASI_CETAK_FISIK');
    }
    return {ok:true,requestId:req.requestId,sjId:d.sjId,noSj:d.noSj,
      printRequested:true,printConfirmed:false,stage:'STRUK DIMINTA CETAK'};
  });
}
function ww1526RequestStatusAuditReadOnly() {
  const ss=warehouseSs_(),requests=outletRequestSyncList_(ss,0),shipments=deliveryListRaw_(ss),byId={};
  shipments.forEach(function(d){byId[d.sjId]=d;});
  const stats={DRAFT:0,DIKIRIM:0,DITERIMA_SEBAGIAN:0,DITERIMA:0,SELISIH:0,SELESAI:0,DIBATALKAN:0,NOT_LINKED:0},
    stale=[];
  requests.forEach(function(r){const d=byId[r.linkedSjId];if(!d){stats.NOT_LINKED++;return;}
    stats[d.status]=(stats[d.status]||0)+1;
    if(['SELESAI','DIBATALKAN'].indexOf(d.status)>=0&&
       ['MENUNGGU DISIAPKAN','MENUNGGU DRAFT'].indexOf(String(r.warehouseStatus||''))>=0)
      stale.push({requestId:r.requestId,sj:d.noSj,mirror:r.warehouseStatus,canonical:d.status});
  });
  const result={ok:true,readOnly:true,build:WW1526_REQUEST_BUILD,requestCount:requests.length,
    canonicalStatuses:stats,staleMirrorCount:stale.length,examples:stale.slice(0,12),
    noLedgerWrites:true,pricingSnapshotPreserved:true,workerChanged:false};
  Logger.log('WW1526_REQUEST_LIFECYCLE_AUDIT_READONLY '+JSON.stringify(result));return result;
}
