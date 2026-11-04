/*
 * TaskBoard 画面モック
 * - サーバー・DB は使わず、データはメモリ上のダミーデータ（再読み込みで初期状態に戻る）
 * - 「今日」は 2026-11-02 に固定（画面設計書のワイヤーフレームに合わせる）
 */
'use strict';

/* ================================================================
 * 定数・ダミーデータ
 * ================================================================ */
const TODAY = '2026-11-02';
const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const BASE_COLORS = [
  { name: '赤', code: '#EF4444' },
  { name: '橙', code: '#F97316' },
  { name: '黄', code: '#EAB308' },
  { name: '緑', code: '#22C55E' },
  { name: '青', code: '#3B82F6' },
  { name: '紫', code: '#A855F7' },
  { name: '桃', code: '#EC4899' },
  { name: '灰', code: '#6B7280' },
];
const DEFAULT_STATUS_NAMES = ['未着手', '進行中', '確認中', '完了'];

let seq = 0;
const nextId = () => ++seq;

function makeProject(name, color) {
  const statuses = DEFAULT_STATUS_NAMES.map((n) => ({ id: nextId(), name: n }));
  return {
    id: nextId(),
    name,
    color,
    statuses,
    defaultStatusId: statuses[0].id, // 初期ステータス（未着手）
    doneStatusId: statuses[3].id,    // 完了ステータス
  };
}

function makeTask(p, statusIdx, title, due, opts = {}) {
  const statusId = p.statuses[statusIdx].id;
  return {
    id: nextId(),
    projectId: p.id,
    statusId,
    title,
    desc: opts.desc || '',
    due: due || null,
    order: seq,
    todayDate: opts.today ? TODAY : null,
    todayOrder: opts.today ? seq : null,
    createdAt: seq,
    subtasks: (opts.subtasks || []).map(([text, done]) => ({ id: nextId(), text, done })),
  };
}

const state = {
  loggedIn: false,
  user: { name: '山田 太郎', email: 'yamada@example.com', password: 'password' },
  projects: [],
  tasks: [],
};

(function seed() {
  const kadai = makeProject('課題', '#3B82F6');
  const kaji = makeProject('家事', '#22C55E');
  state.projects.push(kadai, kaji);
  state.tasks.push(
    makeTask(kadai, 1, 'レポート提出', '2026-11-01', {
      today: true,
      desc: '第3回課題のレポートを提出する。',
      subtasks: [['資料を集める', true], ['下書きを書く', false], ['見直す', false]],
    }),
    makeTask(kaji, 0, '買い物', '2026-11-10', { today: true, desc: '牛乳、卵、パン' }),
    makeTask(kadai, 0, '資料作成', '2026-11-03', {
      subtasks: [['構成を決める', false], ['スライドを作る', false]],
    }),
    makeTask(kadai, 0, '振り返りを書く', null),
    makeTask(kadai, 3, '参考書を買う', '2026-11-02'),
    makeTask(kaji, 0, '掃除', '2026-11-15'),
  );
})();

/* 画面の一時的な状態 */
const thisMonth = () => ({ y: Number(TODAY.slice(0, 4)), m: Number(TODAY.slice(5, 7)) - 1 });
const ui = {
  menuOpen: false,
  viewKey: null,       // 今表示しているプロジェクトの画面（「プロジェクトID/board」など）
  boardIdx: 0,         // スマホのボードで表示中の列
  cal: thisMonth(),    // カレンダーの表示月（m は 0 始まり）
  calSel: TODAY,       // スマホのカレンダーで選択中の日付
};

/* ================================================================
 * ヘルパー
 * ================================================================ */
const $app = document.getElementById('app');
const $dlg = document.getElementById('dlg');
const $confirm = document.getElementById('confirm');
const mq = window.matchMedia('(max-width: 767px)');
const isMobile = () => mq.matches;

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const pad = (n) => String(n).padStart(2, '0');
const md = (d) => `${d.slice(5, 7)}/${d.slice(8, 10)}`;
const byOrder = (a, b) => a.order - b.order;

const getProject = (id) => state.projects.find((p) => p.id === id);
const getTask = (id) => state.tasks.find((t) => t.id === id);
const isDone = (t) => getProject(t.projectId).doneStatusId === t.statusId;
const statusOf = (t) => getProject(t.projectId).statuses.find((s) => s.id === t.statusId);
const isToday = (t) => t.todayDate === TODAY && !isDone(t);

function daysUntil(date) {
  return Math.round((Date.parse(date) - Date.parse(TODAY)) / 86400000);
}

/* 期限アラート（F-07）：3日前〜1日前は黄、当日と期限超過は赤。完了・期限なしは出さない */
function alertOf(t) {
  if (!t.due || isDone(t)) return null;
  const d = daysUntil(t.due);
  if (d < 0) return { level: 'red', label: '期限超過', overdue: true };
  if (d === 0) return { level: 'red', label: '期限当日' };
  if (d <= 3) return { level: 'yellow', label: '期限が近い' };
  return null;
}

/* 文字数・必須のチェック（共通の入力エラー文言） */
function validateText(value, label, max, required) {
  if (required && value.trim() === '') return `${label}を入力してください`;
  if (value.length > max) return `${label}は${max}文字以内で入力してください`;
  return '';
}

/* サブタスクの数（F-06）：完了した数 / 全体の数。サブタスクがないときは出さない */
function subCountHTML(t) {
  if (!t.subtasks.length) return '';
  const done = t.subtasks.filter((s) => s.done).length;
  return `<span class="sub-count" title="サブタスク ${done}/${t.subtasks.length} 完了"><span class="sub-count-icon" aria-hidden="true">✓</span>${done}/${t.subtasks.length}</span>`;
}

/* 列の一番下に入れるときの order（F-04・F-05）。列の中で一番大きい order の次にする */
function bottomOrder(projectId, statusId, exceptId) {
  const orders = columnTasks(projectId, statusId).filter((t) => t.id !== exceptId).map((t) => t.order);
  return orders.length ? Math.max(...orders) + 1 : 0;
}

/* 新しいプロジェクトの色（F-02）：基本の8色から、まだ使われていない色を赤から順に選ぶ。
   8色とも使われているときは、使われている回数が一番少ない色を赤から順に選ぶ（赤から繰り返す） */
function nextProjectColor() {
  const count = (code) => state.projects.filter((p) => p.color.toUpperCase() === code.toUpperCase()).length;
  const min = Math.min(...BASE_COLORS.map((c) => count(c.code)));
  return BASE_COLORS.find((c) => count(c.code) === min).code;
}

