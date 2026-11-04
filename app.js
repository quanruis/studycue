
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CFG = Object.assign({ geminiKey: '', model: 'gemini-2.5-flash', fallbackModel: 'gemini-flash-latest' }, window.STUDYCUE_CONFIG || {});

/* ---------- storage ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('sc_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('sc_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};

/* ---------- stage scaling ---------- */
const stage = $('#stage');
function fit() {
  const s = Math.min(innerWidth / 1366, innerHeight / 768);
  stage.style.transform = `translate(${-683 * s}px,${-384 * s}px) scale(${s})`;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || innerWidth < 900;
  $('#gateLaptop').hidden = !mobile;
}
addEventListener('resize', fit); fit();

/* ---------- toast + modal ---------- */
let toastT;
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms);
}
let closeModalFn = null;
function openModal(html, mount) {
  closeModal();
  const layer = $('#modalLayer'), m = $('#modal');
  m.innerHTML = html; layer.hidden = false;
  const close = () => { layer.hidden = true; m.innerHTML = ''; closeModalFn = null; };
  closeModalFn = close;
  layer.onmousedown = e => { if (e.target === layer) close(); };
  $$('[data-close]', m).forEach(b => b.addEventListener('click', close));
  mount && mount(m, close);
  const f = $('input,select,textarea', m); f && setTimeout(() => f.focus(), 50);
  return close;
}
function closeModal() { closeModalFn && closeModalFn(); }

function beep() {
  try {
    const ac = beep.ac || (beep.ac = new (window.AudioContext || window.webkitAudioContext)());
    [660, 880, 1100].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, ac.currentTime + i * .16); g.gain.linearRampToValueAtTime(.18, ac.currentTime + i * .16 + .02);
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + i * .16 + .2);
      o.connect(g).connect(ac.destination); o.start(ac.currentTime + i * .16); o.stop(ac.currentTime + i * .16 + .22);
    });
  } catch (e) { }
}

/* ---------- status bar icons ---------- */
const SB = `<svg width="22" height="14" viewBox="0 0 22 14"><rect x="1" y="2" width="17" height="10" rx="2.5" fill="#1a6fb8"/><rect x="19" y="5" width="2.4" height="4" rx="1" fill="#1a6fb8"/></svg>
<svg width="18" height="16" viewBox="0 0 18 16"><rect x="1" y="9" width="3" height="6" rx="1" fill="#1a6fb8"/><rect x="6" y="6" width="3" height="9" rx="1" fill="#1a6fb8"/><rect x="11" y="2" width="3" height="13" rx="1" fill="#1a6fb8"/></svg>
<svg width="24" height="17" viewBox="0 0 24 17" fill="none" stroke="#1a6fb8" stroke-width="2.6" stroke-linecap="round"><path d="M2 6.5a14 14 0 0120 0"/><path d="M5.5 10a9 9 0 0113 0"/><path d="M9 13.4a4 4 0 016 0"/></svg>`;
$$('.sbicons').forEach(e => { e.innerHTML = SB; if (e.parentElement.classList.contains('small')) e.style.zoom = .55; });

/* ================= NAVIGATION ================= */
const pages = ['clock', 'notes', 'settings', 'calc', 'features', 'calendar', 'ai'];
let curApp = '', navStack = [];
const screenEl = $('#screen');
function openApp(name, fromApp) {
  if (!pages.includes(name)) return;
  if (fromApp && curApp && curApp !== name) navStack.push(curApp);
  else if (!fromApp && !curApp) navStack = [];
  curApp = name;
  pages.forEach(p => { const el = $('#page-' + p); el.hidden = p !== name; el.classList.remove('in'); });
  const pg = $('#page-' + name); void pg.offsetWidth; pg.classList.add('in');
  screenEl.classList.add('app-mode'); stage.dataset.app = name;
  if (name === 'clock') renderPomo();
  if (name === 'calendar') renderCal();
  if (name === 'notes') { showNbList(); }
  if (name === 'features') { $('#statsCard').hidden = true; }
  if (name === 'ai') setTimeout(() => $('#aiInput').focus({ preventScroll: true }), 700);
  if (name === 'calc') updateCalc();
}
function closeApp() {
  curApp = ''; navStack = [];
  screenEl.classList.remove('app-mode'); stage.dataset.app = '';
  if (document.activeElement) document.activeElement.blur();
}
function goBack() {
  if (closeModalFn) return closeModal();
  if (curApp === 'notes' && !$('#notebookView').hidden) return showNbList();
  if (navStack.length) { const p = navStack.pop(); const keep = navStack.slice(); openApp(p); navStack = keep; return; }
  if (curApp) closeApp();
}
$$('#homeGrid .app').forEach(b => b.addEventListener('click', () => openApp(b.dataset.app)));
$$('[data-app].srow').forEach(b => b.addEventListener('click', () => openApp(b.dataset.app, true)));
$('#appBack').addEventListener('click', goBack);
$('#phoneBack').addEventListener('click', goBack);
$('#phoneHome').addEventListener('click', () => curApp ? closeApp() : toast('You are already on the home screen'));
$('#phoneButterfly').addEventListener('click', () => curApp ? closeApp() : (() => { const i = $('#phoneImg'); i.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], 350); })());
$('#logoPill').addEventListener('click', e => { e.preventDefault(); curApp ? closeApp() : toast('StudyCue 1.1'); });
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (closeModalFn) closeModal(); else goBack(); }
});

