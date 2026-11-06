/**
 * Wills Warehouse V1.5.2.12 — Verified preparation and dispatch workflow.
 *
 * Additive Apps Script file: Code_Preparation_V15212.gs.
 * Depends on Code_Request_Picking_V1525.gs, Core dispatchDelivery, and Warehouse helpers.
 *
 * DRAFT -> physical preparation (qty revisions only before first submit)
 *       -> Selesai Disiapkan (existing saveWarehouseRequestAvailabilityV1525, Admin locked)
 *       -> Cek Ulang (verifyWarehousePreparationV15212, immutable Audit Trail record)
 *       -> dispatchWarehouseVerifiedV15212 (existing core dispatchDelivery)
 *       -> DIKIRIM -> print canonical SJ.
 *
 * Only canonical dispatchDelivery changes stock. This addon never changes stock,
 * finance, an outlet's original request, or the 31-Oct locked inventory opening.
 *
 * RELEASE GATE: deploy with matching Bridge allowlist, REMOVE raw 'dispatchDelivery'
 * from Bridge, and verify CORE dispatch lock/idempotency in isolated staging.
 */
var WW15212_PREP_BUILD='2026-11-06.1.5.2.12-verified-preparation';
var WW15212_PREP_EVENT='REQUEST_PREPARATION_VERIFIED_V15212';

