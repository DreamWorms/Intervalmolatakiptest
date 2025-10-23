// src/main.js — UI bağlama (null-güvenli)
import { S, setCounter, setLang, setIntervalText, sub, broadcast } from './state.js';
import { t } from './i18n.js';
import { openDocPiP } from './pip.js';
import { mountBreaks } from './breaks.js';
import { startDashboardTicker } from './dashboard.js';
import { mountSpecialIntervalUI } from './special-interval-ui.js';

const $ = (s, root=document) => root.querySelector(s);

// Elemanlar (bazıları HTML'de olmayabilir)
const labelLang    = $('#labelLang');
const langSelect   = $('#langSelect');
const openDocPipBtn= $('#openDocPipBtn');

const countVal     = $('#countVal');
const plusBtn      = $('#plusBtn');
const minusBtn     = $('#minusBtn');
const resetBtn     = $('#resetBtn');
const counterTitle = $('#counterTitle');
const kbHint       = $('#kbHint');
const topLevelHint = $('#topLevelHint');

const intervalTitle= $('#intervalTitle');
const intervalHelp = $('#intervalHelp');
const intervalInput= $('#intervalInput');   // KARTI KALDIRDIYSAN null olur
const statusLine   = $('#statusLine');

// İlk durum
if (langSelect) langSelect.value = S.lang;
if (countVal)   countVal.textContent = String(S.counter);
if (intervalInput) intervalInput.value = S.interval;

// Metinleri boyayan fonksiyon
function paintTexts(){
  if (labelLang)     labelLang.textContent = t(S.lang, 'labelLang');
  if (openDocPipBtn) openDocPipBtn.textContent = t(S.lang, 'docpip');

  if (counterTitle)  counterTitle.textContent = t(S.lang, 'counterTitle');
  if (resetBtn)      resetBtn.textContent = t(S.lang, 'reset');
  if (kbHint)        kbHint.textContent = t(S.lang, 'kbHint');

  if (intervalTitle) intervalTitle.textContent = t(S.lang, 'intervalTitle');
  if (intervalHelp)  intervalHelp.textContent = t(S.lang, 'intervalHelp');
  if (intervalInput) intervalInput.placeholder = t(S.lang, 'intervalPlaceholder');

  if (topLevelHint)  topLevelHint.textContent =
    (window.top !== window) ? t(S.lang, 'needTopLevel') : '';

  if (statusLine)    statusLine.textContent =
    S.interval ? '' : t(S.lang, 'intervalHidden');

  const bt = document.getElementById('breaksTitle');
  if (bt) bt.textContent = t(S.lang, 'breaksTitle');
  const cb = document.getElementById('clearBreaksBtn');
  if (cb) cb.textContent = t(S.lang, 'clearBreaks');
}
paintTexts();

// === Üst bar ikon etiketlerini boyayan fonksiyon
function paintIconbarLabels(){
  const set = (sel, key, fallback='')=>{
    const el = document.querySelector(sel);
    if (!el) return;
    el.textContent = key ? (t(S.lang, key) || fallback) : (fallback || '');
  };

  set('#tbThemeLbl',   'navTheme');
  set('#tbLangLbl',    'labelLang');
  set('#tbFriendsLbl', 'navFriends');
  set('#tbSettingsLbl', 'settings', 'Ayarlar');

  // Wellness çevirilmesin
  const wl = document.querySelector('#tbWellnessLbl');
  if (wl) wl.textContent = 'Wellness';

  // PiP kısa ve sabit
  set('#tbPipLbl', 'navPip');

  // buton title'ları da dil alsın
  const themeBtn   = document.querySelector('#btnTheme');
  const langBtn    = document.querySelector('#btnLang');
  const frBtn      = document.querySelector('#openFriends');
  const wlBtn      = document.querySelector('#openWellness');
  const pipBtn     = document.querySelector('#openDocPipBtn');
  const setBtn    = document.querySelector('#tbSettings');
  if (themeBtn) themeBtn.title = t(S.lang, 'navTheme');
  if (langBtn)  langBtn.title  = t(S.lang, 'labelLang');
  if (frBtn)    frBtn.title    = t(S.lang, 'navFriends');
  if (wlBtn)    wlBtn.title    = 'Wellness';
  if (pipBtn)   pipBtn.title   = 'PiP';
}
paintIconbarLabels();
sub('lang', paintIconbarLabels);