/* ================= CLOCK + POMODORO ================= */
const P = {
  cfg: store.get('pomo', { pomodoro: { m: 45, s: 0 }, short: { m: 5, s: 0 }, long: { m: 15, s: 0 }, sessions: 4 }),
  mode: 'pomodoro', state: 'idle', rem: 0, endAt: 0, done: 0
};
const durMs = (m = P.mode) => (P.cfg[m].m * 60 + P.cfg[m].s) * 1000;
P.rem = durMs();
const fmtHM = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
function updateClock() {
  const d = new Date();
  $('#curTime').innerHTML = `${pad(d.getHours())}<i>:</i>${pad(d.getMinutes())}`;
}
const PLAY = 'M6 3.5v13l11-6.5z', PAUSE = 'M5 3.5h3.6v13H5zM11.4 3.5H15v13h-3.6z';
function renderPomo() {
  const m = P.mode, c = P.cfg[m], tot = Math.ceil(P.rem / 1000);
  $('#pdMin').textContent = pad(Math.floor(tot / 60)); $('#pdSec').textContent = pad(tot % 60);
  const isP = m === 'pomodoro';
  $('#page-clock').classList.toggle('isbreak', !isP);
  $('#pCount').textContent = `${P.done}/${P.cfg.sessions}`;
  const len = c.s ? `${c.m}m ${c.s}s` : `${c.m} min`;
  $('#pTotal').textContent = isP ? `${len} total` : `${len} ${m === 'short' ? 'short ' : 'long '}break`;
  const dur = durMs(); $('#pFill').style.width = (P.state === 'idle' ? 0 : Math.min(100, (1 - P.rem / dur) * 100)) + '%';
  const pos = { pomodoro: [3, 92], short: [106, 84], long: [198, 84] }[m];
  $('#pSegThumb').style.left = pos[0] + 'px'; $('#pSegThumb').style.width = pos[1] + 'px';
  $$('#pSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  $('#pStop').classList.toggle('grey', P.state === 'idle');
  $('#pPlay').classList.toggle('grey', P.state !== 'idle');
  $('#pPlayIcon').innerHTML = `<path d="${P.state === 'paused' ? PAUSE : PLAY}"/>`;
  $('#pPlay').setAttribute('aria-label', P.state === 'running' ? 'Pause' : 'Start');
  $('#pPlay').title = { idle: 'Start', running: 'Session in progress (press to pause)', paused: 'Paused (press to resume)' }[P.state];
  // keychain
  $('#kcTime').textContent = `${pad(Math.floor(tot / 60))}:${pad(tot % 60)}`;
  const at = new Date(P.state === 'running' ? P.endAt : Date.now() + P.rem);
  $('#kcLbl').textContent = isP ? 'next break' : 'break ends';
  $('#kcNext').textContent = fmtHM(at);
}
function pomoStart() {
  if (P.state === 'running') return;
  if (P.mode === 'pomodoro' && P.done >= P.cfg.sessions) P.done = 0;
  if (P.rem <= 0) P.rem = durMs();
  P.endAt = Date.now() + P.rem; P.state = 'running'; renderPomo();
}
function pomoPause() { P.rem = Math.max(0, P.endAt - Date.now()); P.state = 'paused'; renderPomo(); }
function pomoStop() { P.state = 'idle'; P.rem = durMs(); renderPomo(); }
function pomoReset() {
  P.state = 'idle'; P.rem = durMs(); P.done = 0; renderPomo();
  const b = $('#pReset'); b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin'); toast('Session reset');
}
function setMode(m) { P.mode = m; P.state = 'idle'; P.rem = durMs(); renderPomo(); }
function pomoFinish() {
  beep();
  const was = P.mode;
  if (was === 'pomodoro') {
    P.done++; bumpStat('pomos'); P.state = 'idle'; P.rem = durMs('pomodoro'); renderPomo();
    showNotif(P.done >= P.cfg.sessions ? 'long' : 'short');
  } else {
    if (was === 'long') P.done = 0;
    P.mode = 'pomodoro'; P.state = 'idle'; P.rem = durMs(); renderPomo(); toast('Break is over. Ready for the next session!');
  }
}
setInterval(() => {
  if (P.state === 'running') {
    P.rem = Math.max(0, P.endAt - Date.now());
    if (P.rem <= 0) pomoFinish(); else renderPomo();
  }
}, 200);
$('#pPlay').addEventListener('click', () => P.state === 'running' ? pomoPause() : pomoStart());
$('#pStop').addEventListener('click', pomoStop);
$('#pReset').addEventListener('click', pomoReset);
$$('#pSeg button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
$('#pEdit').addEventListener('click', () => {
  const m = P.mode, c = P.cfg[m], name = { pomodoro: 'pomodoro', short: 'short break', long: 'long break' }[m];
  const opts = (a, b, v) => Array.from({ length: b - a + 1 }, (_, i) => `<option ${a + i === v ? 'selected' : ''}>${a + i}</option>`).join('');
  openModal(`<h3>edit ${name}</h3>
    <div class="row"><div><label for="eMin">minutes (1–60)</label><select id="eMin">${opts(1, 60, c.m)}</select></div>
    <div><label for="eSec">seconds (0–59)</label><select id="eSec">${opts(0, 59, c.s)}</select></div></div>
    ${m === 'pomodoro' ? `<label for="eSess">sessions before a long break</label><select id="eSess">${opts(1, 8, P.cfg.sessions)}</select>` : ''}
    <p>Saving restarts the timer with your new length and keeps it for next time.</p>
    <div class="acts"><button class="btn" data-close>cancel</button><button class="btn main" id="eSave">save</button></div>`,
    (mod, close) => $('#eSave', mod).addEventListener('click', () => {
      let mm = +$('#eMin', mod).value, ss = +$('#eSec', mod).value;
      P.cfg[m] = { m: mm, s: ss };
      if (m === 'pomodoro') P.cfg.sessions = +$('#eSess', mod).value;
      store.set('pomo', P.cfg); P.state = 'idle'; P.rem = durMs(); renderPomo(); close(); toast('Saved your ' + name + ' time');
    }));
});

/* ---------- break notification ---------- */
let notifKind = 'short';
function showNotif(kind) {
  notifKind = kind;
  const c = P.cfg[kind], len = c.s ? `${c.m} min ${c.s} sec` : `${c.m} minute${c.m === 1 ? '' : 's'}`;
  const el = $('#notifText'); el.style.transform = '';
  el.textContent = `Lets take a ${kind === 'long' ? 'long ' : ''}break for ${len}!`;
  $('#notif').hidden = false; el.style.transformOrigin = '0 50%';
  const w = el.scrollWidth; if (w > 275) el.style.transform = `scale(${275 / w})`;
  beep();
}
$('#nNo').addEventListener('click', () => { $('#notif').hidden = true; });
$('#nYes').addEventListener('click', () => {
  $('#notif').hidden = true; setMode(notifKind); pomoStart(); toast('Enjoy your break!');
});

/* ================= STUDY SESSION + CAMERA ================= */
const S = { active: false, startedAt: 0, elapsed: 0, hours: 0, count: 0, present: 0, absent: 0, inEvent: false };
const stats = store.get('stats', { sessions: 0, seconds: 0, detections: 0, pomos: 0 });
function bumpStat(k, n = 1) { stats[k] = (stats[k] || 0) + n; store.set('stats', stats); }
const video = $('#camVideo'), canvas = $('#camCanvas'), ctx = canvas.getContext('2d'), camBox = $('#camBox');
let stream = null, model = null, modelPromise = null;

function fmtDur(sec) { return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec % 3600 / 60))}:${pad(sec % 60)}`; }
function badge() {
  $('#camBadgeText').textContent = S.active ? `detecting · ${fmtDur(S.elapsed)}` : (stream ? 'camera on' : 'camera starting…');
  camBox.classList.toggle('detecting', S.active);
  $('#btnStart').classList.toggle('on', S.active);
}
function showCamGate(title, msg) {
  $('#camGateTitle').textContent = title; $('#camGateMsg').innerHTML = msg; $('#camGate').hidden = false;
}
async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return showCamGate('Camera is not available', 'This browser cannot reach the camera here. Open StudyCue in Chrome or Edge from <b>https://</b> or <b>http://localhost</b>, or open the file directly.');
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
    video.srcObject = stream; await video.play().catch(() => { });
    camBox.classList.add('live'); $('#camGate').hidden = true; badge();
  } catch (e) {
    const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    showCamGate(denied ? 'Camera access is blocked' : 'No camera found',
      denied ? 'StudyCue only works with your camera on. Allow camera access for this page in your browser (the camera icon in the address bar), then press the button below.'
        : 'StudyCue needs a webcam to notice when you pick up your phone. Connect one and press the button below.');
  }
}
$('#camRetry').addEventListener('click', startCamera);

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
}
function ensureModel() {
  if (model) return Promise.resolve(model);
  if (!modelPromise) modelPromise = (async () => {
    if (!window.tf) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
    if (!window.cocoSsd) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
    model = await cocoSsd.load({ base: 'lite_mobilenet_v2' }); return model;
  })().catch(e => { modelPromise = null; throw e; });
  return modelPromise;
}
function drawBoxes(preds) {
  const W = canvas.width = 1162, H = canvas.height = 666; ctx.clearRect(0, 0, W, H);
  const vw = video.videoWidth || 1280, vh = video.videoHeight || 720, s = Math.max(W / vw, H / vh);
  const ox = (vw * s - W) / 2, oy = (vh * s - H) / 2;
  preds.forEach(p => {
    const [x, y, w, h] = p.bbox, X = x * s - ox, Y = y * s - oy, Wd = w * s, Hd = h * s;
    ctx.lineWidth = 5; ctx.strokeStyle = '#ff5fa8'; ctx.fillStyle = 'rgba(255,95,168,.16)';
    ctx.beginPath(); ctx.roundRect(X, Y, Wd, Hd, 16); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(X + Wd, Y); ctx.scale(-1, 1);  // un-mirror the label
    ctx.fillStyle = '#ff5fa8'; ctx.beginPath(); ctx.roundRect(0, -34, 170, 30, 15); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 18px Poppins, sans-serif'; ctx.fillText('phone ' + Math.round(p.score * 100) + '%', 12, -13); ctx.restore();
  });
}
function registerDetection() {
  S.count++; bumpStat('detections');
  const n = $('#detNum'); n.textContent = S.count; n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');
  camBox.classList.add('alert'); clearTimeout(registerDetection.t); registerDetection.t = setTimeout(() => camBox.classList.remove('alert'), 2600);
  beep();
}
let detTimer = null;
async function detectLoop() {
  if (!S.active) return;
  try {
    if (video.readyState >= 2 && model) {
      const preds = await model.detect(video, 10, 0.35);
      const phones = preds.filter(p => p.class === 'cell phone' && p.score >= 0.4);
      drawBoxes(phones);
      if (phones.length) { S.present++; S.absent = 0; if (S.present >= 3 && !S.inEvent) { S.inEvent = true; registerDetection(); } }
      else { S.absent++; if (S.absent >= 8) { S.present = 0; S.inEvent = false; } }
    }
  } catch (e) { /* keep going */ }
  detTimer = setTimeout(detectLoop, 160);
}
function startDetection() {
  if (!stream) return toast('Waiting for the camera…');
  if (S.active) return toast('Detection is already running');
  S.active = true; S.startedAt = Date.now(); S.elapsed = 0; S.hours = 0; S.present = 0; S.absent = 0; S.inEvent = false; badge();
  toast('Loading the phone detector…', 2200);
  ensureModel().then(() => { if (S.active) { toast('Detection started'); detectLoop(); } })
    .catch(() => { S.active = false; badge(); toast('Could not load the phone detector. It needs an internet connection.', 4500); });
}
function resetCount() { S.count = 0; $('#detNum').textContent = 0; S.inEvent = false; S.present = 0; toast('Count reset'); }
function endSession() {
  if (!S.active && !S.elapsed && !S.count) return toast('No session is running');
  const dur = S.elapsed, cnt = S.count;
  S.active = false; clearTimeout(detTimer); ctx.clearRect(0, 0, canvas.width, canvas.height); camBox.classList.remove('alert'); badge();
  if (dur > 5) { bumpStat('sessions'); bumpStat('seconds', dur); }
  openModal(`<h3>session finished</h3>
    <p style="font-size:20px">You studied for <b>${fmtDur(dur)}</b>.</p>
    <p style="font-size:20px">Phone pick-ups detected: <b>${cnt}</b></p>
    <p>${cnt === 0 ? 'Nice focus. Your phone stayed down the whole time.' : cnt < 4 ? 'Good job. Try to keep it down a little longer next time.' : 'Your phone pulled you away quite a bit. Try keeping it in another room.'}</p>
    <div class="acts"><button class="btn main" data-close>done</button></div>`);
  S.elapsed = 0; S.hours = 0; S.count = 0; $('#detNum').textContent = 0;
}
setInterval(() => {
  if (!S.active) return;
  S.elapsed = Math.floor((Date.now() - S.startedAt) / 1000); badge();
  if (Math.floor(S.elapsed / 3600) > S.hours) { S.hours = Math.floor(S.elapsed / 3600); showNotif('short'); }
}, 1000);
$('#btnStart').addEventListener('click', startDetection);
$('#btnReset').addEventListener('click', resetCount);
$('#btnEnd').addEventListener('click', endSession);
$$('.ico').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.for).click()));

/* ================= NOTES ================= */
const HILLS = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 120" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3fb"/><stop offset="1" stop-color="#e6f5ff"/></linearGradient></defs><rect width="440" height="120" fill="url(#s)"/><ellipse cx="60" cy="26" rx="30" ry="9" fill="#fff"/><ellipse cx="260" cy="16" rx="42" ry="11" fill="#fff"/><path d="M0 120V84Q60 62 120 80T250 90T360 76T440 88V120Z" fill="#c4e07a"/><path d="M0 120V96Q90 78 180 100T340 98T440 90V120Z" fill="#8aa500"/></svg>');
let NB = store.get('notebooks', null);
if (!NB) {
  NB = [
    { id: 'n1', title: '1.1 technology and society', banner: null, created: Date.now() - 2 * 3600e3, updated: Date.now() - 2 * 3600e3,
      text: 'Example notebook.\n\nTechnology shapes how people communicate, work and learn. Add your own notes here, attach files below, or delete this notebook.',
      files: [{ name: 'technology-and-society.txt', type: 'text/plain', size: 168, text: 'Technology and society: key ideas\n- Tools extend what people can do.\n- Each new technology changes habits and expectations.\n- Studying works best with fewer distractions.' }] },
    { id: 'n2', title: 'exam checklist', banner: null, created: Date.now() - 26 * 3600e3, updated: Date.now() - 26 * 3600e3,
      text: 'Example notebook.\n\n1. Review chapter summaries\n2. Practice with StudyAI flashcards\n3. Sleep early', files: [] }
  ];
  store.set('notebooks', NB);
}
let curNb = null;
const saveNB = () => { if (!store.set('notebooks', NB)) toast('Storage is full. Remove a file or notebook to save more.', 4000); };
function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24); return d === 1 ? 'yesterday' : `${d} days ago`;
}
const shortDate = ts => new Date(ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const longDate = ts => new Date(ts).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
function renderNotes() {
  const g = $('#nbGrid');
  if (!NB.length) { g.innerHTML = '<div class="nbempty hw">no notebooks yet.<br>press “+ new notebook” to make one.</div>'; return; }
  g.innerHTML = NB.slice().sort((a, b) => b.created - a.created).map((n, i) => {
    const k = n.files.length;
    return `<div class="nb" tabindex="0" role="button" data-id="${n.id}" style="animation-delay:${i * 60}ms"><div class="inner">
      <div class="ban" style="background-image:url('${n.banner || HILLS}')"></div>
      <div class="t hw">${esc(n.title || 'untitled')}</div>
      <div class="m hw">${k ? k + ' source' + (k === 1 ? '' : 's') : 'no sources'} · ${ago(n.created)} · ${shortDate(n.created)}</div></div></div>`;
  }).join('');
  $$('.nb', g).forEach(el => {
    el.addEventListener('click', () => openNotebook(el.dataset.id));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotebook(el.dataset.id); } });
  });
}
function showNbList() { curNb = null; $('#notebookView').hidden = true; $('#notesList').hidden = false; renderNotes(); }
function openNotebook(id) {
  curNb = NB.find(n => n.id === id); if (!curNb) return;
  $('#notesList').hidden = true; $('#notebookView').hidden = false;
  const v = $('#notebookView'); v.style.animation = 'none'; void v.offsetWidth; v.style.animation = 'pageIn .4s';
  $('#nbBanner').style.backgroundImage = `url('${curNb.banner || HILLS}')`;
  $('#nbTitleInput').value = curNb.title; $('#nbText').value = curNb.text || '';
  renderNbMeta(); renderNbFiles();
}
function renderNbMeta() { $('#nbMeta').textContent = `created ${longDate(curNb.created)}  ·  edited ${ago(curNb.updated)}`; }
function renderNbFiles() {
  const box = $('#nbFiles');
  box.innerHTML = curNb.files.length ? curNb.files.map((f, i) => `<div class="fchip hw" tabindex="0" role="button" data-i="${i}"><b>${esc(f.name)}</b><small>${fmtSize(f.size)}</small><button class="rm" data-rm="${i}" aria-label="Remove ${esc(f.name)}" style="font-size:18px;padding:0 4px">×</button></div>`).join('')
    : '<div class="hw" style="color:#777;font-size:15px">no files yet. use “+ add file”.</div>';
  $$('.fchip', box).forEach(c => {
    c.addEventListener('click', e => { if (e.target.dataset.rm != null) { e.stopPropagation(); curNb.files.splice(+e.target.dataset.rm, 1); curNb.updated = Date.now(); saveNB(); renderNbFiles(); renderNbMeta(); return; } previewFile(curNb.files[+c.dataset.i]); });
    c.addEventListener('keydown', e => { if (e.key === 'Enter') c.click(); });
  });
}
const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b > 1024 ? Math.round(b / 1024) + ' KB' : b + ' B';
function previewFile(f) {
  let body;
  if (f.text != null) body = `<div class="preview">${esc(f.text)}</div>`;
  else if (f.data && /^data:image/.test(f.data)) body = `<div class="preview"><img src="${f.data}" alt="${esc(f.name)}"></div>`;
  else if (f.data) body = `<p>This file type can't be previewed here.</p><div class="acts" style="justify-content:flex-start"><a class="btn main" style="display:inline-flex;align-items:center;text-decoration:none;color:#fff" download="${esc(f.name)}" href="${f.data}">download</a></div>`;
  else body = `<p>${esc(f.name)} was too large to keep inside the browser, so only its name is saved.</p>`;
  openModal(`<h3 style="font-size:24px;word-break:break-all">${esc(f.name)}</h3>${body}<div class="acts"><button class="btn" data-close>close</button></div>`);
}
const readText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(f); });
const readData = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
async function toStored(file) {
  const isText = /^text\//.test(file.type) || /\.(txt|md|csv|json|html|js|py)$/i.test(file.name);
  const o = { name: file.name, type: file.type, size: file.size };
  if (isText && file.size < 400000) o.text = await readText(file);
  else if (file.size < 1200000) o.data = await readData(file);
  return o;
}
async function toBanner(file) {
  const url = await readData(file);
  return new Promise(res => {
    const im = new Image(); im.onload = () => {
      const c = document.createElement('canvas'); c.width = 520; c.height = 240; const x = c.getContext('2d');
      const s = Math.max(520 / im.width, 240 / im.height); x.drawImage(im, (520 - im.width * s) / 2, (240 - im.height * s) / 2, im.width * s, im.height * s);
      res(c.toDataURL('image/jpeg', .8));
    }; im.onerror = () => res(null); im.src = url;
  });
}
$('#newNb').addEventListener('click', () => {
  let banner = null, files = [];
  openModal(`<h3>new notebook</h3>
    <label for="nnTitle">title</label><input type="text" id="nnTitle" maxlength="60" placeholder="e.g. 1.2 networks and the internet">
    <label>banner picture</label><div class="pickrow"><div class="thumb" id="nnThumb" style="background-image:url('${HILLS}')"></div><button class="btn" id="nnBan">choose picture</button></div>
    <label>files for this notebook</label><div class="pickrow"><button class="btn" id="nnFiles">add files</button><span id="nnCount" style="font-size:14px;color:#555">none yet</span></div>
    <div class="minilist" id="nnList"></div>
    <div class="acts"><button class="btn" data-close>cancel</button><button class="btn main" id="nnMake">create</button></div>`,
    (m, close) => {
      $('#nnBan', m).onclick = () => $('#fileNbBanner').click();
      $('#nnFiles', m).onclick = () => $('#fileNbFiles').click();
      $('#fileNbBanner').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; banner = await toBanner(f); if (banner) $('#nnThumb', m).style.backgroundImage = `url('${banner}')`; };
      $('#fileNbFiles').onchange = async e => {
        for (const f of e.target.files) files.push(await toStored(f)); e.target.value = '';
        $('#nnCount', m).textContent = files.length + ' file' + (files.length === 1 ? '' : 's');
        $('#nnList', m).innerHTML = files.map(f => esc(f.name)).join('<br>');
      };
      $('#nnMake', m).onclick = () => {
        const title = $('#nnTitle', m).value.trim() || 'untitled notebook', now = Date.now();
        NB.push({ id: 'n' + now, title, banner, created: now, updated: now, text: '', files }); saveNB(); close(); renderNotes(); toast('Notebook created'); openNotebook('n' + now);
      };
    });
});
$('#nbBack').addEventListener('click', showNbList);
$('#nbTitleInput').addEventListener('input', e => { curNb.title = e.target.value; curNb.updated = Date.now(); saveNBSoon(); });
$('#nbText').addEventListener('input', e => { curNb.text = e.target.value; curNb.updated = Date.now(); saveNBSoon(); });
let nbT; function saveNBSoon() { clearTimeout(nbT); nbT = setTimeout(() => { saveNB(); renderNbMeta(); }, 400); }
$('#nbAddFile').addEventListener('click', () => $('#fileNbMore').click());
$('#fileNbMore').addEventListener('change', async e => {
  for (const f of e.target.files) curNb.files.push(await toStored(f)); e.target.value = '';
  curNb.updated = Date.now(); saveNB(); renderNbFiles(); renderNbMeta(); toast('Files added');
});
let delArm = 0;
$('#nbDelete').addEventListener('click', e => {
  const b = e.currentTarget;
  if (!delArm) { b.textContent = 'sure?'; delArm = setTimeout(() => { b.textContent = 'delete'; delArm = 0; }, 3000); return; }
  clearTimeout(delArm); delArm = 0; b.textContent = 'delete';
  NB = NB.filter(n => n !== curNb); saveNB(); showNbList(); toast('Notebook deleted');
});
setInterval(() => { if (curApp === 'notes' && curNb) renderNbMeta(); else if (curApp === 'notes') renderNotes(); }, 60000);

