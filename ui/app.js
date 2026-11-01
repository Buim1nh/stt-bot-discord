// Giao diện STT Bot. Nói chuyện với STTBot.exe (launcher/Launcher.cs) qua window.chrome.webview.
'use strict';

// ---------- Icon (nét vẽ kiểu Lucide) ----------

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  scroll: '<path d="M8 21h11a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 0 0-2-2h13a2 2 0 0 1 2 2v12"/><path d="M10 8h6M10 12h6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
  power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/>',
  wand: '<path d="m15 4-1 1M19 8l-1 1M15 9l-9.5 9.5a1.4 1.4 0 0 0 2 2L17 11M17.5 3v2M21 6.5h-2M13 6.5h-2M17.5 10V8"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13v1M15 13v1M2 14h2M20 14h2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  wave: '<path d="M2 12h2M6 8v8M10 5v14M14 9v6M18 7v10M22 12h-2"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  arrowRight: '<path d="M5 12h14M13 5l7 7-7 7"/>',
  arrowLeft: '<path d="M19 12H5M11 19l-7-7 7-7"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  play: '<path d="m6 3 14 9-14 9z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
};

const icon = (name, cls = 'ico') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-icon]').forEach((el) => {
    if (!el.firstChild) el.innerHTML = icon(el.dataset.icon);
  });
}

// ---------- Tiện ích ----------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const initials = (name) => (String(name || '').match(/[\p{L}\p{N}]+/gu) || ['?']).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const avatar = (name, url, cls = '') =>
  url
    ? `<div class="avatar ${cls}"><img src="${esc(url)}" alt=""></div>`
    : `<div class="avatar ${cls}" style="background:hsl(${hue(name)} 32% 34%)">${esc(initials(name))}</div>`;

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
function sessionDate(s) {
  if (s.startedAt) return new Date(s.startedAt);
  const m = s.id.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
}
function fmtDuration(ms) {
  if (!ms || ms < 0) return '';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} phút`;
  return `${Math.floor(min / 60)} giờ ${String(min % 60).padStart(2, '0')} phút`;
}
function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return `${Math.floor(s / 3600)}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

// ---------- Cầu nối với STTBot.exe ----------

const bridge = window.chrome && window.chrome.webview;
const pending = new Map();
let seq = 0;

function call(cmd, args = {}) {
  if (!bridge) return Promise.reject(new Error('Mở giao diện này bằng STTBot.exe.'));
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    bridge.postMessage({ id, cmd, args });
  });
}

if (bridge) {
  bridge.addEventListener('message', (e) => {
    const m = e.data;
    if (m.event) return onEvent(m);
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    m.ok ? p.resolve(m.result) : p.reject(new Error(m.error));
  });
}

// ---------- Trạng thái ----------

const S = {
  page: 'home',
  app: null,
  discord: null,
  discordError: '',
  sessions: [],
  sessionFilter: '',
  campaign: null,
  campaignDirty: false,
  glossaryDirty: false,
  log: [],
  stt: null,
  processing: {},
  roles: null,
  drawer: null,
  wiz: null,
};

const cfg = () => (S.app ? S.app.config : {});
const bot = () => (S.app ? S.app.bot : { state: 'offline' });

// ---------- Thông báo ----------

