/**
 * Wills Warehouse v1.5.2.2 — ADDON TUGAS GUDANG (CREATE ONLY)
 *
 * Install as a separate file Code_Tasks_V1522.gs in the EXISTING Warehouse
 * Apps Script project, after checking the project's latest source/backup.
 * Does NOT change stock, money, SJ, worker or historical tasks.
 * Owner-only, immutable task ID derived from the idempotency key.
 *
 * Existing updateWarehouseTaskV1370 already archives (TIDAK BERLAKU) and
 * restores (BELUM DIKERJAKAN); this addon only adds the missing CREATE method.
 */
function createWarehouseTaskV1522(token, payload, idem) {
  return withWriteLock_(function () {
    const ss = warehouseSs_();
    const owner = requireRole_(ss, token, ['OWNER']);
    assertIdem_(idem);
    payload = payload || {};
    const date = String(payload.date || '').trim();
    const group = String(payload.group || '').trim().toUpperCase();
    const name = cleanText_(payload.name, 120);
    const picRole = String(payload.picRole || '').trim().toUpperCase();
    const deadline = cleanText_(payload.deadline, 50);
    const note = cleanText_(payload.note, 500);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !dateKeyV1370_(new Date(date + 'T12:00:00+07:00')) ||
        dateKeyV1370_(new Date(date + 'T12:00:00+07:00')) !== date) {
      throw new Error('Tanggal tugas tidak valid.');
    }
    if (['OPENING','OPERASIONAL','CLOSING'].indexOf(group) < 0) {
      throw new Error('Kelompok tugas tidak valid.');
    }
    if (!name || name.length < 3) {
      throw new Error('Nama tugas minimal 3 karakter.');
    }
    if (['FINANCE','STAFF GUDANG'].indexOf(picRole) < 0) {
      throw new Error('PIC tugas tidak valid.');
    }
    const sh = ss.getSheetByName(WW_V1370.TASK_SHEET);
    if (!sh) throw new Error('Tab Tugas Gudang tidak tersedia.');
    if (sh.getMaxColumns() < 19) {
      throw new Error('Struktur Tugas Gudang belum memiliki 19 kolom yang dibutuhkan.');
    }
    const taskId = 'WWT-1522-' + sha256Hex_(String(idem)).slice(0,16).toUpperCase();
    const existingRow = findRowByExact_(sh, 1, taskId);
    if (existingRow) {
      const width = Math.min(21, sh.getLastColumn());
      const row = sh.getRange(existingRow,1,1,width).getValues()[0];
      if (dateKeyV1370_(row[1]) !== date || String(row[6]||'') !== name ||
          String(row[5]||'') !== group || String(row[7]||'') !== picRole) {
        throw new Error('Idempotency key sudah pernah dipakai untuk data tugas berbeda.');
      }
      return {ok:true,idempotent:true,task:warehouseTaskRowV1370_(row,owner)};
    }
    const now = new Date();
    const width = Math.min(21, sh.getLastColumn());
    if (width < 19) throw new Error('Header Tugas Gudang belum lengkap.');
    const row = Array(width).fill('');
    row[0] = taskId;                             // ID
    row[1] = new Date(date + 'T12:00:00+07:00'); // Date, Jakarta
    row[2] = 'WH';                              // Warehouse code
    row[3] = getSetting_(ss, WW.SETTING.WAREHOUSE_NAME, 'Wills Warehouse');
    row[4] = 'MANUAL-V1522';                    // Template reference
    row[5] = group;                             // Group
    row[6] = name;                              // Task name
    row[7] = picRole;                           // PIC role
    row[10] = 'BELUM DIKERJAKAN';               // Status
    row[11] = deadline;                         // Deadline
    row[12] = 'TIDAK';                          // Required Closing
    row[16] = note;                             // Note
    row[18] = now;                              // Updated at
    sh.getRange(sh.getLastRow()+1,1,1,width).setValues([row]);
    SpreadsheetApp.flush();
    const after = warehouseTaskRowV1370_(row,owner);
    auditLog_(ss,owner,'TUGAS_GUDANG','CREATE_MANUAL',taskId,'SUCCESS',null,after,
      'Owner membuat tugas manual harian melalui PWA v1.5.2.2. Tidak mengubah stok/keuangan.');
    return {ok:true,task:after,taskId:taskId};
  });
}

/** Read-only validation of the addon and existing task dependencies. */
function ww1522TaskAdminAuditReadOnly() {
  const ss = warehouseSs_(),sh = ss.getSheetByName(WW_V1370.TASK_SHEET),master = ss.getSheetByName('Template Tugas Gudang');
  const out = {
    ok: !!(sh && sh.getLastColumn()>=19 && master && master.getLastColumn()>=11),
    readOnly:true,build:'2026-10-28.1.5.2.2-task-admin-candidate',
    spreadsheetId:ss.getId(),
    taskSheetPresent:!!sh,
    taskColumns:sh?sh.getLastColumn():0,
    templateSheetPresent:!!master,
    templateColumns:master?master.getLastColumn():0,
    templateCount:master?Math.max(0,master.getLastRow()-1):0,
    templateCrudReady:!!(master&&master.getLastColumn()>=11),
    ownerOnlyCreate:true,
    archiveViaExistingTaskStatus:true,
    taskRowCount:sh?Math.max(0,sh.getLastRow()-1):0,
    stockMoneySjWorkerChanged:false
  };
  Logger.log('WW1522_TASK_ADMIN_AUDIT_READONLY '+JSON.stringify(out));
  return out;
}


