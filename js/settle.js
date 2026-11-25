/* ⑧ 精算: 旅行のあとで、だれがいくら払ったかをまとめ、2人の貸し借りを計算する
 *
 * - 交通・宿泊の金額は各タブからそのまま取り込む(金額を直すときは元のタブで)
 * - 追加費用は「交通」「宿泊」「その他」の各欄に、このページで追加する
 * - 各費用に「払った人(自分/妻)」と「負担(共通=折半 / 自分 / 妻)」を付ける
 * - しおりには載せない
 */
(function (App) {
  'use strict';
  const { U } = App;
  const M = {};

  const SECTIONS = [
    { key: 'transport', label: '交通', icon: '🚄', from: '交通タブから', add: '＋ 交通の追加費用', ph: '例: タクシー(金沢駅→宿)' },
    { key: 'hotel', label: '宿泊', icon: '🏨', from: '宿・食事タブから', add: '＋ 宿泊の追加費用', ph: '例: 入湯税、追加の飲み物' },
    { key: 'other', label: 'その他', icon: '🧾', from: '', add: '＋ その他の費用(食事・入場料など)', ph: '例: 21世紀美術館の入場料' },
  ];
  const PEOPLE = ['me', 'wife'];
  const SHARES = ['both', 'me', 'wife'];

  const st = () => App.data.settlement;
  const name = (key) => App.giverLabel(key);
  const shareLabel = (key) => (key === 'both' ? '共通(折半)' : `${name(key)}個人`);
  const tracedOf = (id) => st().traced[id] || { payer: '', share: 'both' };

  // 精算の対象になる費用をすべて並べる(交通 → 宿泊 → 追加費用)
  M.lines = () => {
    const d = App.data;
    const lines = [];
    U.sortByDayTime(d.transport, 'depTime').forEach((t) => {
      const s = tracedOf(t.id);
      lines.push({
        id: t.id, kind: 'traced', mod: 'transport', section: 'transport',
        title: `${t.from} → ${t.to}`,
        sub: [App.modules.transport.whenText(t), t.trainName].filter(Boolean).join(' '),
        amount: t.price, payer: s.payer, share: s.share, memo: '',
      });
    });
    d.hotels.forEach((h) => {
      const s = tracedOf(h.id);
      lines.push({
        id: h.id, kind: 'traced', mod: 'stay', section: 'hotel',
        title: h.name, sub: App.modules.stay.nightsLabel(h.nights),
        amount: h.price, payer: s.payer, share: s.share, memo: '',
      });
    });
    st().extras.forEach((x) => {
      lines.push({
        id: x.id, kind: 'extra', section: x.category,
        title: x.title, sub: x.day >= 0 ? U.dayLabel(d.trip.startDate, x.day) : '',
        amount: x.amount, payer: x.payer, share: x.share, memo: x.memo,
      });
    });
    return lines;
  };

  // 払った額・負担する額・貸し借り(balance > 0 なら 妻 → 自分 へ払う)
  M.calc = (lines) => {
    const r = { total: 0, paid: { me: 0, wife: 0 }, owe: { me: 0, wife: 0 }, byShare: { both: 0, me: 0, wife: 0 }, noPayer: 0, noAmount: 0 };
    lines.forEach((l) => {
      const a = U.toNum(l.amount);
      if (!a) { r.noAmount++; return; }
      if (!l.payer) { r.noPayer++; return; }
      r.total += a;
      r.paid[l.payer] += a;
      r.byShare[l.share] += a;
      if (l.share === 'both') {
        r.owe.me += a / 2;
        r.owe.wife += a / 2;
      } else {
        r.owe[l.share] += a;
      }
    });
    r.balance = Math.round(r.paid.me - r.owe.me); // 1円未満は四捨五入
    return r;
  };

  // 「さき → たか へ 12,345円」
  function answer(r) {
    if (!r.total) return { text: 'まだ精算する費用がありません', who: '', amount: 0 };
    if (r.balance === 0) return { text: '貸し借りはありません', who: '', amount: 0 };
    const [from, to] = r.balance > 0 ? ['wife', 'me'] : ['me', 'wife'];
    return { text: `${name(from)} → ${name(to)} へ`, who: `${name(from)}から${name(to)}へ`, amount: Math.abs(r.balance) };
  }

  M.summaryText = () => {
    const r = M.calc(M.lines());
    const a = answer(r);
    return [
      `【${App.data.trip.title || '旅行'} 精算】`,
      `合計 ${U.yen(r.total)}`,
      `${name('me')}が払った ${U.yen(r.paid.me)} / ${name('wife')}が払った ${U.yen(r.paid.wife)}`,
      `共通分 ${U.yen(r.byShare.both)}(1人 ${U.yen(Math.round(r.byShare.both / 2))})`,
      `${name('me')}個人 ${U.yen(r.byShare.me)} / ${name('wife')}個人 ${U.yen(r.byShare.wife)}`,
      a.amount ? `→ ${a.who} ${U.yen(a.amount)}` : `→ ${a.text}`,
    ].join('\n');
  };

  function openEdit(id, section) {
    const found = st().extras.find((x) => x.id === id);
    const filterPayer = PEOPLE.includes(App.ui.settlePayer) ? App.ui.settlePayer : '';
    App.openForm({
      title: found ? '追加費用を編集' : '追加費用を追加',
      fields: [
        { key: 'category', label: '区分', type: 'select', options: SECTIONS.map((s) => ({ value: s.key, label: `${s.icon} ${s.label}` })) },
        { key: 'day', label: '日にち', type: 'day', allowNone: true },
        { key: 'title', label: '内容', type: 'text', required: true, full: true, placeholder: (SECTIONS.find((s) => s.key === (found ? found.category : section)) || SECTIONS[2]).ph },
        { key: 'amount', label: '金額(円)', type: 'number', required: true },
        { key: 'payer', label: '払った人', type: 'select', options: [{ value: '', label: '未設定' }].concat(PEOPLE.map((p) => ({ value: p, label: name(p) }))) },
        { key: 'share', label: '負担', type: 'select', options: SHARES.map((s) => ({ value: s, label: shareLabel(s) })), hint: '共通は2人で半分ずつ、個人はその人が全額負担します' },
        { key: 'memo', label: 'メモ', type: 'textarea', full: true },
      ],
      values: found || Object.assign({}, App.DEF.extra, { category: section || 'other', payer: filterPayer }),
      onSubmit: (v) => {
        if (found) Object.assign(found, v);
        else st().extras.push(Object.assign({}, App.DEF.extra, v, { id: U.uid() }));
        App.commit();
      },
      onDelete: found ? () => remove(found) : null,
    });
  }

  // ToDoページなどから追加費用の編集画面を開く
  M.edit = (id) => openEdit(id);

  function remove(x) {
    st().extras = st().extras.filter((e) => e !== x);
    App.commit();
    U.toast('削除しました');
  }

  const segBtns = (l, field, keys, label) => keys.map((k) =>
    `<button type="button" class="${l[field] === k ? 'on' : ''}" data-set="${field}" data-v="${k}" data-id="${l.id}" data-kind="${l.kind}" aria-pressed="${l[field] === k}">${U.esc(label(k))}</button>`).join('');

  function rowHtml(l) {
    const sec = SECTIONS.find((s) => s.key === l.section) || SECTIONS[2];
    const a = U.toNum(l.amount);
    const warn = !a ? '金額が入っていません' : !l.payer ? '払った人を選んでください' : '';
    return `
      <article class="card item-card settle-row${warn ? ' is-warn' : ''}">
        <div class="ic-head">
          <span class="chip ${l.kind === 'traced' ? 'chip-ai' : 'chip-kin'}">${l.kind === 'traced' ? sec.from : '追加費用'}</span>
          ${l.sub ? `<span class="ic-when">${U.esc(l.sub)}</span>` : ''}
        </div>
        <div class="settle-main">
          <div class="ic-title">${U.esc(l.title)}</div>
          <div class="settle-amount">${a ? U.yen(a) : '—'}</div>
        </div>
        ${warn ? `<div class="settle-warn">⚠ ${warn}</div>` : ''}
        <div class="settle-ctrl">
          <div class="settle-ctrl-row"><span class="settle-label">払った人</span><div class="seg seg-sm">${segBtns(l, 'payer', PEOPLE, name)}</div></div>
          <div class="settle-ctrl-row"><span class="settle-label">負担</span><div class="seg seg-sm">${segBtns(l, 'share', SHARES, shareLabel)}</div>
            ${l.share === 'both' && a ? `<span class="settle-half">1人 ${U.yen(Math.round(a / 2))}</span>` : ''}</div>
        </div>
        ${l.memo ? `<div class="ic-memo">${App.memoHtml(l.memo, l.id)}</div>` : ''}
        <div class="ic-foot">
          <span class="spacer"></span>
          ${l.kind === 'traced'
            ? `<button type="button" class="btn btn-small" data-act="src-edit" data-mod="${l.mod}" data-id="${l.id}">✎ 金額などを直す</button>`
            : `<button type="button" class="btn btn-small" data-act="edit" data-id="${l.id}">✎ 編集</button>
               <button type="button" class="icon-btn danger" data-act="del" data-id="${l.id}" aria-label="削除">🗑</button>`}
        </div>
      </article>`;
  }

  M.render = (el) => {
    const all = M.lines();
    const r = M.calc(all);
    const ans = answer(r);
    const payerF = ['me', 'wife', 'none'].includes(App.ui.settlePayer) ? App.ui.settlePayer : 'all';
    const shareF = SHARES.includes(App.ui.settleShare) ? App.ui.settleShare : 'all';
    const shown = all.filter((l) =>
      (payerF === 'all' || (payerF === 'none' ? !l.payer : l.payer === payerF)) &&
      (shareF === 'all' || l.share === shareF));
    const filtered = payerF !== 'all' || shareF !== 'all';
    const person = (p) => {
      const diff = Math.round(r.paid[p] - r.owe[p]);
      return `
        <div class="settle-person">
          <div class="settle-person-name">👤 ${U.esc(name(p))}</div>
          <dl class="ic-dl">
            <div><dt>払った額</dt><dd>${U.yen(r.paid[p])}</dd></div>
            <div><dt>負担する額</dt><dd>${U.yen(Math.round(r.owe[p]))}</dd></div>
            <div><dt>差額</dt><dd class="${diff < 0 ? 'sv-over' : ''}">${diff > 0 ? '+' : ''}${U.yen(diff)}</dd></div>
          </dl>
        </div>`;
    };
    const seg = (attr, cur, opts) => opts.map(([v, label]) =>
      `<button type="button" data-${attr}="${v}" class="${cur === v ? 'on' : ''}">${U.esc(label)}</button>`).join('');

    el.innerHTML = `
      <section class="card settle-result${st().done ? ' is-done' : ''}">
        <h2 class="card-title">💴 精算結果${st().done ? '<span class="chip chip-ok">✅ 精算済み</span>' : ''}</h2>
        <div class="settle-answer">
          <span class="settle-answer-text">${U.esc(ans.text)}</span>
          ${ans.amount ? `<span class="settle-answer-amount">${U.yen(ans.amount)}</span>` : ''}
        </div>
        <div class="settle-people">${person('me')}${person('wife')}</div>
        <p class="note" style="margin:10px 0 0">合計 ${U.yen(r.total)}(共通分 ${U.yen(r.byShare.both)} / ${U.esc(name('me'))}個人 ${U.yen(r.byShare.me)} / ${U.esc(name('wife'))}個人 ${U.yen(r.byShare.wife)})。1円未満は四捨五入。</p>
        ${r.noPayer || r.noAmount ? `<p class="settle-warn" style="margin-top:8px">⚠ ${[r.noPayer ? `払った人が未設定の費用が${r.noPayer}件` : '', r.noAmount ? `金額が未入力の費用が${r.noAmount}件` : ''].filter(Boolean).join('、')}あります(計算に入っていません)</p>` : ''}
        <div class="ic-foot">
          <label class="check-big"><input type="checkbox" data-act="done"${st().done ? ' checked' : ''}>精算済み</label>
          <span class="spacer"></span>
          <button type="button" class="btn btn-small btn-ai" data-act="share">📤 結果を送る</button>
        </div>
      </section>
      <div class="banner">💡 交通・宿泊の金額は各タブからそのまま取り込みます。追加でかかった費用は各欄の「＋」から追加してください。このページはしおりには載りません。</div>
      <div class="seg-row">
        <div class="seg" role="group" aria-label="払った人で絞り込み">
          ${seg('payer', payerF, [['all', '全員'], ['me', `${name('me')}が払った`], ['wife', `${name('wife')}が払った`], ['none', '未設定']])}
        </div>
        <div class="seg" role="group" aria-label="負担で絞り込み">
          ${seg('share', shareF, [['all', 'すべて'], ['both', '共通分'], ['me', `${name('me')}個人`], ['wife', `${name('wife')}個人`]])}
        </div>
      </div>
      ${filtered ? `<p class="note">表示中の合計: ${U.yen(shown.reduce((s, l) => s + U.toNum(l.amount), 0))}(${shown.length}件)</p>` : ''}
      ${SECTIONS.map((sec) => {
        const ls = shown.filter((l) => l.section === sec.key);
        const sub = ls.reduce((s, l) => s + U.toNum(l.amount), 0);
        return `
          <h2 class="section-title">${sec.icon} ${sec.label} <span class="count">${ls.length}件・${U.yen(sub)}</span></h2>
          ${ls.length ? `<div class="list">${ls.map(rowHtml).join('')}</div>` : ''}
          <button type="button" class="btn btn-add" data-act="add" data-section="${sec.key}">${sec.add}</button>`;
      }).join('')}`;
  };

  M.init = (el) => {
    el.addEventListener('click', async (e) => {
      const f = e.target.closest('[data-payer], [data-share]');
      if (f) {
        if (f.dataset.payer) App.ui.settlePayer = f.dataset.payer;
        if (f.dataset.share) App.ui.settleShare = f.dataset.share;
        App.saveUi();
        return App.render();
      }
      const s = e.target.closest('[data-set]');
      if (s) {
        const { id, kind, set, v } = s.dataset;
        const target = kind === 'traced'
          ? (st().traced[id] = st().traced[id] || { payer: '', share: 'both' })
          : st().extras.find((x) => x.id === id);
        if (!target) return;
        target[set] = v;
        return App.commit();
      }
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'add') openEdit(null, b.dataset.section);
      if (act === 'edit') openEdit(b.dataset.id);
      if (act === 'src-edit') App.modules[b.dataset.mod].edit(b.dataset.id);
      if (act === 'del') {
        const x = st().extras.find((e2) => e2.id === b.dataset.id);
        if (x && confirm(`「${x.title}」を削除しますか?`)) remove(x);
      }
      if (act === 'share') {
        const text = M.summaryText();
        try {
          if (navigator.share) {
            await navigator.share({ text });
          } else {
            await navigator.clipboard.writeText(text);
            U.toast('精算結果をコピーしました。LINEなどに貼り付けてください');
          }
        } catch (err) {
          if (err.name !== 'AbortError') App.openViewer('精算結果', `<p class="note">下の文章をコピーして送ってください。</p><pre class="settle-text">${U.esc(text)}</pre>`);
        }
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.dataset.act !== 'done') return;
      st().done = e.target.checked;
      App.commit();
    });
  };

  App.modules = App.modules || {};
  App.modules.settle = M;
})(window.App);
