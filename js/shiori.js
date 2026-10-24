/* ⑥ しおり: A4プレビュー / PDF(印刷) / スマホ用PNG
 * 対象は 行程・交通・宿泊/食事・持ち物 のみ(お土産は含めない)
 */
(function (App) {
  'use strict';
  const { U } = App;
  const M = {};

  // html2canvas はPNG作成時にだけ読み込む(CDNが落ちていたら予備のCDNへ)
  const H2C_URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  ];
  const PHONE_BG = '#fbf7ee';
  const MAX_PIXELS = 16000000; // iOS Safariのcanvas上限(約1677万px)より少し小さく
  const KANJI_DAY = ['一日目', '二日目', '三日目'];

  const OPTS = [
    ['cover', '表紙・概要'],
    ['days', '行程(3日分)'],
    ['dayExtras', '各日に「交通・予約」を表示'],
    ['transport', '交通'],
    ['stay', '宿泊・食事'],
    ['packing', '持ち物'],
  ];

  const opts = () => Object.assign(App.defaultUi().shioriOpts, App.ui.shioriOpts);
  const start = () => App.data.trip.startDate;
  const title = () => App.data.trip.title || '旅のしおり';
  const kv = (k, v) => (v ? `<div class="sh-kv"><span class="sh-k">${k}</span><span class="sh-v">${v}</span></div>` : '');
  // PDFでは地図をリンクにする(画像では押せないので文字だけ)
  const linkOrText = (href, text, mode) =>
    href && mode === 'a4' ? `<a href="${U.esc(href)}" target="_blank" rel="noopener">${text}</a>` : text;

  /* ---------- 表紙・概要 ---------- */
  function coverHtml(mode) {
    const d = App.data;
    const s = U.dayDate(start(), 0);
    const e = U.dayDate(start(), U.DAYS - 1);
    const dateText = s ? `${U.fmtYMD(s)} 〜 ${U.fmtMDLong(e)}` : '日程未設定';

    const overview = d.itinerary.map((items, i) => {
      const main = items.filter((it) => it.type !== 'move');
      const titles = (main.length ? main : items).map((it) => U.esc(it.title)).filter(Boolean);
      const date = U.dayDate(start(), i);
      return `
        <div class="sh-ov-row">
          <div class="sh-ov-day"><b>${KANJI_DAY[i]}</b>${date ? `<span>${U.fmtMD(date)}</span>` : ''}</div>
          <div class="sh-ov-body">${titles.length ? titles.join('<span class="sh-sep">・</span>') : '<span class="sh-muted">予定なし</span>'}</div>
        </div>`;
    }).join('');

    const hotels = d.hotels.map((h) => `
      <div class="sh-ov-hotel">
        <div class="sh-ov-hotel-name">${U.esc(h.name)}<span class="sh-tag">${U.esc(App.modules.stay.nightsLabel(h.nights))}</span></div>
        <div class="sh-kvs">
          ${kv('IN / OUT', `${U.esc(h.checkIn) || '—'} / ${U.esc(h.checkOut) || '—'}`)}
          ${kv('電話', U.esc(h.phone))}
          ${kv('住所', h.address ? linkOrText(App.modules.stay.hotelMap(h), U.esc(h.address), mode) : '')}
        </div>
      </div>`).join('');

    return `
      <div class="sh-cover">
        <p class="sh-kicker">旅のしおり</p>
        <h1 class="sh-cover-title">${U.esc(title())}</h1>
        <div class="sh-ornament" aria-hidden="true"><i></i><b></b><i></i></div>
        <p class="sh-cover-date">${U.esc(dateText)}</p>
        <p class="sh-cover-sub">二泊三日${d.trip.members ? `<span class="sh-sep">|</span>${U.esc(d.trip.members)}` : ''}</p>
      </div>
      <section class="sh-block">
        <h2 class="sh-h2">旅程の概要</h2>
        <div class="sh-overview">${overview}</div>
      </section>
      ${hotels ? `<section class="sh-block"><h2 class="sh-h2">お宿</h2>${hotels}</section>` : ''}`;
  }

  /* ---------- 各日の行程 ---------- */
  function extrasHtml(day) {
    const d = App.data;
    const rows = [];
    U.sortByDayTime(d.transport.filter((t) => t.day === day), 'depTime').forEach((t) => {
      const time = [t.depTime, t.arrTime].filter(Boolean).join('→');
      const detail = [t.trainName, t.seat].filter(Boolean).map(U.esc).join(' ');
      rows.push({ key: U.timeKey(t.depTime), html: `<span class="sh-x-time">${U.esc(time) || '—'}</span><span class="sh-x-body"><b>${U.esc(App.kindOf(t.kind).label)}</b> ${U.esc(t.from)} → ${U.esc(t.to)}${detail ? `<span class="sh-x-sub">${detail}</span>` : ''}</span>` });
    });
    d.restaurants.filter((r) => r.day === day).forEach((r) => {
      const sub = [r.people ? `${U.esc(r.people)}名` : '', r.phone ? `電話 ${U.esc(r.phone)}` : ''].filter(Boolean).join('・');
      rows.push({ key: U.timeKey(r.time), html: `<span class="sh-x-time">${U.esc(r.time) || '—'}</span><span class="sh-x-body"><b>予約</b> ${U.esc(r.name)}${sub ? `<span class="sh-x-sub">${sub}</span>` : ''}</span>` });
    });
    if (!rows.length) return '';
    rows.sort((a, b) => a.key.localeCompare(b.key));
    return `
      <div class="sh-extras">
        <h3 class="sh-h3">この日の交通・予約</h3>
        ${rows.map((r) => `<div class="sh-x-row">${r.html}</div>`).join('')}
      </div>`;
  }

  function dayHtml(day, mode, o) {
    const items = App.data.itinerary[day];
    const date = U.dayDate(start(), day);
    const rows = items.map((it) => {
      const t = App.typeOf(it.type);
      const href = U.mapHref(it.mapUrl, it.place);
      return `
        <div class="sh-row t-${t.key}">
          <div class="sh-time">${U.esc(it.time)}</div>
          <div class="sh-line"><span class="sh-dot"></span></div>
          <div class="sh-content">
            <div class="sh-title-line"><span class="sh-type">${t.label}</span><span class="sh-title">${U.esc(it.title)}</span></div>
            ${it.place ? `<div class="sh-place">${linkOrText(href, U.esc(it.place), mode)}${href && mode === 'a4' ? '<span class="sh-maplabel">(地図)</span>' : ''}</div>` : ''}
            ${it.memo ? `<div class="sh-memo">${U.escBr(it.memo)}</div>` : ''}
          </div>
        </div>`;
    }).join('');
    return `
      <section class="sh-day">
        <h2 class="sh-day-title"><span class="sh-day-num">${KANJI_DAY[day]}</span><span class="sh-day-date">${date ? U.fmtMDLong(date) : ''}</span></h2>
        ${rows ? `<div class="sh-tl">${rows}</div>` : '<p class="sh-muted">予定はまだありません</p>'}
        ${o.dayExtras ? extrasHtml(day) : ''}
      </section>`;
  }

  /* ---------- 交通 ---------- */
  function transportHtml(mode) {
    const list = U.sortByDayTime(App.data.transport, 'depTime');
    if (!list.length) return '';
    const total = App.modules.transport.total();
    const when = (t) => `${U.esc(U.dayLabel(start(), t.day))}<br>${U.esc([t.depTime, t.arrTime].filter(Boolean).join(' → '))}`;
    const body = mode === 'a4'
      ? `<table class="sh-table">
          <thead><tr><th>日時</th><th>区間</th><th>列車名</th><th>号車・座席</th><th>乗車方法</th><th class="num">金額</th></tr></thead>
          <tbody>${list.map((t) => `
            <tr>
              <td class="nowrap">${when(t)}</td>
              <td><b>${U.esc(t.from)} → ${U.esc(t.to)}</b><div class="sh-small">${U.esc(App.kindOf(t.kind).label)}</div></td>
              <td>${U.esc(t.trainName)}</td>
              <td>${U.esc(t.seat)}</td>
              <td>${U.esc(t.method)}</td>
              <td class="num">${U.hasValue(t.price) ? U.yen(t.price) : ''}</td>
            </tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="5">合計</td><td class="num">${U.yen(total)}</td></tr></tfoot>
        </table>`
      : `${list.map((t) => `
          <div class="sh-card">
            <div class="sh-card-when">${U.esc(App.modules.transport.whenText(t))}</div>
            <div class="sh-card-title">${U.esc(t.from)} → ${U.esc(t.to)}<span class="sh-tag">${U.esc(App.kindOf(t.kind).label)}</span></div>
            <div class="sh-kvs">
              ${kv('列車名', U.esc(t.trainName))}
              ${kv('号車・座席', U.esc(t.seat))}
              ${kv('乗車方法', U.esc(t.method))}
              ${kv('金額', U.hasValue(t.price) ? U.yen(t.price) : '')}
            </div>
          </div>`).join('')}
          <div class="sh-total"><span>合計</span><b>${U.yen(total)}</b></div>`;
    return `<section class="sh-block"><h2 class="sh-h2">交通</h2>${body}</section>`;
  }

  /* ---------- 宿泊・食事 ---------- */
  function stayHtml(mode) {
    const d = App.data;
    const S = App.modules.stay;
    const hotels = d.hotels.map((h) => `
      <div class="sh-card">
        <div class="sh-card-title">${U.esc(h.name)}<span class="sh-tag">${U.esc(S.nightsLabel(h.nights))}</span></div>
        <div class="sh-kvs">
          ${kv('チェックイン', U.esc(h.checkIn))}
          ${kv('チェックアウト', U.esc(h.checkOut))}
          ${kv('住所', h.address ? linkOrText(S.hotelMap(h), U.esc(h.address), mode) : '')}
          ${kv('電話', U.esc(h.phone))}
          ${kv('メモ', U.escBr(h.memo))}
        </div>
      </div>`).join('');

    const rests = U.sortByDayTime(d.restaurants, 'time');
    const restHtml = !rests.length ? '' : mode === 'a4'
      ? `<table class="sh-table">
          <thead><tr><th>日時</th><th>店名</th><th>人数</th><th>電話</th><th>メモ</th></tr></thead>
          <tbody>${rests.map((r) => `
            <tr>
              <td class="nowrap">${U.esc(U.dayLabel(start(), r.day))}<br>${U.esc(r.time)}</td>
              <td><b>${linkOrText(U.mapHref(r.mapUrl, r.name), U.esc(r.name), mode)}</b></td>
              <td class="nowrap">${r.people ? `${U.esc(r.people)}名` : ''}</td>
              <td class="nowrap">${U.esc(r.phone)}</td>
              <td>${U.escBr(r.memo)}</td>
            </tr>`).join('')}</tbody>
        </table>`
      : rests.map((r) => `
          <div class="sh-card">
            <div class="sh-card-when">${U.esc(S.restaurantWhen(r))}</div>
            <div class="sh-card-title">${U.esc(r.name)}${r.people ? `<span class="sh-tag">${U.esc(r.people)}名</span>` : ''}</div>
            <div class="sh-kvs">${kv('電話', U.esc(r.phone))}${kv('メモ', U.escBr(r.memo))}</div>
          </div>`).join('');

    if (!hotels && !restHtml) return '';
    return `
      ${hotels ? `<section class="sh-block"><h2 class="sh-h2">宿泊</h2>${hotels}</section>` : ''}
      ${restHtml ? `<section class="sh-block"><h2 class="sh-h2">食事の予約</h2>${restHtml}</section>` : ''}`;
  }

  /* ---------- 持ち物 ---------- */
  function packingHtml() {
    const cols = App.PACK_GROUPS.map((g) => {
      const items = App.data.packing[g.key];
      return `
        <div class="sh-pack-col">
          <h3 class="sh-h3">${g.label}</h3>
          ${items.length ? `<ul class="sh-checks">${items.map((it) => `<li class="${it.checked ? 'on' : ''}"><span class="sh-box">${it.checked ? '✓' : ''}</span><span>${U.esc(it.name)}</span></li>`).join('')}</ul>` : '<p class="sh-muted">なし</p>'}
        </div>`;
    }).join('');
    return `<section class="sh-block"><h2 class="sh-h2">持ち物</h2><div class="sh-pack">${cols}</div></section>`;
  }

  // ページ単位のHTML。PDFでは1ページ目から順に、画像では1枚ずつになる
  M.pages = (mode) => {
    const o = opts();
    const pages = [];
    if (o.cover) pages.push({ key: 'cover', name: '表紙', html: coverHtml(mode) });
    if (o.days) {
      [0, 1, 2].forEach((i) => pages.push({ key: `day${i + 1}`, name: U.dayLabel(start(), i), html: dayHtml(i, mode, o) }));
    }
    const info = [o.transport ? transportHtml(mode) : '', o.stay ? stayHtml(mode) : ''].join('').trim();
    if (info) pages.push({ key: 'info', name: '交通・宿・食事', html: info });
    if (o.packing) pages.push({ key: 'packing', name: '持ち物', html: packingHtml() });
    return pages;
  };

  /* ---------- 画面 ---------- */
  function fitPreview(el) {
    const wrap = el.querySelector('.sheets-wrap');
    const sheets = el.querySelector('.sheets');
    if (!wrap || !sheets || !wrap.clientWidth) return;
    const a4 = 793.7; // 210mm
    sheets.style.zoom = Math.min(1, wrap.clientWidth / a4).toFixed(3);
  }

  M.render = (el) => {
    const o = opts();
    const pages = M.pages('a4');
    el.innerHTML = `
      <section class="card no-print">
        <h2 class="card-title">しおりを出力する</h2>
        <div class="opt-list">
          ${OPTS.map(([k, label]) => `<label class="check-big opt"><input type="checkbox" data-opt="${k}"${o[k] ? ' checked' : ''}>${label}</label>`).join('')}
        </div>
        <div class="btn-row" style="margin-top:12px">
          <button type="button" class="btn btn-primary" data-act="print">🖨 PDFで保存・印刷</button>
          <button type="button" class="btn btn-ai" data-act="png-split">🖼 スマホ用画像(日ごとに分割)</button>
          <button type="button" class="btn" data-act="png-one">🖼 スマホ用画像(1枚にまとめる)</button>
        </div>
        <details class="howto">
          <summary>保存のしかた</summary>
          <ul>
            <li><b>PC(Chrome/Edge)</b>: 「PDFで保存・印刷」→ 送信先を「PDFに保存」→ 保存。用紙はA4・縦、「背景のグラフィック」をオンにすると色がきれいに出ます。</li>
            <li><b>iPad / iPhone(Safari)</b>: 「PDFで保存・印刷」→ 共有ボタン →「ファイルに保存」、またはプレビューを2本指で広げるとPDFになります。</li>
            <li><b>画像</b>: 作成後に「保存」または「共有」で写真やLINEへ。iPhoneでは画像を長押しして「写真に追加」もできます。</li>
            <li>お土産のページはしおりに載りません。</li>
          </ul>
        </details>
      </section>
      <p class="note no-print">プレビュー(A4縦)。実際の改ページは印刷時に自動で調整されます。</p>
      <div class="sheets-wrap">
        <div class="shiori a4 sheets">
          ${pages.length ? pages.map((p) => `<div class="sheet sheet-${p.key}">${p.html}</div>`).join('') : '<div class="sheet"><p class="sh-muted">出力する項目を選んでください</p></div>'}
        </div>
      </div>`;
    fitPreview(el);
  };

  /* ---------- PNG作成 ---------- */
  let h2cPromise = null;
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { s.remove(); reject(new Error('load failed: ' + src)); };
    document.head.appendChild(s);
  });
  function loadHtml2canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (!h2cPromise) {
      h2cPromise = H2C_URLS
        .reduce((p, url) => p.catch(() => loadScript(url)), Promise.reject(new Error('start')))
        .then(() => window.html2canvas)
        .catch(() => {
          h2cPromise = null;
          throw new Error('画像作成用のライブラリを読み込めませんでした。インターネットに接続してからもう一度お試しください。');
        });
    }
    return h2cPromise;
  }

  const busy = (text) => {
    const el = document.getElementById('busy');
    el.hidden = !text;
    if (text) document.getElementById('busy-text').textContent = text;
  };

  function phoneHtml(pageName, html) {
    return `
      <div class="shiori phone">
        <div class="ph-head"><span class="ph-title">${U.esc(title())}</span>${pageName ? `<span class="ph-page">${U.esc(pageName)}</span>` : ''}</div>
        ${html}
        <div class="ph-foot">旅のしおり</div>
      </div>`;
  }

  async function capture(html2canvas, html) {
    const area = document.getElementById('capture-area');
    area.innerHTML = html;
    const node = area.firstElementChild;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const scale = Math.max(1, Math.min(3, Math.floor(Math.sqrt(MAX_PIXELS / (w * h)) * 10) / 10));
    const canvas = await html2canvas(node, {
      scale,
      backgroundColor: PHONE_BG,
      logging: false,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
    });
    area.innerHTML = '';
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像に変換できませんでした'))), 'image/png'));
  }

  async function makeImages(split) {
    const pages = M.pages('phone');
    if (!pages.length) return alert('出力する項目を選んでください');
    busy('画像を準備しています…');
    try {
      const html2canvas = await loadHtml2canvas();
      const jobs = split
        ? pages.map((p) => ({ name: p.name, key: p.key, html: phoneHtml(p.name, p.html) }))
        : [{ name: 'しおり(まとめ)', key: 'all', html: phoneHtml('', pages.map((p) => `<div class="ph-page-block">${p.html}</div>`).join('')) }];
      const results = [];
      for (let i = 0; i < jobs.length; i++) {
        busy(`画像を作成しています… ${i + 1} / ${jobs.length}`);
        const blob = await capture(html2canvas, jobs[i].html);
        results.push({
          name: jobs[i].name,
          blob,
          url: URL.createObjectURL(blob),
          filename: `shiori-${String(i + 1).padStart(2, '0')}-${jobs[i].key}.png`,
        });
      }
      busy('');
      showGallery(results);
    } catch (err) {
      console.error(err);
      busy('');
      document.getElementById('capture-area').innerHTML = '';
      alert(err.message || '画像の作成に失敗しました');
    }
  }

  const toFile = (r) => new File([r.blob], r.filename, { type: 'image/png' });
  const canShare = (files) => !!(navigator.canShare && navigator.canShare({ files }));

  async function share(files) {
    try {
      await navigator.share({ files, title: title() });
    } catch (err) {
      if (err.name !== 'AbortError') alert('共有できませんでした: ' + err.message);
    }
  }

  function showGallery(results) {
    const allFiles = results.map(toFile);
    const html = `
      <p class="note">「保存」でダウンロード、「共有」で写真アプリやLINEへ送れます。iPhone/iPadでは画像を長押しして「写真に追加」でも保存できます。</p>
      ${results.length > 1 ? `<div class="btn-row" style="margin-bottom:14px">
        ${canShare(allFiles) ? '<button type="button" class="btn btn-primary" data-g="share-all">まとめて共有</button>' : ''}
        <button type="button" class="btn" data-g="save-all">すべて保存</button>
      </div>` : ''}
      <div class="png-gallery">
        ${results.map((r, i) => `
          <figure class="png-item">
            <img src="${r.url}" alt="${U.esc(r.name)}">
            <figcaption>${U.esc(r.name)}</figcaption>
            <div class="btn-row">
              <a class="btn btn-small" href="${r.url}" download="${U.esc(r.filename)}">保存</a>
              ${canShare([allFiles[i]]) ? `<button type="button" class="btn btn-small btn-ai" data-g="share" data-i="${i}">共有</button>` : ''}
            </div>
          </figure>`).join('')}
      </div>`;
    const dlg = App.openViewer(`スマホ用画像(${results.length}枚)`, html);
    dlg.querySelector('.dlg-body').onclick = async (e) => {
      const b = e.target.closest('[data-g]');
      if (!b) return;
      if (b.dataset.g === 'share') share([allFiles[Number(b.dataset.i)]]);
      if (b.dataset.g === 'share-all') share(allFiles);
      if (b.dataset.g === 'save-all') {
        for (const r of results) {
          U.download(r.blob, r.filename);
          await new Promise((res) => setTimeout(res, 400));
        }
      }
    };
    dlg.addEventListener('close', () => {
      dlg.innerHTML = '';
      results.forEach((r) => URL.revokeObjectURL(r.url));
    }, { once: true });
  }

  /* ---------- 初期化 ---------- */
  M.init = (el) => {
    el.addEventListener('change', (e) => {
      const k = e.target.dataset.opt;
      if (!k) return;
      App.ui.shioriOpts = Object.assign(opts(), { [k]: e.target.checked });
      App.saveUi();
      App.render();
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      if (b.dataset.act === 'print') window.print();
      if (b.dataset.act === 'png-split') makeImages(true);
      if (b.dataset.act === 'png-one') makeImages(false);
    });
    window.addEventListener('resize', () => { if (App.ui.tab === 'shiori') fitPreview(el); });
    // どの画面から印刷しても、最新のしおりが出るようにする
    window.addEventListener('beforeprint', () => { if (App.ui.tab !== 'shiori') M.render(el); });
  };

  App.modules = App.modules || {};
  App.modules.shiori = M;
})(window.App);
