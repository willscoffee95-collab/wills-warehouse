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
    requestAnimationFrame(()=>el.classList.add('show')); setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},3200);
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
    try{ await withBusy('Memuat tugas gudang…',async()=>{r=await call('getWarehouseTasksV1370');}); }
    catch(e){ openFeature('Tugas Gudang',`<div class="notice warn"><b>Backend fitur belum aktif.</b><br>${esc(e.message)}</div>`); return; }
    const tasks=r.tasks||[], groups=['OPENING','OPERASIONAL','CLOSING'],sum=r.summary||{};
    const blocks=groups.map(g=>{
      const rows=tasks.filter(x=>String(x.group||'').toUpperCase()===g);
      const label=g==='OPENING'?'Opening':g==='OPERASIONAL'?'Operasional':'Closing';
      return `<section class="section"><div class="section-head"><h3>${label}</h3><span>${rows.filter(x=>String(x.status).toUpperCase()==='SELESAI').length}/${rows.length} selesai</span></div><div class="direct-list">${rows.map(x=>`<button class="direct-card direct-click" data-task-id="${esc(x.taskId)}" ${x.editable===false?'disabled':''}><b>${esc(x.name)}</b><small>${esc(x.picRole||'')}${x.deadline?' · '+esc(x.deadline):''}</small><span class="badge ${taskClass(x.status)}">${esc(x.status||'BELUM DIKERJAKAN')}</span></button>`).join('')||'<div class="empty">Tidak ada tugas.</div>'}</div></section>`;
    }).join('');
    openFeature('Tugas Gudang',`<div class="demo-box"><b>${esc(r.dateLabel||'Hari ini')}</b><br>Selesai ${num(sum.completed)} dari ${num(sum.total||tasks.length)} · Dikerjakan ${num(sum.inProgress)} · Terkendala ${num(sum.blocked)} · Belum ${num(sum.pending)}</div>${blocks}`);
    $$('[data-task-id]').forEach(b=>b.onclick=()=>editTask(tasks.find(x=>String(x.taskId)===String(b.dataset.taskId))));
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