// Sayaç — PAD + kısayollar (sol tık +1 / sağ tık −1)
const counterPad   = document.getElementById('counterPad');
const shortcutBtns = document.querySelectorAll('.counter-actions [data-step]');

const bump = (delta) => {
  setCounter(S.counter + delta);
  broadcast('counter', S.counter);   // PiP vb. her yere yayılsın
};

if (counterPad) {
  // Sol tık +1, Sağ tık −1
  counterPad.addEventListener('pointerdown', (e) => {
    if (e.button === 2) bump(-1);
    else               bump(+1);
  });
  // Sağ tık menüsü çıkmasın
  counterPad.addEventListener('contextmenu', (e) => e.preventDefault());
}

// +2 / +4 / +8 kısa yolları
shortcutBtns.forEach(btn => {
  btn.addEventListener('click', () => bump(Number(btn.dataset.step)));
});

// Sıfırla
if (resetBtn) resetBtn.onclick = () => { setCounter(0); broadcast('counter', S.counter); };

// (artık plusBtn/minusBtn yok; ama sayfada kalırsa sorun olmasın diye)
if (plusBtn)  plusBtn.onclick  = () => bump(+1);
if (minusBtn) minusBtn.onclick = () => bump(-1);

// Klavye kısayolları
window.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.key === 'ArrowUp' || e.key === '+') { setCounter(S.counter + 1); broadcast('counter', S.counter); }
  if (e.key === 'ArrowDown' || e.key === '-') { setCounter(S.counter - 1); broadcast('counter', S.counter); }
  if (e.key.toLowerCase() === 'r') { setCounter(0); broadcast('counter', S.counter); }
});

// Dil
if (langSelect) langSelect.onchange = () => {
  setLang(langSelect.value);
  broadcast('lang', S.lang);
  paintTexts();
};
sub('lang', paintTexts);

// Interval (opsiyonel panel için)
if (intervalInput) {
  intervalInput.oninput = () => {
    const v = intervalInput.value.trim();
    setIntervalText(v);
    broadcast('interval', v);
    if (statusLine) statusLine.textContent = v ? '' : t(S.lang, 'intervalHidden');
  };
}

// Doc PiP
if (openDocPipBtn) openDocPipBtn.onclick = () => openDocPiP();

// Senkron
sub('counter', (val) => { if (countVal) countVal.textContent = String(val); });

sub('interval', (txt) => {
  if (intervalInput && intervalInput.value !== txt) intervalInput.value = txt || '';
  if (statusLine) statusLine.textContent = txt ? '' : t(S.lang, 'intervalHidden');
});


// --- Yeni: pill saat seçiciyi doldur & #siStart ile senkronla ---
function mountTimePill(){
  const hourSel = document.getElementById('siHour');
  const minSel  = document.getElementById('siMinute');
  const hidden  = document.getElementById('siStart');
  if (!hourSel || !minSel || !hidden) return;

  // drop-down'ları doldur
  if (!hourSel.options.length) {
    for (let h=0; h<24; h++) hourSel.add(new Option(String(h).padStart(2,'0')));
    for (let m=0; m<60; m++) minSel.add(new Option(String(m).padStart(2,'0')));
  }

  // başlangıç senkronu
  const [ih, im] = (hidden.value || '00:00').split(':');
  hourSel.value = ih || '00';
  minSel.value  = im || '00';
  const sync = () => hidden.value = `${hourSel.value}:${minSel.value}`;
  hourSel.onchange = minSel.onchange = sync;
  sync();
}

mountBreaks('#breakGrid');
mountSpecialIntervalUI();
mountTimePill();          
startDashboardTicker();

