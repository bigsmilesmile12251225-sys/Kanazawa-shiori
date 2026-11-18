/* ④ 持ち物(共通/自分/妻) */
(function (App) {
  'use strict';
  const { U } = App;
  const M = {};

  const count = (items) => ({ done: items.filter((x) => x.checked).length, all: items.length });
  const editing = new Set(); // 「編集」中の区分(画面を開いている間だけ)

  // 通常: チェックリスト / 編集中: ▲▼で並べ替え・✎で名前の修正
  function rowHtml(g, it, idx, len) {
    const del = `<button type="button" class="icon-btn" data-act="del" data-group="${g.key}" data-id="${it.id}" aria-label="「${U.esc(it.name)}」を削除">✕</button>`;
    if (!editing.has(g.key)) {
      return `
          <li class="${it.checked ? 'is-checked' : ''}">
            <label class="check-row"><input type="checkbox" data-group="${g.key}" data-id="${it.id}"${it.checked ? ' checked' : ''}><span>${U.esc(it.name)}</span></label>
            ${del}
          </li>`;
    }
    return `
          <li class="edit-row">
            <button type="button" class="edit-name" data-act="rename" data-group="${g.key}" data-id="${it.id}">${U.esc(it.name)}</button>
            <button type="button" class="icon-btn" data-act="up" data-group="${g.key}" data-id="${it.id}" aria-label="上へ"${idx === 0 ? ' disabled' : ''}>▲</button>
            <button type="button" class="icon-btn" data-act="down" data-group="${g.key}" data-id="${it.id}" aria-label="下へ"${idx === len - 1 ? ' disabled' : ''}>▼</button>
            <button type="button" class="icon-btn" data-act="rename" data-group="${g.key}" data-id="${it.id}" aria-label="「${U.esc(it.name)}」を修正">✎</button>
            ${del}
          </li>`;
  }

  function groupHtml(g) {
    const items = App.data.packing[g.key];
    const c = count(items);
    const isEditing = editing.has(g.key);
    return `
      <section class="card pack-card${isEditing ? ' is-editing' : ''}">
        <header class="pack-head">
          <h2>${U.esc(g.label)}</h2>
          <span class="pack-count">${c.done} / ${c.all}</span>
          ${items.length ? `<button type="button" class="btn btn-small${isEditing ? ' btn-ai' : ''}" data-act="toggle-edit" data-group="${g.key}">${isEditing ? '✓ 完了' : '✎ 編集'}</button>` : ''}
        </header>
        <div class="progress"><span style="width:${c.all ? (c.done / c.all) * 100 : 0}%"></span></div>
        ${isEditing ? '<p class="pack-edit-note">▲▼で並べ替え、名前か✎をタップで修正</p>' : ''}
        ${items.length ? `<ul class="checklist">${items.map((it, i) => rowHtml(g, it, i, items.length)).join('')}</ul>` : '<p class="empty">項目がありません</p>'}
        <form class="add-row" data-group="${g.key}">
          <input type="text" name="name" placeholder="項目を追加" enterkeyhint="done" aria-label="${U.esc(g.label)}に項目を追加">
          <button type="submit" class="btn btn-ai">追加</button>
        </form>
      </section>`;
  }

  // 名前の修正と、区分(共通/自分/妻)の移動
  function openRename(groupKey, id) {
    const list = App.data.packing[groupKey];
    const it = list.find((x) => x.id === id);
    if (!it) return;
    App.openForm({
      title: '持ち物を修正',
      fields: [
        { key: 'name', label: '名前', type: 'text', required: true, full: true },
        { key: 'group', label: '区分', type: 'select', full: true, options: App.PACK_GROUPS.map((g) => ({ value: g.key, label: g.label })), hint: '区分を変えると、移動先のいちばん下に入ります' },
      ],
      values: { name: it.name, group: groupKey },
      onSubmit: (v) => {
        it.name = v.name;
        if (v.group !== groupKey && App.data.packing[v.group]) {
          list.splice(list.indexOf(it), 1);
          App.data.packing[v.group].push(it);
          U.toast(`「${it.name}」を${App.PACK_GROUPS.find((g) => g.key === v.group).label}へ移しました`);
        }
        App.commit();
      },
    });
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
      const act = b.dataset.act;
      if (act === 'toggle-edit') {
        const g = b.dataset.group;
        if (editing.has(g)) editing.delete(g);
        else editing.add(g);
        return App.render();
      }
      if (act === 'rename') return openRename(b.dataset.group, b.dataset.id);
      if (act === 'up' || act === 'down') {
        const list = App.data.packing[b.dataset.group];
        const idx = list.findIndex((x) => x.id === b.dataset.id);
        const to = idx + (act === 'up' ? -1 : 1);
        if (idx === -1 || to < 0 || to >= list.length) return;
        [list[idx], list[to]] = [list[to], list[idx]];
        App.commit();
        // 押したボタンにフォーカスを戻して、続けて動かせるようにする
        const again = el.querySelector(`[data-act="${act}"][data-id="${b.dataset.id}"]`);
        if (again && !again.disabled) again.focus();
        return;
      }
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