function ww15212FindVerified_(ss,d) {
  const sh=sheet_(ss,WW.S.AUDIT),last=sh.getLastRow();
  if(last<2)return null;
  // Fail closed if a previous verification is outside this bounded audit tail.
  const start=Math.max(2,last-5999),rows=sh.getRange(start,1,last-start+1,11).getValues();
  for(let i=rows.length-1;i>=0;i--){
    const r=rows[i];
    if(String(r[5]||'')!==WW15212_PREP_EVENT||String(r[6]||'')!==String(d.noSj))continue;
    let meta={};
    try{meta=JSON.parse(String(r[9]||'{}'))||{};}catch(e){continue;}
    if(String(meta.sjId||'')!==String(d.sjId))continue;
    return {requestId:String(meta.requestId||''),reviewId:String(meta.reviewId||''),
      verifiedBy:String(r[2]||''),verifiedAt:serializeDateTime_(r[0])};
  }
  return null;
}
function ww15212PreparationState_(ss,linked) {
  const d=linked.delivery,review=ww1525ReadReview_(ss,linked);
  const verified=ww15212FindVerified_(ss,d);
  const clean=review.checked&&!!review.reviewId;
  const accepted=clean&&!!verified&&verified.reviewId===review.reviewId&&
    verified.requestId===linked.requestId;
  const phase=String(d.status||'').toUpperCase()!=='DRAFT'?String(d.status||'').toUpperCase():
    accepted?'SIAP_KIRIM':clean?'SIAP_CEK_ULANG':'MENUNGGU_DISIAPKAN';
  return {phase:phase,checked:clean,reviewId:clean?review.reviewId:'',
    verified:accepted,verificationId:accepted?verified.reviewId:'',
    verifiedBy:accepted?verified.verifiedBy:'',verifiedAt:accepted?verified.verifiedAt:'',
    requestedLines:linked.lines.length};
}
function getWarehousePreparationV15212(token,requestId){
  const ss=warehouseSs_(),user=requireSessionReadOnlyFastV1360_(ss,token);
  if(!roleHasPermission_(user.role,'DELIVERY_PREPARE')&&
     !roleHasPermission_(user.role,'DELIVERY_DISPATCH')&&
     String(user.role||'').toUpperCase()!=='OWNER')
    throw new Error('Akses status persiapan ditolak.');
  const linked=ww1525FindRequestDraft_(ss,requestId),view=ww15212PreparationState_(ss,linked);
  return Object.assign({ok:true,readOnly:true,build:WW15212_PREP_BUILD,
    requestId:linked.requestId,sjId:linked.delivery.sjId,noSj:linked.delivery.noSj,
    status:linked.delivery.status,lockedForStaff:ww1527HasPickingAdjustment_(ss,linked.delivery.sjId),
    lines:linked.lines.map(function(l){return{
      lineNo:Number(l.lineNo),code:l.code,name:l.name,
      requestedQtyUnit:Number(l.requestedQtyUnit||0),approvedQtyUnit:Number(l.qtyUnit||0),
      unit:l.sendUnit,reason:l.fulfillmentReason||''
    };})},view);
}
function verifyWarehousePreparationV15212(token,payload,idem){
  return withWriteLock_(function(){
    const ss=warehouseSs_(),user=requirePermission_(ss,token,'DELIVERY_PREPARE');
    assertNoPendingRecovery_(ss);assertIdem_(idem);
    payload=payload||{};
    const linked=ww1525FindRequestDraft_(ss,payload.requestId),d=linked.delivery;
    if(d.status!=='DRAFT'||String(payload.sjId||'')!==String(d.sjId))
      throw new Error('Surat Jalan berubah. Muat ulang sebelum Cek Ulang.');
    const current=ww15212PreparationState_(ss,linked);
    if(!current.checked||!current.reviewId||
       String(payload.reviewId||'')!==current.reviewId)
      throw new Error('Persiapan belum tersimpan atau sudah direvisi. Buka kembali pemeriksaan.');
    // This is a true second check: the final quantities/reasons must match a fresh server read.
    const picks=Array.isArray(payload.items)?payload.items:[];
    if(!picks.length||picks.length!==linked.lines.length)
      throw new Error('Periksa ulang setiap bahan, termasuk barang kosong.');
    const seen={},byLine={};
    picks.forEach(function(x){
      const n=Number(x.lineNo);
      if(!Number.isInteger(n)||seen[n])throw new Error('Baris Cek Ulang ganda/tidak valid.');
      seen[n]=true;byLine[n]=x;
    });
    let positive=0;
    linked.lines.forEach(function(line){
      const x=byLine[Number(line.lineNo)];
      if(!x||normalizeCode_(x.code)!==normalizeCode_(line.code))
        throw new Error('Identitas bahan Cek Ulang tidak sesuai.');
      const raw=String(x.approvedQtyUnit==null?'':x.approvedQtyUnit).trim();
      if(!/^\d+(?:\.\d{1,6})?$/.test(raw)||
         Math.abs(Number(raw)-Number(line.qtyUnit||0))>0.000001||
         String(x.reason||'').trim()!==String(line.fulfillmentReason||'').trim())
        throw new Error('Jumlah/alasan Cek Ulang tidak sesuai untuk '+line.name+'.');
      positive+=Number(line.qtyUnit||0)>0?1:0;
    });
    if(!positive)throw new Error('Seluruh bahan kosong. Kirim SJ ditahan sampai ada bahan.');
    if(current.verified)return {ok:true,idempotent:true,verified:true,
      requestId:linked.requestId,sjId:d.sjId,reviewId:current.reviewId,phase:'SIAP_KIRIM'};
    auditLog_(ss,user,'DISTRIBUTION',WW15212_PREP_EVENT,d.noSj,
      'SUCCESS',null,{requestId:linked.requestId,sjId:d.sjId,reviewId:current.reviewId,idem:idem},
      'Cek ulang fisik selesai. Bukan dispatch dan bukan mutasi stok.');
    const latest=ww15212PreparationState_(ss,linked);
    if(!latest.verified)throw new Error('Verifikasi belum terbaca dari audit. Jangan Kirim.');
    return {ok:true,verified:true,requestId:linked.requestId,sjId:d.sjId,
      reviewId:current.reviewId,phase:'SIAP_KIRIM'};
  });
}
function dispatchWarehouseVerifiedV15212(token,payload,idem){
  payload=payload||{};
  const ss=warehouseSs_(),user=requirePermission_(ss,token,'DELIVERY_DISPATCH');
  assertNoPendingRecovery_(ss);assertIdem_(idem);
  const linked=ww1525FindRequestDraft_(ss,payload.requestId),d=linked.delivery;
  if(d.status!=='DRAFT'||String(payload.sjId||'')!==String(d.sjId))
    throw new Error('Surat Jalan bukan DRAFT. Gunakan Cek Status; jangan Kirim ulang.');
  const fresh=ww15212PreparationState_(ss,linked);
  if(!fresh.verified||!fresh.checked||fresh.reviewId!==String(payload.reviewId||''))
    throw new Error('Cek Ulang belum terverifikasi di server / hasil cek telah berubah. Kirim ditahan.');
  if(!linked.lines.some(function(l){return Number(l.qtyUnit||0)>0;}))
    throw new Error('Tidak ada bahan disiapkan. Kirim ditahan.');
  // Core dispatchDelivery owns its own write lock, idempotency and stock ledger.
  // Do not acquire withWriteLock_ here; that would create a nested lock.
  // Release gate: verify there is no Owner revision between this check and core lock.
  return dispatchDelivery(token,{sjId:d.sjId},idem);
}
function ww15212PreparationAuditReadOnly(){
  const ss=warehouseSs_();
  const out={ok:true,readOnly:true,build:WW15212_PREP_BUILD,
    addonPresent:typeof getWarehousePreparationV15212==='function'&&
      typeof verifyWarehousePreparationV15212==='function'&&
      typeof dispatchWarehouseVerifiedV15212==='function',
    stockLedgerModified:false,financeLedgerModified:false,dispatchTriggered:false};
  Logger.log('WW15212_PREPARATION_AUDIT_READONLY '+JSON.stringify(out));
  return out;
}
