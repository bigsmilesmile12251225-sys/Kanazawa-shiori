/* ② 交通(新幹線・特急・在来線など) */
(function (App) {
  'use strict';
  const { U } = App;
  const M = {};

  const METHOD_SUGGESTIONS = ['紙のきっぷ', 'えきねっと(新幹線eチケット)', 'スマートEX', '交通系ICカード', 'きっぷ(駅で受け取り)', '現地で購入'];

  const fields = () => [
    { key: 'kind', label: '種別', type: 'select', options: App.TRANSPORT_KINDS.map((k) => ({ value: k.key, label: k.label })) },
    { key: 'day', label: '日にち', type: 'day', allowNone: true },
    { key: 'from', label: '出発', type: 'text', placeholder: '例: 東京', required: true },
    { key: 'to', label: '到着', type: 'text', placeholder: '例: 金沢', required: true },
    { key: 'depTime', label: '発車時刻', type: 'time' },
    { key: 'arrTime', label: '到着時刻', type: 'time' },
    { key: 'trainName', label: '列車名', type: 'text', placeholder: '例: かがやき○号' },
    { key: 'seat', label: '号車・座席', type: 'text', placeholder: '例: 7号車 3D・3E' },
    { key: 'price', label: '金額(円)', type: 'number', placeholder: '例: 28760', hint: '2人分の合計など、実際に払う金額' },
    { key: 'method', label: '乗車方法', type: 'text', placeholder: '例: えきねっと', suggestions: METHOD_SUGGESTIONS },
    { key: 'booked', label: '手配済み', type: 'checkbox' },
    { key: 'memo', label: 'メモ', type: 'textarea', full: true },
  ];

  M.total = () => App.data.transport.reduce((sum, t) => sum + U.toNum(t.price), 0);

  // 「1日目 11/20(金) 07:36 → 10:30」
  M.whenText = (t) => {
    const time = [t.depTime, t.arrTime].filter(Boolean).join(' → ');
    return [U.dayLabel(App.data.trip.startDate, t.day), time].filter(Boolean).join(' ');
  };

  function openEdit(id) {
    const found = App.data.transport.find((t) => t.id === id);
    App.openForm({
      title: found ? '交通を編集' : '交通を追加',
      fields: fields(),
      values: found || Object.assign({}, App.DEF.transport),
      onSubmit: (v) => {
        if (found) Object.assign(found, v);
        else App.data.transport.push(Object.assign({}, App.DEF.transport, v, { id: U.uid() }));
        App.commit();
      },
      onDelete: found ? () => remove(found) : null,
    });
  }

  function remove(t) {
    App.data.transport = App.data.transport.filter((x) => x !== t);
    App.commit();
    U.toast('削除しました');
  }

  function cardHtml(t) {
    const kind = App.kindOf(t.kind);
    const rows = [
      ['列車', t.trainName],
      ['号車・座席', t.seat],
      ['乗車方法', t.method],
      ['金額', U.hasValue(t.price) ? U.yen(t.price) : ''],
    ].filter((r) => r[1]);
    return `
      <article class="card item-card${t.booked ? ' is-done' : ''}">
        <div class="ic-head">
          <span class="chip chip-ai">${kind.label}</span>
          <span class="ic-when">${U.esc(M.whenText(t))}</span>
          ${t.booked ? '<span class="chip chip-ok">手配済み</span>' : '<span class="chip chip-warn">未手配</span>'}
        </div>
        <div class="ic-title">${U.esc(t.from)} → ${U.esc(t.to)}</div>
        ${rows.length ? `<dl class="ic-dl">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${U.esc(r[1])}</dd></div>`).join('')}</dl>` : ''}
        ${t.memo ? `<div class="ic-memo">${U.escBr(t.memo)}</div>` : ''}
        <div class="ic-foot">
          <label class="check-big"><input type="checkbox" data-act="booked" data-id="${t.id}"${t.booked ? ' checked' : ''}>手配済み</label>
          <span class="spacer"></span>
          <button type="button" class="btn btn-small" data-act="edit" data-id="${t.id}">✎ 編集</button>
          <button type="button" class="icon-btn danger" data-act="del" data-id="${t.id}" aria-label="削除">🗑</button>
        </div>
      </article>`;
  }

  M.render = (el) => {
    const list = U.sortByDayTime(App.data.transport, 'depTime');
    const booked = list.filter((t) => t.booked).length;
    el.innerHTML = `
      <section class="card summary-card">
        <div class="stat"><span class="stat-label">合計金額</span><span class="stat-value">${U.yen(M.total())}</span></div>
        <div class="stat"><span class="stat-label">手配済み</span><span class="stat-value">${booked}<small> / ${list.length}件</small></span></div>
      </section>
      <div class="list">
        ${list.length ? list.map(cardHtml).join('') : '<p class="empty card">まだ交通の予定がありません</p>'}
      </div>
      <button type="button" class="btn btn-add" data-act="add">＋ 交通を追加</button>
      <p class="note">日にち・発車時刻の順に自動で並びます。</p>`;
  };

  M.init = (el) => {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const t = App.data.transport.find((x) => x.id === b.dataset.id);
      if (b.dataset.act === 'add') openEdit();
      if (b.dataset.act === 'edit') openEdit(b.dataset.id);
      if (b.dataset.act === 'del' && t && confirm(`「${t.from} → ${t.to}」を削除しますか?`)) remove(t);
    });
    el.addEventListener('change', (e) => {
      if (e.target.dataset.act !== 'booked') return;
      const t = App.data.transport.find((x) => x.id === e.target.dataset.id);
      if (t) {
        t.booked = e.target.checked;
        App.commit();
      }
    });
  };

  App.modules = App.modules || {};
  App.modules.transport = M;
})(window.App);