function columnTasks(projectId, statusId) {
  return state.tasks.filter((t) => t.projectId === projectId && t.statusId === statusId).sort(byOrder);
}

/* ================================================================
 * ルーティング（#/login, #/dashboard, #/project/:id/board, #/project/:id/calendar）
 * ================================================================ */
function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'project') {
    return { name: parts[2] === 'calendar' ? 'calendar' : 'board', projectId: Number(parts[1]) };
  }
  if (parts[0] === 'dashboard') return { name: 'dashboard' };
  return { name: 'login' };
}

function go(hash) {
  ui.menuOpen = false;
  if (location.hash === hash) render();
  else location.hash = hash;
}

window.addEventListener('hashchange', () => { ui.menuOpen = false; render(); });
mq.addEventListener('change', () => render());

/* ================================================================
 * 描画
 * ================================================================ */
function render() {
  const r = parseRoute();
  if (!state.loggedIn && r.name !== 'login') { location.replace('#/login'); return; }
  if (state.loggedIn && r.name === 'login') { location.replace('#/dashboard'); return; }
  if (r.projectId && !getProject(r.projectId)) { location.replace('#/dashboard'); return; }

  if (r.name === 'login') { $app.innerHTML = loginHTML(); return; }

  // ボード・カレンダーを開いたときは、毎回初期状態に戻す（別の画面やタブから来たとき。
  // ダイアログを閉じたときなど、同じ画面のままの再描画では戻さない）
  const viewKey = r.projectId ? `${r.projectId}/${r.name}` : null;
  if (viewKey !== ui.viewKey) {
    ui.viewKey = viewKey;
    if (r.name === 'board') ui.boardIdx = 0; // 最初の列
    if (r.name === 'calendar') {
      ui.cal = thisMonth(); // 今月
      ui.calSel = TODAY;    // 今日を選んだ状態
    }
  }

  let inner = '';
  if (r.name === 'dashboard') inner = dashboardHTML();
  else if (r.name === 'board') inner = boardHTML(getProject(r.projectId));
  else inner = calendarHTML(getProject(r.projectId));

  $app.innerHTML = layoutHTML(r, inner);
}

/* ---------- S-01 ログイン ---------- */
function loginHTML() {
  return `
  <div class="login-wrap">
    <form class="login-box" id="login-form" novalidate>
      <h1>TaskBoard</h1>
      <div class="field">
        <label for="login-email">メールアドレス</label>
        <input class="input" type="email" id="login-email" autocomplete="username">
        <div class="err" id="err-email"></div>
      </div>
      <div class="field">
        <label for="login-pass">パスワード</label>
        <input class="input" type="password" id="login-pass" autocomplete="current-password">
        <div class="err" id="err-pass"></div>
      </div>
      <div class="err-box" id="err-login" hidden>メールアドレスまたはパスワードが正しくありません</div>
      <div class="login-actions"><button class="btn btn-primary" type="submit">ログイン</button></div>
      <p class="mock-note">モック用アカウント：yamada@example.com / password</p>
    </form>
  </div>`;
}

function submitLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  let emailErr = '';
  if (email === '') emailErr = 'メールアドレスを入力してください';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emailErr = 'メールアドレスの形式で入力してください';
  const passErr = pass === '' ? 'パスワードを入力してください' : '';
  document.getElementById('err-email').textContent = emailErr;
  document.getElementById('err-pass').textContent = passErr;
  document.getElementById('err-login').hidden = true;
  if (emailErr || passErr) return;
  if (email !== state.user.email || pass !== state.user.password) {
    document.getElementById('err-login').hidden = false;
    return;
  }
  state.loggedIn = true;
  go('#/dashboard');
}

/* ---------- 共通レイアウト（ヘッダー＋サイドメニュー） ---------- */
function layoutHTML(r, inner) {
  const p = r.projectId ? getProject(r.projectId) : null;
  const mobile = isMobile();
  const sideProjects = state.projects.map((x) => `
      <button class="side-link ${p && p.id === x.id ? 'active' : ''}" data-act="nav" data-href="#/project/${x.id}/board">
        <span class="dot" style="background:${esc(x.color)}"></span><span class="ellipsis">${esc(x.name)}</span>
      </button>`).join('');

  return `
  <header class="header">
    <button class="btn btn-sm only-sp" data-act="toggle-menu">メニュー</button>
    <span class="logo ellipsis">${mobile && p ? esc(p.name) : 'TaskBoard'}</span>
    <span class="spacer"></span>
    ${mobile && p ? '<button class="btn btn-sm" data-act="open-settings">設定</button>' : ''}
    <span class="user only-pc">${esc(state.user.name)}</span>
  </header>
  <div class="layout ${ui.menuOpen ? 'menu-open' : ''}">
    <nav class="side">
      <button class="side-link ${r.name === 'dashboard' ? 'active' : ''}" data-act="nav" data-href="#/dashboard">ダッシュボード</button>
      <div class="side-label">プロジェクト</div>
      ${sideProjects}
      <button class="side-link side-add" data-act="add-project">+ プロジェクトを追加</button>
      <div class="side-bottom">
        <button class="side-link" data-act="logout">ログアウト</button>
      </div>
    </nav>
    <div class="side-overlay" data-act="toggle-menu"></div>
    <main class="main">${inner}</main>
  </div>`;
}

/* ---------- S-02 ダッシュボード ---------- */
function dashboardHTML() {
  const active = state.tasks.filter((t) => !isDone(t));
  const today = active.filter(isToday).sort((a, b) => a.todayOrder - b.todayOrder);
  const list = active.filter((t) => !isToday(t)).sort((a, b) => {
    if (a.due && b.due) return a.due === b.due ? a.createdAt - b.createdAt : a.due < b.due ? -1 : 1;
    if (a.due) return -1;
    if (b.due) return 1;
    return a.createdAt - b.createdAt;
  });

  return `
  <div class="dash">
    <section class="dash-section">
      <h2>今日やるタスク</h2>
      <div class="today-zone card-list" data-drop="today">
        ${today.length ? today.map((t) => dashCardHTML(t, 'today')).join('') : '<div class="empty">今日やるタスクはありません</div>'}
      </div>
    </section>
    <section class="dash-section">
      <h2>タスク一覧（期限が近い順）</h2>
      <div class="list-zone card-list">
        ${list.length ? list.map((t) => dashCardHTML(t, 'list')).join('') : '<div class="empty">タスクはありません</div>'}
      </div>
    </section>
  </div>`;
}