function toast(text, kind = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.innerHTML = icon(kind === 'ok' ? 'checkCircle' : kind === 'err' ? 'alert' : 'info') + `<div>${esc(text)}</div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, kind === 'err' ? 7000 : 4200);
}

function confirmBox({ title, text, ok = 'Đồng ý', cancel = 'Huỷ', danger = false }) {
  return new Promise((resolve) => {
    const modal = $('#modal');
    modal.innerHTML = `<div class="modal" role="dialog">
      <h3>${esc(title)}</h3><p>${esc(text)}</p>
      <div class="modal-actions">
        <button class="btn" data-r="0">${esc(cancel)}</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-r="1">${esc(ok)}</button>
      </div></div>`;
    modal.classList.add('open');
    const done = (v) => {
      modal.classList.remove('open');
      modal.onclick = null;
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') done(false);
      if (e.key === 'Enter') done(true);
    };
    modal.onclick = (e) => {
      const b = e.target.closest('[data-r]');
      if (b) done(b.dataset.r === '1');
      else if (e.target === modal) done(false);
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => modal.querySelector('[data-r="1"]').focus(), 30);
  });
}

async function run(btn, fn) {
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    toast(err.message, 'err');
    return undefined;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ---------- Sự kiện từ STTBot.exe ----------

function onEvent(m) {
  switch (m.event) {
    case 'log':
      S.log.push(m.line);
      if (S.log.length > 1500) S.log.splice(0, 500);
      if (S.page === 'log') appendLogLine(m.line);
      break;
    case 'bot': {
      const prev = bot().state;
      S.app.bot = m.bot;
      if (m.bot.state === 'online' && prev !== 'online') toast(`Bot đã trực tuyến: ${m.bot.name}`, 'ok');
      if (m.bot.state === 'crashed') toast('Bot dừng bất ngờ. Xem trang Nhật ký để biết lý do.', 'err');
      if (m.bot.state === 'offline' && prev === 'stopping') toast('Đã tắt bot.', 'info');
      renderBotParts();
      break;
    }
    case 'stt':
      S.stt = m;
      S.app.stt.installing = m.phase === 'running';
      if (m.phase === 'done') {
        S.app.stt.ready = true;
        toast('Đã cài xong phần nhận dạng giọng nói.', 'ok');
        refreshState();
      }
      if (m.phase === 'error') toast(m.message, 'err');
      renderSttParts();
      break;
    case 'process':
      S.processing[m.id] = m;
      if (m.phase === 'done') {
        toast(`Đã xử lý xong buổi ${m.id}.`, 'ok');
        // Ngăn chi tiết đang mở buổi này thì mở lại để hiện recap/transcript vừa làm
        loadSessions().then(() => S.drawer && S.drawer.id === m.id && openSession(m.id));
      }
      if (m.phase === 'error') toast(`Xử lý buổi ${m.id} bị lỗi. Xem Nhật ký.`, 'err');
      if (S.page === 'sessions' || S.page === 'home') renderSessionsList();
      if (S.drawer && S.drawer.id === m.id) renderDrawer();
      break;
  }
}

async function refreshState() {
  S.app = await call('getState');
  renderBotParts();
  renderSttParts();
  if (S.page === 'home') patch('#checks', checksHtml());
}

async function loadSessions() {
  S.sessions = await call('listSessions').catch(() => []);
  $('#nav-sessions').textContent = S.sessions.length || '';
  if (S.page === 'sessions' || S.page === 'home') renderSessionsList();
}

async function verifyDiscord() {
  if (!cfg().token) return;
  try {
    S.discord = await call('verifyToken', { token: cfg().token });
    S.discordError = '';
  } catch (err) {
    S.discord = null;
    S.discordError = err.message;
  }
  if (S.page === 'home') patch('#checks', checksHtml());
  if (S.page === 'settings') render();
}

function patch(sel, html) {
  const el = $(sel);
  if (!el) return;
  el.innerHTML = html;
  hydrateIcons(el);
}

// ---------- Điều hướng ----------

function setPage(page) {
  S.page = page;
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.page === page));
  render();
  $('#view').scrollTop = 0;
}

function render() {
  const pages = { home: pageHome, sessions: pageSessions, campaign: pageCampaign, settings: pageSettings, log: pageLog };
  $('#view').innerHTML = `<div class="page">${pages[S.page]()}</div>`;
  hydrateIcons($('#view'));
  if (S.page === 'log') scrollLog();
  if (S.page === 'campaign' && !S.campaign) loadCampaign();
  if (S.page === 'settings' && S.roles === null && cfg().guildId) loadRoles();
  renderSidebarBot();
}

// ---------- Bot ----------

const BOT_TEXT = {
  offline: ['Bot đang tắt', 'Bật bot trước buổi chơi. Khi bot trực tuyến, gõ /record start trong Discord để bắt đầu ghi âm.'],
  starting: ['Đang khởi động…', 'Đang đăng ký lệnh với Discord.'],
  connecting: ['Đang kết nối Discord…', 'Chỉ mất vài giây.'],
  online: ['Bot đang trực tuyến', 'Sẵn sàng. Vào kênh voice và gõ /record start để bắt đầu ghi âm buổi chơi.'],
  stopping: ['Đang tắt bot…', 'Đang lưu lại các file ghi âm.'],
  crashed: ['Bot dừng bất ngờ', 'Xem trang Nhật ký để biết lý do, rồi bật lại. File đã ghi vẫn còn nguyên.'],
};

function botHeroHtml() {
  const b = bot();
  const [title, text] = BOT_TEXT[b.state] || BOT_TEXT.offline;
  const busy = ['starting', 'connecting', 'stopping'].includes(b.state);
  const on = b.state === 'online';
  const orb = on ? 'orb--online' : busy ? 'orb--busy' : b.state === 'crashed' ? 'orb--bad' : '';
  const guild = S.discord && S.discord.guilds.find((g) => g.id === cfg().guildId);
  const power = busy
    ? `<button class="power power--busy" disabled><span class="spinner"></span></button><span class="power-label">Đợi chút…</span>`
    : on
      ? `<button class="power power--on" data-action="stopBot" title="Tắt bot">${icon('power')}</button><span class="power-label">Bấm để tắt</span>`
      : `<button class="power" data-action="startBot" title="Bật bot">${icon('power')}</button><span class="power-label">Bấm để bật</span>`;
  return `<section class="hero" data-state="${b.state}">
    <div class="hero-text">
      <div class="eyebrow"><span class="orb orb--sm ${orb}"></span>&nbsp; Trạng thái bot</div>
      <h2>${esc(title)}</h2>
      <p>${esc(text)}</p>
      <div class="hero-meta">
        ${b.name ? `<span>${icon('bot')}${esc(b.name)}</span>` : ''}
        ${guild ? `<span>${icon('shield')}${esc(guild.name)}</span>` : ''}
        ${on || b.state === 'connecting' ? `<span>${icon('clock')}<span class="tabnum" id="uptime">${fmtClock(Date.now() - b.since)}</span></span>` : ''}
      </div>
    </div>
    <div class="power-wrap">${power}</div>
  </section>`;
}

function renderSidebarBot() {
  const b = bot();
  const [title] = BOT_TEXT[b.state] || BOT_TEXT.offline;
  const orb = b.state === 'online' ? 'orb--online' : ['starting', 'connecting', 'stopping'].includes(b.state) ? 'orb--busy' : b.state === 'crashed' ? 'orb--bad' : '';
  $('#sidebar-bot').innerHTML = `<div class="mini-status"><span class="orb orb--sm ${orb}"></span>
    <div><b>${esc(title.replace('…', ''))}</b>${b.state === 'online' ? `<span class="tabnum" id="uptime-mini">${fmtClock(Date.now() - b.since)}</span>` : 'STT Bot ' + esc(S.app ? S.app.version : '')}</div></div>`;
}

function renderBotParts() {
  if (S.page === 'home') {
    const hero = $('#hero');
    if (hero) {
      hero.innerHTML = botHeroHtml();
      hydrateIcons(hero);
    }
  }
  renderSidebarBot();
}

async function startBot(btn) {
  if (!cfg().token || !cfg().guildId) return openWizard();
  if (!S.app.stt.ready) {
    const go = await confirmBox({
      title: 'Chưa cài phần nhận dạng giọng nói',
      text: 'Bot vẫn ghi âm được, nhưng chưa làm được transcript và recap cho tới khi cài xong. Vẫn bật bot?',
      ok: 'Vẫn bật',
    });
    if (!go) return;
  }
  await run(btn, () => call('startBot'));
}

async function stopBot() {
  const go = await confirmBox({
    title: 'Tắt bot?',
    text: 'Nếu đang ghi âm, phần đã ghi vẫn được lưu lại và xử lý sau được.',
    ok: 'Tắt bot',
    danger: true,
  });
  if (go) await run(null, () => call('stopBot'));
}

setInterval(() => {
  const b = bot();
  if (!b.since) return;
  const text = fmtClock(Date.now() - b.since);
  const a = $('#uptime');
  const m = $('#uptime-mini');
  if (a) a.textContent = text;
  if (m) m.textContent = text;
}, 1000);

// ---------- Trang Tổng quan ----------

function pageHome() {
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  return `
    <div class="page-head"><div><h1>${greet}, DM</h1><p>Mọi thứ cho buổi chơi hôm nay nằm ở đây.</p></div></div>
    <div id="hero">${botHeroHtml()}</div>

    <div class="section-title"><h2>Sẵn sàng chưa?</h2></div>
    <div class="grid-3" id="checks">${checksHtml()}</div>

    <div class="section-title"><h2>Dùng trong Discord</h2></div>
    <div class="howto">
      <div><span class="step-n">TRƯỚC BUỔI CHƠI</span><code class="cmd copyable" data-action="copy" data-text="/record start" title="Bấm để copy">/record start</code><p>Vào kênh voice rồi gõ lệnh này. Bot vào kênh và báo cho cả nhóm là đang ghi.</p></div>
      <div><span class="step-n">KẾT THÚC</span><code class="cmd copyable" data-action="copy" data-text="/record stop" title="Bấm để copy">/record stop</code><p>Bot dừng ghi, tự làm transcript và đăng recap vào kênh chat sau vài phút.</p></div>
      <div><span class="step-n">NGƯỜI CHƠI</span><code class="cmd copyable" data-action="copy" data-text="/optout" title="Bấm để copy">/optout</code><p>Ai không muốn bị ghi giọng thì tự gõ lệnh này. Gõ <code class="cmd">/optin</code> để bật lại.</p></div>
    </div>

    <div class="section-title"><h2>Buổi chơi gần đây</h2><button class="link" data-action="nav" data-page="sessions">Xem tất cả →</button></div>
    <div class="sessions" id="session-list" data-limit="3">${sessionsHtml(3)}</div>`;
}

function checksHtml() {
  return [discordCheck(), sttCheck(), claudeCheck()].join('');
}

function discordCheck() {
  const c = cfg();
  const guild = S.discord && S.discord.guilds.find((g) => g.id === c.guildId);
  if (c.token && c.guildId && !S.discordError) {
    return `<div class="card check check--ok">
      <div class="check-head"><div class="check-icon">${icon('bot')}</div><div><h3>Bot Discord</h3><div class="sub">Đã kết nối</div></div></div>
      <p>${S.discord ? `<b>${esc(S.discord.botName)}</b> ở server <b>${esc(guild ? guild.name : 'đã chọn')}</b>.` : 'Đang kiểm tra kết nối…'}</p>
      <div class="check-foot"><span class="pill pill--ok">Sẵn sàng</span><button class="btn btn--sm btn--ghost" data-action="nav" data-page="settings">Đổi</button></div>
    </div>`;
  }
  return `<div class="card check check--todo">
    <div class="check-head"><div class="check-icon">${icon('bot')}</div><div><h3>Bot Discord</h3><div class="sub">Bước 1</div></div></div>
    <p>${S.discordError ? esc(S.discordError) : 'Kết nối bot với server Discord của nhóm. Có hướng dẫn từng bước.'}</p>
    <div class="check-foot"><span class="pill pill--warn">Chưa xong</span><button class="btn btn--sm btn--primary" data-action="openWizard">Kết nối</button></div>
  </div>`;
}

function sttCheck() {
  const st = S.app.stt;
  const run = S.stt && S.stt.phase === 'running' ? S.stt : null;
  if (st.installing || run) {
    const r = run || { step: 0, total: 4, label: st.label || 'Đang cài…' };
    const pct = Math.max(6, Math.round(((r.step - 0.5) / r.total) * 100));
    return `<div class="card check" id="stt-card">
      <div class="check-head"><div class="check-icon">${icon('wave')}</div><div><h3>Nhận dạng giọng nói</h3><div class="sub">Đang cài, đừng tắt app</div></div></div>
      <div><div class="progress-row"><span>${esc(r.label)}</span><span>Bước ${r.step}/${r.total}</span></div><div class="progress"><div style="width:${pct}%"></div></div></div>
      <p>Tải về vài GB, mất 10 đến 30 phút tuỳ mạng. Cứ dùng app bình thường trong lúc chờ.</p>
    </div>`;
  }
  if (st.ready) {
    return `<div class="card check check--ok" id="stt-card">
      <div class="check-head"><div class="check-icon">${icon('wave')}</div><div><h3>Nhận dạng giọng nói</h3><div class="sub">Whisper, chạy trên máy này</div></div></div>
      <p>${st.gpu ? `Dùng card đồ hoạ <b>${esc(st.gpuName)}</b>, nhanh.` : 'Không có GPU NVIDIA nên chạy bằng CPU. Vẫn dùng được, chỉ chậm hơn.'}</p>
      <div class="check-foot"><span class="pill pill--ok">Đã cài</span>${st.gpu ? `<span class="pill pill--plain">${icon('cpu')} GPU</span>` : ''}</div>
    </div>`;
  }
  const failed = S.stt && S.stt.phase === 'error';
  return `<div class="card check check--todo" id="stt-card">
    <div class="check-head"><div class="check-icon">${icon('wave')}</div><div><h3>Nhận dạng giọng nói</h3><div class="sub">${st.venv ? 'Cần cập nhật' : 'Cài một lần'}</div></div></div>
    <p>${failed ? esc(S.stt.message) : 'Bộ chuyển giọng nói thành chữ chạy ngay trên máy, không gửi audio đi đâu. Tải về khoảng ' + (st.gpu ? '4GB.' : '2GB.')}</p>
    <div class="check-foot"><span class="pill ${failed ? 'pill--bad' : 'pill--warn'}">${failed ? 'Lỗi' : 'Chưa cài'}</span><button class="btn btn--sm btn--primary" data-action="installStt">${icon('download')}${failed ? 'Thử lại' : 'Cài đặt'}</button></div>
  </div>`;
}

function claudeCheck() {
  const c = S.app.claude;
  const llm = cfg().llm;
  if (llm === 'none') {
    return `<div class="card check">
      <div class="check-head"><div class="check-icon">${icon('sparkles')}</div><div><h3>Viết recap bằng AI</h3><div class="sub">Đang tắt</div></div></div>
      <p>Bot chỉ làm transcript thô, không viết recap. Bật lại trong Cài đặt.</p>
      <div class="check-foot"><span class="pill">Tắt</span><button class="btn btn--sm btn--ghost" data-action="nav" data-page="settings">Cài đặt</button></div>
    </div>`;
  }
  if (c.installed && c.loggedIn) {
    return `<div class="card check check--ok">
      <div class="check-head"><div class="check-icon">${icon('sparkles')}</div><div><h3>Viết recap bằng Claude</h3><div class="sub">${esc(c.email)}</div></div></div>
      <p>Claude biên tập transcript, viết recap cho cả nhóm và ghi chú riêng cho DM.</p>
      <div class="check-foot"><span class="pill pill--ok">Đã đăng nhập${c.plan ? ' · ' + esc(c.plan) : ''}</span><button class="btn btn--sm btn--ghost" data-action="loginClaude">Đổi tài khoản</button></div>
    </div>`;
  }
  return `<div class="card check check--todo">
    <div class="check-head"><div class="check-icon">${icon('sparkles')}</div><div><h3>Viết recap bằng Claude</h3><div class="sub">Cần gói Claude Pro</div></div></div>
    <p>${c.installed ? 'Đăng nhập tài khoản Claude để bot viết recap. Không tốn thêm tiền ngoài gói Pro.' : 'Cài Claude Code (1 phút) rồi đăng nhập tài khoản Claude Pro để bot tự viết recap.'}</p>
    <div class="check-foot"><span class="pill pill--warn">${c.installed ? 'Chưa đăng nhập' : 'Chưa cài'}</span>
      <button class="btn btn--sm btn--primary" data-action="${c.installed ? 'loginClaude' : 'installClaude'}">${c.installed ? 'Đăng nhập' : icon('download') + 'Cài đặt'}</button></div>
  </div>`;
}

function renderSttParts() {
  const card = $('#stt-card');
  if (card) {
    card.outerHTML = sttCheck();
    hydrateIcons($('#checks') || document);
  }
  if (S.wiz && S.wiz.step === 3) renderWizard();
}

async function installStt(btn) {
  const gpu = S.app.stt.gpu;
  const go = await confirmBox({
    title: 'Cài phần nhận dạng giọng nói',
    text: gpu
      ? `Sẽ tải về khoảng 4GB (Python, thư viện cho ${S.app.stt.gpuName}, model Whisper). Mất 10 đến 30 phút tuỳ mạng. Trong lúc chờ vẫn dùng app được.`
      : 'Máy không có GPU NVIDIA nên Whisper sẽ chạy bằng CPU (chậm hơn nhiều). Sẽ tải về khoảng 2GB.',
    ok: 'Bắt đầu cài',
  });
  if (!go) return;
  S.stt = { phase: 'running', step: 0, total: gpu ? 4 : 3, label: 'Chuẩn bị…' };
  S.app.stt.installing = true;
  renderSttParts();
  await run(btn, () => call('installStt'));
}

async function claudeAction(cmd, btn) {
  if (cmd === 'loginClaude') {
    const go = await confirmBox({
      title: 'Đăng nhập Claude',
      text: 'Một cửa sổ đen sẽ mở ra. Chọn đăng nhập bằng tài khoản Claude (gói Pro), làm theo hướng dẫn trên trình duyệt, xong thì đóng cửa sổ đen.',
      ok: 'Mở cửa sổ đăng nhập',
    });
    if (!go) return;
  } else {
    const go = await confirmBox({
      title: 'Cài Claude Code',
      text: 'Một cửa sổ sẽ mở và cài Claude Code từ trang chính thức claude.ai. Đợi nó báo xong rồi bấm Enter để đóng.',
      ok: 'Cài đặt',
    });
    if (!go) return;
  }
  const status = await run(btn, () => call(cmd));
  if (!status) return;
  S.app.claude = status;
  if (status.loggedIn) toast(`Đã đăng nhập Claude: ${status.email}`, 'ok');
  else if (cmd === 'installClaude' && status.installed) toast('Đã cài Claude Code. Giờ đăng nhập nhé.', 'ok');
  if (S.page === 'home') patch('#checks', checksHtml());
  if (S.wiz) renderWizard();
}

// ---------- Trang Buổi chơi ----------

function pageSessions() {
  return `
    <div class="page-head">
      <div><h1>Buổi chơi</h1><p>Mỗi lần ghi âm là một buổi. Bấm vào để đọc recap, ghi chú và transcript.</p></div>
      <div class="toolbar">
        <div class="search">${icon('search')}<input class="input" id="session-search" placeholder="Tìm buổi chơi…" value="${esc(S.sessionFilter)}"></div>
        <button class="btn btn--icon" data-action="openPath" data-kind="sessions" title="Mở thư mục">${icon('folder')}</button>
      </div>
    </div>
    <div class="sessions" id="session-list">${sessionsHtml()}</div>`;
}

function sessionStatus(s) {
  const p = S.processing[s.id];
  if (p && p.phase === 'running') return `<span class="pill pill--warn"><span class="spinner spinner--sm" style="border-top-color:currentColor"></span>${esc(p.label)}</span>`;
  if (s.files.includes('recap.md')) return '<span class="pill pill--ok">Có recap</span>';
  if (s.files.includes('transcript_raw.md')) return '<span class="pill pill--warn">Chỉ có transcript</span>';
  if (!s.segments) return '<span class="pill">Trống</span>';
  return '<span class="pill pill--warn">Chưa xử lý</span>';
}

function sessionsHtml(limit) {
  let list = S.sessions;
  const q = S.sessionFilter.trim().toLowerCase();
  if (q) list = list.filter((s) => [s.id, s.channel, s.preview, ...s.speakers].join(' ').toLowerCase().includes(q));
  if (limit) list = list.slice(0, limit);
  if (!list.length) {
    return `<div class="card empty">${icon('scroll')}<h3>${q ? 'Không tìm thấy' : 'Chưa có buổi chơi nào'}</h3>
      <p>${q ? 'Thử từ khoá khác.' : 'Bật bot, vào kênh voice và gõ /record start. Buổi chơi sẽ hiện ở đây.'}</p></div>`;
  }
  return list
    .map((s) => {
      const d = sessionDate(s);
      const dur = s.startedAt && s.endedAt ? fmtDuration(new Date(s.endedAt) - new Date(s.startedAt)) : '';
      const title = `${s.channel ? esc(s.channel) + ' · ' : ''}${d ? WEEKDAYS[d.getDay()] + ', ' + d.toLocaleDateString('vi-VN') : esc(s.id)}`;
      return `<div class="session" role="button" tabindex="0" aria-label="${esc(s.title || (d ? WEEKDAYS[d.getDay()] + ', ' + d.toLocaleDateString('vi-VN') : s.id))}" data-action="openSession" data-id="${esc(s.id)}">
        <div class="date-tile"><b>${d ? d.getDate() : '?'}</b><span>Th ${d ? d.getMonth() + 1 : ''}</span></div>
        <div style="min-width:0">
          <h3>${s.title ? esc(s.title) : title}</h3>
          <div class="meta">
            ${s.title && d ? `<span>${esc(WEEKDAYS[d.getDay()])}, ${d.toLocaleDateString('vi-VN')}</span>` : ''}
            ${d ? `<span>${icon('clock')}${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}${dur ? ' · ' + dur : ''}</span>` : ''}
            <span>${icon('wave')}${s.segments} đoạn ghi</span>
            ${s.speakers.length ? `<span>${icon('users')}${s.speakers.length} người</span>` : ''}
          </div>
          ${s.preview ? `<p class="preview">${esc(s.preview)}</p>` : ''}
        </div>
        <div class="session-side">${sessionStatus(s)}<div class="stack">${s.speakers.slice(0, 5).map((n) => avatar(n)).join('')}</div></div>
      </div>`;
    })
    .join('');
}

function renderSessionsList() {
  const el = $('#session-list');
  if (!el) return;
  el.innerHTML = sessionsHtml(el.dataset.limit ? +el.dataset.limit : undefined);
}

// ---------- Ngăn chi tiết buổi chơi ----------

const FILE_TABS = [
  ['recap.md', 'Recap'],
  ['notes.md', 'Ghi chú DM'],
  ['transcript_clean.md', 'Transcript'],
  ['transcript_raw.md', 'Transcript thô'],
];

async function openSession(id) {
  const s = S.sessions.find((x) => x.id === id);
  if (!s) return;
  const tab = FILE_TABS.find(([f]) => s.files.includes(f));
  S.drawer = { id, tab: tab ? tab[0] : null, text: '', loading: !!tab };
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('#drawer-backdrop').classList.add('open');
  renderDrawer();
  if (tab) await loadDrawerFile(tab[0]);
}

async function loadDrawerFile(file) {
  const d = S.drawer;
  d.tab = file;
  d.loading = true;
  renderDrawer();
  d.text = await call('readSessionFile', { id: d.id, file }).catch((e) => `Không đọc được file: ${e.message}`);
  d.loading = false;
  if (S.drawer === d) renderDrawer();
}

function closeDrawer() {
  S.drawer = null;
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  $('#drawer-backdrop').classList.remove('open');
}

function renderDrawer() {
  const d = S.drawer;
  if (!d) return;
  const s = S.sessions.find((x) => x.id === d.id) || { id: d.id, files: [], speakers: [], segments: 0 };
  const date = sessionDate(s);
  const p = S.processing[s.id];
  const running = p && p.phase === 'running';
  const hasRecap = s.files.includes('recap.md');
  const noLlm = cfg().llm === 'none';
  let body;
  if (!d.tab) {
    body = `<div class="empty">${icon('wand')}<h3>Buổi này chưa được xử lý</h3><p>${s.segments ? 'Bấm "Làm transcript và recap" để chuyển phần ghi âm thành chữ và viết recap.' : 'Buổi này không có đoạn ghi âm nào.'}</p></div>`;
  } else if (d.loading) {
    body = '<div class="boot" style="height:200px"><div class="spinner"></div></div>';
  } else if (d.tab.startsWith('transcript')) {
    body = transcriptHtml(d.text);
  } else {
    body = `<div class="prose">${markdown(d.text)}</div>`;
  }
  $('#drawer').innerHTML = `
    <div class="drawer-head">
      <div class="top">
        <div><div class="eyebrow">${esc([s.channel, date ? WEEKDAYS[date.getDay()] + ', ' + date.toLocaleDateString('vi-VN') : ''].filter(Boolean).join(' · ') || 'Buổi chơi')}</div>
          <h2>${esc(s.title || (date ? WEEKDAYS[date.getDay()] + ', ' + date.toLocaleDateString('vi-VN') : s.id))}</h2>
          <div class="hint">${s.segments} đoạn ghi · ${s.speakers.length ? esc(s.speakers.join(', ')) : 'chưa rõ người nói'}</div></div>
        <button class="btn btn--icon btn--ghost" data-action="closeDrawer" title="Đóng (Esc)">${icon('x')}</button>
      </div>
      <div class="drawer-actions">
        ${s.segments && !(hasRecap && s.files.includes('notes.md')) && !(noLlm && s.files.includes('transcript_raw.md')) ? `<button class="btn ${hasRecap ? '' : 'btn--primary'}" data-action="processSession" data-id="${esc(s.id)}" ${running ? 'disabled' : ''}>
          ${running ? `<span class="spinner spinner--sm"></span>${esc(p.label)}` : icon(hasRecap ? 'refresh' : 'wand') + (hasRecap ? 'Làm lại phần còn thiếu' : noLlm ? 'Làm transcript' : 'Làm transcript và recap')}</button>` : ''}
        ${d.tab && !d.loading ? `<button class="btn" data-action="copyDrawer">${icon('copy')}Copy</button>` : ''}
        <button class="btn" data-action="openSessionFolder" data-id="${esc(s.id)}">${icon('folder')}Mở thư mục</button>
      </div>
      <div class="tabs">${FILE_TABS.map(([f, label]) => `<button class="${d.tab === f ? 'on' : ''}" data-action="drawerTab" data-file="${f}" ${s.files.includes(f) ? '' : 'disabled'}>${label}</button>`).join('')}</div>
    </div>
    <div class="drawer-body">${body}</div>`;
}

function inline(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, '$1<em>$2</em>');
}

function markdown(src) {
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`);
    list = null;
  };
  for (const raw of esc(src).split(/\r?\n/)) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara();
      flushList();
      const n = Math.min(m[1].length, 3);
      out.push(`<h${n}>${inline(m[2])}</h${n}>`);
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushPara();
      flushList();
      out.push('<hr>');
    } else if ((m = line.match(/^\s*[-*+]\s+(.*)$/)) || (m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara();
      const type = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(m[1]);
    } else if ((m = line.match(/^&gt;\s?(.*)$/))) {
      flushPara();
      flushList();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return out.join('\n');
}

function transcriptHtml(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:\[(IC|OOC)\]\s*)?\[(\d{2}:\d{2}:\d{2})\]\s*([^:]{1,60}):\s*(.*)$/);
    if (!m) continue;
    const tag = m[1] ? `<span class="tag tag--${m[1].toLowerCase()}">${m[1]}</span>` : '';
    rows.push(`<div class="tline ${m[1] === 'OOC' ? 'tline--ooc' : ''}"><time>${m[2]}</time><span class="who" title="${esc(m[3])}">${esc(m[3])}</span><span class="what">${tag}${esc(m[4])}</span></div>`);
  }
  return rows.length ? `<div class="transcript">${rows.join('')}</div>` : `<div class="prose">${markdown(text)}</div>`;
}

