/* ⑤ お土産(しおりには載せない別ページ) */
(function (App) {
  'use strict';
  const { U } = App;
  const M = {};

  const CATEGORIES = [
    { value: 'gift', label: '渡す相手用' },
    { value: 'ours', label: '自分たち用' },
  ];

  const recipients = () =>
    [...new Set(App.data.souvenirs.map((s) => s.recipient.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'));

  const fields = () => [
    { key: 'category', label: '区分', type: 'select', options: CATEGORIES },
    { key: 'recipient', label: '渡す相手', type: 'text', placeholder: '例: 職場、実家', suggestions: recipients(), showIf: (v) => v.category !== 'ours' },
    { key: 'item', label: '品物', type: 'text', required: true, full: true, placeholder: '例: 加賀棒茶' },
    { key: 'shop', label: '購入場所', type: 'text', full: true, placeholder: '例: 金沢駅のお土産売り場' },
    { key: 'timing', label: '購入タイミング', type: 'timing', full: true, hint: '行程の予定を選ぶと、行程画面のその予定に🎁が表示されます' },
    { key: 'budget', label: '予算(円)', type: 'number' },
    { key: 'actual', label: '実際の金額(円)', type: 'number' },
    { key: 'bought', label: '購入済み', type: 'checkbox' },
    { key: 'photo', label: '写真(1枚)', type: 'photo', full: true, hint: '保存容量を節約するため、自動で小さくします' },
    { key: 'url', label: '商品URL', type: 'url', full: true, placeholder: 'https://…' },
    { key: 'memo', label: 'メモ', type: 'textarea', full: true },
  ];

  M.totals = (list) => {
    const budget = list.reduce((s, x) => s + U.toNum(x.budget), 0);
    const actual = list.reduce((s, x) => s + U.toNum(x.actual), 0);
    return { budget, actual, rest: budget - actual };
  };

  function openEdit(id) {
    const found = App.data.souvenirs.find((s) => s.id === id);
    App.openForm({
      title: found ? 'お土産を編集' : 'お土産を追加',
      fields: fields(),
      values: found || Object.assign({}, App.DEF.souvenir),
      onSubmit: (v) => {
        if (v.category === 'ours') v.recipient = '';
        if (found) Object.assign(found, v);
        else App.data.souvenirs.push(Object.assign({}, App.DEF.souvenir, v, { id: U.uid() }));
        App.commit();
      },
      onDelete: found ? () => remove(found) : null,
    });
  }

  function remove(s) {
    App.data.souvenirs = App.data.souvenirs.filter((x) => x !== s);
    App.commit();
    U.toast('削除しました');
  }

  function cardHtml(s) {
    const timing = App.timingLabel(s);
    const over = U.hasValue(s.actual) && U.hasValue(s.budget) && U.toNum(s.actual) > U.toNum(s.budget);
    const url = U.safeUrl(s.url);
    return `
      <article class="card item-card${s.bought ? ' is-done' : ''}">
        <div class="sv-layout">
          ${s.photo
            ? `<button type="button" class="sv-photo" data-act="photo" data-id="${s.id}" aria-label="写真を大きく表示"><img src="${s.photo}" alt=""></button>`
            : '<div class="sv-photo empty" aria-hidden="true">🎁</div>'}
          <div class="sv-main">
            <div class="ic-title">${U.esc(s.item)}</div>
            ${s.shop ? `<div class="sv-meta">🏬 ${U.esc(s.shop)}</div>` : ''}
            ${timing ? `<div class="sv-meta">🕒 ${U.esc(timing)}</div>` : ''}
            <div class="sv-money">
              <span>予算 <b>${U.hasValue(s.budget) ? U.yen(s.budget) : '—'}</b></span>
              <span>実額 <b class="${over ? 'sv-over' : ''}">${U.hasValue(s.actual) ? U.yen(s.actual) : '—'}</b>${over ? '<span class="sv-over">(予算オーバー)</span>' : ''}</span>
            </div>
            ${s.memo ? `<div class="ic-memo">${U.escBr(s.memo)}</div>` : ''}
            ${url ? `<div class="ic-links">${U.link(url, '🔗 商品ページ', 'mini-link')}</div>` : ''}
          </div>
        </div>
        <div class="ic-foot">
          <label class="check-big"><input type="checkbox" data-act="bought" data-id="${s.id}"${s.bought ? ' checked' : ''}>購入済み</label>
          <span class="spacer"></span>
          <button type="button" class="btn btn-small" data-act="edit" data-id="${s.id}">✎ 編集</button>
          <button type="button" class="icon-btn danger" data-act="del" data-id="${s.id}" aria-label="削除">🗑</button>
        </div>
      </article>`;
  }

  function groupHtml(title, list) {
    if (!list.length) return '';
    const t = M.totals(list);
    return `
      <h3 class="sv-group-title">${U.esc(title)}<small>${list.length}件・予算 ${U.yen(t.budget)}</small></h3>
      <div class="list">${list.map(cardHtml).join('')}</div>`;
  }

  M.render = (el) => {
    const all = App.data.souvenirs;
    const t = M.totals(all);
    const filter = App.ui.souvenirFilter || 'all';
    const shown = all.filter((s) => filter === 'all' || (filter === 'bought' ? s.bought : !s.bought));
    const gifts = shown.filter((s) => s.category !== 'ours');
    const ours = shown.filter((s) => s.category === 'ours');
    const byRecipient = {};
    gifts.forEach((s) => {
      const k = s.recipient.trim() || '(相手未入力)';
      (byRecipient[k] = byRecipient[k] || []).push(s);
    });
    const names = Object.keys(byRecipient).sort((a, b) =>
      (a === '(相手未入力)') - (b === '(相手未入力)') || a.localeCompare(b, 'ja'));
    const sub = (list) => M.totals(list);
    const gT = sub(all.filter((s) => s.category !== 'ours'));
    const oT = sub(all.filter((s) => s.category === 'ours'));

    el.innerHTML = `
      <div class="banner">🎁 お土産のページは<strong>しおり(PDF・画像)には載りません</strong>。自分用のメモとして使えます。</div>
      <section class="card">
        <div class="summary-card" style="padding:0;border:0;box-shadow:none;background:none">
          <div class="stat"><span class="stat-label">合計予算</span><span class="stat-value">${U.yen(t.budget)}</span></div>
          <div class="stat"><span class="stat-label">合計実額</span><span class="stat-value">${U.yen(t.actual)}</span></div>
          <div class="stat"><span class="stat-label">残額(予算−実額)</span><span class="stat-value${t.rest < 0 ? ' minus' : ''}">${U.yen(t.rest)}</span></div>
          <div class="stat"><span class="stat-label">購入済み</span><span class="stat-value">${all.filter((s) => s.bought).length}<small> / ${all.length}件</small></span></div>
        </div>
        <p class="note" style="margin:10px 0 0">内訳: 渡す相手用 予算${U.yen(gT.budget)}・実額${U.yen(gT.actual)} / 自分たち用 予算${U.yen(oT.budget)}・実額${U.yen(oT.actual)}</p>
      </section>
      <div class="seg" role="group" aria-label="表示の絞り込み">
        <button type="button" data-filter="all" class="${filter === 'all' ? 'on' : ''}">すべて</button>
        <button type="button" data-filter="todo" class="${filter === 'todo' ? 'on' : ''}">未購入</button>
        <button type="button" data-filter="bought" class="${filter === 'bought' ? 'on' : ''}">購入済み</button>
      </div>
      <div>
        ${names.map((n) => groupHtml(`渡す相手: ${n}`, byRecipient[n])).join('')}
        ${groupHtml('自分たち用', ours)}
        ${shown.length ? '' : `<p class="empty card">${all.length ? '該当するお土産はありません' : 'まだお土産が登録されていません'}</p>`}
      </div>
      <button type="button" class="btn btn-add" data-act="add">＋ お土産を追加</button>`;
  };

  M.init = (el) => {
    el.addEventListener('click', (e) => {
      const f = e.target.closest('[data-filter]');
      if (f) {
        App.ui.souvenirFilter = f.dataset.filter;
        App.saveUi();
        return App.render();
      }
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const s = App.data.souvenirs.find((x) => x.id === b.dataset.id);
      if (b.dataset.act === 'add') openEdit();
      if (b.dataset.act === 'edit') openEdit(b.dataset.id);
      if (b.dataset.act === 'del' && s && confirm(`「${s.item}」を削除しますか?`)) remove(s);
      if (b.dataset.act === 'photo' && s) App.openViewer(s.item, `<img class="viewer-img" src="${s.photo}" alt="${U.esc(s.item)}">`);
    });
    el.addEventListener('change', (e) => {
      if (e.target.dataset.act !== 'bought') return;
      const s = App.data.souvenirs.find((x) => x.id === e.target.dataset.id);
      if (s) {
        s.bought = e.target.checked;
        App.commit();
      }
    });
  };

  App.modules = App.modules || {};
  App.modules.souvenir = M;
})(window.App);