/* ================= SETTINGS ================= */
$('#aboutBtn').addEventListener('click', () => openModal(`<h3>About StudyCue</h3>
  <p>StudyCue is an interactive website for studying and note-taking. It keeps a pomodoro timer, notebooks, a calendar and a calculator close by, and it watches your camera feed to notice when you pick up your phone.</p>
  <p>StudyAI uses Google Gemini to summarize your files and turn them into flashcards.</p>
  <p>StudyCue was carefully curated under the supervision of 4 students and with the support of SMAK 7 BPK Penabur Jakarta through allowing us to express our creativity from the IT project program.</p>
  <p>Version 1.1</p><div class="acts"><button class="btn main" data-close>close</button></div>`));

/* ================= CALCULATOR ================= */
const calc = { expr: '', result: null, fresh: false };
const KEYS = [
  ['(', 111, 180], [')', 215, 180], ['%', 319, 180], ['/', 430, 180],
  ['7', 111, 277], ['8', 215, 277], ['9', 319, 277], ['X', 430, 277],
  ['4', 111, 374], ['5', 215, 374], ['6', 319, 374], ['-', 430, 374],
  ['1', 111, 471], ['2', 215, 471], ['3', 319, 471], ['+', 430, 471],
  ['0', 111, 569], [',', 215, 569], ['=', 319, 569, 194]
];
$('#calcKeys').innerHTML = KEYS.map(([k, x, y, w]) => `<button class="ck${'/X-+'.includes(k) ? ' op' : ''}" data-k="${k}" style="left:${x}px;top:${y}px;${w ? 'width:' + w + 'px' : ''}">${k}</button>`).join('');
function calcEvaluate(src) {
  const t = src.match(/\d*\.?\d+|[()+\-×\/%]/g) || []; let i = 0;
  const peek = () => t[i], next = () => t[i++];
  function expr() {
    let l = term();
    while (peek() === '+' || peek() === '-') {
      const op = next(), r = term();
      const rv = r.pct && r.single ? l.v * r.v : r.v; // 200+10% => 220
      l = { v: op === '+' ? l.v + rv : l.v - rv };
    }
    return l;
  }
  function term() {
    let l = factor(), n = 1;
    while (true) {
      const p = peek();
      if (p === '×' || p === '/') { next(); const r = factor(); if (p === '/' && r.v === 0) throw new Error("can't divide by 0"); l = { v: p === '×' ? l.v * r.v : l.v / r.v }; n++; }
      else if (p === '(' || /^\d|^\./.test(p || '')) { const r = factor(); l = { v: l.v * r.v }; n++; }
      else break;
    }
    return { v: l.v, pct: l.pct && n === 1, single: n === 1 };
  }
  function factor() {
    let neg = 1, p = peek();
    while (p === '-' || p === '+') { if (p === '-') neg = -neg; next(); p = peek(); }
    let v, pct = false;
    if (p === '(') { next(); v = expr().v; if (peek() === ')') next(); else throw new Error('missing )'); }
    else if (p != null && /^\d|^\./.test(p)) v = parseFloat(next());
    else throw new Error('incomplete');
    while (peek() === '%') { next(); v /= 100; pct = true; }
    return { v: neg * v, pct };
  }
  const r = term2();
  function term2() { const r = expr(); if (i < t.length) throw new Error('error'); return r; }
  return r.v;
}
const showNum = n => String(n).replace('.', ',');
function updateCalc() {
  const main = calc.result != null ? calc.result : (calc.expr || '0');
  $('#calcMain').innerHTML = `<span>${esc(showNum(main))}</span>`;
  $('#calcExpr').innerHTML = `<span>${esc(calc.result != null ? showNum(calc.expr) + ' =' : '')}</span>`;
}
function calcPress(k) {
  const ops = '+-×/', last = calc.expr.slice(-1);
  if (k === 'X' || k === '*') k = '×'; if (k === ',') k = '.';
  if (calc.err) { calc.err = false; calc.expr = ''; calc.result = null; }
  if (k === 'C') { calc.expr = ''; calc.result = null; return updateCalc(); }
  if (k === 'BACK') { if (calc.result != null) { calc.result = null; } else calc.expr = calc.expr.slice(0, -1); return updateCalc(); }
  if (k === '=') {
    if (!calc.expr) return;
    let e = calc.expr; const open = (e.match(/\(/g) || []).length - (e.match(/\)/g) || []).length; e += ')'.repeat(Math.max(0, open));
    e = e.replace(/[+\-×\/]+$/, '');
    try { const v = calcEvaluate(e); if (!isFinite(v)) throw new Error('error'); calc.result = String(parseFloat(v.toPrecision(12))); calc.expr = e; calc.fresh = true; }
    catch (err) { calc.result = err.message === 'incomplete' ? 'incomplete' : err.message; calc.err = true; }
    return updateCalc();
  }
  if (calc.result != null && !calc.err) {
    if (calc.fresh && (/\d/.test(k) || k === '(' || k === '.')) { calc.expr = ''; }
    else calc.expr = calc.result;
    calc.result = null; calc.fresh = false;
  }
  const lastCh = calc.expr.slice(-1);
  if (/\d/.test(k)) calc.expr += k;
  else if (k === '.') { const seg = calc.expr.split(/[+\-×\/()%]/).pop(); if (!seg.includes('.')) calc.expr += (seg === '' ? '0.' : '.'); }
  else if (k === '(') calc.expr += k;
  else if (k === ')') { const open = (calc.expr.match(/\(/g) || []).length - (calc.expr.match(/\)/g) || []).length; if (open > 0 && /[\d)%]/.test(lastCh)) calc.expr += k; }
  else if (k === '%') { if (/[\d)%]/.test(lastCh)) calc.expr += k; }
  else if (ops.includes(k)) {
    if (!calc.expr) { if (k === '-') calc.expr = '-'; }
    else if (ops.includes(lastCh)) { if (calc.expr.length > 1 || k === '-') calc.expr = calc.expr.slice(0, -1) + k; }
    else if (lastCh === '(') { if (k === '-') calc.expr += k; }
    else calc.expr += k;
  }
  if (calc.expr.length > 60) calc.expr = calc.expr.slice(0, 60);
  updateCalc();
}
$$('.ck').forEach(b => b.addEventListener('click', () => calcPress(b.dataset.k)));
$('#cClear').addEventListener('click', () => calcPress('C'));
$('#cBack').addEventListener('click', () => calcPress('BACK'));
addEventListener('keydown', e => {
  if (curApp !== 'calc' || closeModalFn || e.ctrlKey || e.metaKey) return;
  const k = e.key; let m = null;
  if (/^[0-9]$/.test(k) || '+-()%/'.includes(k)) m = k; else if (k === '*' || k === 'x' || k === 'X') m = 'X'; else if (k === '.' || k === ',') m = ','; else if (k === 'Enter' || k === '=') m = '='; else if (k === 'Backspace') m = 'BACK'; else if (k === 'Delete' || k === 'c' || k === 'C') m = 'C';
  if (m == null) return; e.preventDefault(); calcPress(m === ',' ? '.' : m);
  const btn = $(`.ck[data-k="${m === '.' ? ',' : m}"]`); if (btn) { btn.classList.add('press'); setTimeout(() => btn.classList.remove('press'), 110); }
});