async function processSession(id, btn) {
  await run(btn, () => call('processSession', { id }));
}

// ---------- Trang Chiến dịch ----------

async function loadCampaign() {
  S.campaign = await call('getCampaign').catch((e) => {
    toast(e.message, 'err');
    return { players: [], known: [], glossary: '' };
  });
  S.campaignDirty = false;
  S.glossaryDirty = false;
  if (S.page === 'campaign') render();
}

function pageCampaign() {
  const c = S.campaign;
  if (!c) return '<div class="boot" style="height:300px"><div class="spinner"></div></div>';
  const ids = new Set(c.players.map((p) => p.id));
  const suggestions = c.known.filter((k) => !ids.has(k.id));
  const knownById = Object.fromEntries(c.known.map((k) => [k.id, k]));
  return `
    <div class="page-head"><div><h1>Chiến dịch</h1><p>Cho bot biết ai là ai và tên riêng trong thế giới của bạn, để transcript và recap ghi đúng.</p></div></div>

    <div class="section-title" style="margin-top:0"><h2>Người chơi</h2><span class="hint">Transcript sẽ ghi "Thorin (Minh)" thay vì tên Discord</span></div>
    <div class="card">
      ${c.players.length ? `<div class="player-head"><span></span><span>Discord</span><span>Tên người chơi</span><span>Nhân vật</span><span>Vai trò</span><span></span></div>` : ''}
      <div class="player-list" id="players">
        ${c.players.length ? c.players.map((p, i) => playerRow(p, i, knownById[p.id])).join('') : `<div class="empty" style="padding:36px 20px">${icon('users')}<h3>Chưa khai báo ai</h3><p>${suggestions.length ? 'Chọn từ những người đã nói trong các buổi trước ở bên dưới.' : 'Sau buổi ghi âm đầu tiên, những người đã nói sẽ hiện ở đây để thêm bằng một cú bấm.'}</p></div>`}
      </div>
    </div>
    ${suggestions.length ? `<div style="margin-top:14px"><div class="hint" style="margin-bottom:10px">Những người đã nói trong các buổi trước, bấm để thêm:</div>
      <div class="chips">${suggestions.map((k) => `<button class="chip" data-action="addPlayer" data-id="${esc(k.id)}">${avatar(k.displayName)}${esc(k.displayName)}${icon('plus')}</button>`).join('')}</div></div>` : ''}
    <div style="margin-top:12px"><button class="link" data-action="addPlayerManual">+ Thêm bằng Discord User ID</button></div>
    ${S.campaignDirty ? `<div class="savebar"><span>Danh sách người chơi có thay đổi chưa lưu.</span><div class="toolbar"><button class="btn btn--ghost" data-action="discardPlayers">Huỷ</button><button class="btn btn--primary" data-action="savePlayers">${icon('check')}Lưu</button></div></div>` : ''}

    <div class="section-title"><h2>Tên riêng</h2><span class="hint">Mỗi dòng một tên: NPC, địa danh, thần, phe phái…</span></div>
    <div class="card" style="padding:18px">
      <textarea class="textarea" id="glossary" spellcheck="false" placeholder="Varenhal&#10;Thorin Khiên Sắt&#10;Hội Bàn Tay Bạc">${esc(c.glossary)}</textarea>
      <div class="check-foot" style="margin-top:12px">
        <span class="hint">Danh sách càng đủ, Whisper và Claude càng nhận đúng tên. Dòng bắt đầu bằng # là ghi chú.</span>
        <button class="btn ${S.glossaryDirty ? 'btn--primary' : ''}" data-action="saveGlossary" id="save-glossary" ${S.glossaryDirty ? '' : 'disabled'}>${icon('check')}Lưu tên riêng</button>
      </div>
    </div>`;
}

