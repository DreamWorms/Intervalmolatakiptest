// --- i18n yardımcıları (friends.js modül değil; DOM'dan dili alıyoruz)
const getLang = () => (document.getElementById('langSelect')?.value || 'tr');
const TT = (k) => {
  const L = getLang();
  const pack = window.I18N || {};
  return (pack[L] && pack[L][k]) || (pack.tr && pack.tr[k]) || k;
};
// ===== FRIENDS v4 — yalnızca textarea'dan HH:MM okur, süre alanı yok =====
(function () {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // UI
  const openBtn   = $('#openFriends');
  const grid      = $('#frGrid');
  const olapList  = $('#olapList');
  const frSelect  = $('#frSelect');
  const frName    = $('#frName');
  const frAdd     = $('#btnFrAdd');
  const frDel     = $('#btnFrDel');
  const frPipChk  = $('#frPip');

  const pip       = $('#frPipPanel');
  const pipTitle  = $('#frPipTitle');
  const pipBreaks = $('#frPipBreaks');
  const pipOlap   = $('#frPipOverlaps');
  const pipMin    = $('#frPipMin');
  const pipClose  = $('#frPipClose');

  // Slot şablonları (süre sabit; kullanıcı sadece başlangıç HH:MM yazar)
  const SLOT_DEFS = [
    ['Rest 1',15], ['Rest 2',15], ['Lunch',45], ['Wellness 1',16],
    ['Wellness 2',16], ['Wellness 3',62], ['Meeting',15], ['Meeting/Quiz',30],
    ['Meeting/Training',45], ['Meeting/Training 2',60],
    ['Özel 1',15], ['Özel 2',15], ['Özel 3',15], ['Özel 4',15], ['Özel 5',15],
  ];

  // Zaman yardımcıları
  const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const HHMM_ANY = /(?:^|\b)([01]\d|2[0-3]):[0-5]\d\b/; // metin içinde ilk eşleşme
  const toMin   = v => (HHMM.test(v||'') ? (v.split(':')[0]*60 + (+v.split(':')[1])) : NaN);
  const fromMin = m => { const t=((m%1440)+1440)%1440; const h=String(Math.floor(t/60)).padStart(2,'0'); const mm=String(t%60).padStart(2,'0'); return `${h}:${mm}`; };
  const endBy   = (start, dur) => fromMin(toMin(start) + Number(dur||0));

  const pickTime = (txt='') => {
    const m = String(txt).match(HHMM_ANY);
    return m ? m[0] : '';
  };

  // Kalıcı durum
  const LS = 'kzs_friends_v2';
  const st = { friends:[], selectedId:null, pipVisible:true, pipCollapsed:false };
  const save = () => localStorage.setItem(LS, JSON.stringify(st));
  const load = () => { try{ Object.assign(st, JSON.parse(localStorage.getItem(LS)||'{}')); }catch{} };

  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const cur = () => {
    let f = st.friends.find(x=>x.id===st.selectedId);
    if(!f && st.friends.length){ st.selectedId = st.friends[0].id; f = st.friends[0]; save(); }
    return f||null;
  };

  // Benim molalarım — ana gridten (Breaks) okunur
  let myBreaks = [];
  window.kzSetMyBreaks = (arr=[]) => {
    myBreaks = arr.map(x=>{
      const start = x.start;
      const end   = x.end || (x.min ? endBy(x.start, x.min) : '');
      return (start && end) ? { label:x.label||'-', start, end } : null;
    }).filter(Boolean);
    updateAll();
  };

  // Yedek: Breaks gridini tarayıp HH:MM + rozet süreyi okur
  function scrapeMyBreaks(){
    const tiles = $$('#breakGrid .break-tile');
    const out = [];
    tiles.forEach(t=>{
      const label = (t.querySelector('.tile-title')?.textContent || t.getAttribute('data-label') || '').trim() || 'Break';

      // süre: rozetten
      let min = 0;
      const pill = t.querySelector('.badge, .pill');
      if (pill) { const m = parseInt(pill.textContent,10); if (m>0) min = m; }

      // başlangıç: textarea/input içindeki ilk HH:MM
      let start = '';
      const any = t.querySelector('textarea, input');
      if (any) start = pickTime(any.value || any.textContent || '');

      if (HHMM.test(start) && min>0){
        out.push({ label, start, end:endBy(start,min) });
      }
    });
    myBreaks = out;
  }

  // Break grid değiştikçe canlı oku
  function hookBreakGrid(){
    const g = $('#breakGrid'); if(!g) return;
    const mo = new MutationObserver(()=>{ scrapeMyBreaks(); updateAll(); });
    mo.observe(g, { subtree:true, childList:true, attributes:true, characterData:true });

    g.addEventListener('input',  e => { if (e.target.matches('input, textarea, select')) { scrapeMyBreaks(); updateAll(); } }, true);
    g.addEventListener('change', e => { if (e.target.matches('input, textarea, select')) { scrapeMyBreaks(); updateAll(); } }, true);

    scrapeMyBreaks();
  }

  // Arkadaş slot gridini kur (yalnızca TEXTAREA vardır)
  function buildSlots(){
    if(!grid || grid.childElementCount) return;
    SLOT_DEFS.forEach(([label, def], i)=>{
      const id = `slot_${i}`;
      const el = document.createElement('div');
      el.className='frTile'; el.dataset.label = label;
      el.innerHTML = `
        <div class="tileHead"><div class="label">${label}</div></div>
        <div class="tileBody"><!-- artık input[type=time] yok --></div>
        <textarea id="${id}_note" class="note" placeholder="ör. 15:30 yaz"></textarea>
      `;
      grid.appendChild(el);

      const noteEl  = $(`#${id}_note`);
      const push = ()=>{
        const f = cur(); if(!f) return;
        let s = f.slots.find(x=>x.id===id);
        if(!s){ s = {id,label,start:'',min:def,end:'',note:''}; f.slots.push(s); }
        s.note  = noteEl.value || '';
        s.min   = def;
        s.start = pickTime(s.note);                 // HH:MM metinden çek
        s.end   = s.start ? endBy(s.start, s.min) : '';
        save(); updateAll();
      };
      on(noteEl,'input',push);
    });
  }

  // UI’yi seçili arkadaşa doldur
  function fillFromFriend(){
    const f = cur();
    renderFriendSelect();
    frName.value = f?.name || '';
    frPipChk.checked = !!st.pipVisible;

    SLOT_DEFS.forEach(([label,def], i)=>{
      const id = `slot_${i}`;
      const s = f?.slots?.find(x=>x.id===id) || null;
      const noteEl  = $(`#${id}_note`);
      if (noteEl) noteEl.value = s?.note || '';
    });

    updateAll();
  }

  function renderFriendSelect(){
    if (!frSelect) return;
    frSelect.innerHTML = st.friends.map(f=>`<option value="${f.id}">${f.name||'(adsız)'}</option>`).join('');
    if(st.selectedId) frSelect.value = st.selectedId;
  }

  // Kesişim hesap
  function overlap(a,b){
    const s = Math.max(toMin(a.start), toMin(b.start));
    const e = Math.min(toMin(a.end),   toMin(b.end));
    return (isFinite(s)&&isFinite(e)&&e>s) ? { start:fromMin(s), end:fromMin(e), min:e-s } : null;
  }

  function calcOverlaps(){
    const f = cur();
    if(!f){ olapList.innerHTML = TT('frNoFriend'); return []; }

    const slots = (f.slots||[])
      .filter(x=>x.start && (x.min||0)>0)
      .map(x=>({label:x.label,start:x.start,end:endBy(x.start,x.min)}));

    const out=[];
    slots.forEach(s=>{
      myBreaks.forEach(m=>{
        const o = overlap(m,s); if(o) out.push({ me:m.label, fr:s.label, start:o.start, end:o.end, min:o.min });
      });
    });
    out.sort((a,b)=> toMin(a.start)-toMin(b.start));

    if (olapList) {
      olapList.innerHTML = out.length
        ? out.map(r=>`<div>• <strong>${r.me}</strong> ↔ <em>${r.fr}</em>: ${r.start}–${r.end} (${r.min} dk)</div>`).join('')
        : TT('frOverlapsNone');
    }
    return out;
  }

  // Sol üst PiP panel
  function renderPip(overlaps){
    if (!pip) return; // DOM yoksa sessiz çık
    pip.setAttribute('aria-hidden', String(!st.pipVisible));
    pip.dataset.collapsed = st.pipCollapsed ? 'true' : 'false';

    const f = cur();
    if (pipTitle)  pipTitle.textContent = f ? `Arkadaş: ${f.name||'(adsız)'}` : 'Arkadaşlar';

    if(!f){
      if (pipBreaks) pipBreaks.textContent='–';
      if (pipOlap)   pipOlap.textContent='–';
      return;
    }

    const b = (f.slots||[]).filter(x=>x.start && (x.min||0)>0)
      .map(x=>`• ${x.label}: ${x.start} → ${endBy(x.start,x.min)} (${x.min} dk)`).join('<br>');
    if (pipBreaks) pipBreaks.innerHTML = b || '–';

    const list = overlaps || calcOverlaps();
    if (pipOlap) {
      pipOlap.innerHTML = list.length
        ? list.map(r=>`• ${r.me} ↔ ${r.fr}: ${r.start}–${r.end} (${r.min} dk)`).join('<br>')
        : '–';
    }
  }

  function updateAll(){
    scrapeMyBreaks();               // ana ekrandan oku
    const ol = calcOverlaps();      // kesişimler
    renderPip(ol);                  // paneli güncelle
  }

  // Arkadaş CRUD
  function addFriend(){
    const f = { id:uid(), name: (frName.value || TT('frNewFriend')).trim(), slots:[] };
    st.friends.push(f); st.selectedId=f.id; save(); renderFriendSelect(); fillFromFriend();
  }
  function delFriend(){
    const id = st.selectedId; if(!id) return;
    if(!confirm(TT('frConfirmDelete'))) return;
    st.friends = st.friends.filter(x=>x.id!==id);
    st.selectedId = st.friends[0]?.id || null; save(); renderFriendSelect(); fillFromFriend();
  }

  // Events
  on(frSelect,'change', ()=>{ st.selectedId = frSelect.value||null; save(); fillFromFriend(); });
  on(frName,'input', ()=>{ const f=cur(); if(!f)return; f.name = frName.value; save(); renderFriendSelect(); renderPip(); });
  on(frAdd,'click', addFriend);
  on(frDel,'click', delFriend);

  on(frPipChk,'change', ()=>{ st.pipVisible = frPipChk.checked; save(); renderPip(); });
  on(pipMin,'click', ()=>{ st.pipCollapsed = !st.pipCollapsed; save(); renderPip(); });
  on(pipClose,'click', ()=>{ st.pipVisible = false; if(frPipChk) frPipChk.checked = false; save(); renderPip(); });

  on(openBtn,'click', ()=>{ buildSlots(); fillFromFriend(); hookBreakGrid(); });

  // init
  load();
  if(st.friends.length===0){
    st.friends.push({ id:uid(), name: TT('frNewFriend'), slots:[] });
    st.selectedId = st.friends[0].id; save();
  }
  buildSlots(); renderFriendSelect(); fillFromFriend(); hookBreakGrid(); renderPip();
})();