function dashCardHTML(t, mode) {
  const p = getProject(t.projectId);
  const a = alertOf(t);
  const draggable = mode === 'list' && !isMobile();
  return `
  <div class="card" data-act="open-task" data-id="${t.id}" ${draggable ? `draggable="true" data-drag="dash"` : ''}>
    <div class="card-title">${esc(t.title)}</div>
    <div class="card-meta">
      <span class="dot" style="background:${esc(p.color)}"></span>
      <span>${esc(p.name)} / ${t.due ? `期限 ${md(t.due)}` : '期限なし'}</span>
    </div>
    ${a ? `<div class="card-alert"><span class="badge badge-${a.level}">${a.label}</span></div>` : ''}
    ${a && a.overdue ? '<div class="alert-note">見直しをしてください</div>' : ''}
    <div class="card-actions">
      ${subCountHTML(t)}
      <span class="spacer"></span>
      ${mode === 'today'
        ? `<button class="btn btn-sm" data-act="today-remove" data-id="${t.id}">外す</button>`
        : `<button class="btn btn-sm" data-act="today-add" data-id="${t.id}">今日やる</button>`}
    </div>
  </div>`;
}

/* ---------- S-03 / S-04 共通の上部 ---------- */
function projectHeadHTML(p, tab) {
  return `
  <div class="page-head only-pc">
    <h1 class="ellipsis">${esc(p.name)}</h1>
    <span class="spacer"></span>
    <button class="btn" data-act="open-settings">設定</button>
  </div>
  <div class="tabs">
    <button class="tab ${tab === 'board' ? 'active' : ''}" data-act="nav" data-href="#/project/${p.id}/board">ボード</button>
    <button class="tab ${tab === 'calendar' ? 'active' : ''}" data-act="nav" data-href="#/project/${p.id}/calendar">カレンダー</button>
  </div>`;
}

/* ---------- S-03 ボード ---------- */
function boardCardHTML(t, mobile) {
  const a = alertOf(t);
  const prefix = mobile ? '期限 ' : '';
  let due = '期限なし';
  if (t.due) {
    due = a ? `<span class="badge badge-${a.level}">${prefix}${md(t.due)}</span>` : `${prefix}${md(t.due)}`;
    if (a && a.overdue) due += ' <span class="alert-note">期限超過</span>';
  }
  return `
  <div class="card card-board" data-act="open-task" data-id="${t.id}" ${mobile ? '' : 'draggable="true" data-drag="card"'} title="${esc(t.title)}">
    <div class="card-title">${esc(t.title)}</div>
    <div class="card-meta">${due}</div>
    ${t.subtasks.length ? `<div class="card-meta">${subCountHTML(t)}</div>` : ''}
  </div>`;
}

function boardHTML(p) {
  const mobile = isMobile();
  let body;
  if (!mobile) {
    const cols = p.statuses.map((s) => {
      const tasks = columnTasks(p.id, s.id);
      return `
      <section class="col">
        <div class="col-head">${esc(s.name)} (${tasks.length})</div>
        <div class="card-list" data-drop="board" data-status="${s.id}">
          ${tasks.map((t) => boardCardHTML(t, false)).join('')}
        </div>
      </section>`;
    }).join('');
    body = `
    <div class="toolbar"><button class="btn btn-primary" data-act="add-task">+ タスクを追加</button></div>
    <div class="board">${cols}</div>`;
  } else {
    ui.boardIdx = Math.min(ui.boardIdx, p.statuses.length - 1);
    const s = p.statuses[ui.boardIdx];
    const tasks = columnTasks(p.id, s.id);
    body = `
    <div class="status-switch">
      <button class="btn btn-sm" data-act="mb-move" data-dir="-1" ${ui.boardIdx === 0 ? 'disabled' : ''}>&lt;</button>
      ${p.statuses.map((x, i) => `<button class="btn btn-sm ${i === ui.boardIdx ? 'active' : ''}" data-act="mb-status" data-idx="${i}">${esc(x.name)}</button>`).join('')}
      <button class="btn btn-sm" data-act="mb-move" data-dir="1" ${ui.boardIdx === p.statuses.length - 1 ? 'disabled' : ''}>&gt;</button>
    </div>
    <div class="card-list">
      ${tasks.length ? tasks.map((t) => boardCardHTML(t, true)).join('') : '<div class="empty">タスクはありません</div>'}
    </div>
    <div class="mobile-add"><button class="btn btn-primary" data-act="add-task">+ タスクを追加</button></div>`;
  }
  return projectHeadHTML(p, 'board') + body;
}

/* ---------- S-04 カレンダー ---------- */
function calClass(t) {
  if (isDone(t)) return 'done';
  const a = alertOf(t);
  return a ? a.level : '';
}