function playerRow(p, i, known) {
  return `<div class="player" data-i="${i}">
    ${avatar(p.name || (known && known.displayName) || p.id)}
    <div class="who"><b>${esc(known ? known.displayName : 'Không rõ')}</b><small>${esc(p.id)}</small></div>
    <input class="input" data-field="name" value="${esc(p.name)}" placeholder="Tên thật, vd. Minh">
    <input class="input" data-field="character" value="${esc(p.character)}" placeholder="${p.role === 'dm' ? 'DM' : 'Tên nhân vật'}" ${p.role === 'dm' ? 'disabled' : ''}>
    <div class="segmented"><button class="${p.role !== 'dm' ? 'on' : ''}" data-action="setRole" data-role="player">Người chơi</button><button class="${p.role === 'dm' ? 'on' : ''}" data-action="setRole" data-role="dm">DM</button></div>
    <button class="btn btn--icon btn--ghost" data-action="removePlayer" title="Xoá">${icon('trash')}</button>
  </div>`;
}

function markPlayersDirty() {
  if (!S.campaignDirty) {
    S.campaignDirty = true;
    render();
  }
}

async function addPlayerManual() {
  const modal = $('#modal');
  modal.innerHTML = `<div class="modal"><h3>Thêm người chơi bằng ID</h3>
    <p style="margin-bottom:16px">Trong Discord: Cài đặt người dùng → Nâng cao → bật Chế độ nhà phát triển. Sau đó chuột phải vào tên người chơi → Sao chép ID người dùng.</p>
    <div class="field"><label>Discord User ID</label><input class="input input--mono" id="manual-id" placeholder="435328423360200714"></div>
    <div class="modal-actions"><button class="btn" data-r="0">Huỷ</button><button class="btn btn--primary" data-r="1">Thêm</button></div></div>`;
  modal.classList.add('open');
  setTimeout(() => $('#manual-id').focus(), 30);
  modal.onclick = (e) => {
    const b = e.target.closest('[data-r]');
    if (!b && e.target !== modal) return;
    if (b && b.dataset.r === '1') {
      const id = $('#manual-id').value.trim();
      if (!/^\d{15,25}$/.test(id)) return toast('ID là một dãy 17 đến 20 chữ số.', 'err');
      if (S.campaign.players.some((p) => p.id === id)) return toast('Người này đã có trong danh sách.', 'err');
      S.campaign.players.push({ id, name: '', character: '', role: 'player' });
      S.campaignDirty = true;
      render();
    }
    modal.classList.remove('open');
  };
}

