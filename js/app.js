/* タブ切り替え・初期化・データ管理 */
(function (App) {
  'use strict';
  const { U } = App;

  App.modules = App.modules || {};
  const TAB_KEYS = ['itinerary', 'transport', 'stay', 'packing', 'souvenir', 'shiori'];
  const panel = (key) => document.getElementById('panel-' + key);

  App.render = () => {
    const key = App.ui.tab;
    App.modules[key].render(panel(key));
    renderHeader();
  };

  // データを変更したら呼ぶ: 保存して再描画
  App.commit = () => {
    App.save();
    App.render();
  };

  App.setTab = (key) => {
    if (!TAB_KEYS.includes(key)) key = 'itinerary';
    App.ui.tab = key;
    App.saveUi();
    document.querySelectorAll('.tab').forEach((t) => {
      const on = t.dataset.tab === key;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
    });
    TAB_KEYS.forEach((k) => { panel(k).hidden = k !== key; });
    App.render();
    window.scrollTo(0, 0);
  };

  function renderHeader() {
    const { title, startDate } = App.data.trip;
    document.getElementById('header-title').textContent = title || '旅のしおり';
    const s = U.dayDate(startDate, 0);
    const e = U.dayDate(startDate, U.DAYS - 1);
    document.getElementById('header-period').textContent = s ? `${U.fmtMD(s)}〜${U.fmtMD(e)}` : '';
    document.title = (title || '旅のしおり') + ' | 旅のしおり';
  }
  App.renderHeader = renderHeader;

  /* ---------- データ管理ダイアログ ---------- */
  function setupDataDialog() {
    const dlg = document.getElementById('dlg-data');

    const refreshInfo = () => {
      const t = App.data.updatedAt ? new Date(App.data.updatedAt) : null;
      document.getElementById('info-saved').textContent = t ? t.toLocaleString('ja-JP') : '未保存';
      const kb = App.storageBytes() / 1024;
      document.getElementById('info-size').textContent =
        kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB(目安上限 約5MB)` : `${Math.ceil(kb)} KB(目安上限 約5MB)`;
    };

    document.getElementById('btn-data').addEventListener('click', () => {
      refreshInfo();
      dlg.showModal();
    });

    dlg.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      switch (act.dataset.act) {
        case 'close':
          dlg.close();
          break;
        case 'export':
          App.exportJSON();
          U.toast('JSONファイルを書き出しました');
          break;
        case 'sample':
          if (confirm('今のデータをサンプル(架空)で上書きします。よろしいですか?\n※必要なら先に「書き出し」でバックアップしてください。')) {
            App.data = App.normalize(App.sampleData());
            App.commit();
            dlg.close();
            U.toast('サンプルデータを読み込みました');
          }
          break;
        case 'reset':
          if (confirm('すべてのデータを消して初期状態に戻します。元に戻せません。よろしいですか?')) {
            App.data = App.defaultData();
            App.commit();
            dlg.close();
            U.toast('初期状態に戻しました');
          }
          break;
      }
    });

    document.getElementById('import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (!confirm(`「${file.name}」を読み込み、今のデータを置き換えます。よろしいですか?`)) return;
      try {
        App.importJSON(await file.text());
        App.render();
        dlg.close();
        U.toast('データを読み込みました');
      } catch (err) {
        console.error(err);
        alert('読み込めませんでした。しおりアプリで書き出したJSONファイルか確認してください。\n(' + err.message + ')');
      }
    });
  }

  function init() {
    App.load();
    TAB_KEYS.forEach((k) => {
      const m = App.modules[k];
      if (m && m.init) m.init(panel(k));
    });
    document.querySelector('.tabs').addEventListener('click', (e) => {
      const t = e.target.closest('.tab');
      if (t) App.setTab(t.dataset.tab);
    });
    setupDataDialog();
    App.setTab(App.ui.tab);

    // ブラウザによる自動削除をできるだけ防ぐ(対応ブラウザのみ)
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.App);