function calendarHTML(p) {
  const mobile = isMobile();
  const { y, m } = ui.cal;
  const startDow = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(`${y}-${pad(m + 1)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);

  const dated = state.tasks.filter((t) => t.projectId === p.id && t.due).sort(byOrder);
  const tasksOn = (date) => dated.filter((t) => t.due === date);

  const head = DOW.map((w, i) => `<div class="cal-dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${w}</div>`).join('');
  const grid = cells.map((date) => {
    if (!date) return '<div class="cal-cell blank"></div>';
    const day = Number(date.slice(8));
    const ts = tasksOn(date);
    // 今日の日付は数字を基本色の丸で塗る（F-09）。スマホの選択中は枠線の丸（今日を選んでいるときは塗ったまま）
    const today = date === TODAY ? 'today' : '';
    if (mobile) {
      return `
      <div class="cal-cell ${today} ${date === ui.calSel ? 'selected' : ''}" data-act="cal-sel" data-date="${date}">
        <span class="cal-date"><span class="cal-num">${day}</span></span>
        <div class="cal-marks">${ts.map((t) => `<span class="mark ${calClass(t)}"></span>`).join('')}</div>
      </div>`;
    }
    return `
    <div class="cal-cell ${today}">
      <div class="cal-date"><span class="cal-num">${day}</span></div>
      ${ts.map((t) => `<div class="cal-task ${calClass(t)}" data-act="open-task" data-id="${t.id}" title="${esc(t.title)}">${esc(t.title)}</div>`).join('')}
    </div>`;
  }).join('');

  let dayList = '';
  if (mobile && ui.calSel) {
    const sel = ui.calSel;
    const dow = DOW[new Date(Date.parse(sel)).getUTCDay()];
    const ts = tasksOn(sel);
    dayList = `
    <div class="day-list">
      <h3>${Number(sel.slice(5, 7))}月${Number(sel.slice(8))}日（${dow}）のタスク</h3>
      <div class="card-list">
        ${ts.length ? ts.map((t) => {
          const a = alertOf(t);
          const tag = isDone(t) ? '<span class="badge badge-gray">完了</span>'
            : a ? `<span class="badge badge-${a.level}">${a.label}</span>` : '';
          // 一覧のカードにはサブタスクの数も出す（F-06）。カレンダーのマスには出さない
          const meta = [tag, subCountHTML(t)].filter(Boolean).join('');
          return `<div class="card" data-act="open-task" data-id="${t.id}"><div class="card-title">${esc(t.title)}</div>${meta ? `<div class="card-meta">${meta}</div>` : ''}</div>`;
        }).join('') : '<div class="empty">この日のタスクはありません</div>'}
      </div>
    </div>`;
  }

  return projectHeadHTML(p, 'calendar') + `
  <div class="cal-nav">
    <button class="btn btn-sm" data-act="cal-move" data-dir="-1">&lt;</button>
    <span class="ym">${y}年${m + 1}月</span>
    <button class="btn btn-sm" data-act="cal-move" data-dir="1">&gt;</button>
    <span class="spacer"></span>
    <button class="btn btn-sm" data-act="cal-this">今月</button>
  </div>
  <div class="cal-grid ${mobile ? 'sp' : ''}">${head}${grid}</div>
  ${dayList}`;
}

/* ================================================================
 * 画面上の操作
 * ================================================================ */
const actions = {
  'nav': (el) => go(el.dataset.href),
  'toggle-menu': () => { ui.menuOpen = !ui.menuOpen; render(); },
  'logout': () => { state.loggedIn = false; go('#/login'); },
  'add-project': () => { ui.menuOpen = false; render(); openNewProject(); },
  'open-task': (el) => openDetail(Number(el.dataset.id)),
  'today-add': (el) => addToday(Number(el.dataset.id)),
  'today-remove': (el) => { getTask(Number(el.dataset.id)).todayDate = null; render(); },
  'add-task': () => openEdit({ projectId: parseRoute().projectId }),
  'open-settings': () => openSettings(parseRoute().projectId),
  'mb-status': (el) => { ui.boardIdx = Number(el.dataset.idx); render(); },
  'mb-move': (el) => { ui.boardIdx += Number(el.dataset.dir); render(); },
  'cal-move': (el) => {
    const d = new Date(Date.UTC(ui.cal.y, ui.cal.m + Number(el.dataset.dir), 1));
    setCalMonth(d.getUTCFullYear(), d.getUTCMonth());
  },
  'cal-this': () => { const { y, m } = thisMonth(); setCalMonth(y, m); },
  'cal-sel': (el) => { ui.calSel = el.dataset.date; render(); },
};

function setCalMonth(y, m) {
  ui.cal = { y, m };
  const ym = `${y}-${pad(m + 1)}`;
  ui.calSel = TODAY.startsWith(ym) ? TODAY : `${ym}-01`;
  render();
}

function addToday(id) {
  const t = getTask(id);
  t.todayDate = TODAY;
  t.todayOrder = nextId();
  render();
}

$app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && actions[el.dataset.act]) actions[el.dataset.act](el, e);
});
$app.addEventListener('submit', (e) => {
  if (e.target.id === 'login-form') { e.preventDefault(); submitLogin(); }
});

/* ================================================================
 * ドラッグ＆ドロップ（ネイティブ HTML5）
 *   data-drag : ドラッグできる要素の種類（dash / card / sub / status）
 *   data-drop : ドロップ先の種類（today / board / sub / status）
 * ================================================================ */
let drag = null;
const ACCEPTS = { today: 'dash', board: 'card', sub: 'sub', status: 'status' };

function clearDropMarks() {
  document.querySelectorAll('.drop-line').forEach((x) => x.remove());
  document.querySelectorAll('.drop-over').forEach((x) => x.classList.remove('drop-over'));
}

function insertIndex(container, y) {
  const items = [...container.querySelectorAll(':scope > [data-drag]')].filter((x) => !x.classList.contains('dragging'));
  let index = 0;
  for (const el of items) {
    const r = el.getBoundingClientRect();
    if (y > r.top + r.height / 2) index++;
    else break;
  }
  return { index, items };
}

// サブタスクとステータスは、つまみ（=）を押したときだけドラッグできるようにする
document.addEventListener('mousedown', (e) => {
  const h = e.target.closest('.handle');
  if (h) h.closest('[data-drag]').setAttribute('draggable', 'true');
});
document.addEventListener('mouseup', () => {
  document.querySelectorAll('.handle').forEach((h) => {
    const item = h.closest('[data-drag]');
    if (item && !item.classList.contains('dragging')) item.setAttribute('draggable', 'false');
  });
});

document.addEventListener('dragstart', (e) => {
  const el = e.target.closest && e.target.closest('[data-drag]');
  if (!el) return;
  drag = { type: el.dataset.drag, id: el.dataset.id, el };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', el.dataset.id);
  requestAnimationFrame(() => el.classList.add('dragging'));
});

document.addEventListener('dragend', () => {
  if (drag) {
    drag.el.classList.remove('dragging');
    if (drag.type === 'sub' || drag.type === 'status') drag.el.setAttribute('draggable', 'false');
  }
  drag = null;
  clearDropMarks();
});

document.addEventListener('dragover', (e) => {
  if (!drag) return;
  const c = e.target.closest('[data-drop]');
  if (!c || ACCEPTS[c.dataset.drop] !== drag.type) { clearDropMarks(); return; }
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (c.dataset.drop === 'today') {
    clearDropMarks();
    c.classList.add('drop-over');
    return;
  }
  const { index, items } = insertIndex(c, e.clientY);
  const existing = c.querySelector(':scope > .drop-line');
  const ref = items[index] || null;
  if (existing && existing.nextElementSibling === ref) return;
  clearDropMarks();
  const line = document.createElement(c.tagName === 'UL' ? 'li' : 'div');
  line.className = 'drop-line';
  c.insertBefore(line, ref);
});