// ——— Foldable (katlanabilir) panel yardımcıları ———
function setupFoldable({ titleSel, storageKey }){
  const title = document.querySelector(titleSel);
  if (!title) return;

  // Kartın kökünü bul (karta en uygun sarmalayıcıyı dene)
  const root = title.closest('.card, .kzCard, .panel, .box, section') || title.closest('div');
  if (!root) return;
  root.setAttribute('data-fold','');

  // Kökün doğrudan çocukları arasında başlığı içeren elemanı "head" olarak işaretle
  const headChild = Array.from(root.children).find(ch => ch.contains(title)) || root.firstElementChild;
  headChild.setAttribute('data-fold-head','');

  // Diğer kardeşleri "body" olarak işaretle (kapanınca bunlar gizlenecek)
  Array.from(root.children).forEach(ch => {
    if (ch !== headChild) ch.setAttribute('data-fold-body','');
  });

  // Sağ üste katlama butonunu ekle
  let btn = headChild.querySelector('.fold-btn');
  if (!btn){
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fold-btn';
    btn.setAttribute('aria-label', 'Katla');
    btn.title = 'Katla / Aç';
    btn.innerHTML = '<span class="chev">▾</span>';
    headChild.appendChild(btn);
  }

  // Durumu yükle & uygula
  const KEY = 'kzs_fold_' + storageKey;
  let collapsed = localStorage.getItem(KEY) === '1';
  const apply = () => {
    if (collapsed) root.setAttribute('data-collapsed','1');
    else           root.removeAttribute('data-collapsed');
  };
  apply();

  // Tıklandığında değiştir & kaydet
  btn.addEventListener('click', () => {
    collapsed = !collapsed;
    localStorage.setItem(KEY, collapsed ? '1' : '0');
    apply();
  });
}

// ——— Hangi paneller katlansın? Başlık ID’leri ile bağla ———
// Bunlar sende zaten var: #counterTitle, #intervalTitle, #breaksTitle
setupFoldable({ titleSel:'#counterTitle',  storageKey:'counter'  });   // Sayaç
setupFoldable({ titleSel:'#intervalTitle', storageKey:'interval' });   // Mevcut Interval
setupFoldable({ titleSel:'#breaksTitle',   storageKey:'breaks'   });   // Breaks

// Özel İnterval başlığında bir id yoksa, HTML’de başlığa id ekle: id="siTitle"
// sonra şunu da aç:
setupFoldable({ titleSel:'#siTitle',       storageKey:'special'  });   // Özel İnterval

// ========== Wallpaper Tema Seçici ==========
(function () {
  const root = document.documentElement;
  const sel  = document.getElementById('themeSelect');
  if (!sel) return;

  // açılışta kaydedilmiş temayı yükle
  const saved = localStorage.getItem('theme') || '';
  if (saved) root.setAttribute('data-theme', saved);
  sel.value = saved;

  // değişince uygula + kaydet
  sel.addEventListener('change', (e) => {
    const v = e.target.value || '';
    if (v) root.setAttribute('data-theme', v);
    else root.removeAttribute('data-theme');
    localStorage.setItem('theme', v);
  });
})();
import './season-badges.js';

// === WELLNESS: geri sayım "00:00:00" olunca haftalık deftere otomatik yaz ===
(function autoWellnessLedgerHook() {
  const etaEl  = document.getElementById('nextBreakEta');
  const nameEl = document.getElementById('nextBreakName');
  if (!etaEl || !nameEl || typeof window.kzWB_log !== 'function') return;

  // Senin kurala göre eşleme: W1/W2 = 16 dk, W3 = 62 dk
  const MIN_BY_NAME = { 'Wellness 1': 16, 'Wellness 2': 16, 'Wellness 3': 62 };

  let lastKey = ''; // aynı molayı iki kez yazmamak için
  const parseEta = (txt) => {
    const m = (txt || '').match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : null;
  };

  const check = () => {
    const name = (nameEl.textContent || '').trim();
    const eta  = (etaEl.textContent || '').trim();
    const secs = parseEta(eta);

    if (!name || !name.toLowerCase().includes('wellness')) return;
    if (secs === 0) {
      const minutes = MIN_BY_NAME[name] ?? 16; // bilinmezse 16 kabul et
      const key = new Date().toDateString() + '|' + name;
      if (key !== lastKey) {                 // sadece bir kez yaz
        lastKey = key;
        window.kzWB_log(minutes);
      }
    }
  };

  // Hem DOM değişimini hem de güvenlik için her saniye kontrol et
  new MutationObserver(check).observe(etaEl, { childList: true, characterData: true, subtree: true });
  setInterval(check, 1000);
})();

import './pip-settings.js';

