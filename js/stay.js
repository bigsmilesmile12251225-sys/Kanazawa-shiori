/* ③ 宿泊・食事(予約した店) */
(function (App) {
  'use strict';
  const { U } = App;
  const M = {};

  const hotelFields = () => [
    { key: 'name', label: '宿名', type: 'text', required: true, full: true },
    { key: 'address', label: '住所', type: 'text', full: true },
    { key: 'checkIn', label: 'チェックイン', type: 'time' },
    { key: 'checkOut', label: 'チェックアウト', type: 'time' },
    { key: 'nights', label: '泊まる日', type: 'select', options: App.NIGHTS.map((n) => ({ value: n.key, label: n.label })) },
    { key: 'phone', label: '電話', type: 'tel', placeholder: '例: 076-xxx-xxxx' },
    { key: 'mapUrl', label: '地図(GoogleマップのURL)', type: 'url', full: true, hint: '空欄のときは住所(なければ宿名)で検索します' },
    { key: 'memo', label: 'メモ', type: 'textarea', full: true, placeholder: '例: 朝食付き、駐車場なし' },
  ];

  const restaurantFields = () => [
    { key: 'name', label: '店名', type: 'text', required: true, full: true },
    { key: 'day', label: '日にち', type: 'day', allowNone: true },
    { key: 'time', label: '時刻', type: 'time' },
    { key: 'people', label: '人数', type: 'number' },
    { key: 'phone', label: '電話', type: 'tel' },
    { key: 'mapUrl', label: '地図(GoogleマップのURL)', type: 'url', full: true, hint: '空欄のときは店名で検索します' },
    { key: 'memo', label: 'メモ', type: 'textarea', full: true, placeholder: '例: コース予約、カウンター席' },
  ];

  M.nightsLabel = (key) => (App.NIGHTS.find((n) => n.key === key) || App.NIGHTS[0]).label;
  M.restaurantWhen = (r) => [U.dayLabel(App.data.trip.startDate, r.day), r.time].filter(Boolean).join(' ');
  M.hotelMap = (h) => U.mapHref(h.mapUrl, h.address || h.name);

  function openEdit(kind, id) {
    const isHotel = kind === 'hotel';
    const listKey = isHotel ? 'hotels' : 'restaurants';
    const def = isHotel ? App.DEF.hotel : App.DEF.restaurant;
    const found = App.data[listKey].find((x) => x.id === id);
    App.openForm({
      title: (isHotel ? '宿' : '予約した店') + (found ? 'を編集' : 'を追加'),
      fields: isHotel ? hotelFields() : restaurantFields(),
      values: found || Object.assign({}, def),
      onSubmit: (v) => {
        if (found) Object.assign(found, v);
        else App.data[listKey].push(Object.assign({}, def, v, { id: U.uid() }));
        App.commit();
      },
      onDelete: found ? () => {
        App.data[listKey] = App.data[listKey].filter((x) => x !== found);
        App.commit();
        U.toast('削除しました');
      } : null,
    });
  }

  const actions = (kind, id) => `
    <div class="ic-foot">
      <span class="spacer"></span>
      <button type="button" class="btn btn-small" data-act="edit" data-kind="${kind}" data-id="${id}">✎ 編集</button>
      <button type="button" class="icon-btn danger" data-act="del" data-kind="${kind}" data-id="${id}" aria-label="削除">🗑</button>
    </div>`;

  function hotelHtml(h) {
    const tel = U.telHref(h.phone);
    return `
      <article class="card item-card">
        <div class="ic-head"><span class="chip chip-kin">${U.esc(M.nightsLabel(h.nights))}</span></div>
        <div class="ic-title">${U.esc(h.name)}</div>
        <dl class="ic-dl">
          <div><dt>チェックイン</dt><dd>${U.esc(h.checkIn) || '—'}</dd></div>
          <div><dt>チェックアウト</dt><dd>${U.esc(h.checkOut) || '—'}</dd></div>
          ${h.address ? `<div style="grid-column:1/-1"><dt>住所</dt><dd>${U.esc(h.address)}</dd></div>` : ''}
          ${h.phone ? `<div><dt>電話</dt><dd>${U.esc(h.phone)}</dd></div>` : ''}
        </dl>
        ${h.memo ? `<div class="ic-memo">${U.escBr(h.memo)}</div>` : ''}
        <div class="ic-links">
          ${U.link(M.hotelMap(h), '📍 地図を開く', 'mini-link')}
          ${tel ? `<a class="mini-link" href="${U.esc(tel)}">📞 電話をかける</a>` : ''}
        </div>
        ${actions('hotel', h.id)}
      </article>`;
  }

  function restaurantHtml(r) {
    const tel = U.telHref(r.phone);
    return `
      <article class="card item-card">
        <div class="ic-head"><span class="ic-when">${U.esc(M.restaurantWhen(r))}</span>${r.people ? `<span class="chip chip-enji">${U.esc(r.people)}名</span>` : ''}</div>
        <div class="ic-title">${U.esc(r.name)}</div>
        ${r.phone ? `<dl class="ic-dl"><div><dt>電話</dt><dd>${U.esc(r.phone)}</dd></div></dl>` : ''}
        ${r.memo ? `<div class="ic-memo">${U.escBr(r.memo)}</div>` : ''}
        <div class="ic-links">
          ${U.link(U.mapHref(r.mapUrl, r.name), '📍 地図を開く', 'mini-link')}
          ${tel ? `<a class="mini-link" href="${U.esc(tel)}">📞 電話をかける</a>` : ''}
        </div>
        ${actions('restaurant', r.id)}
      </article>`;
  }

  M.render = (el) => {
    const hotels = App.data.hotels;
    const rests = U.sortByDayTime(App.data.restaurants, 'time');
    el.innerHTML = `
      <h2 class="section-title" style="margin-top:0">宿 <span class="count">${hotels.length}件</span></h2>
      <div class="list">${hotels.length ? hotels.map(hotelHtml).join('') : '<p class="empty card">まだ宿が登録されていません</p>'}</div>
      <button type="button" class="btn btn-add" data-act="add" data-kind="hotel">＋ 宿を追加</button>

      <h2 class="section-title">予約した店 <span class="count">${rests.length}件</span></h2>
      <div class="list">${rests.length ? rests.map(restaurantHtml).join('') : '<p class="empty card">まだ予約した店がありません</p>'}</div>
      <button type="button" class="btn btn-add" data-act="add" data-kind="restaurant">＋ 店を追加</button>`;
  };

  M.init = (el) => {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const kind = b.dataset.kind;
      if (b.dataset.act === 'add') openEdit(kind);
      if (b.dataset.act === 'edit') openEdit(kind, b.dataset.id);
      if (b.dataset.act === 'del') {
        const key = kind === 'hotel' ? 'hotels' : 'restaurants';
        const rec = App.data[key].find((x) => x.id === b.dataset.id);
        if (rec && confirm(`「${rec.name}」を削除しますか?`)) {
          App.data[key] = App.data[key].filter((x) => x !== rec);
          App.commit();
          U.toast('削除しました');
        }
      }
    });
  };

  App.modules = App.modules || {};
  App.modules.stay = M;
})(window.App);
