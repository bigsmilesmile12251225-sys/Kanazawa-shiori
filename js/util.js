/* 共通ヘルパー */
window.App = window.App || {};
(function (App) {
  'use strict';

  const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  const U = {};

  U.DAYS = 3; // 2泊3日

  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  U.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

  // エスケープ + 改行を<br>に
  U.escBr = (s) => U.esc(s).replace(/\r?\n/g, '<br>');

  // 「1,200円」なども数値として扱う
  U.toNum = (v) => {
    if (v === '' || v == null) return 0;
    const n = Number(String(v).replace(/[,，円¥￥\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  U.yen = (n) => U.toNum(n).toLocaleString('ja-JP') + '円';
  U.hasValue = (v) => v !== '' && v != null;

  /* ---------- 日付 ---------- */
  U.parseDate = (str) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  // 旅行開始日から i 日目(0始まり)の日付
  U.dayDate = (startDate, i) => {
    const d = U.parseDate(startDate);
    if (!d || i < 0) return null;
    d.setDate(d.getDate() + i);
    return d;
  };
  U.fmtMD = (d) => (d ? `${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})` : '');
  U.fmtMDLong = (d) => (d ? `${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]})` : '');
  U.fmtYMD = (d) => (d ? `${d.getFullYear()}年${U.fmtMDLong(d)}` : '');
  U.dayName = (i) => (i >= 0 && i < U.DAYS ? `${i + 1}日目` : '日付未定');
  // 「1日目 11/20(金)」
  U.dayLabel = (startDate, i) => {
    const d = U.dayDate(startDate, i);
    return d && i < U.DAYS ? `${U.dayName(i)} ${U.fmtMD(d)}` : U.dayName(i);
  };

  /* ---------- 時刻・並べ替え ---------- */
  U.timeKey = (t) => (/^\d{1,2}:\d{2}$/.test(t || '') ? t.padStart(5, '0') : '99:99');
  U.dayKey = (d) => (Number(d) >= 0 ? Number(d) : 99);
  U.sortByDayTime = (list, timeField) =>
    list.slice().sort((a, b) =>
      U.dayKey(a.day) - U.dayKey(b.day) ||
      U.timeKey(a[timeField]).localeCompare(U.timeKey(b[timeField])));

  /* ---------- URL ---------- */
  U.safeUrl = (url) => {
    const s = String(url || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  };
  // 地図URLが無ければ、場所名・住所でGoogleマップ検索
  U.mapHref = (mapUrl, query) => {
    const u = U.safeUrl(mapUrl);
    if (u) return u;
    const q = String(query || '').trim();
    return q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '';
  };
  U.telHref = (tel) => {
    const t = String(tel || '').replace(/[^\d+]/g, '');
    return t ? 'tel:' + t : '';
  };
  U.link = (href, text, cls) =>
    href ? `<a class="${cls || ''}" href="${U.esc(href)}" target="_blank" rel="noopener">${text}</a>` : '';

  /* ---------- 画像 ---------- */
  // 写真を縮小してJPEGのdataURLにする(localStorage節約)
  U.resizeImage = (file, max = 720, quality = 0.72) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * r);
        canvas.height = Math.round(img.naturalHeight * r);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('画像を読み込めませんでした'));
      };
      img.src = url;
    });

  /* ---------- 画面まわり ---------- */
  let toastTimer = null;
  // action: { label, onClick } を渡すと「元に戻す」などのボタンを付ける
  U.toast = (msg, action) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = `<span>${U.esc(msg)}</span>` +
      (action ? `<button type="button" class="toast-btn">${U.esc(action.label)}</button>` : '');
    if (action) {
      el.querySelector('button').onclick = () => {
        el.classList.remove('show');
        action.onClick();
      };
    }
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), action ? 5000 : 2200);
  };

  U.download = (blob, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  };

  U.stamp = (date = new Date()) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
  };

  App.U = U;
})(window.App);