/**
 * OWNER-only master template catalog. This controls the existing
 * "Template Tugas Gudang" tab, NOT historical "Tugas Gudang" rows.
 * Inactivation is a soft archive (Aktif=TIDAK).
 */
function listWarehouseTaskTemplatesV1522(token) {
  const ss=warehouseSs_(),user=requireSessionReadOnlyFastV1360_(ss,token);
  if(user.role!=='OWNER')throw new Error('Hanya Owner yang dapat mengelola template tugas.');
  const sh=ss.getSheetByName('Template Tugas Gudang');
  if(!sh||sh.getLastColumn()<11)throw new Error('Master Template Tugas Gudang belum tersedia/lengkap.');
  const rows=sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,11).getValues();
  return {ok:true,readOnly:true,templates:rows.filter(r=>String(r[0]||'')).map(r=>({
    id:String(r[0]),group:String(r[1]),name:String(r[2]),deadline:String(r[3]||''),
    requiredClosing:String(r[4]||'TIDAK'),active:String(r[5]||'TIDAK'),
    order:Number(r[6]||0),picRole:String(r[7]||'STAFF GUDANG'),note:String(r[10]||'')
  }))};
}

/**
 * CREATE / UPDATE / ARCHIVE / RESTORE an existing task template.
 * No physical delete. Every write is Owner-only and auditable.
 * Existing daily task rows and warehouse ledgers are untouched.
 */
function saveWarehouseTaskTemplateV1522(token,payload,idem) {
  return withWriteLock_(function(){
    const ss=warehouseSs_(),owner=requireRole_(ss,token,['OWNER']);
    assertIdem_(idem);payload=payload||{};
    const action=String(payload.action||'').trim().toUpperCase();
    if(['CREATE','UPDATE','ARCHIVE','RESTORE'].indexOf(action)<0)throw new Error('Aksi template tidak valid.');
    const sh=ss.getSheetByName('Template Tugas Gudang');
    if(!sh||sh.getLastColumn()<11)throw new Error('Master Template Tugas Gudang belum tersedia/lengkap.');
    let rowNo=0,before=null,values=null;
    const now=new Date();
    if(action==='CREATE'){
      const id='WHTPL-1522-'+sha256Hex_(String(idem)).slice(0,14).toUpperCase();
      const found=findRowByExact_(sh,1,id);
      if(found)return{ok:true,id:id,idempotent:true};
      values=[id,'','','','TIDAK','YA',0,'STAFF GUDANG',now,now,''];
    }else{
      const id=cleanText_(payload.id,100);
      if(!id)throw new Error('Template ID wajib ada.');
      rowNo=findRowByExact_(sh,1,id);
      if(!rowNo)throw new Error('Template tidak ditemukan.');
      values=sh.getRange(rowNo,1,1,11).getValues()[0];
      before={id:String(values[0]),group:String(values[1]),name:String(values[2]),active:String(values[5]),picRole:String(values[7])};
    }
    if(action==='ARCHIVE'||action==='RESTORE'){
      values[5]=action==='RESTORE'?'YA':'TIDAK';
    }else{
      const group=String(payload.group||'').toUpperCase();
      const picRole=String(payload.picRole||'').toUpperCase();
      const name=cleanText_(payload.name,150);
      const deadline=cleanText_(payload.deadline,50);
      const note=cleanText_(payload.note,500);
      const order=Number(payload.order||0);
      const requiredClosing=String(payload.requiredClosing||'TIDAK').toUpperCase();
      if(['OPENING','OPERASIONAL','CLOSING'].indexOf(group)<0)throw new Error('Kelompok template tidak valid.');
      if(['STAFF GUDANG','FINANCE'].indexOf(picRole)<0)throw new Error('PIC Role template tidak valid.');
      if(name.length<3)throw new Error('Nama tugas minimal 3 karakter.');
      if(!Number.isSafeInteger(order)||order<0||order>99999)throw new Error('Urutan harus bilangan bulat 0–99999.');
      if(['YA','TIDAK'].indexOf(requiredClosing)<0)throw new Error('Wajib Closing tidak valid.');
      values[1]=group;values[2]=name;values[3]=deadline;values[4]=requiredClosing;
      values[6]=order;values[7]=picRole;values[10]=note;
    }
    values[9]=now;
    if(rowNo)sh.getRange(rowNo,1,1,11).setValues([values]);else sh.getRange(sh.getLastRow()+1,1,1,11).setValues([values]);
    SpreadsheetApp.flush();
    const after={id:String(values[0]),group:String(values[1]),name:String(values[2]),active:String(values[5]),picRole:String(values[7])};
    auditLog_(ss,owner,'TEMPLATE_TUGAS_GUDANG',action,after.id,'SUCCESS',before,after,
      'Master tugas, tanpa mengubah stok/SJ/ledger atau tugas historis.');
    return{ok:true,id:after.id,action:action,active:after.active};
  });
}
