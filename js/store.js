/* データ形式・localStorage保存・JSON入出力 */
(function (App) {
  'use strict';
  const { U } = App;

  const KEY = 'kanazawa-shiori:data:v1';
  const UI_KEY = 'kanazawa-shiori:ui:v1';
  const SCHEMA = 1;

  /* ---------- 定数 ---------- */
  App.ITEM_TYPES = [
    { key: 'move', label: '移動', icon: '🚃' },
    { key: 'sight', label: '観光', icon: '⛩️' },
    { key: 'meal', label: '食事', icon: '🍽️' },
    { key: 'stay', label: '宿泊', icon: '🏨' },
    { key: 'shop', label: '買い物', icon: '🛍️' },
  ];
  App.typeOf = (key) => App.ITEM_TYPES.find((t) => t.key === key) || App.ITEM_TYPES[1];

  App.TRANSPORT_KINDS = [
    { key: 'shinkansen', label: '新幹線' },
    { key: 'express', label: '特急' },
    { key: 'local', label: '在来線' },
    { key: 'bus', label: 'バス' },
    { key: 'other', label: 'その他' },
  ];
  App.kindOf = (key) => App.TRANSPORT_KINDS.find((k) => k.key === key) || App.TRANSPORT_KINDS[4];

  App.NIGHTS = [
    { key: 'both', label: '2泊とも' },
    { key: 'n1', label: '1泊目(1日目の夜)' },
    { key: 'n2', label: '2泊目(2日目の夜)' },
  ];

  App.PACK_GROUPS = [
    { key: 'common', label: '共通' },
    { key: 'me', label: '自分' },
    { key: 'wife', label: '妻' },
  ];

  // 一般的な旅行の持ち物(初期値)
  App.DEFAULT_PACKING = {
    common: [
      '財布・現金', '交通系ICカード', 'きっぷ・予約QR(スマホ)', 'スマホ充電器', 'モバイルバッテリー',
      '折りたたみ傘(金沢は天気が変わりやすい)', '常備薬・絆創膏', '保険証(マイナ保険証)',
      'エコバッグ(お土産用)', 'ウェットティッシュ', 'ビニール袋',
    ],
    me: [
      '着替え(2日分)', '下着・靴下', 'パジャマ', '洗面用具・ひげそり', '歩きやすい靴',
      '羽織るもの', 'ハンカチ・ティッシュ', 'メガネ・コンタクト',
    ],
    wife: [
      '着替え(2日分)', '下着・靴下', 'パジャマ', 'スキンケア・化粧品', 'ヘアアイロン',
      '歩きやすい靴', '羽織るもの', 'ハンカチ・ティッシュ',
    ],
  };

  /* ---------- 各レコードの既定値 ---------- */
  const DEF = {
    item: { id: '', time: '', title: '', place: '', memo: '', mapUrl: '', type: 'sight' },
    transport: {
      id: '', kind: 'shinkansen', day: 0, depTime: '', arrTime: '', from: '', to: '',
      trainName: '', seat: '', price: '', method: '', booked: false, memo: '',
    },
    hotel: {
      id: '', name: '', address: '', checkIn: '15:00', checkOut: '10:00', nights: 'both',
      phone: '', mapUrl: '', price: '', memo: '',
    },
    restaurant: { id: '', name: '', day: 0, time: '', people: 2, phone: '', mapUrl: '', price: '', memo: '' },
    pack: { id: '', name: '', checked: false },
    souvenir: {
      id: '', category: 'gift', recipient: '', item: '', shop: '', timingItemId: '', timingText: '',
      budget: '', actual: '', bought: false, photo: '', url: '', memo: '',
    },
  };
  App.DEF = DEF;

  const rec = (def, raw) => {
    const o = Object.assign({}, def);
    if (raw && typeof raw === 'object') {
      Object.keys(def).forEach((k) => {
        if (raw[k] !== undefined && raw[k] !== null) o[k] = raw[k];
      });
    }
    if (!o.id) o.id = U.uid();
    return o;
  };
  const list = (def, raw) => (Array.isArray(raw) ? raw.filter((x) => x && typeof x === 'object').map((x) => rec(def, x)) : []);

  App.makePackItems = (names) => names.map((name) => rec(DEF.pack, { name }));

  App.defaultData = () => ({
    schema: SCHEMA,
    trip: { title: '金沢 二人旅', catchphrase: '', startDate: '', members: '' },
    itinerary: [[], [], []],
    transport: [],
    hotels: [],
    restaurants: [],
    packing: {
      common: App.makePackItems(App.DEFAULT_PACKING.common),
      me: App.makePackItems(App.DEFAULT_PACKING.me),
      wife: App.makePackItems(App.DEFAULT_PACKING.wife),
    },
    souvenirs: [],
    todoDone: {}, // ⚠️メモから作ったToDoの完了状態 { キー: true }
    updatedAt: '',
  });

  // 読み込んだデータの欠けを補い、形をそろえる
  App.normalize = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('データの形式が正しくありません');
    const d = App.defaultData();
    const trip = raw.trip || {};
    d.trip = {
      title: String(trip.title ?? d.trip.title),
      catchphrase: String(trip.catchphrase ?? ''),
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(trip.startDate || '') ? trip.startDate : '',
      members: String(trip.members ?? ''),
    };
    const it = Array.isArray(raw.itinerary) ? raw.itinerary : [];
    d.itinerary = [0, 1, 2].map((i) => list(DEF.item, it[i]));
    d.transport = list(DEF.transport, raw.transport);
    d.hotels = list(DEF.hotel, raw.hotels);
    d.restaurants = list(DEF.restaurant, raw.restaurants);
    if (raw.packing && typeof raw.packing === 'object') {
      App.PACK_GROUPS.forEach((g) => { d.packing[g.key] = list(DEF.pack, raw.packing[g.key]); });
    }
    d.souvenirs = list(DEF.souvenir, raw.souvenirs);
    // 写真は縮小済みの画像dataURLだけを受け付ける
    d.souvenirs.forEach((s) => {
      if (!/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s.photo)) s.photo = '';
    });
    if (raw.todoDone && typeof raw.todoDone === 'object') {
      Object.keys(raw.todoDone).forEach((k) => { if (raw.todoDone[k] === true) d.todoDone[k] = true; });
    }
    d.updatedAt = raw.updatedAt || '';
    return d;
  };

  /* ---------- 保存・読込 ---------- */
  App.load = () => {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* プライベートモード等 */ }
    App.isFirstRun = !saved;
    try {
      App.data = saved ? App.normalize(JSON.parse(saved)) : App.defaultData();
    } catch (e) {
      console.error(e);
      App.data = App.defaultData();
      alert('保存データを読み込めなかったため、初期状態で開きました。');
    }
    try {
      App.ui = Object.assign(App.defaultUi(), JSON.parse(localStorage.getItem(UI_KEY) || '{}'));
    } catch (e) {
      App.ui = App.defaultUi();
    }
  };

  App.defaultUi = () => ({
    tab: 'itinerary',
    souvenirFilter: 'all',
    todoHideDone: false,
    shioriOpts: { cover: true, days: true, dayExtras: true, transport: true, stay: true, packing: true, todoInShiori: false },
  });

  App.save = () => {
    App.data.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify(App.data));
      return true;
    } catch (e) {
      console.error(e);
      alert('保存できませんでした。容量がいっぱいの可能性があります。\nお土産の写真を減らすか、「データ」→「書き出し」でバックアップしてください。');
      return false;
    }
  };

  App.saveUi = () => {
    try { localStorage.setItem(UI_KEY, JSON.stringify(App.ui)); } catch (e) { /* 無視 */ }
  };

  App.storageBytes = () => {
    try { return (localStorage.getItem(KEY) || '').length; } catch (e) { return 0; }
  };

  App.exportJSON = () => {
    const blob = new Blob([JSON.stringify(App.data, null, 2)], { type: 'application/json' });
    U.download(blob, `kanazawa-shiori-${U.stamp()}.json`);
  };

  // JSON文字列を読み込んで置き換える(失敗時は例外)
  App.importJSON = (text) => {
    const data = App.normalize(JSON.parse(text));
    App.data = data;
    App.save();
    return data;
  };

  /* ---------- 行程まわりの参照ヘルパー ---------- */
  App.findItem = (id) => {
    if (!id) return null;
    for (let day = 0; day < App.data.itinerary.length; day++) {
      const idx = App.data.itinerary[day].findIndex((x) => x.id === id);
      if (idx !== -1) return { day, idx, item: App.data.itinerary[day][idx] };
    }
    return null;
  };
  App.itemLabel = (day, item) =>
    [U.dayLabel(App.data.trip.startDate, day), item.time, item.title].filter(Boolean).join(' ');

  // お土産の「購入タイミング」の表示文字列
  App.timingLabel = (sv) => {
    const f = App.findItem(sv.timingItemId);
    if (f) return App.itemLabel(f.day, f.item);
    return sv.timingText || '';
  };
})(window.App);