async function savePlayers(btn) {
  const missing = S.campaign.players.find((p) => !p.name.trim());
  if (missing) return toast('Điền tên cho tất cả người chơi trước khi lưu.', 'err');
  const res = await run(btn, () => call('savePlayers', { players: S.campaign.players }));
  if (!res) return;
  S.campaign = res;
  S.campaignDirty = false;
  render();
  toast('Đã lưu danh sách người chơi.', 'ok');
}

// ---------- Trang Cài đặt ----------

async function loadRoles() {
  S.roles = [];
  S.roles = await call('listRoles', { guildId: cfg().guildId }).catch(() => []);
  if (S.page === 'settings') render();
}

function pageSettings() {
  const c = cfg();
  const d = S.discord;
  const guild = d && d.guilds.find((g) => g.id === c.guildId);
  const silence = +c.silenceMs || 1200;
  return `
    <div class="page-head"><div><h1>Cài đặt</h1><p>Thay đổi được lưu ngay. Bot đang chạy thì tắt và bật lại để áp dụng.</p></div></div>

    <div class="card">
      <div class="identity">
        ${d ? avatar(d.botName, d.avatarUrl, 'avatar--lg') : `<div class="avatar avatar--lg">${icon('bot')}</div>`}
        <div style="flex:1;min-width:0">
          <h3>${d ? esc(d.botName) : c.token ? 'Đang kiểm tra bot…' : 'Chưa kết nối bot'}</h3>
          <div class="sub">${S.discordError ? `<span class="err">${esc(S.discordError)}</span>` : guild ? `Đang phục vụ server <b>${esc(guild.name)}</b>` : d ? 'Chưa chọn server' : 'Dán token bot để bắt đầu'}</div>
        </div>
        <button class="btn" data-action="openWizard">${icon('link')}${c.token ? 'Kết nối lại' : 'Kết nối bot'}</button>
      </div>
      ${d ? `<div class="setting"><div><h3>Server</h3><p>Server Discord nơi nhóm chơi. Bot phải được mời vào server đó.</p></div>
        <div class="control"><select class="select" data-setting="guildId">${d.guilds.map((g) => `<option value="${esc(g.id)}" ${g.id === c.guildId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}${guild ? '' : '<option value="" selected>Chọn server…</option>'}</select>
        <button class="btn btn--icon" data-action="openUrl" data-url="${esc(d.inviteUrl)}" title="Mời bot vào server khác">${icon('plus')}</button></div></div>` : ''}
      <div class="setting"><div><h3>Ai được bật/tắt ghi âm</h3><p>Chỉ người có role này mới dùng được /record start và /record stop.</p></div>
        <div class="control"><select class="select" data-setting="roleId">
          <option value="">Mọi người trong server</option>
          ${(S.roles || []).map((r) => `<option value="${esc(r.id)}" ${r.id === c.roleId ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
          ${c.roleId && !(S.roles || []).some((r) => r.id === c.roleId) ? `<option value="${esc(c.roleId)}" selected>Role ${esc(c.roleId)}</option>` : ''}
        </select></div></div>
    </div>

    <div class="section-title"><h2>Ghi âm và nhận dạng</h2></div>
    <div class="card settings">
      <div class="setting"><div><h3>Chất lượng nhận dạng</h3><p>Chính xác hơn thì chậm gấp đôi, dùng nhiều bộ nhớ card đồ hoạ hơn và tải thêm model 3GB ở lần chạy đầu.</p></div>
        <div class="control"><div class="segmented">
          <button class="${c.whisperModel !== 'large-v3' ? 'on' : ''}" data-action="setSetting" data-key="whisperModel" data-value="large-v3-turbo">Nhanh</button>
          <button class="${c.whisperModel === 'large-v3' ? 'on' : ''}" data-action="setSetting" data-key="whisperModel" data-value="large-v3">Chính xác</button>
        </div></div></div>
      <div class="setting"><div><h3>Ngắt câu khi im lặng</h3><p>Ai hay ngập ngừng giữa câu thì tăng lên để câu không bị cắt vụn.</p></div>
        <div class="control"><input type="range" class="range" min="600" max="2500" step="100" value="${silence}" data-setting="silenceMs"><span class="tabnum" id="silence-val" style="width:52px;text-align:right">${(silence / 1000).toFixed(1)}s</span></div></div>
    </div>

    <div class="section-title"><h2>Biên tập bằng AI</h2></div>
    <div class="card settings">
      <div class="setting"><div><h3>Viết recap và ghi chú</h3><p>Claude sửa lỗi transcript, viết recap cho cả nhóm và ghi chú NPC, quest, loot cho DM.</p></div>
        <div class="control"><div class="segmented">
          <button class="${c.llm === 'claude' ? 'on' : ''}" data-action="setSetting" data-key="llm" data-value="claude">Claude</button>
          ${c.llm === 'gemini' ? '<button class="on">Gemini</button>' : ''}
          <button class="${c.llm === 'none' ? 'on' : ''}" data-action="setSetting" data-key="llm" data-value="none">Tắt</button>
        </div></div></div>
      ${c.llm === 'claude' ? `<div class="setting"><div><h3>Tài khoản Claude</h3><p>${S.app.claude.loggedIn ? `Đang dùng <b>${esc(S.app.claude.email)}</b>${S.app.claude.plan ? ' (' + esc(S.app.claude.plan) + ')' : ''}.` : S.app.claude.installed ? 'Chưa đăng nhập.' : 'Chưa cài Claude Code.'}</p></div>
        <div class="control"><button class="btn" data-action="${S.app.claude.installed ? 'loginClaude' : 'installClaude'}">${S.app.claude.installed ? (S.app.claude.loggedIn ? 'Đổi tài khoản' : 'Đăng nhập') : 'Cài Claude Code'}</button></div></div>` : ''}
    </div>

    <div class="section-title"><h2>Nâng cao</h2></div>
    <div class="card settings">
      <div class="setting"><div><h3>Nhận dạng giọng nói</h3><p>${S.app.stt.ready ? 'Đã cài.' : 'Chưa cài.'} Cài lại nếu bộ nhận dạng báo lỗi.</p></div>
        <div class="control"><button class="btn" data-action="installStt" ${S.app.stt.installing ? 'disabled' : ''}>${icon('refresh')}Cài lại</button></div></div>
      <div class="setting"><div><h3>File cấu hình</h3><p>Sửa trực tiếp file .env cho các tuỳ chọn hiếm dùng.</p></div>
        <div class="control"><button class="btn" data-action="openPath" data-kind="env">Mở .env</button><button class="btn" data-action="openPath" data-kind="app">${icon('folder')}Thư mục app</button></div></div>
      <div class="setting"><div><h3>Phiên bản</h3><p>STT Bot ${esc(S.app.version)}</p></div>
        <div class="control"><button class="btn" data-action="openUrl" data-url="https://github.com/Buim1nh/stt-bot-discord/releases">${icon('external')}Bản mới</button></div></div>
    </div>`;
}

async function saveSetting(key, value) {
  const res = await run(null, () => call('saveConfig', { [key]: value }));
  if (!res) return;
  S.app = res;
  if (key === 'guildId') {
    S.roles = null;
    loadRoles();
  }
  if (bot().state === 'online') toast('Đã lưu. Tắt và bật lại bot để áp dụng.', 'info');
  else toast('Đã lưu.', 'ok');
  if (S.page === 'settings') render();
}

// ---------- Trang Nhật ký ----------

function logLineHtml(line) {
  const t = line.slice(0, 8);
  const rest = line.slice(10);
  const cls = /lỗi|error|exception|traceback|thất bại|failed/i.test(rest) ? 'e' : /^==/.test(rest) ? 's' : /online|xong|thành công/i.test(rest) ? 'ok' : '';
  return `<div><span class="t">${esc(t)}</span>  <span class="${cls}">${esc(rest)}</span></div>`;
}

function pageLog() {
  return `
    <div class="page-head">
      <div><h1>Nhật ký</h1><p>Những gì bot và trình cài đặt đang làm. Gửi file nhật ký cho người hỗ trợ khi gặp lỗi.</p></div>
      <div class="toolbar"><button class="btn" data-action="copyLog">${icon('copy')}Copy</button><button class="btn" data-action="openPath" data-kind="logs">${icon('folder')}Mở file nhật ký</button></div>
    </div>
    <div class="console" id="console">${S.log.length ? S.log.map(logLineHtml).join('') : '<span class="t">Chưa có gì.</span>'}</div>`;
}

function appendLogLine(line) {
  const el = $('#console');
  if (!el) return;
  const stick = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  el.insertAdjacentHTML('beforeend', logLineHtml(line));
  if (stick) el.scrollTop = el.scrollHeight;
}

function scrollLog() {
  const el = $('#console');
  if (el) el.scrollTop = el.scrollHeight;
}

// ---------- Trình hướng dẫn kết nối ----------

const WIZ_STEPS = ['Chào mừng', 'Tạo bot Discord', 'Mời vào server', 'Cài thành phần', 'Hoàn tất'];

function openWizard() {
  const c = cfg();
  S.wiz = { step: c.token ? 1 : 0, token: c.token || '', verify: S.discord, error: '', busy: false, guildId: c.guildId, showToken: false };
  $('#wizard').classList.add('open');
  renderWizard();
}

function closeWizard() {
  S.wiz = null;
  clearInterval(wizPoll);
  $('#wizard').classList.remove('open');
  render();
}

let wizPoll = null;

function renderWizard() {
  const w = S.wiz;
  if (!w) return;
  clearInterval(wizPoll);
  const steps = WIZ_STEPS.map(
    (name, i) => `<div class="wstep ${i === w.step ? 'on' : i < w.step ? 'done' : ''}"><span class="n">${i < w.step ? icon('check') : i + 1}</span>${name}</div>`,
  ).join('');
  const views = [wizWelcome, wizToken, wizServer, wizComponents, wizDone];
  const { title, lead, body, foot } = views[w.step]();
  $('#wizard').innerHTML = `<div class="wizard">
    <div class="wizard-side">
      <div class="brand"><div class="brand-mark">${$('.brand-mark').innerHTML}</div><div><div class="brand-name">STT Bot</div><div class="brand-sub">Thiết lập</div></div></div>
      ${steps}
      <div style="margin-top:auto"><button class="btn btn--ghost btn--sm" data-action="closeWizard">${cfg().token && cfg().guildId ? 'Đóng' : 'Làm sau'}</button></div>
    </div>
    <div class="wizard-main">
      <h2>${title}</h2><p class="lead">${lead}</p>
      <div class="wizard-body">${body}</div>
      <div class="wizard-foot">${foot}</div>
    </div></div>`;
  hydrateIcons($('#wizard'));
  const input = $('#wiz-token');
  if (input) {
    input.addEventListener('input', () => {
      w.token = input.value;
      w.error = '';
    });
    input.addEventListener('keydown', (e) => e.key === 'Enter' && wizVerify($('[data-action="wizVerify"]')));
    if (!w.verify) input.focus();
  }
  // Ở bước mời bot: tự kiểm tra lại danh sách server mỗi 4 giây
  if (w.step === 2 && w.verify && !w.verify.guilds.length) {
    wizPoll = setInterval(async () => {
      const v = await call('verifyToken', { token: w.token }).catch(() => null);
      if (v && v.guilds.length && S.wiz === w) {
        w.verify = v;
        if (v.guilds.length === 1) w.guildId = v.guilds[0].id;
        renderWizard();
      }
    }, 4000);
  }
}

const back = (step) => `<button class="btn btn--ghost" data-action="wizGo" data-step="${step}">${icon('arrowLeft')}Quay lại</button>`;

function wizWelcome() {
  return {
    title: 'Chào DM, cùng thiết lập nhé',
    lead: 'Mất khoảng 5 phút. Xong rồi chỉ cần bấm một nút trước mỗi buổi chơi.',
    body: `<div class="welcome-art">
        <div>${icon('mic')}<b>Ghi âm từng người</b><small>Bot ngồi trong kênh voice, ghi riêng giọng mỗi người khi bạn gõ /record start.</small></div>
        <div>${icon('wave')}<b>Chuyển thành chữ</b><small>Whisper chạy ngay trên máy bạn, audio không gửi đi đâu.</small></div>
        <div>${icon('book')}<b>Recap tự động</b><small>Claude viết recap cho cả nhóm và ghi chú NPC, quest, loot cho DM.</small></div>
      </div>
      <div class="hint">Bạn cần: quyền quản lý server Discord của nhóm. Nên có thêm card đồ hoạ NVIDIA và gói Claude Pro.</div>`,
    foot: `<span></span><button class="btn btn--primary btn--lg" data-action="wizGo" data-step="1">Bắt đầu${icon('arrowRight')}</button>`,
  };
}

function wizToken() {
  const w = S.wiz;
  const v = w.verify;
  return {
    title: 'Tạo bot Discord của riêng bạn',
    lead: 'Mỗi nhóm dùng một bot riêng. Làm theo 3 bước rồi dán token vào ô bên dưới.',
    body: `<ol class="steps-list">
        <li><span>Mở <button class="link" data-action="openUrl" data-url="https://discord.com/developers/applications">Discord Developer Portal</button>, đăng nhập, bấm <b>New Application</b> và đặt tên, ví dụ "Bot Ghi Âm".</span></li>
        <li><span>Ở menu trái chọn <b>Bot</b>, bấm <b>Reset Token</b> rồi <b>Copy</b>.</span></li>
        <li><span>Dán token vào ô bên dưới. App sẽ tự lấy các thông tin còn lại.</span></li>
      </ol>
      <div class="field">
        <label for="wiz-token">Token bot</label>
        <div class="input-wrap"><input class="input input--mono" id="wiz-token" type="${w.showToken ? 'text' : 'password'}" value="${esc(w.token)}" placeholder="MTUx...dài khoảng 70 ký tự" autocomplete="off" spellcheck="false">
        <button class="btn btn--ghost" data-action="wizToggleToken" title="Hiện/ẩn">${icon(w.showToken ? 'eyeOff' : 'eye')}</button></div>
        <span class="hint">Token như mật khẩu của bot, đừng gửi cho ai. App chỉ lưu nó trên máy này.</span>
      </div>
      ${w.error ? `<div class="err">${icon('alert')}<span>${esc(w.error)}</span></div>` : ''}
      ${v ? `<div class="bot-found">${avatar(v.botName, v.avatarUrl)}<div><b>${esc(v.botName)}</b><small>Token hợp lệ · đang ở ${v.guilds.length} server</small></div></div>` : ''}`,
    foot: `${back(0)}${v
      ? `<button class="btn btn--primary btn--lg" data-action="wizGo" data-step="2">Tiếp tục${icon('arrowRight')}</button>`
      : `<button class="btn btn--primary btn--lg" data-action="wizVerify" ${w.busy ? 'disabled' : ''}>${w.busy ? '<span class="spinner spinner--sm"></span>Đang kiểm tra' : 'Kiểm tra token'}</button>`}`,
  };
}

function wizServer() {
  const w = S.wiz;
  const v = w.verify;
  const guilds = v.guilds;
  return {
    title: 'Mời bot vào server của nhóm',
    lead: 'Bấm nút mời, chọn server trên trang Discord rồi bấm Authorize. Quay lại đây là thấy server hiện ra.',
    body: `<div class="mini-card">${avatar(v.botName, v.avatarUrl)}<div class="grow"><b>Mời ${esc(v.botName)}</b><small>Cần quyền Quản lý server. Bot chỉ xin quyền xem kênh, gửi tin, gửi file, vào và nói trong kênh voice.</small></div>
        <button class="btn btn--primary" data-action="openUrl" data-url="${esc(v.inviteUrl)}">${icon('external')}Mời bot</button></div>
      ${guilds.length
        ? `<div class="field"><label>Chọn server nhóm chơi</label><div class="servers">${guilds.map((g) => `<button class="server ${g.id === w.guildId ? 'on' : ''}" data-action="wizPickGuild" data-id="${esc(g.id)}">${avatar(g.name, g.iconUrl)}<span>${esc(g.name)}</span></button>`).join('')}</div></div>
           <div class="hint">Không thấy server? Mời bot vào rồi bấm <button class="link" data-action="wizRefresh">tải lại danh sách</button>.</div>`
        : `<div class="waiting"><span class="spinner spinner--sm"></span>Đang chờ bot được mời vào server…</div>`}
      ${w.error ? `<div class="err">${icon('alert')}<span>${esc(w.error)}</span></div>` : ''}`,
    foot: `${back(1)}<button class="btn btn--primary btn--lg" data-action="wizSaveDiscord" ${w.guildId && guilds.some((g) => g.id === w.guildId) ? '' : 'disabled'}>Lưu và tiếp tục${icon('arrowRight')}</button>`,
  };
}

function wizComponents() {
  const st = S.app.stt;
  const c = S.app.claude;
  const run = S.stt && S.stt.phase === 'running' ? S.stt : null;
  const sttBody = st.installing || run
    ? `<div class="grow"><b>Nhận dạng giọng nói</b><div class="progress-row" style="margin:6px 0"><span>${esc((run || {}).label || st.label)}</span><span>${run ? `Bước ${run.step}/${run.total}` : ''}</span></div>
        <div class="progress"><div style="width:${run ? Math.max(6, Math.round(((run.step - 0.5) / run.total) * 100)) : 10}%"></div></div></div>`
    : `<div class="grow"><b>Nhận dạng giọng nói</b><small>${st.ready ? 'Đã cài' + (st.gpu ? ' · ' + esc(st.gpuName) : ' · chạy bằng CPU') : `Whisper chạy trên máy, tải về khoảng ${st.gpu ? '4GB' : '2GB'}.`}</small></div>
       ${st.ready ? '<span class="pill pill--ok">Xong</span>' : `<button class="btn btn--primary" data-action="installStt">${icon('download')}Cài đặt</button>`}`;
  return {
    title: 'Cài các thành phần',
    lead: 'Mỗi thứ chỉ cài một lần. Phần nhận dạng giọng nói tải khá lâu, cứ để nó chạy, bạn có thể bấm Tiếp tục.',
    body: `<div class="mini-card"><div class="check-icon">${icon('wave')}</div>${sttBody}</div>
      <div class="mini-card"><div class="check-icon">${icon('sparkles')}</div>
        <div class="grow"><b>Claude viết recap</b><small>${c.loggedIn ? 'Đã đăng nhập ' + esc(c.email) : c.installed ? 'Đã cài, cần đăng nhập tài khoản Claude Pro.' : 'Cần gói Claude Pro. Không có thì bỏ qua, bot vẫn làm transcript.'}</small></div>
        ${c.loggedIn ? '<span class="pill pill--ok">Xong</span>' : `<button class="btn" data-action="${c.installed ? 'loginClaude' : 'installClaude'}">${c.installed ? 'Đăng nhập' : icon('download') + 'Cài đặt'}</button>`}</div>`,
    foot: `${back(2)}<button class="btn btn--primary btn--lg" data-action="wizGo" data-step="4">Tiếp tục${icon('arrowRight')}</button>`,
  };
}

function wizDone() {
  return {
    title: 'Xong rồi!',
    lead: 'Từ giờ, trước mỗi buổi chơi chỉ cần mở app và bật bot.',
    body: `<ol class="steps-list">
        <li><span>Bấm <b>Bật bot</b> trong app.</span></li>
        <li><span>Vào kênh voice của nhóm, gõ <code class="cmd">/record start</code>.</span></li>
        <li><span>Hết buổi gõ <code class="cmd">/record stop</code>. Vài phút sau recap sẽ được đăng vào kênh chat.</span></li>
      </ol>
      <div class="hint">Mẹo: vào mục <b>Chiến dịch</b> khai báo tên nhân vật và tên riêng (NPC, địa danh) để recap ghi đúng tên.</div>`,
    foot: `${back(3)}<button class="btn btn--primary btn--lg" data-action="wizFinish">${icon('power')}Bật bot ngay</button>`,
  };
}

async function wizVerify(btn) {
  const w = S.wiz;
  w.token = ($('#wiz-token') || {}).value || w.token;
  if (!w.token.trim()) {
    w.error = 'Dán token bot vào ô trên trước đã.';
    return renderWizard();
  }
  w.busy = true;
  w.error = '';
  renderWizard();
  try {
    w.verify = await call('verifyToken', { token: w.token });
    w.token = w.verify.token;
    if (!w.guildId && w.verify.guilds.length === 1) w.guildId = w.verify.guilds[0].id;
  } catch (err) {
    w.error = err.message;
    w.verify = null;
  }
  w.busy = false;
  renderWizard();
}

async function wizSaveDiscord(btn) {
  const w = S.wiz;
  const res = await run(btn, () => call('saveConfig', { token: w.token, clientId: w.verify.clientId, guildId: w.guildId }));
  if (!res) return;
  S.app = res;
  S.discord = w.verify;
  S.discordError = '';
  S.roles = null;
  w.step = 3;
  renderWizard();
}

// ---------- Xử lý thao tác ----------

const actions = {
  nav: (el) => setPage(el.dataset.page),
  startBot: (el) => startBot(el),
  stopBot: () => stopBot(),
  installStt: (el) => installStt(el),
  installClaude: (el) => claudeAction('installClaude', el),
  loginClaude: (el) => claudeAction('loginClaude', el),
  openWizard: () => openWizard(),
  closeWizard: () => closeWizard(),
  openUrl: (el) => call('openUrl', { url: el.dataset.url }),
  openPath: (el) => call('openPath', { kind: el.dataset.kind }),
  copy: (el) => navigator.clipboard.writeText(el.dataset.text).then(() => toast(`Đã copy ${el.dataset.text}`, 'ok')),
  openSession: (el) => openSession(el.dataset.id),
  closeDrawer: () => closeDrawer(),
  drawerTab: (el) => loadDrawerFile(el.dataset.file),
  copyDrawer: () => navigator.clipboard.writeText(S.drawer.text).then(() => toast('Đã copy vào clipboard.', 'ok')),
  openSessionFolder: (el) => run(null, () => call('openSession', { id: el.dataset.id, file: '' })),
  processSession: (el) => processSession(el.dataset.id, el),
  addPlayer: (el) => {
    const k = S.campaign.known.find((x) => x.id === el.dataset.id);
    S.campaign.players.push({ id: k.id, name: k.displayName, character: '', role: 'player' });
    S.campaignDirty = true;
    render();
    const rows = document.querySelectorAll('.player [data-field="character"]');
    if (rows.length) rows[rows.length - 1].focus();
  },
  addPlayerManual: () => addPlayerManual(),
  removePlayer: (el) => {
    S.campaign.players.splice(+el.closest('.player').dataset.i, 1);
    S.campaignDirty = true;
    render();
  },
  setRole: (el) => {
    const p = S.campaign.players[+el.closest('.player').dataset.i];
    p.role = el.dataset.role;
    S.campaignDirty = true;
    render();
  },
  savePlayers: (el) => savePlayers(el),
  discardPlayers: () => loadCampaign(),
  saveGlossary: async (el) => {
    const text = $('#glossary').value;
    const ok = await run(el, () => call('saveGlossary', { text }));
    if (ok === undefined) return;
    S.campaign.glossary = text;
    S.glossaryDirty = false;
    el.classList.remove('btn--primary');
    el.disabled = true;
    toast('Đã lưu tên riêng.', 'ok');
  },
  setSetting: (el) => saveSetting(el.dataset.key, el.dataset.value),
  copyLog: () => navigator.clipboard.writeText(S.log.join('\n')).then(() => toast('Đã copy nhật ký.', 'ok')),
  wizGo: (el) => {
    S.wiz.step = +el.dataset.step;
    S.wiz.error = '';
    renderWizard();
  },
  wizVerify: (el) => wizVerify(el),
  wizToggleToken: () => {
    S.wiz.token = $('#wiz-token').value;
    S.wiz.showToken = !S.wiz.showToken;
    renderWizard();
  },
  wizPickGuild: (el) => {
    S.wiz.guildId = el.dataset.id;
    renderWizard();
  },
  wizRefresh: async () => {
    const v = await call('verifyToken', { token: S.wiz.token }).catch((e) => {
      toast(e.message, 'err');
      return null;
    });
    if (v) {
      S.wiz.verify = v;
      renderWizard();
    }
  },
  wizSaveDiscord: (el) => wizSaveDiscord(el),
  wizFinish: async (el) => {
    closeWizard();
    setPage('home');
    await startBot(null);
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) {
    e.preventDefault();
    fn(el, e);
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'session-search') {
    S.sessionFilter = t.value;
    renderSessionsList();
  } else if (t.id === 'glossary') {
    if (!S.glossaryDirty) {
      S.glossaryDirty = true;
      const b = $('#save-glossary');
      b.disabled = false;
      b.classList.add('btn--primary');
    }
  } else if (t.dataset.field) {
    const p = S.campaign.players[+t.closest('.player').dataset.i];
    p[t.dataset.field] = t.value;
    if (!S.campaignDirty) {
      S.campaignDirty = true;
      const bar = document.createElement('div');
      bar.innerHTML = `<div class="savebar"><span>Danh sách người chơi có thay đổi chưa lưu.</span><div class="toolbar"><button class="btn btn--ghost" data-action="discardPlayers">Huỷ</button><button class="btn btn--primary" data-action="savePlayers">${icon('check')}Lưu</button></div></div>`;
      $('#players').closest('.card').after(bar.firstChild);
    }
  } else if (t.dataset.setting === 'silenceMs') {
    $('#silence-val').textContent = `${(t.value / 1000).toFixed(1)}s`;
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.setting) saveSetting(t.dataset.setting, t.value);
});

document.addEventListener('keydown', (e) => {
  const card = e.target.closest && e.target.closest('[role="button"][data-action]');
  if (card && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    card.click();
    return;
  }
  if (e.key !== 'Escape') return;
  if ($('#modal').classList.contains('open')) return;
  if (S.drawer) closeDrawer();
});

// ---------- Khởi động ----------

async function init() {
  hydrateIcons();
  if (!bridge) {
    $('#view').innerHTML = '<div class="page"><div class="card empty"><h3>Mở bằng STTBot.exe</h3><p>Giao diện này chạy bên trong ứng dụng STT Bot.</p></div></div>';
    return;
  }
  [S.app, S.log] = await Promise.all([call('getState'), call('getLog')]);
  if (S.app.stt.installing) S.stt = { phase: 'running', step: 0, total: 4, label: S.app.stt.label };
  setPage('home');
  loadSessions();
  verifyDiscord();
  if (!cfg().token || !cfg().guildId) openWizard();
}

init().catch((err) => {
  $('#view').innerHTML = `<div class="page"><div class="card empty">${icon('alert')}<h3>Không khởi động được</h3><p>${esc(err.message)}</p></div></div>`;
});