/* ================= FEATURES ================= */
$('#featStats').addEventListener('click', () => {
  const c = $('#statsCard'), h = Math.floor(stats.seconds / 3600), m = Math.floor(stats.seconds % 3600 / 60);
  c.innerHTML = `<b style="font-weight:400;font-size:26px">study stats</b><br>sessions finished: ${stats.sessions}<br>time studied: ${h}h ${m}m<br>pomodoros completed: ${stats.pomos}<br>phone pick-ups detected: ${stats.detections}`;
  c.hidden = false; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = 'pageIn .4s';
});

/* ================= CALENDAR ================= */
let EV = store.get('events', []);
const now0 = new Date(); let cal = { y: now0.getFullYear(), m: now0.getMonth() };
const COLORS = ['#ffb3d6', '#b9e3ff', '#fff09a', '#c9f0b4', '#d9c8ff'];
const dkey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
function renderCal() {
  const first = new Date(cal.y, cal.m, 1), dim = new Date(cal.y, cal.m + 1, 0).getDate();
  const off = (first.getDay() + 6) % 7, total = Math.ceil((off + dim) / 7) * 7, rows = total / 7;
  $('#calMonth').textContent = first.toLocaleString('en-US', { month: 'long' }); $('#calYear').textContent = cal.y;
  const g = $('#calGrid'); g.style.gridTemplateRows = `repeat(${rows},1fr)`;
  const today = new Date(), tk = dkey(today.getFullYear(), today.getMonth(), today.getDate());
  let html = '';
  for (let i = 0; i < total; i++) {
    const d = new Date(cal.y, cal.m, 1 - off + i), k = dkey(d.getFullYear(), d.getMonth(), d.getDate());
    const evs = EV.filter(e => e.date === k).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    html += `<div class="cd${d.getMonth() !== cal.m ? ' out' : ''}${k === tk ? ' today' : ''}" data-k="${k}">${k === tk ? '<b>' + d.getDate() + '</b>' : d.getDate()}` +
      evs.slice(0, 2).map(e => `<span class="ev" data-id="${e.id}" style="background:${e.color}">${e.time ? e.time + ' ' : ''}${esc(e.title)}</span>`).join('') +
      (evs.length > 2 ? `<span class="more">+${evs.length - 2} more</span>` : '') + '</div>';
  }
  g.innerHTML = html;
  $$('.cd', g).forEach(c => c.addEventListener('click', e => {
    const ev = e.target.closest('.ev'); if (ev) return viewEvent(ev.dataset.id); eventModal(c.dataset.k);
  }));
}
function eventModal(date) {
  const t = new Date(), def = date || dkey(t.getFullYear(), t.getMonth(), t.getDate()); let color = COLORS[0];
  openModal(`<h3>add event</h3>
    <label for="evTitle">event name</label><input type="text" id="evTitle" maxlength="40" placeholder="e.g. Math test">
    <div class="row"><div><label for="evDate">date</label><input type="date" id="evDate" value="${def}"></div><div><label for="evTime">time (optional)</label><input type="time" id="evTime"></div></div>
    <label>color</label><div class="swatches">${COLORS.map((c, i) => `<button class="swatch${i ? '' : ' sel'}" data-c="${c}" style="background:${c}" aria-label="color ${i + 1}"></button>`).join('')}</div>
    <div class="acts"><button class="btn" data-close>cancel</button><button class="btn main" id="evSave">save event</button></div>`,
    (m, close) => {
      $$('.swatch', m).forEach(s => s.onclick = () => { $$('.swatch', m).forEach(x => x.classList.remove('sel')); s.classList.add('sel'); color = s.dataset.c; });
      $('#evSave', m).onclick = () => {
        const title = $('#evTitle', m).value.trim(), date = $('#evDate', m).value;
        if (!title) { $('#evTitle', m).focus(); return toast('Give the event a name'); }
        if (!date) return toast('Pick a date');
        EV.push({ id: 'e' + Date.now(), date, title, time: $('#evTime', m).value, color }); store.set('events', EV);
        const [y, mo] = date.split('-').map(Number); cal = { y, m: mo - 1 }; renderCal(); close(); toast('Event added');
      };
    });
}
function viewEvent(id) {
  const e = EV.find(x => x.id === id); if (!e) return;
  openModal(`<h3>${esc(e.title)}</h3><p style="font-size:19px">${new Date(e.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${e.time ? ' at ' + e.time : ''}</p>
    <div class="acts"><button class="btn danger" id="evDel">delete</button><button class="btn main" data-close>close</button></div>`,
    (m, close) => $('#evDel', m).onclick = () => { EV = EV.filter(x => x.id !== id); store.set('events', EV); renderCal(); close(); toast('Event deleted'); });
}
$('#addEvent').addEventListener('click', () => eventModal());
$('#calPrev').addEventListener('click', () => { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y--; } renderCal(); });
$('#calNext').addEventListener('click', () => { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++; } renderCal(); });
$('#calMonth').addEventListener('click', () => { const t = new Date(); cal = { y: t.getFullYear(), m: t.getMonth() }; renderCal(); });
$('#calMonth').style.cursor = 'pointer'; $('#calMonth').title = 'Back to this month';

