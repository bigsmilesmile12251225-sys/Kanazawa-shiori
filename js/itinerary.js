/* ① 行程(3日分) */
(function (App) {
  'use strict';
  const { U } = App;
  const M = {};

  const fields = () => [
    { key: 'day', label: '日にち', type: 'day' },
    { key: 'time', label: '時刻', type: 'time' },
    { key: 'type', label: '種別', type: 'select', options: App.ITEM_TYPES.map((t) => ({ value: t.key, label: `${t.icon} ${t.label}` })) },
    { key: 'title', label: 'タイトル', type: 'text', required: true, full: true, placeholder: '例: 兼六園を散策' },
    { key: 'place', label: '場所', type: 'text', full: true, placeholder: '例: 兼六園' },
    { key: 'mapUrl', label: '地図(GoogleマップのURL)', type: 'url', full: true, placeholder: 'https://maps.app.goo.gl/…', hint: '空欄のときは「場所」の名前でGoogleマップを検索します' },
    { key: 'memo', label: 'メモ', type: 'textarea', full: true },
  ];

  // 時刻を見て、ちょうどよい位置に差し込む
  function insertByTime(list, item) {
    const k = U.timeKey(item.time);
    const idx = k === '99:99' ? -1 : list.findIndex((x) => U.timeKey(x.time) > k);
    if (idx === -1) list.push(item);
    else list.splice(idx, 0, item);
  }

  function openEdit(day, id) {
    const days = App.data.itinerary;
    const found = id ? App.findItem(id) : null;
    const values = found ? Object.assign({ day: found.day }, found.item) : Object.assign({}, App.DEF.item, { day });
    App.openForm({
      title: found ? '予定を編集' : '予定を追加',
      fields: fields(),
      values,
      onSubmit: (v) => {
        const newDay = v.day;
        delete v.day;
        if (found) {
          Object.assign(found.item, v);
          if (newDay !== found.day) {
            days[found.day].splice(found.idx, 1);
            insertByTime(days[newDay], found.item);
          }
        } else {
          insertByTime(days[newDay], Object.assign({}, App.DEF.item, v, { id: U.uid() }));
        }
        App.commit();
      },
      onDelete: found ? () => removeItem(found) : null,
    });
  }

  function removeItem(found) {
    // 購入タイミングに紐づいたお土産は、文字のメモに切り替えて残す
    const label = App.itemLabel(found.day, found.item);
    App.data.souvenirs.forEach((s) => {
      if (s.timingItemId === found.item.id) {
        s.timingItemId = '';
        s.timingText = label;
      }
    });
    App.data.itinerary[found.day].splice(found.idx, 1);
    App.commit();
    U.toast('予定を削除しました');
  }

  function giftsByItem() {
    const map = {};
    App.data.souvenirs.forEach((s) => {
      if (s.timingItemId) (map[s.timingItemId] = map[s.timingItemId] || []).push(s);
    });
    return map;
  }

  function itemHtml(it, idx, count, gifts) {
    const t = App.typeOf(it.type);
    const map = U.mapHref(it.mapUrl, it.place);
    const giftHtml = (gifts[it.id] || []).map((g) =>
      `<div class="tl-gift">🎁 ${U.esc(g.item)}${g.shop ? `(${U.esc(g.shop)})` : ''}${g.bought ? '<span class="chip chip-ok">購入済</span>' : ''}</div>`).join('');
    return `
      <li class="tl-item t-${t.key}">
        <div class="tl-time">${U.esc(it.time) || '—'}</div>
        <div class="tl-main">
          <div class="tl-head"><span class="chip type-chip">${t.icon} ${t.label}</span><span class="tl-title">${U.esc(it.title)}</span></div>
          ${it.place || map ? `<div class="tl-place">${it.place ? `<span>📍 ${U.esc(it.place)}</span>` : ''}${U.link(map, '地図を開く', 'mini-link')}</div>` : ''}
          ${it.memo ? `<div class="tl-memo">${U.escBr(it.memo)}</div>` : ''}
          ${giftHtml}
        </div>
        <div class="tl-actions">
          <button type="button" class="icon-btn" data-act="up" data-id="${it.id}" aria-label="上へ"${idx === 0 ? ' disabled' : ''}>▲</button>
          <button type="button" class="icon-btn" data-act="down" data-id="${it.id}" aria-label="下へ"${idx === count - 1 ? ' disabled' : ''}>▼</button>
          <button type="button" class="icon-btn" data-act="edit" data-id="${it.id}" aria-label="編集">✎</button>
          <button type="button" class="icon-btn danger" data-act="del" data-id="${it.id}" aria-label="削除">🗑</button>
        </div>
      </li>`;
  }

  function dayHtml(day, gifts) {
    const items = App.data.itinerary[day];
    const date = U.dayDate(App.data.trip.startDate, day);
    return `
      <section class="card day-card">
        <header class="day-head">
          <h2 class="day-title"><span class="day-num">${U.dayName(day)}</span><span class="day-date">${date ? U.fmtMDLong(date) : '日付未設定'}</span></h2>
          ${items.length > 1 ? `<button type="button" class="btn btn-small" data-act="sort" data-day="${day}">時刻順に並べる</button>` : ''}
        </header>
        <div class="day-body">
          ${items.length
            ? `<ol class="timeline">${items.map((it, i) => itemHtml(it, i, items.length, gifts)).join('')}</ol>`
            : '<p class="empty">まだ予定がありません</p>'}
          <button type="button" class="btn btn-add" data-act="add" data-day="${day}">＋ 予定を追加</button>
        </div>
      </section>`;
  }

  function periodText() {
    const s = U.dayDate(App.data.trip.startDate, 0);
    if (!s) return '旅行開始日を入れると、3日分の日付が自動で入ります。';
    return `期間: ${U.fmtYMD(s)} 〜 ${U.fmtMDLong(U.dayDate(App.data.trip.startDate, U.DAYS - 1))}(2泊3日)`;
  }

  M.render = (el) => {
    const trip = App.data.trip;
    const gifts = giftsByItem();
    const isEmpty = App.data.itinerary.every((d) => d.length === 0);
    el.innerHTML = `
      <section class="card">
        <h2 class="card-title">旅の基本</h2>
        <div class="form-grid">
          <label class="field full"><span class="field-label">しおりのタイトル</span><input type="text" data-trip="title" value="${U.esc(trip.title)}" placeholder="例: 金沢 二人旅"></label>
          <label class="field"><span class="field-label">旅行開始日(1日目)</span><input type="date" data-trip="startDate" value="${U.esc(trip.startDate)}"></label>
          <label class="field"><span class="field-label">参加者</span><input type="text" data-trip="members" value="${U.esc(trip.members)}" placeholder="例: 夫・妻"></label>
        </div>
        <p class="trip-period" id="trip-period">${U.esc(periodText())}</p>
      </section>
      ${isEmpty && App.isFirstRun ? `
        <div class="banner">はじめてお使いの場合は、右上の「⚙ データ」から<strong>サンプルデータ(架空)</strong>を読み込むと、入力例を確認できます。</div>` : ''}
      ${[0, 1, 2].map((d) => dayHtml(d, gifts)).join('')}`;
  };

  M.init = (el) => {
    // 旅の基本: 入力中は保存だけ、日付変更時は再描画
    el.addEventListener('input', (e) => {
      const key = e.target.dataset.trip;
      if (!key) return;
      App.data.trip[key] = e.target.value;
      App.save();
      App.renderHeader();
    });
    el.addEventListener('change', (e) => {
      if (e.target.dataset.trip === 'startDate') App.render();
    });

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'add') return openEdit(Number(b.dataset.day));
      if (act === 'sort') {
        const day = Number(b.dataset.day);
        App.data.itinerary[day].sort((a, c) => U.timeKey(a.time).localeCompare(U.timeKey(c.time)));
        App.commit();
        return U.toast('時刻順に並べ替えました');
      }
      const found = App.findItem(b.dataset.id);
      if (!found) return;
      const list = App.data.itinerary[found.day];
      if (act === 'edit') openEdit(found.day, found.item.id);
      if (act === 'del' && confirm(`「${found.item.title}」を削除しますか?`)) removeItem(found);
      if (act === 'up' || act === 'down') {
        const to = found.idx + (act === 'up' ? -1 : 1);
        if (to < 0 || to >= list.length) return;
        [list[found.idx], list[to]] = [list[to], list[found.idx]];
        App.commit();
      }
    });
  };

  App.modules = App.modules || {};
  App.modules.itinerary = M;
})(window.App);
