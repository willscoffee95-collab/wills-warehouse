(() => {
  'use strict';

  const FEATURE = '2026-09-19.1.3.7.0-feature-tugas-gudang-office-attendance';
  const TOKEN_KEY = 'ww_github_token_v1';
  const bridge = window.WILLS_BRIDGE;
  const $ = (q, root=document) => root.querySelector(q);
  const $$ = (q, root=document) => [...root.querySelectorAll(q)];
  let shell = null;

  const TASK_ROLES = new Set(['OWNER','ADMIN','ADMIN_1','ADMIN_2','STAFF_GUDANG','STAFF_LOGISTIK','FINANCE']);
  const OFFICE_ROLES = new Set(['OWNER','ADMIN','ADMIN_1','FINANCE','HR']);

  function token(){ return localStorage.getItem(TOKEN_KEY) || ''; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function num(v){ return new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(v||0)); }
  function makeIdem(prefix){
    if (window.crypto && crypto.randomUUID) return prefix+':'+crypto.randomUUID();
    return prefix+':'+Date.now()+':'+Math.random().toString(36).slice(2);
  }
  async function call(method,...args){
    if(!bridge) throw new Error('Bridge Warehouse tidak tersedia.');
    const t=token(); if(!t) throw new Error('Sesi tidak tersedia. Silakan login kembali.');
    return bridge.call(method,t,...args);
  }
  function toast(msg,type='info'){
    const root=$('#toastRoot');
    if(!root){ alert(msg); return; }
    const el=document.createElement('div'); el.className='toast '+(type==='error'?'bad':type==='success'?'ok':''); el.textContent=String(msg||''); root.appendChild(el);
    let dismissed=false;
    const close=()=>{if(dismissed)return;dismissed=true;el.classList.remove('show');setTimeout(()=>el.remove(),200);};
    requestAnimationFrame(()=>el.classList.add('show'));
    if(window.wwAttachSwipeToastV1522)window.wwAttachSwipeToastV1522(el,close);
    setTimeout(close,3200);
  }
  function closeFeature(){ const root=$('#sheetRoot'); if(root) root.innerHTML=''; }
  function openFeature(title,html){
    const root=$('#sheetRoot'); if(!root) throw new Error('sheetRoot tidak ditemukan.');
    root.innerHTML=`<div class="sheet-backdrop" id="v1370Backdrop"><section class="sheet"><div class="sheet-head"><div><small>WILLS WAREHOUSE</small><h3>${esc(title)}</h3></div><button class="icon-btn" id="v1370Close" aria-label="Tutup">×</button></div><div class="sheet-body">${html}</div></section></div>`;
    $('#v1370Close').onclick=closeFeature;
    $('#v1370Backdrop').addEventListener('click',e=>{ if(e.target.id==='v1370Backdrop') closeFeature(); });
  }
  function busy(on,text='Memuat…'){
    const root=$('#busyRoot'),label=$('#busyText'); if(!root) return;
    if(label) label.textContent=text; root.classList.toggle('is-hidden',!on);
  }
  async function withBusy(text,fn){ busy(true,text); try{return await fn();} finally{busy(false);} }

  async function loadShell(){
    if(shell) return shell;
    try{ shell=await call('getAppSessionShellV1360'); }catch(_){ shell=null; }
    return shell;
  }
  function role(){ return String(shell&&shell.user&&shell.user.role||'').toUpperCase(); }

  function moduleCard(icon,title,desc,action){
    const svg=icon==='task'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h6M9 3h6v4H9z"/><path d="M7 5H5v16h14V5h-2M8 13l2 2 5-5"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    return `<button class="module-card v1370-card" data-v1370-action="${action}"><span class="module-icon">${svg}</span><span class="copy"><b>${esc(title)}</b><small>${esc(desc)}</small></span><span class="chev">›</span></button>`;
  }
  function injectHrRoleOption(){
    if(role()!=='OWNER') return;
    const sel=document.querySelector('#ghUser select[name="role"]');
    if(!sel || [...sel.options].some(o=>o.value==='HR')) return;
    const opt=document.createElement('option'); opt.value='HR'; opt.textContent='HR · Absensi Office'; sel.appendChild(opt);
  }

  async function injectCards(){
    injectHrRoleOption();
    const content=$('#content'); if(!content) return;
    const head=content.querySelector('.page-head h1,.page-head h2,.page-head h3');
    const text=(head?head.textContent:content.textContent||'').trim();
    if(!/Kontrol/i.test(text)) return;
    const grid=content.querySelector('.module-grid'); if(!grid || grid.dataset.v1370Injected==='1') return;
    await loadShell();
    const r=role(); let html='';
    if(TASK_ROLES.has(r)) html+=moduleCard('task','Tugas Gudang','Opening · Operasional · Closing','tasks');
    if(OFFICE_ROLES.has(r)) html+=moduleCard('clock','Absensi Office','Masuk Shift · Selesai Shift · jadwal otomatis','office');
    if(!html) return;
    grid.insertAdjacentHTML('afterbegin',html); grid.dataset.v1370Injected='1';
    $$('[data-v1370-action]',grid).forEach(btn=>btn.onclick=()=>btn.dataset.v1370Action==='tasks'?openTasks():openOffice());
  }

  function taskClass(st){ st=String(st||'').toUpperCase(); return st==='SELESAI'?'ok':st==='TERKENDALA'?'bad':st==='DIKERJAKAN'?'brand':st==='BELUM DIKERJAKAN'?'warn':''; }
  async function openTasks(){
    let r;
    try{await withBusy('Memuat tugas gudang…',async()=>{r=await call('getWarehouseTasksV1370');});}
    catch(e){openFeature('Tugas Gudang','<div class="notice warn"><b>Backend tugas belum aktif.</b><p>'+esc(e.message)+'</p></div>');return;}
    const tasks=r.tasks||[],groups=['OPENING','OPERASIONAL','CLOSING'],sum=r.summary||{},owner=role()==='OWNER';
    const blocks=groups.map(g=>{
      const rows=tasks.filter(x=>String(x.group||'').toUpperCase()===g&&String(x.status||'').toUpperCase()!=='TIDAK BERLAKU');
      const label=g==='OPENING'?'Opening':g==='OPERASIONAL'?'Operasional':'Closing';
      const entries=rows.map(x=>
        '<div class="ww-task-entry"><button class="ww-task-main" data-task-id="'+esc(x.taskId)+'" type="button" '+(x.editable===false?'disabled':'')+'>'+
        '<b>'+esc(x.name)+'</b><small>PIC '+esc(x.picRole||'')+(x.deadline?' · '+esc(x.deadline):'')+'</small>'+
        '<span class="badge '+taskClass(x.status)+'">'+esc(x.status||'BELUM DIKERJAKAN')+'</span></button>'+
        (owner?'<button class="ww-task-archive" data-ww-task-archive="'+esc(x.taskId)+'" type="button">Arsipkan</button>':'')+'</div>'
      ).join('');
      return '<details class="ww-task-group" '+(g==='OPERASIONAL'?'open':'')+'><summary><b>'+esc(label)+'</b><span>'+
        rows.filter(x=>String(x.status).toUpperCase()==='SELESAI').length+'/'+rows.length+' selesai</span></summary>'+
        '<div class="ww-task-list">'+(entries||'<div class="empty">Belum ada tugas aktif.</div>')+'</div></details>';
    }).join('');
    const archived=tasks.filter(x=>String(x.status||'').toUpperCase()==='TIDAK BERLAKU');
    const archivedHtml=owner?'<details class="ww-task-group ww-task-archived"><summary>Arsip tugas hari ini <span>'+num(archived.length)+' tugas</span></summary>'+
      '<div class="ww-task-list">'+(archived.map(x=>'<div class="ww-task-entry"><div class="ww-task-main"><b>'+esc(x.name)+'</b><small>'+esc(x.group)+' · '+esc(x.picRole)+'</small></div>'+
        '<button class="ww-task-archive" data-ww-task-restore="'+esc(x.taskId)+'" type="button">Aktifkan</button></div>').join('')||'<div class="empty">Belum ada tugas diarsipkan.</div>')+'</div></details>':'';
    openFeature('Tugas Gudang','<div class="ww-task-summary"><b>'+esc(r.dateLabel||'Hari ini')+'</b><span>'+
      num(sum.completed)+' selesai · '+num(sum.inProgress)+' dikerjakan · '+num(sum.pending)+' belum</span></div>'+
      (owner?'<div class="ww-task-admin-actions"><button id="wwTaskTemplateManage" class="btn btn-soft" type="button">Kelola Template & PIC</button><button id="wwTaskNew" class="btn btn-primary" type="button">+ Tugas Hari Ini</button></div>':'')+
      blocks+archivedHtml);
    $$('[data-task-id]').forEach(b=>b.onclick=()=>editTask(tasks.find(x=>String(x.taskId)===String(b.dataset.taskId))));
    if(owner){
      $('#wwTaskNew').onclick=openTaskCreatorV1522;
      $('#wwTaskTemplateManage').onclick=openTaskTemplatesV1522;
      $$('[data-ww-task-archive]').forEach(b=>b.onclick=()=>changeTaskArchiveV1522(tasks.find(x=>String(x.taskId)===b.dataset.wwTaskArchive),true));
      $$('[data-ww-task-restore]').forEach(b=>b.onclick=()=>changeTaskArchiveV1522(tasks.find(x=>String(x.taskId)===b.dataset.wwTaskRestore),false));
    }
  }
  async function changeTaskArchiveV1522(task,archive){
    if(!task||role()!=='OWNER')return;
    if(!window.confirm((archive?'Arsipkan':'Aktifkan kembali')+' tugas "'+task.name+'"? Histori tugas tetap tersimpan.'))return;
    try{
      await withBusy('Mengubah status tugas…',()=>call('updateWarehouseTaskV1370',{taskId:task.taskId,status:archive?'TIDAK BERLAKU':'BELUM DIKERJAKAN',note:task.note||''},makeIdem('TASKARCHIVE')));
      toast(archive?'Tugas diarsipkan.':'Tugas diaktifkan kembali.','success');await openTasks();
    }catch(e){toast(e.message,'error');}
  }
  function openTaskCreatorV1522(){
    if(role()!=='OWNER')return;
    const today=new Date(),date=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    openFeature('Buat Tugas Gudang','<div class="ww-task-help">Tugas baru dibuat untuk satu tanggal. Tugas yang diarsipkan tidak dihapus dari histori.</div>'+
      '<form id="wwTaskCreateForm" class="ww-task-create">'+
      '<label class="field"><span>Tanggal tugas</span><input type="date" name="date" required value="'+date+'"></label>'+
      '<label class="field"><span>Kelompok</span><select name="group"><option value="OPENING">Opening</option><option value="OPERASIONAL">Operasional</option><option value="CLOSING">Closing</option></select></label>'+
      '<label class="field"><span>Nama tugas</span><input name="name" maxlength="120" required placeholder="Contoh: Cek stok packing"></label>'+
      '<label class="field"><span>Penanggung jawab</span><select name="picRole"><option value="STAFF GUDANG">Staff Gudang</option><option value="FINANCE">Finance</option></select></label>'+
      '<label class="field"><span>Batas waktu (opsional)</span><input name="deadline" placeholder="Contoh: 10.00"></label>'+
      '<label class="field"><span>Catatan (opsional)</span><textarea name="note" maxlength="500"></textarea></label>'+
      '<div class="actions"><button class="btn btn-line" type="button" id="wwTaskCreateCancel">Kembali</button><button class="btn btn-primary" type="submit">Simpan Tugas</button></div></form>');
    $('#wwTaskCreateCancel').onclick=openTasks;
    $('#wwTaskCreateForm').onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(e.target),payload=Object.fromEntries(fd.entries());
      if(!payload.name||!payload.date)return toast('Tanggal dan nama tugas wajib diisi.','error');
      try{await withBusy('Membuat tugas…',()=>call('createWarehouseTaskV1522',payload,makeIdem('TASKCREATE')));toast('Tugas baru ditambahkan.','success');await openTasks();}
      catch(err){toast('Tugas belum dibuat: '+err.message+'. Pastikan add-on backend V1.5.2.2 terpasang.','error');}
    };
  }

  async function openTaskTemplatesV1522(){
    if(role()!=='OWNER')return;
    let data;
    try{await withBusy('Memuat master tugas…',async()=>{data=await call('listWarehouseTaskTemplatesV1522');});}
    catch(e){openFeature('Master Tugas Gudang','<div class="notice warn">Fitur master belum terpasang: '+esc(e.message)+'</div><button class="btn btn-line" id="wwTemplateBack">Kembali</button>');$('#wwTemplateBack').onclick=openTasks;return;}
    const templates=(data.templates||[]).slice().sort((a,b)=>{
      const ord=['OPENING','OPERASIONAL','CLOSING'];
      return ord.indexOf(a.group)-ord.indexOf(b.group)||Number(a.order||0)-Number(b.order||0);
    });
    const active=templates.filter(x=>x.active==='YA'),inactive=templates.filter(x=>x.active!=='YA');
    const rows=(list)=>list.map(x=>'<div class="ww-task-template-row"><div class="ww-task-template-copy"><b>'+esc(x.name)+'</b><small>'+esc(x.group)+' · PIC '+esc(x.picRole)+' · urutan '+num(x.order)+'</small></div>'+
      '<button type="button" data-ww-tpl-edit="'+esc(x.id)+'">Ubah</button><button type="button" data-ww-tpl-toggle="'+esc(x.id)+'">'+(x.active==='YA'?'Arsipkan':'Aktifkan')+'</button></div>').join('');
    openFeature('Master Tugas & Peran PIC',
      '<div class="ww-task-summary"><b>Template Tugas Gudang</b><span>'+num(active.length)+' aktif · '+num(inactive.length)+' diarsipkan</span><span>Arsip menyembunyikan template dari penjadwalan berikutnya; histori tugas lama tetap ada.</span></div>'+
      '<div class="ww-task-admin-actions"><button id="wwTaskTemplateBack" class="btn btn-line" type="button">Kembali</button><button id="wwTaskTemplateNew" class="btn btn-primary" type="button">+ Template Baru</button></div>'+
      '<div class="ww-task-templates">'+(rows(active)||'<div class="empty">Belum ada template aktif.</div>')+'</div>'+
      '<details class="ww-task-group"><summary>Template Arsip <span>'+num(inactive.length)+' template</span></summary><div class="ww-task-templates">'+(rows(inactive)||'<div class="empty">Belum ada template arsip.</div>')+'</div></details>');
    $('#wwTaskTemplateBack').onclick=openTasks;
    $('#wwTaskTemplateNew').onclick=()=>editTaskTemplateV1522(null);
    $('[data-ww-tpl-edit]').forEach(b=>b.onclick=()=>editTaskTemplateV1522(templates.find(x=>x.id===b.dataset.wwTplEdit)));
    $('[data-ww-tpl-toggle]').forEach(b=>b.onclick=async()=>{
      const t=templates.find(x=>x.id===b.dataset.wwTplToggle);if(!t)return;
      const action=t.active==='YA'?'ARCHIVE':'RESTORE';
      if(!window.confirm((action==='ARCHIVE'?'Arsipkan':'Aktifkan kembali')+' template "'+t.name+'"? Histori tugas harian tidak dihapus.'))return;
      try{await withBusy('Memperbarui master tugas…',()=>call('saveWarehouseTaskTemplateV1522',{id:t.id,action:action},makeIdem('TPLSTATUS')));toast('Template berhasil diperbarui.','success');openTaskTemplatesV1522();}
      catch(e){toast(e.message,'error');}
    });
  }
  function editTaskTemplateV1522(t){
    if(role()!=='OWNER')return;
    const creating=!t,idem=makeIdem('TPLSAVE');
    openFeature(creating?'Template Tugas Baru':'Ubah Template Tugas',
      '<div class="ww-task-help">PIC adalah penanggung jawab tugas, bukan definisi akses pengguna. Perubahan template tidak menghapus histori.</div>'+
      '<form id="wwTemplateForm" class="ww-task-create">'+
      '<label class="field"><span>Kelompok</span><select name="group">'+['OPENING','OPERASIONAL','CLOSING'].map(g=>'<option value="'+g+'" '+(t&&t.group===g?'selected':'')+'>'+g+'</option>').join('')+'</select></label>'+
      '<label class="field"><span>Nama tugas</span><input name="name" maxlength="150" required value="'+esc(t?t.name:'')+'"></label>'+
      '<label class="field"><span>PIC Role</span><select name="picRole"><option value="STAFF GUDANG" '+(t&&t.picRole==='STAFF GUDANG'?'selected':'')+'>Staff Gudang</option><option value="FINANCE" '+(t&&t.picRole==='FINANCE'?'selected':'')+'>Finance</option></select></label>'+
      '<div class="form-2"><label class="field"><span>Urutan</span><input type="number" name="order" min="0" max="99999" value="'+esc(t?t.order:100)+'"></label>'+
      '<label class="field"><span>Deadline</span><input name="deadline" maxlength="50" placeholder="Contoh: 17.00" value="'+esc(t?t.deadline:'')+'"></label></div>'+
      '<label class="field"><span>Wajib Closing</span><select name="requiredClosing"><option value="TIDAK" '+(!t||t.requiredClosing!=='YA'?'selected':'')+'>Tidak</option><option value="YA" '+(t&&t.requiredClosing==='YA'?'selected':'')+'>Ya</option></select></label>'+
      '<label class="field"><span>Catatan</span><textarea name="note" maxlength="500">'+esc(t?t.note:'')+'</textarea></label>'+
      '<div class="actions"><button id="wwTemplateCancel" class="btn btn-line" type="button">Kembali</button><button class="btn btn-primary" type="submit">Simpan Template</button></div></form>');
    $('#wwTemplateCancel').onclick=openTaskTemplatesV1522;
    $('#wwTemplateForm').onsubmit=async e=>{
      e.preventDefault();const form=e.target,submit=form.querySelector('button[type="submit"]');
      if(submit.disabled)return;
      const fd=new FormData(form),payload={...Object.fromEntries(fd.entries()),action:creating?'CREATE':'UPDATE'};
      if(!creating)payload.id=t.id;
      submit.disabled=true;
      try{await withBusy('Menyimpan template…',()=>call('saveWarehouseTaskTemplateV1522',payload,idem));toast('Template tersimpan.','success');await openTaskTemplatesV1522();}
      catch(err){toast(err.message,'error');submit.disabled=false;}
    };
  }

  function editTask(task){
    if(!task || task.editable===false) return toast('Tugas ini hanya dapat diubah oleh PIC yang sesuai.','error');
    const st=String(task.status||'BELUM DIKERJAKAN').toUpperCase();
    openFeature(task.name,`<div class="demo-box"><b>${esc(task.group)}</b><br>PIC ${esc(task.picRole||'-')}</div><form id="v1370TaskForm"><label class="field"><span>Status</span><select name="status"><option ${st==='BELUM DIKERJAKAN'?'selected':''}>BELUM DIKERJAKAN</option><option ${st==='DIKERJAKAN'?'selected':''}>DIKERJAKAN</option><option ${st==='SELESAI'?'selected':''}>SELESAI</option><option ${st==='TERKENDALA'?'selected':''}>TERKENDALA</option><option ${st==='TIDAK BERLAKU'?'selected':''}>TIDAK BERLAKU</option></select></label><label class="field"><span>Catatan</span><textarea name="note">${esc(task.note||'')}</textarea></label><div class="actions"><button class="btn btn-line" type="button" id="v1370TaskBack">Kembali</button><button class="btn btn-primary" type="submit">Simpan</button></div></form>`);
    $('#v1370TaskBack').onclick=openTasks;
    $('#v1370TaskForm').onsubmit=async e=>{
      e.preventDefault(); const fd=new FormData(e.target),status=String(fd.get('status')||''),note=String(fd.get('note')||'').trim();
      if(status==='TERKENDALA'&&note.length<3) return toast('Status TERKENDALA wajib diberi catatan.','error');
      try{ await withBusy('Menyimpan tugas…',()=>call('updateWarehouseTaskV1370',{taskId:task.taskId,status,note},makeIdem('WHTASK'))); toast('Tugas gudang diperbarui.','success'); await openTasks(); }
      catch(err){ toast(err.message,'error'); }
    };
  }

  function attBadge(st){st=String(st||'').toUpperCase();return st==='HADIR'||st==='KERJA'?'ok':st==='IZIN'||st==='SAKIT'?'warn':st==='ALPHA'?'bad':'';}
  async function openOffice(){
    let r;
    try{ await withBusy('Memuat absensi office…',async()=>{r=await call('getOfficeAttendanceV1370');}); }
    catch(e){ openFeature('Absensi Office',`<div class="notice warn"><b>Backend fitur belum aktif.</b><br>${esc(e.message)}</div>`); return; }
    if(!r||r.eligible===false){ openFeature('Absensi Office',`<div class="notice warn"><b>Akun belum terhubung ke staff Office.</b><br>${esc(r&&r.message||'Hubungi Owner.')}</div><div class="demo-box">Absensi bersifat self-service. Nama Tita/Rizqia tidak dipilih manual agar orang lain tidak bisa absen atas nama mereka.</div>`); return; }
    const s=r.schedule||{},a=r.attendance||{},ss=String(s.status||'OFF').toUpperCase(),canShift=['KERJA','BACKUP'].includes(ss),hasIn=!!a.checkIn,hasOut=!!a.checkOut;
    let action='';
    if(!canShift) action=`<div class="notice ok"><b>Hari ini ${esc(ss)}.</b><br>Tidak perlu Masuk Shift.</div>`;
    else if(!hasIn) action='<button class="btn btn-primary btn-xl" id="v1370CheckIn">Masuk Shift</button>';
    else if(!hasOut) action='<button class="btn btn-primary btn-xl" id="v1370CheckOut">Selesai Shift</button>';
    else action='<div class="notice ok"><b>Shift hari ini sudah selesai.</b></div>';
    const vari=[]; if(Number(a.lateMinutes||0)>0)vari.push('Telat '+num(a.lateMinutes)+' menit');if(Number(a.earlyMinutes||0)>0)vari.push('Pulang awal '+num(a.earlyMinutes)+' menit');if(Number(a.overtimeMinutes||0)>0)vari.push('Lembur '+num(a.overtimeMinutes)+' menit');
    openFeature('Absensi Office',`<div class="demo-box"><b>${esc(r.staff&&r.staff.name||'')}</b><br>${esc(r.staff&&r.staff.role||'')} · ${esc(r.staff&&r.staff.homeBase||'')}</div><div class="stats-mini"><div class="demo-box"><b>Jadwal</b><br>${esc(s.scheduleIn||'-')} – ${esc(s.scheduleOut||'-')}<br><span class="badge ${attBadge(ss)}">${esc(ss)}</span></div><div class="demo-box"><b>Penugasan</b><br>${esc(s.assignment||'REGULAR')}${s.backupOutletName?'<br>'+esc(s.backupOutletName):''}</div></div><div class="demo-box"><b>Aktual</b><br>Masuk ${esc(a.checkIn||'-')} · Pulang ${esc(a.checkOut||'-')}${vari.length?'<br>'+esc(vari.join(' · ')):''}</div><div class="actions">${action}</div>`);
    const i=$('#v1370CheckIn'),o=$('#v1370CheckOut'); if(i)i.onclick=()=>shift('CHECK_IN'); if(o)o.onclick=()=>shift('CHECK_OUT');
  }
  async function shift(action){
    try{ await withBusy(action==='CHECK_IN'?'Mencatat Masuk Shift…':'Mencatat Selesai Shift…',()=>call('officeAttendanceShiftV1370',{action},makeIdem('OFFICE'))); toast(action==='CHECK_IN'?'Masuk Shift tercatat.':'Selesai Shift tercatat.','success'); await openOffice(); }
    catch(e){ toast(e.message,'error'); }
  }

  const observer=new MutationObserver(()=>injectCards().catch(()=>{}));
  observer.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('load',()=>{loadShell().finally(()=>injectCards().catch(()=>{}));});
  console.info('[Wills Warehouse] feature v1.3.7.0 loaded',FEATURE);
})();