/* ================= STUDYAI (Gemini) ================= */
const AI = { file: null, hist: [], busy: false, deck: null, qi: 0, ans: [], shown: [] };
const getKey = () => (store.get('gkey', '') || CFG.geminiKey || '').trim();
const SYS = 'You are StudyAI, the study helper inside the StudyCue website. Be accurate, clear and friendly. Reply in the language the student writes in. For summaries use a one-line overview followed by short bullet points. Never invent facts that are not in the student\'s material.';
function md(t) {
  let h = esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^#{1,4}\s*(.+)$/gm, '<strong>$1</strong>');
  const lines = h.split('\n'), out = []; let inList = false;
  for (const l of lines) {
    const li = l.match(/^\s*[-*•]\s+(.*)/);
    if (li) { if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>' + li[1] + '</li>'); }
    else { if (inList) { out.push('</ul>'); inList = false; } out.push(l.trim() ? '<p>' + l + '</p>' : ''); }
  }
  if (inList) out.push('</ul>'); return out.join('');
}
function addMsg(kind, html, raw) {
  const d = document.createElement('div'); d.className = 'msg ' + kind; if (raw) d.textContent = html; else d.innerHTML = html;
  const c = $('#aiChat'); c.appendChild(d); c.scrollTop = c.scrollHeight; return d;
}
function showChat() { $('#aiQuiz').hidden = true; $('#aiChat').hidden = false; }
function updateChip() {
  const c = $('#aiFileChip'); c.hidden = !AI.file; if (AI.file) c.textContent = 'file: ' + AI.file.name; c.title = AI.file ? AI.file.name : '';
}
function keyModal() {
  openModal(`<h3>Gemini API key</h3>
    <p>StudyAI uses Google Gemini. Paste your API key below. It is saved only in this browser. Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>.</p>
    <label for="kIn">API key</label><input type="password" id="kIn" value="${esc(store.get('gkey', ''))}" placeholder="AIza…" autocomplete="off">
    <div class="acts"><button class="btn danger" id="kDel">remove</button><button class="btn" data-close>cancel</button><button class="btn main" id="kSave">save</button></div>`,
    (m, close) => {
      $('#kSave', m).onclick = () => { store.set('gkey', $('#kIn', m).value.trim()); close(); toast('API key saved'); };
      $('#kDel', m).onclick = () => { store.set('gkey', ''); close(); toast('API key removed'); };
    });
}
$('#aiKeyBtn').addEventListener('click', keyModal);

async function fileToPart(f) {
  if (f.text != null) return { text: `Material from "${f.name}":\n\n${f.text.slice(0, 600000)}` };
  return { inline_data: { mime_type: f.mime, data: f.b64 } };
}
async function gemini(contents, { json = false, schema = null } = {}) {
  const key = getKey(); if (!key) throw Object.assign(new Error('NO_KEY'), { code: 'NO_KEY' });
  const body = { systemInstruction: { parts: [{ text: SYS }] }, contents, generationConfig: { temperature: json ? .6 : .7 } };
  if (json) { body.generationConfig.responseMimeType = 'application/json'; if (schema) body.generationConfig.responseSchema = schema; }
  const call = async model => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body)
  });
  let res = await call(CFG.model);
  if (res.status === 404 && CFG.fallbackModel) res = await call(CFG.fallbackModel);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + res.status));
  const c = data.candidates && data.candidates[0];
  const text = c && c.content && c.content.parts ? c.content.parts.map(p => p.text || '').join('') : '';
  if (!text) throw new Error(data.promptFeedback && data.promptFeedback.blockReason ? 'The request was blocked (' + data.promptFeedback.blockReason + ').' : 'Gemini returned an empty answer.');
  return text;
}
function errMsg(e) {
  if (e.code === 'NO_KEY') return 'StudyAI needs a Gemini API key first. Press “API key” at the top right of this screen and paste yours.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(e.message)) return 'I could not reach Gemini. Check your internet connection and try again.';
  if (/API key not valid|API_KEY_INVALID/i.test(e.message)) return 'Gemini says this API key is not valid. Press “API key” to enter a different one.';
  return 'Gemini error: ' + e.message;
}
async function buildContents(userText) {
  const turns = AI.hist.map(h => ({ role: h.role, parts: [{ text: h.text }] }));
  turns.push({ role: 'user', parts: [{ text: userText }] });
  if (AI.file) turns[0].parts.unshift(await fileToPart(AI.file));
  return turns;
}
async function aiChat(text, label) {
  if (AI.busy) return; AI.busy = true; showChat();
  addMsg('me', label || text, true);
  const wait = addMsg('ai', '<span class="dots"><i></i><i></i><i></i></span>');
  try {
    const out = await gemini(await buildContents(text));
    AI.hist.push({ role: 'user', text }, { role: 'model', text: out }); wait.innerHTML = md(out);
  } catch (e) { wait.className = 'msg ai err'; wait.textContent = errMsg(e); }
  AI.busy = false; const c = $('#aiChat'); c.scrollTop = c.scrollHeight;
}
const QSCHEMA = { type: 'ARRAY', items: { type: 'OBJECT', properties: { question: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } }, answerIndex: { type: 'INTEGER' }, explanation: { type: 'STRING' } }, required: ['question', 'options', 'answerIndex', 'explanation'] } };
function cleanDeck(arr) {
  return (Array.isArray(arr) ? arr : []).filter(q => q && q.question && Array.isArray(q.options) && q.options.length >= 4 && Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4)
    .map(q => ({ question: String(q.question), options: q.options.slice(0, 4).map(o => String(o).replace(/^[a-dA-D][.)]\s+/, '')), answerIndex: q.answerIndex, explanation: String(q.explanation || '') }));
}
async function aiFlash(text) {
  if (AI.busy) return;
  const topic = text.replace(/^(can you )?(please )?(make|create|generate)( me)?( a| some)? ?(flash ?cards?|quiz)( about| on| for| from)?/i, '').trim();
  if (!AI.file && !topic) { showChat(); addMsg('me', text, true); addMsg('ai', md('Tell me the topic, or upload a file first, and I will make 15 flashcards from it.')); return; }
  AI.busy = true; showChat(); addMsg('me', text, true);
  const wait = addMsg('ai', '<span class="dots"><i></i><i></i><i></i></span> making 15 flashcards…');
  const ask = n => `Create exactly ${n} multiple-choice flashcard questions ${AI.file ? 'based only on the attached material' : 'about: ' + (topic || text)}. Student request: "${text}". Each question has exactly 4 options without letter prefixes, one correct answerIndex (0-3), and a short explanation (1-3 sentences) of why that answer is correct. Mix easy and harder questions and spread the correct answers across positions.`;
  try {
    const mk = async (n, extra = '') => {
      const turns = [{ role: 'user', parts: [{ text: ask(n) + extra }] }]; if (AI.file) turns[0].parts.unshift(await fileToPart(AI.file));
      return cleanDeck(JSON.parse(await gemini(turns, { json: true, schema: QSCHEMA })));
    };
    let deck = await mk(15);
    if (deck.length < 15 && deck.length > 0) { const more = await mk(15 - deck.length, ` Do not repeat these questions: ${deck.map(d => d.question).join(' | ')}`); deck = deck.concat(more); }
    if (!deck.length) throw new Error('Gemini did not return usable questions. Try again with a clearer topic.');
    AI.deck = { title: AI.file ? AI.file.name : (topic || text), items: deck.slice(0, 15) }; AI.qi = 0; AI.ans = []; AI.shown = [];
    wait.innerHTML = md(`I made ${AI.deck.items.length} flashcards${AI.file ? ' from ' + AI.file.name : ' about ' + (topic || text)}.`) + ' <a href="#" class="qlink" data-open>open flashcards</a>';
    $('[data-open]', wait).onclick = ev => { ev.preventDefault(); showQuiz(); };
    showQuiz();
  } catch (e) { wait.className = 'msg ai err'; wait.textContent = errMsg(e instanceof SyntaxError ? new Error('Gemini sent back an unreadable answer. Please try again.') : e); }
  AI.busy = false;
}
const LOCK = '<svg class="lock" viewBox="0 0 44 46"><rect x="6" y="19" width="32" height="24" rx="4" fill="#9a9a9a"/><path d="M13 20v-6a9 9 0 0118 0v6" fill="none" stroke="#9a9a9a" stroke-width="5"/><circle cx="22" cy="30" r="3.4" fill="#ebebeb"/><rect x="20.5" y="31" width="3" height="6" rx="1.2" fill="#ebebeb"/></svg>';
function showQuiz() {
  if (!AI.deck) return; $('#aiChat').hidden = true; const q = $('#aiQuiz'); q.hidden = false;
  const D = AI.deck, i = AI.qi, it = D.items[i], a = AI.ans[i], L = ['a', 'b', 'c', 'd'];
  const score = AI.ans.filter((x, k) => x === D.items[k].answerIndex).length, done = AI.ans.filter(x => x != null).length;
  q.innerHTML = `<div class="qhead hw"><img src="assets/folder.png" alt=""><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:330px">based off ${esc(D.title)}</span><span class="sp"></span>${done === D.items.length ? `<span class="qscore">score ${score}/${D.items.length}</span>` : ''}<a class="qlink" id="qChat">chat</a></div>
    <div class="qcard hw" key="${i}">${esc(it.question)}</div>
    <div class="qopts">${it.options.map((o, k) => `<button class="qo${a != null ? (k === it.answerIndex ? ' ok' : (k === a ? ' bad' : '')) : ''}" data-k="${k}" ${a != null ? 'disabled' : ''}>${L[k]}. ${esc(o)}</button>`).join('')}</div>
    <div class="qexrow hw"><span>show explanation:</span><span class="sp"></span><span class="qnav"><button id="qPrev" aria-label="Previous question" ${i === 0 ? 'disabled' : ''}>&#8249;</button><span>${i + 1} / ${D.items.length}</span><button id="qNext" aria-label="Next question" ${i === D.items.length - 1 ? 'disabled' : ''}>&#8250;</button></span></div>
    <div class="qex">${AI.shown[i] ? `<div class="txt hw"><b style="font-weight:700">Answer: ${L[it.answerIndex]}. ${esc(it.options[it.answerIndex])}</b><br><br>${esc(it.explanation)}</div>` : `<button class="lock" id="qLock" aria-label="Show explanation" style="background:none">${LOCK}</button>`}</div>`;
  $$('.qo', q).forEach(b => b.onclick = () => { AI.ans[i] = +b.dataset.k; showQuiz(); });
  $('#qPrev', q).onclick = () => { AI.qi--; showQuiz(); }; $('#qNext', q).onclick = () => { AI.qi++; showQuiz(); };
  const lk = $('#qLock', q); if (lk) lk.onclick = () => { AI.shown[i] = true; showQuiz(); };
  $('#qChat', q).onclick = showChat;
}
function sendAI() {
  const inp = $('#aiInput'), text = inp.value.trim(); if (!text || AI.busy) return; inp.value = '';
  if (/flash\s?cards?|quiz|kuis|kartu/i.test(text)) aiFlash(text); else aiChat(text);
}
$('#aiInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendAI(); } });
$('#aiFlash').addEventListener('click', () => { const i = $('#aiInput'); i.value = 'can you please make a flashcard about '; i.focus(); i.setSelectionRange(i.value.length, i.value.length); if (AI.deck) { /* keep old deck reachable */ } });
$('#aiUpload').addEventListener('click', () => $('#fileAI').click());
$('#fileAI').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (f.size > 15 * 1024 * 1024) return toast('That file is over 15 MB. Please choose a smaller one.');
  const isText = /^text\//.test(f.type) || /\.(txt|md|csv|json|html)$/i.test(f.name);
  try {
    if (isText) AI.file = { name: f.name, text: await readText(f) };
    else {
      const mime = f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : '');
      if (!/^(application\/pdf|image\/(png|jpeg|webp))$/.test(mime)) return toast('StudyAI can read PDF, TXT, MD, CSV, HTML, JSON, PNG, JPG and WEBP files.', 4000);
      AI.file = { name: f.name, mime, b64: (await readData(f)).split(',')[1] };
    }
  } catch (err) { return toast('Could not read that file'); }
  AI.hist = []; AI.deck = null; updateChip(); showChat();
  aiChat('Please summarize this file for studying: give a short overview, the key points as bullets, and any important terms.', 'Summarize: ' + f.name);
});
addMsg('sys', 'Upload a file for a summary, or ask StudyAI anything about your studies.', true);

/* ================= INIT ================= */
updateClock(); setInterval(updateClock, 1000);
renderPomo(); renderNotes(); renderCal(); updateCalc(); badge();
startCamera();
window.StudyCue = { _debug: { registerDetection, showNotif, S, P } };
})();
