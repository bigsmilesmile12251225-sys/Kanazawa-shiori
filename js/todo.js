/* ⑦ やること(ToDo): 各メモの「⚠️」の行を集めて、旅行前にやることの一覧にする
 *
 * - メモの1行に ⚠️(⚠ でも可)があれば、その行を1件のToDoとする
 * - 完了状態は App.data.todoDone[キー] に保存。キーは「元の項目のid|本文」
 *   (本文を書き換えると別のToDoとして扱われ、未完了に戻る)
 * - しおりには、標準では ⚠️ の行を載せない(shioriOpts.todoInShiori)
 */
(function (App) {
  'use strict';
  const { U } = App;
  const M = {};

  const MARK = /⚠️?/;
  const MARK_ALL = /⚠️?/g;

  const todoText = (line) => line.replace(MARK_ALL, '').replace(/^[\s:：・\-]+/, '').trim();
  const keyOf = (srcId, text) => `${srcId}|${text}`;

  // メモをHTMLにする(⚠️の行は目立たせ、完了済みなら取り消し線)
  App.memoHtml = (memo, srcId) =>
    String(memo || '').split(/\r?\n/).map((line) => {
      if (!MARK.test(line)) return U.esc(line);
      const done = !!App.data.todoDone[keyOf(srcId, todoText(line))];
      return `<span class="memo-todo${done ? ' done' : ''}">${done ? '✅ ' + U.esc(todoText(line)) : U.esc(line)}</span>`;
    }).join('<br>');

  // しおり用: ⚠️の行を取り除いたメモ
  App.memoForShiori = (memo) =>
    String(memo || '').split(/\r?\n/).filter((line) => !MARK.test(line)).join('\n').trim();

  // すべてのToDoを、行程 → 交通 → 宿 → 店 → お土産 → 持ち物 の順に集める
  M.collect = () => {
    const d = App.data;
    const list = [];
    const add = (group, srcId, memo, source, open) => {
      String(memo || '').split(/\r?\n/).forEach((line) => {
        if (!MARK.test(line)) return;
        const text = todoText(line);
        if (!text) return;
        const key = keyOf(srcId, text);
        list.push({ group, key, text, source, open, done: !!d.todoDone[key] });
      });
    };

    d.itinerary.forEach((items, day) => items.forEach((it) => {
      add('行程', it.id, it.memo, App.itemLabel(day, it), { mod: 'itinerary', id: it.id });
    }));
    U.sortByDayTime(d.transport, 'depTime').forEach((t) => {
      add('交通', t.id, t.memo, `${App.modules.transport.whenText(t)} ${t.from} → ${t.to}`, { mod: 'transport', id: t.id });
    });
    d.hotels.forEach((h) => add('宿', h.id, h.memo, h.name, { mod: 'stay', id: h.id }));
    U.sortByDayTime(d.restaurants, 'time').forEach((r) => {
      add('予約した店', r.id, r.memo, `${App.modules.stay.restaurantWhen(r)} ${r.name}`, { mod: 'stay', id: r.id });
    });
    d.souvenirs.forEach((s) => {
      add('お土産', s.id, s.memo, [s.category === 'ours' ? '自分たち用' : s.recipient, s.item].filter(Boolean).join(' / '), { mod: 'souvenir', id: s.id });
    });
    App.PACK_GROUPS.forEach((g) => d.packing[g.key].forEach((p) => {
      add('持ち物', 'pack:' + p.id, p.name, `持ち物(${g.label})`, { tab: 'packing' });
    }));
    return list;
  };

  M.openCount = () => M.collect().filter((t) => !t.done).length;

  // 出発まであと何日か
  function countdown() {
    const s = U.parseDate(App.data.trip.startDate);
    if (!s) return { label: '出発日', value: '未設定', note: '「行程」で旅行開始日を入れてください' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((s - today) / 86400000);
    if (days > 0) return { label: '出発まで', value: `あと${days}日`, note: U.fmtYMD(s) + ' 出発' };
    if (days === 0) return { label: '出発', value: '今日!', note: 'いってらっしゃい' };
    if (days > -U.DAYS) return { label: '旅行中', value: `${1 - days}日目`, note: '' };
    return { label: '旅行', value: '終了', note: 'おかえりなさい' };
  }

  const GROUP_ICON = { 行程: '🗓️', 交通: '🚄', 宿: '🏨', 予約した店: '🍽️', お土産: '🎁', 持ち物: '🧳' };
  let current = [];

  M.render = (el) => {
    const all = M.collect();
    // 消えたToDo(メモを書き換えた等)の完了状態を掃除する
    const keys = new Set(all.map((t) => t.key));
    const stale = Object.keys(App.data.todoDone).filter((k) => !keys.has(k));
    if (stale.length) {
      stale.forEach((k) => delete App.data.todoDone[k]);
      App.save();
    }

    const hide = !!App.ui.todoHideDone;
    current = hide ? all.filter((t) => !t.done) : all;
    const done = all.filter((t) => t.done).length;
    const cd = countdown();
    const groups = [];
    current.forEach((t, i) => {
      let g = groups.find((x) => x.name === t.group);
      if (!g) groups.push((g = { name: t.group, items: [] }));
      g.items.push({ t, i });
    });

    el.innerHTML = `
      <section class="card summary-card">
        <div class="stat"><span class="stat-label">${U.esc(cd.label)}</span><span class="stat-value">${U.esc(cd.value)}</span>${cd.note ? `<small class="stat-note">${U.esc(cd.note)}</small>` : ''}</div>
        <div class="stat"><span class="stat-label">やること</span><span class="stat-value">残り ${all.length - done}<small> / ${all.length}件</small></span></div>
        <span class="spacer"></span>
        <label class="check-big"><input type="checkbox" data-act="hide"${hide ? ' checked' : ''}>完了したものを隠す</label>
        ${all.length ? `<div class="progress" style="flex-basis:100%"><span style="width:${(done / all.length) * 100}%"></span></div>` : ''}
      </section>
      <div class="banner">各画面のメモに <b>⚠️</b> を付けて書いた行が、ここに自動で集まります(1行=1件)。<br>例: <code>⚠️ 3日前までに人数の最終連絡</code>　※⚠️の行はしおりには載りません。</div>
      ${groups.map((g) => `
        <h2 class="section-title">${GROUP_ICON[g.name] || ''} ${U.esc(g.name)} <span class="count">${g.items.length}件</span></h2>
        <ul class="card todo-list">
          ${g.items.map(({ t, i }) => `
            <li class="todo-item${t.done ? ' is-done' : ''}">
              <label class="check-row"><input type="checkbox" data-i="${i}"${t.done ? ' checked' : ''}><span class="todo-body"><span class="todo-text">${U.esc(t.text)}</span><span class="todo-src">${U.esc(t.source)}</span></span></label>
              <button type="button" class="btn btn-small" data-act="open" data-i="${i}">${t.open.mod ? '✎ 編集' : '開く'}</button>
            </li>`).join('')}
        </ul>`).join('')}
      ${current.length ? '' : `<p class="empty card">${all.length ? '🎉 やることはすべて完了しました!' : '⚠️ の付いたメモはまだありません'}</p>`}`;
  };

  M.init = (el) => {
    el.addEventListener('change', (e) => {
      if (e.target.dataset.act === 'hide') {
        App.ui.todoHideDone = e.target.checked;
        App.saveUi();
        return App.render();
      }
      const t = current[Number(e.target.dataset.i)];
      if (!t) return;
      if (e.target.checked) App.data.todoDone[t.key] = true;
      else delete App.data.todoDone[t.key];
      App.commit();
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act="open"]');
      if (!b) return;
      const t = current[Number(b.dataset.i)];
      if (!t) return;
      // 元の項目の編集画面をこの場で開く(保存後もこのページに戻る)
      if (t.open.mod) App.modules[t.open.mod].edit(t.open.id);
      else App.setTab(t.open.tab);
    });
  };

  App.modules = App.modules || {};
  App.modules.todo = M;
})(window.App);