document.addEventListener('drop', (e) => {
  if (!drag) return;
  const c = e.target.closest('[data-drop]');
  if (!c || ACCEPTS[c.dataset.drop] !== drag.type) return;
  e.preventDefault();
  const kind = c.dataset.drop;
  const { index } = insertIndex(c, e.clientY);
  const id = drag.id;
  clearDropMarks();
  if (kind === 'today') addToday(Number(id));
  else if (kind === 'board') moveCard(Number(id), Number(c.dataset.status), index);
  else if (kind === 'sub') moveSubtask(Number(id), index);
  else if (kind === 'status') moveStatus(Number(id), index);
});

/* 指（タッチ・ペン）での並べ替え。サブタスクとステータスのつまみ（=）だけが対象。
   ネイティブ HTML5 のドラッグはタッチでは動かないため、ポインターイベントで同じ動きを作る */
let touchDrag = null;

document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return; // マウスは上のネイティブのドラッグを使う
  const h = e.target.closest('.handle');
  if (!h) return;
  const el = h.closest('[data-drag]');
  const c = el && el.closest('[data-drop]');
  if (!c || ACCEPTS[c.dataset.drop] !== el.dataset.drag) return;
  e.preventDefault(); // 画面のスクロールや文字の選択を止める（入力欄からも離れなくなる）
  if (document.activeElement && document.activeElement.id === 'sub-edit') document.activeElement.blur();
  h.setPointerCapture(e.pointerId);
  touchDrag = { pointerId: e.pointerId, id: el.dataset.id, el, container: c };
  el.classList.add('dragging');
});

document.addEventListener('pointermove', (e) => {
  if (!touchDrag || e.pointerId !== touchDrag.pointerId) return;
  e.preventDefault();
  const c = touchDrag.container;
  const { index, items } = insertIndex(c, e.clientY);
  const existing = c.querySelector(':scope > .drop-line');
  const ref = items[index] || null;
  if (existing && existing.nextElementSibling === ref) return;
  clearDropMarks();
  const line = document.createElement(c.tagName === 'UL' ? 'li' : 'div');
  line.className = 'drop-line';
  c.insertBefore(line, ref);
});

function endTouchDrag(e, commit) {
  if (!touchDrag || e.pointerId !== touchDrag.pointerId) return;
  const { id, el, container: c } = touchDrag;
  touchDrag = null;
  const moved = commit && c.querySelector(':scope > .drop-line');
  const { index } = insertIndex(c, e.clientY);
  el.classList.remove('dragging');
  clearDropMarks();
  if (!moved) return;
  if (c.dataset.drop === 'sub') moveSubtask(Number(id), index);
  else if (c.dataset.drop === 'status') moveStatus(Number(id), index);
}
document.addEventListener('pointerup', (e) => endTouchDrag(e, true));
document.addEventListener('pointercancel', (e) => endTouchDrag(e, false));

function moveCard(id, statusId, index) {
  const t = getTask(id);
  const col = columnTasks(t.projectId, statusId).filter((x) => x.id !== id);
  col.splice(index, 0, t);
  t.statusId = statusId;
  col.forEach((x, i) => { x.order = i; });
  if (isDone(t)) t.todayDate = null; // 完了にすると今日やるタスクから外れる
  render();
}

/* ================================================================
 * ダイアログの共通処理
 * ================================================================ */
let dlgCtx = null; // { render, isDirty?, onCancel? }

function openDialog(ctx) {
  dlgCtx = ctx;
  ctx.render();
  if (!$dlg.open) $dlg.showModal();
}

function closeDialog() {
  if ($dlg.open) $dlg.close();
  dlgCtx = null;
  render();
}

/* 「キャンセル」「×」・外側・Esc で閉じるとき。変更があれば未保存の確認を出す */
async function requestClose() {
  if (!dlgCtx) return;
  if (dlgCtx.isDirty && dlgCtx.isDirty()) {
    const ok = await askConfirm('変更が保存されていません。閉じてもよいですか？', '閉じる', '戻る');
    if (!ok) return;
  }
  if (dlgCtx.onCancel) dlgCtx.onCancel();
  else closeDialog();
}

function askConfirm(message, okLabel, cancelLabel, danger = false) {
  return new Promise((resolve) => {
    $confirm.innerHTML = `
    <div class="confirm-body">
      <p>${esc(message)}</p>
      <div class="dlg-foot">
        <button class="btn" data-r="0">${esc(cancelLabel)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${esc(okLabel)}</button>
      </div>
    </div>`;
    const finish = (v) => { $confirm.close(); resolve(v); };
    $confirm.onclick = (e) => {
      const b = e.target.closest('[data-r]');
      if (b) finish(b.dataset.r === '1');
    };
    $confirm.oncancel = (e) => { e.preventDefault(); finish(false); };
    $confirm.showModal();
  });
}

const dlgActions = {};
let pressedOnBackdrop = false;

$dlg.addEventListener('mousedown', (e) => { pressedOnBackdrop = e.target === $dlg; });
$dlg.addEventListener('click', (e) => {
  if (e.target === $dlg && pressedOnBackdrop) { requestClose(); return; }
  const el = e.target.closest('[data-act]');
  if (el && dlgActions[el.dataset.act]) dlgActions[el.dataset.act](el, e);
});
$dlg.addEventListener('cancel', (e) => { e.preventDefault(); requestClose(); });
$dlg.addEventListener('input', (e) => { if (dlgCtx && dlgCtx.onInput) dlgCtx.onInput(e.target); });
$dlg.addEventListener('change', (e) => { if (dlgCtx && dlgCtx.onInput) dlgCtx.onInput(e.target); });
$dlg.addEventListener('keydown', (e) => { if (dlgCtx && dlgCtx.onKeydown) dlgCtx.onKeydown(e); });

dlgActions['dlg-close'] = () => requestClose();

/* ページを離れるときの確認（S-06・S-07 に未保存の変更があるとき） */
window.addEventListener('beforeunload', (e) => {
  if ($dlg.open && dlgCtx && dlgCtx.isDirty && dlgCtx.isDirty()) {
    e.preventDefault();
    e.returnValue = '';
  }
});

/* ================================================================
 * S-05 タスク詳細
 * ================================================================ */
function openDetail(taskId) {
  openDialog({ type: 'detail', taskId, editingSubId: null, subErr: '', render: renderDetail, onKeydown: detailKeydown });
}

