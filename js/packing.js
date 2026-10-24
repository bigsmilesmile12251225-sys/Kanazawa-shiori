/* ④ 持ち物(共通/自分/妻) */
(function (App) {
  'use strict';
  const { U } = App;
  const M = {};

  const count = (items) => ({ done: items.filter((x) => x.checked).length, all: items.length });

  function groupHtml(g) {
    const items = App.data.packing[g.key];
    const c = count(items);
    return `
      <section class="card pack-card">
        <header class="pack-head"><h2>${g.label}</h2><span class="pack-count">${c.done} / ${c.all}</span></header>
        <div class="progress"><span style="width:${c.all ? (c.done / c.all) * 100 : 0}%"></span></div>
        ${items.length ? `<ul class="checklist">${items.map((it) => `
          <li class="${it.checked ? 'is-checked' : ''}">
            <label class="check-row"><input type="checkbox" data-group="${g.key}" data-id="${it.id}"${it.checked ? ' checked' : ''}><span>${U.esc(it.name)}</span></label>
            <button type="button" class="icon-btn" data-act="del" data-group="${g.key}" data-id="${it.id}" aria-label="「${U.esc(it.name)}」を削除">✕</button>
          </li>`).join('')}</ul>` : '<p class="empty">項目がありません</p>'}
        <form class="add-row" data-group="${g.key}">
          <input type="text" name="name" placeholder="項目を追加" enterkeyhint="done" aria-label="${g.label}に項目を追加">
          <button type="submit" class="btn btn-ai">追加</button>
        </form>
      </section>`;
  }

  M.render = (el) => {
    const all = App.PACK_GROUPS.map((g) => App.data.packing[g.key]).flat();
    const c = count(all);
    el.innerHTML = `
      <section class="card summary-card">
        <div class="stat"><span class="stat-label">準備できたもの</span><span class="stat-value">${c.done}<small> / ${c.all}</small></span></div>
        <span class="spacer"></span>
        <div class="btn-row">
          <button type="button" class="btn btn-small" data-act="uncheck">チェックをすべて外す</button>
          <button type="button" class="btn btn-small" data-act="defaults">定番の持ち物を補充</button>
        </div>
      </section>
      <div class="pack-grid">${App.PACK_GROUPS.map(groupHtml).join('')}</div>`;
  };

  M.init = (el) => {
    el.addEventListener('change', (e) => {
      const { group, id } = e.target.dataset;
      if (!group || e.target.type !== 'checkbox') return;
      const it = App.data.packing[group].find((x) => x.id === id);
      if (it) {
        it.checked = e.target.checked;
        App.commit();
      }
    });

    el.addEventListener('submit', (e) => {
      e.preventDefault();
      const group = e.target.dataset.group;
      const name = e.target.elements.name.value.trim();
      if (!name) return;
      App.data.packing[group].push(Object.assign({}, App.DEF.pack, { id: U.uid(), name }));
      App.commit();
      // 続けて入力できるようにフォーカスを戻す
      const input = el.querySelector(`.add-row[data-group="${group}"] input`);
      if (input) input.focus();
    });

    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      if (b.dataset.act === 'del') {
        const list = App.data.packing[b.dataset.group];
        const idx = list.findIndex((x) => x.id === b.dataset.id);
        if (idx === -1) return;
        const [removed] = list.splice(idx, 1);
        App.commit();
        U.toast(`「${removed.name}」を削除しました`, {
          label: '元に戻す',
          onClick: () => {
            list.splice(Math.min(idx, list.length), 0, removed);
            App.commit();
          },
        });
      }
      if (b.dataset.act === 'uncheck' && confirm('すべてのチェックを外しますか?')) {
        App.PACK_GROUPS.forEach((g) => App.data.packing[g.key].forEach((x) => { x.checked = false; }));
        App.commit();
      }
      if (b.dataset.act === 'defaults') {
        let added = 0;
        App.PACK_GROUPS.forEach((g) => {
          const list = App.data.packing[g.key];
          App.DEFAULT_PACKING[g.key].forEach((name) => {
            if (!list.some((x) => x.name === name)) {
              list.push(Object.assign({}, App.DEF.pack, { id: U.uid(), name }));
              added++;
            }
          });
        });
        App.commit();
        U.toast(added ? `${added}件を追加しました` : '定番の持ち物はすべて入っています');
      }
    });
  };

  App.modules = App.modules || {};
  App.modules.packing = M;
})(window.App);
