/* 編集ダイアログ(項目定義からフォームを組み立てる共通部品)
 *
 * App.openForm({
 *   title, fields, values, submitLabel,
 *   onSubmit(values),   // 保存時
 *   onDelete(),         // 指定すると「削除」ボタンを表示
 * })
 *
 * field: { key, label, type, required, full, placeholder, hint, options, suggestions, showIf(values) }
 * type: text / textarea / time / number / url / tel / select / checkbox / day / photo / timing
 */
(function (App) {
  'use strict';
  const { U } = App;

  // 日にちの選択肢(none=true で「日付未定」も)
  App.dayOptions = (none) => {
    const opts = [0, 1, 2].map((i) => ({ value: String(i), label: U.dayLabel(App.data.trip.startDate, i) }));
    if (none) opts.push({ value: '-1', label: '日付未定' });
    return opts;
  };

  // お土産の購入タイミング用: 行程の項目一覧
  const timingOptions = () => {
    const opts = [];
    App.data.itinerary.forEach((items, day) => {
      items.forEach((it) => opts.push({ value: it.id, label: App.itemLabel(day, it) }));
    });
    return opts;
  };

  const optionTags = (options, value) =>
    options.map((o) => `<option value="${U.esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${U.esc(o.label)}</option>`).join('');

  function fieldHtml(f, v) {
    const val = v[f.key];
    const id = 'f-' + f.key;
    const cls = `field${f.full ? ' full' : ''}${f.type === 'checkbox' ? ' field-check' : ''}`;
    const req = f.required ? ' <span class="req">必須</span>' : '';
    const label = `<span class="field-label">${U.esc(f.label)}${req}</span>`;
    const hint = f.hint ? `<span class="field-hint">${U.esc(f.hint)}</span>` : '';
    const ph = f.placeholder ? ` placeholder="${U.esc(f.placeholder)}"` : '';
    let input = '';

    switch (f.type) {
      case 'textarea':
        input = `<textarea id="${id}" name="${f.key}" rows="3"${ph}>${U.esc(val)}</textarea>`;
        break;
      case 'number':
        input = `<input id="${id}" name="${f.key}" type="number" inputmode="numeric" min="0" step="1" value="${U.esc(val)}"${ph}>`;
        break;
      case 'select':
        input = `<select id="${id}" name="${f.key}">${optionTags(f.options, val)}</select>`;
        break;
      case 'day':
        input = `<select id="${id}" name="${f.key}">${optionTags(App.dayOptions(f.allowNone), val)}</select>`;
        break;
      case 'checkbox':
        return `<label class="${cls}" data-field="${f.key}"><input id="${id}" name="${f.key}" type="checkbox"${val ? ' checked' : ''}><span>${U.esc(f.label)}</span></label>`;
      case 'photo':
        input = `
          <div class="photo-field">
            <div class="photo-preview">${val ? `<img src="${val}" alt="">` : '<span>写真なし</span>'}</div>
            <div class="photo-buttons">
              <label class="btn btn-small file-btn">写真を選ぶ<input type="file" accept="image/*" data-photo="${f.key}" hidden></label>
              <button type="button" class="btn btn-small" data-photo-clear="${f.key}"${val ? '' : ' hidden'}>写真を外す</button>
            </div>
          </div>`;
        return `<div class="${cls}" data-field="${f.key}">${label}${input}${hint}</div>`;
      case 'timing': {
        const opts = timingOptions();
        const free = !v.timingItemId && !!v.timingText;
        const sel = v.timingItemId && opts.some((o) => o.value === v.timingItemId) ? v.timingItemId : (free ? '__free' : '');
        input = `
          <select id="${id}" name="timingItemId">
            <option value="">未定</option>
            ${opts.length ? `<optgroup label="行程から選ぶ">${optionTags(opts, sel)}</optgroup>` : ''}
            <option value="__free"${sel === '__free' ? ' selected' : ''}>自由に入力する…</option>
          </select>
          <input name="timingText" type="text" class="timing-text" placeholder="例: 金沢駅で帰る前に" value="${U.esc(v.timingText)}"${sel === '__free' ? '' : ' hidden'}>`;
        break;
      }
      default: {
        const type = ['time', 'url', 'tel'].includes(f.type) ? f.type : 'text';
        const list = f.suggestions && f.suggestions.length ? ` list="${id}-list"` : '';
        const im = type === 'url' ? ' inputmode="url" autocapitalize="off"' : '';
        input = `<input id="${id}" name="${f.key}" type="${type}" value="${U.esc(val)}"${ph}${list}${im}>`;
        if (list) input += `<datalist id="${id}-list">${f.suggestions.map((s) => `<option value="${U.esc(s)}">`).join('')}</datalist>`;
      }
    }
    return `<label class="${cls}" data-field="${f.key}">${label}${input}${hint}</label>`;
  }

  App.openForm = function (opt) {
    const dlg = document.getElementById('dlg-form');
    const values = Object.assign({}, opt.values);
    const photos = {}; // 写真フィールドの現在値
    opt.fields.filter((f) => f.type === 'photo').forEach((f) => { photos[f.key] = values[f.key] || ''; });

    dlg.innerHTML = `
      <form class="dlg-form" novalidate>
        <header class="dlg-head"><h2>${U.esc(opt.title)}</h2></header>
        <div class="dlg-body form-grid">${opt.fields.map((f) => fieldHtml(f, values)).join('')}</div>
        <footer class="dlg-foot">
          ${opt.onDelete ? '<button type="button" class="btn btn-danger-outline" data-act="delete">削除</button>' : ''}
          <span class="spacer"></span>
          <button type="button" class="btn" data-act="cancel">キャンセル</button>
          <button type="submit" class="btn btn-primary">${U.esc(opt.submitLabel || '保存')}</button>
        </footer>
      </form>`;
    const form = dlg.querySelector('form');

    // form.elements.item は組み込みメソッドと衝突するので namedItem を使う
    const named = (name) => form.elements.namedItem(name);
    const collect = () => {
      const out = {};
      opt.fields.forEach((f) => {
        const el = named(f.key);
        switch (f.type) {
          case 'checkbox': out[f.key] = !!(el && el.checked); break;
          case 'day': out[f.key] = Number(el.value); break;
          case 'photo': out[f.key] = photos[f.key]; break;
          case 'timing': {
            const sel = named('timingItemId').value;
            out.timingItemId = sel === '__free' ? '' : sel;
            out.timingText = sel === '__free' ? named('timingText').value.trim() : '';
            break;
          }
          default: out[f.key] = el ? el.value.trim() : '';
        }
      });
      return out;
    };

    const refresh = () => {
      const v = collect();
      opt.fields.forEach((f) => {
        if (f.showIf) form.querySelector(`[data-field="${f.key}"]`).hidden = !f.showIf(v);
      });
      const tt = named('timingText');
      if (tt) tt.hidden = named('timingItemId').value !== '__free';
    };
    form.addEventListener('change', refresh);
    refresh();

    // 写真の選択・解除
    form.addEventListener('change', async (e) => {
      const key = e.target.dataset && e.target.dataset.photo;
      if (!key || !e.target.files[0]) return;
      try {
        photos[key] = await U.resizeImage(e.target.files[0]);
        const wrap = form.querySelector(`[data-field="${key}"]`);
        wrap.querySelector('.photo-preview').innerHTML = `<img src="${photos[key]}" alt="">`;
        wrap.querySelector('[data-photo-clear]').hidden = false;
      } catch (err) {
        alert(err.message);
      }
      e.target.value = '';
    });

    form.addEventListener('click', (e) => {
      const clear = e.target.closest('[data-photo-clear]');
      if (clear) {
        const key = clear.dataset.photoClear;
        photos[key] = '';
        form.querySelector(`[data-field="${key}"] .photo-preview`).innerHTML = '<span>写真なし</span>';
        clear.hidden = true;
        return;
      }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'cancel') dlg.close();
      if (act.dataset.act === 'delete' && confirm('この項目を削除しますか?')) {
        dlg.close();
        opt.onDelete();
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = collect();
      let firstError = null;
      form.querySelectorAll('.field.has-error').forEach((el) => el.classList.remove('has-error'));
      opt.fields.forEach((f) => {
        if (f.required && !String(v[f.key] || '').trim()) {
          const el = form.querySelector(`[data-field="${f.key}"]`);
          el.classList.add('has-error');
          firstError = firstError || el.querySelector('input,select,textarea');
        }
      });
      if (firstError) {
        firstError.focus();
        return;
      }
      dlg.close();
      opt.onSubmit(v);
    });

    dlg.showModal();
    dlg.querySelector('.dlg-body').scrollTop = 0;
  };

  // 画像や任意HTMLを表示するだけのダイアログ
  App.openViewer = function (title, html) {
    const dlg = document.getElementById('dlg-form');
    dlg.innerHTML = `
      <div class="dlg-form">
        <header class="dlg-head"><h2>${U.esc(title)}</h2></header>
        <div class="dlg-body">${html}</div>
        <footer class="dlg-foot"><span class="spacer"></span><button type="button" class="btn btn-primary" data-close>閉じる</button></footer>
      </div>`;
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    dlg.showModal();
    return dlg;
  };
})(window.App);