function renderDetail() {
  const ctx = dlgCtx;
  const t = getTask(ctx.taskId);
  const p = getProject(t.projectId);
  const a = alertOf(t);
  const doneCount = t.subtasks.filter((s) => s.done).length;

  const subs = t.subtasks.map((s) => `
    <li class="sub-item ${s.done ? 'done' : ''}" data-drag="sub" data-id="${s.id}" draggable="false">
      <span class="handle" title="ドラッグで並べ替え">=</span>
      <input type="checkbox" data-act="sub-toggle" data-id="${s.id}" ${s.done ? 'checked' : ''}>
      ${ctx.editingSubId === s.id
        ? `<input class="input" id="sub-edit" data-id="${s.id}" value="${esc(s.text)}">`
        : `<span class="sub-text" data-act="sub-edit" data-id="${s.id}" title="クリックで書き直す">${esc(s.text)}</span>`}
      <button class="btn btn-sm btn-link" data-act="sub-del" data-id="${s.id}">削除</button>
    </li>`).join('');

  $dlg.innerHTML = `
  <div class="dlg">
    <div class="dlg-head">
      <div class="grow">
        <h2 class="detail-title">${esc(t.title)}</h2>
        <div class="detail-meta"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)} / ${esc(statusOf(t).name)}</div>
        <div class="detail-due">
          <span>${t.due ? `期限 ${md(t.due)}` : '期限なし'}</span>
          ${a ? `<span class="badge badge-${a.level}">${a.label}</span>` : ''}
          ${a && a.overdue ? '<span class="alert-note">見直しをしてください</span>' : ''}
        </div>
      </div>
      <button class="icon-btn" data-act="dlg-close" aria-label="閉じる">×</button>
    </div>
    <div class="dlg-body">
      <h3>説明</h3>
      <div class="detail-desc ${t.desc ? '' : 'muted'}">${t.desc ? esc(t.desc) : '説明はありません'}</div>
      <h3>サブタスク (${doneCount}/${t.subtasks.length})</h3>
      <ul class="sub-list" data-drop="sub">${subs}</ul>
      <div class="sub-add">
        <input class="input" id="sub-new" placeholder="サブタスクを入力">
        <button class="btn" data-act="sub-add">追加</button>
      </div>
      <div class="err" id="sub-err">${esc(ctx.subErr)}</div>
    </div>
    <div class="dlg-foot">
      <button class="btn btn-danger-text" data-act="task-del">削除</button>
      <span class="spacer"></span>
      <button class="btn btn-primary" data-act="task-edit">編集</button>
    </div>
  </div>`;

  const editing = document.getElementById('sub-edit');
  if (editing) {
    editing.focus();
    editing.select();
    editing.addEventListener('blur', () => commitSubEdit(true, true));
  }
}

function detailKeydown(e) {
  if (e.target.id === 'sub-new' && e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    dlgActions['sub-add']();
  }
  if (e.target.id === 'sub-edit') {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); commitSubEdit(true); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); commitSubEdit(false); }
  }
}

/* サブタスクの書き直しを確定する。
   fromBlur（ほかの場所を押して入力欄から離れたとき）は、書き直していた行だけを戻す。
   全体を描き直すと、押したボタンやチェックボックスが消えて、その操作が効かなくなるため */
function commitSubEdit(save, fromBlur = false) {
  const ctx = dlgCtx;
  if (!ctx || ctx.type !== 'detail' || ctx.editingSubId == null) return;
  const input = document.getElementById('sub-edit');
  const t = getTask(ctx.taskId);
  const s = t.subtasks.find((x) => x.id === ctx.editingSubId);
  ctx.editingSubId = null;
  ctx.subErr = '';
  if (save && input && s) {
    const v = input.value.trim();
    // 空にしたときは元の文言に戻す（F-06）。文字数オーバーはエラーを出して元に戻す
    if (v !== '') {
      const err = validateText(v, 'サブタスク', 50, true);
      if (err) ctx.subErr = err;
      else s.text = v;
    }
  }
  if (!fromBlur || !input || !s) { renderDetail(); return; }
  const span = document.createElement('span');
  span.className = 'sub-text';
  span.dataset.act = 'sub-edit';
  span.dataset.id = s.id;
  span.title = 'クリックで書き直す';
  span.textContent = s.text;
  input.replaceWith(span);
  document.getElementById('sub-err').textContent = ctx.subErr;
}

function moveSubtask(id, index) {
  const t = getTask(dlgCtx.taskId);
  const from = t.subtasks.findIndex((s) => s.id === id);
  const [s] = t.subtasks.splice(from, 1);
  t.subtasks.splice(index, 0, s);
  renderDetail();
}

Object.assign(dlgActions, {
  'sub-toggle': (el) => {
    const t = getTask(dlgCtx.taskId);
    t.subtasks.find((s) => s.id === Number(el.dataset.id)).done = el.checked;
    renderDetail();
  },
  'sub-edit': (el) => {
    dlgCtx.editingSubId = Number(el.dataset.id);
    renderDetail();
  },
  'sub-del': (el) => {
    const t = getTask(dlgCtx.taskId);
    t.subtasks = t.subtasks.filter((s) => s.id !== Number(el.dataset.id));
    renderDetail();
  },
  'sub-add': () => {
    const input = document.getElementById('sub-new');
    const v = input.value.trim();
    if (v === '') return; // 空のときは追加しない
    const err = validateText(v, 'サブタスク', 50, true);
    dlgCtx.subErr = err;
    if (!err) getTask(dlgCtx.taskId).subtasks.push({ id: nextId(), text: v, done: false });
    renderDetail();
    const again = document.getElementById('sub-new');
    if (err) again.value = v;
    again.focus();
  },
  'task-edit': () => openEdit({ taskId: dlgCtx.taskId }),
  'task-del': async () => {
    const id = dlgCtx.taskId;
    const ok = await askConfirm('このタスクを削除しますか？', '削除', 'キャンセル', true);
    if (!ok) return;
    state.tasks = state.tasks.filter((t) => t.id !== id);
    closeDialog();
  },
});

/* ================================================================
 * S-06 タスク作成・編集
 * ================================================================ */
function openEdit({ taskId, projectId }) {
  const t = taskId ? getTask(taskId) : null;
  const p = getProject(t ? t.projectId : projectId);
  const init = {
    title: t ? t.title : '',
    desc: t ? t.desc : '',
    due: t ? (t.due || '') : '',
    statusId: t ? t.statusId : p.defaultStatusId,
  };
  openDialog({
    type: 'edit',
    taskId: t ? t.id : null,
    projectId: p.id,
    init,
    form: { ...init },
    errors: {},
    isDirty() { return JSON.stringify(this.form) !== JSON.stringify(this.init); },
    onCancel: t ? () => openDetail(t.id) : null, // 編集のときはタスク詳細に戻る
    onInput(el) {
      const f = el.dataset.field;
      if (!f) return;
      this.form[f] = f === 'statusId' ? Number(el.value) : el.value;
    },
    render: renderEdit,
  });
  document.getElementById('f-title').focus();
}

function renderEdit() {
  const ctx = dlgCtx;
  const p = getProject(ctx.projectId);
  const f = ctx.form;
  const e = ctx.errors;
  $dlg.innerHTML = `
  <div class="dlg">
    <div class="dlg-head">
      <h2 class="grow">${ctx.taskId ? 'タスクを編集' : 'タスクを追加'}</h2>
      <button class="icon-btn" data-act="dlg-close" aria-label="閉じる">×</button>
    </div>
    <div class="dlg-body">
      <div class="field">
        <label for="f-title">タイトル <span class="field-note">（必須・50文字まで）</span></label>
        <input class="input ${e.title ? 'invalid' : ''}" id="f-title" data-field="title" value="${esc(f.title)}">
        <div class="err">${esc(e.title || '')}</div>
      </div>
      <div class="field">
        <label for="f-desc">説明 <span class="field-note">（1000文字まで）</span></label>
        <textarea class="input ${e.desc ? 'invalid' : ''}" id="f-desc" data-field="desc" rows="4">${esc(f.desc)}</textarea>
        <div class="err">${esc(e.desc || '')}</div>
      </div>
      <div class="field">
        <label for="f-due">期限</label>
        <div class="due-row">
          <input class="input" type="date" id="f-due" data-field="due" value="${esc(f.due)}">
          <button class="btn" data-act="due-clear">期限なし</button>
        </div>
      </div>
      <div class="field">
        <label for="f-status">ステータス</label>
        <select class="input" id="f-status" data-field="statusId" style="width:auto">
          ${p.statuses.map((s) => `<option value="${s.id}" ${s.id === f.statusId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="dlg-foot">
      <span class="spacer"></span>
      <button class="btn" data-act="dlg-close">キャンセル</button>
      <button class="btn btn-primary" data-act="task-save">保存</button>
    </div>
  </div>`;
}

Object.assign(dlgActions, {
  'due-clear': () => {
    dlgCtx.form.due = '';
    document.getElementById('f-due').value = '';
  },
  'task-save': () => {
    const ctx = dlgCtx;
    const f = ctx.form;
    ctx.errors = {
      title: validateText(f.title, 'タイトル', 50, true),
      desc: validateText(f.desc, '説明', 1000, false),
    };
    if (ctx.errors.title || ctx.errors.desc) { renderEdit(); return; }

    const p = getProject(ctx.projectId);
    if (ctx.taskId) {
      const t = getTask(ctx.taskId);
      if (t.statusId !== f.statusId) {
        t.order = bottomOrder(p.id, f.statusId, t.id); // 移動先の列の一番下へ
        t.statusId = f.statusId;
      }
      t.title = f.title.trim();
      t.desc = f.desc;
      t.due = f.due || null;
      if (isDone(t)) t.todayDate = null;
      render();
      openDetail(t.id); // 編集のときはタスク詳細に戻る
    } else {
      const id = nextId();
      state.tasks.push({
        id,
        projectId: p.id,
        statusId: f.statusId,
        title: f.title.trim(),
        desc: f.desc,
        due: f.due || null,
        order: bottomOrder(p.id, f.statusId), // 列の一番下へ
        todayDate: null,
        todayOrder: null,
        createdAt: id,
        subtasks: [],
      });
      closeDialog(); // 作成のときはボードに戻る
    }
  },
});

/* ================================================================
 * S-07 プロジェクト設定
 * ================================================================ */
function openSettings(projectId) {
  const p = getProject(projectId);
  const init = {
    name: p.name,
    color: p.color,
    statuses: p.statuses.map((s) => ({ id: s.id, name: s.name })),
  };
  openDialog({
    type: 'settings',
    projectId,
    init,
    form: JSON.parse(JSON.stringify(init)),
    deleted: [],
    errors: { statuses: {} },
    saveError: '',
    isDirty() { return JSON.stringify(this.form) !== JSON.stringify(this.init); },
    onInput(el) {
      if (el.dataset.field === 'name') this.form.name = el.value;
      if (el.dataset.field === 'color') {
        this.form.color = el.value;
        document.querySelectorAll('.swatch').forEach((s) => {
          s.classList.toggle('selected', s.dataset.code.toUpperCase() === el.value.toUpperCase());
        });
        if (/^#[0-9A-Fa-f]{6}$/.test(el.value)) document.getElementById('color-preview').style.background = el.value;
      }
      if (el.dataset.stIdx !== undefined) this.form.statuses[Number(el.dataset.stIdx)].name = el.value;
    },
    render: renderSettings,
  });
}

function renderSettings() {
  const ctx = dlgCtx;
  const p = getProject(ctx.projectId);
  const f = ctx.form;
  const e = ctx.errors;
  const validColor = /^#[0-9A-Fa-f]{6}$/.test(f.color);

  const swatches = BASE_COLORS.map((c) => `
    <button class="swatch ${c.code.toUpperCase() === f.color.toUpperCase() ? 'selected' : ''}" data-act="pick-color" data-code="${c.code}">
      <span class="dot" style="background:${c.code}"></span>${c.name}
    </button>`).join('');

  const statuses = f.statuses.map((s, i) => {
    const fixed = s.id === p.defaultStatusId ? '初期ステータス' : s.id === p.doneStatusId ? '完了ステータス' : '';
    const err = e.statuses[i] || '';
    return `
    <li class="st-item" data-drag="status" data-id="${i}" draggable="false">
      <div class="st-row">
        <span class="handle" title="ドラッグで並べ替え">=</span>
        <input class="input ${err ? 'invalid' : ''}" data-st-idx="${i}" value="${esc(s.name)}" placeholder="ステータス名">
        ${fixed ? `<span class="st-label">${fixed}</span>` : `<span class="spacer"></span><button class="btn btn-sm btn-link" data-act="st-del" data-idx="${i}">削除</button>`}
      </div>
      <div class="err">${esc(err)}</div>
    </li>`;
  }).join('');

  $dlg.innerHTML = `
  <div class="dlg">
    <div class="dlg-head">
      <h2 class="grow">プロジェクト設定</h2>
      <button class="icon-btn" data-act="dlg-close" aria-label="閉じる">×</button>
    </div>
    <div class="dlg-body">
      ${ctx.saveError ? `<div class="err-box">${esc(ctx.saveError)}</div>` : ''}
      <div class="dlg-section">
        <div class="field">
          <label for="s-name">プロジェクト名 <span class="field-note">（必須・30文字まで）</span></label>
          <input class="input ${e.name ? 'invalid' : ''}" id="s-name" data-field="name" value="${esc(f.name)}">
          <div class="err">${esc(e.name || '')}</div>
        </div>
        <div class="field">
          <span class="field-label">色</span>
          <div class="swatches">${swatches}</div>
          <div class="color-code">
            <label for="s-color">カラーコード</label>
            <input class="input ${e.color ? 'invalid' : ''}" id="s-color" data-field="color" value="${esc(f.color)}">
            <span class="color-preview" id="color-preview" style="background:${validColor ? esc(f.color) : 'transparent'}"></span>
          </div>
          <div class="err">${esc(e.color || '')}</div>
        </div>
      </div>
      <div class="dlg-section">
        <span class="field-label">ステータス</span>
        <ul class="st-list" data-drop="status">${statuses}</ul>
        <button class="btn btn-sm" data-act="st-add">+ ステータスを追加</button>
      </div>
    </div>
    <div class="dlg-foot">
      <button class="btn btn-danger-text" data-act="project-del">プロジェクトを削除</button>
      <span class="spacer"></span>
      <button class="btn" data-act="dlg-close">キャンセル</button>
      <button class="btn btn-primary" data-act="settings-save">保存</button>
    </div>
  </div>`;
}

function moveStatus(from, index) {
  const list = dlgCtx.form.statuses;
  const [s] = list.splice(from, 1);
  list.splice(index, 0, s);
  dlgCtx.errors.statuses = {};
  renderSettings();
}

Object.assign(dlgActions, {
  'pick-color': (el) => {
    dlgCtx.form.color = el.dataset.code;
    dlgCtx.errors.color = '';
    renderSettings();
  },
  'st-add': () => {
    dlgCtx.form.statuses.push({ id: `new-${nextId()}`, name: '' });
    renderSettings();
    const inputs = document.querySelectorAll('[data-st-idx]');
    inputs[inputs.length - 1].focus();
  },
  'st-del': async (el) => {
    const ok = await askConfirm('このステータスを削除しますか？', '削除', 'キャンセル', true);
    if (!ok) return;
    const [s] = dlgCtx.form.statuses.splice(Number(el.dataset.idx), 1);
    if (typeof s.id === 'number') dlgCtx.deleted.push(s.id);
    dlgCtx.errors.statuses = {};
    renderSettings();
  },
  'settings-save': () => {
    const ctx = dlgCtx;
    const f = ctx.form;
    const p = getProject(ctx.projectId);
    ctx.saveError = '';
    ctx.errors = {
      name: validateText(f.name, 'プロジェクト名', 30, true),
      color: f.color.trim() === '' ? 'カラーコードを入力してください'
        : /^#[0-9A-Fa-f]{6}$/.test(f.color) ? '' : 'カラーコードは「#」と16進数6桁で入力してください',
      statuses: {},
    };
    f.statuses.forEach((s, i) => {
      const err = validateText(s.name, 'ステータス名', 20, true);
      if (err) ctx.errors.statuses[i] = err;
    });
    const hasError = ctx.errors.name || ctx.errors.color || Object.keys(ctx.errors.statuses).length;
    if (!hasError && ctx.deleted.some((id) => state.tasks.some((t) => t.statusId === id))) {
      ctx.saveError = 'タスクが残っているため削除できません';
    }
    if (hasError || ctx.saveError) { renderSettings(); return; }

    // 名前・色・ステータスをまとめて保存する
    p.name = f.name.trim();
    p.color = f.color.toUpperCase();
    p.statuses = f.statuses.map((s) => ({
      id: typeof s.id === 'number' ? s.id : nextId(),
      name: s.name.trim(),
    }));
    closeDialog();
  },
  'project-del': async () => {
    const ok = await askConfirm('プロジェクトと、その中のタスクがすべて削除されます。よろしいですか？', '削除', 'キャンセル', true);
    if (!ok) return;
    const id = dlgCtx.projectId;
    state.projects = state.projects.filter((p) => p.id !== id);
    state.tasks = state.tasks.filter((t) => t.projectId !== id);
    $dlg.close();
    dlgCtx = null;
    go('#/dashboard');
  },
});

/* ================================================================
 * S-08 プロジェクト作成
 * ================================================================ */
function openNewProject() {
  openDialog({ type: 'newproject', title: '', error: '', render: renderNewProject,
    onInput(el) { if (el.id === 'np-title') this.title = el.value; },
    onKeydown(e) {
      if (e.target.id === 'np-title' && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); dlgActions['project-create'](); }
    },
  });
  document.getElementById('np-title').focus();
}

function renderNewProject() {
  const ctx = dlgCtx;
  $dlg.innerHTML = `
  <div class="dlg">
    <div class="dlg-head">
      <h2 class="grow">プロジェクトを追加</h2>
      <button class="icon-btn" data-act="dlg-close" aria-label="閉じる">×</button>
    </div>
    <div class="dlg-body">
      <div class="field">
        <label for="np-title">タイトル <span class="field-note">（必須・30文字まで）</span></label>
        <input class="input ${ctx.error ? 'invalid' : ''}" id="np-title" value="${esc(ctx.title)}">
        <div class="err">${esc(ctx.error)}</div>
      </div>
      <p class="muted">色は自動で設定されます。<br>あとから設定画面で変更できます。</p>
    </div>
    <div class="dlg-foot">
      <span class="spacer"></span>
      <button class="btn" data-act="dlg-close">キャンセル</button>
      <button class="btn btn-primary" data-act="project-create">作成</button>
    </div>
  </div>`;
}

dlgActions['project-create'] = () => {
  const ctx = dlgCtx;
  ctx.error = validateText(ctx.title, 'タイトル', 30, true);
  if (ctx.error) { renderNewProject(); document.getElementById('np-title').focus(); return; }
  // 色は基本カラーから、まだ使われていない色を自動で設定する
  const p = makeProject(ctx.title.trim(), nextProjectColor());
  state.projects.push(p);
  $dlg.close();
  dlgCtx = null;
  go(`#/project/${p.id}/board`);
};

/* ================================================================
 * 起動
 * ================================================================ */
render();
