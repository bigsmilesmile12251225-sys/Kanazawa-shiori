# CLAUDE.md — 金沢 旅のしおり

別の端末やセッションでも作業を続けられるように、仕様・方針・進捗をここにまとめる。**作業を進めたら「進捗」と「次にやること」を更新すること。**

## 概要

- 2泊3日の金沢旅行(夫婦2人)用「旅のしおり」Webアプリ。
- 編集するのは本人だけ。妻は出力したしおり(画像 / PDF)を見るだけ。
- 主な端末はタブレットとスマホ。PCでも使う。

## 技術方針(必ず守る)

- **HTML / CSS / JavaScript のみ**。フレームワークなし、ビルドなし、npm依存なし。
- `<script>` は ES Modules にせず、通常のスクリプトで読み込む。`index.html` をダブルクリック(file://)で開いても動くようにするため。名前空間はグローバルの `window.App` を使う。
- データは localStorage に保存する。キーは `kanazawa-shiori:data:v1`(データ本体)と `kanazawa-shiori:ui:v1`(開いているタブなど画面の状態)。
- JSON の書き出し / 読み込みで別の端末へ移す。
- **個人情報(宿名・予約内容など)をリポジトリに入れない**。サンプルは架空のものだけにする(`js/sample.js`、店名・宿名には「(架空)」を付け、電話番号は 000- で始める)。`.gitignore` で `*.json` を除外している(`manifest.webmanifest` は対象外)。
- GitHub Pages で公開する(ルート直下、`.nojekyll` あり)。
- 外部から読み込むのは2つだけ:
  - Google Fonts の Zen Old Mincho(見出し用。読めなくても明朝体のフォールバックで表示される)
  - html2canvas 1.4.1(PNG作成時にだけ遅延読み込み。cdnjs で失敗したら jsDelivr)
- 日本語UI。タブレット操作を優先し、タップ領域は 44〜48px 以上、入力欄の文字は 16px 以上(iOSで画面が拡大されないように)。

## デザイン

- 和風で金沢らしい雰囲気。読みやすさを最優先にし、飾りは控えめにする。
- 配色(CSS変数は `css/style.css` の `:root`、しおり側は `.shiori` 内の `--s-*`):
  - 生成り `#f5efe1` / 和紙 `#fffdf7` / 藍 `#1f3d66` / 臙脂 `#9a2e33` / 金箔 `#b28b36`
  - 行程の種別色は加賀五彩から: 移動=藍 `#2c5282`、観光=臙脂 `#9a2e33`、食事=黄土 `#a0701f`、宿泊=古代紫 `#6a4b7d`、買い物=草 `#4f7a3a`
- 見出しは明朝体(`--font-mincho`: Zen Old Mincho → ヒラギノ明朝 → 游明朝 → Noto Serif JP)。本文はゴシック体(`--font-sans`)。
- しおりの飾りは、金の細線と小さな金箔風の菱形だけにする。
- スマホではタブを画面下に固定し、タブレット・PCでは上部に置く(切り替えは幅640px)。

## ファイル構成と役割

| ファイル | 役割 |
|---|---|
| `index.html` | ヘッダー、タブ、各パネル(中身は空)、ダイアログ(`#dlg-form` 共通 / `#dlg-data` データ管理)、`#capture-area`(PNG作成用、画面外) |
| `js/util.js` | `App.U`: エスケープ、日付計算(`dayDate`, `dayLabel`)、金額、URL(`mapHref` は地図URLが無ければGoogleマップ検索URLを作る)、トースト(元に戻すボタン付き)、ダウンロード、画像縮小 |
| `js/store.js` | 定数(種別・区分)、既定値 `App.DEF`、`normalize`(読み込んだデータを補正・検証)、load/save、JSON入出力、`findItem` / `itemLabel` / `timingLabel` |
| `js/sample.js` | `App.sampleData()`(架空) |
| `js/form.js` | `App.openForm({title, fields, values, onSubmit, onDelete})` 項目定義から作る編集ダイアログ。`App.openViewer(title, html)` |
| `js/itinerary.js` ほか | 各タブのモジュール。`App.modules.<key> = { init(el), render(el) }` |
| `js/shiori.js` | `M.pages(mode)` でページごとのHTMLを作る(`mode` は `'a4'` か `'phone'`)。プレビュー、`window.print()`、html2canvas でPNG作成、作成した画像の一覧(保存・共有) |
| `js/app.js` | タブ切替、`App.render()`、`App.commit()`(保存して再描画)、データ管理ダイアログ |

### 実装の決まり

- データを変えたら `App.commit()` を呼ぶ(保存して、表示中のタブだけ再描画)。
- 各パネルのイベントは `init` でパネル要素に一度だけ委譲して登録する(`data-act` 属性で分ける)。
- ユーザーが入力した文字列は必ず `U.esc()` を通してから HTML に入れる。URLは `U.safeUrl()` で http/https だけを許可する。写真は `normalize` で `data:image/...;base64` だけを許可する。
- `form.elements[name]` ではなく `form.elements.namedItem(name)` を使う(`item` という名前が組み込みメソッドと衝突するため)。
- しおりのスマホ画像は html2canvas で描くので、CSS grid・`font-variant-numeric`・`attr()` を使わない(flex / block / table で組む)。

## データ形式(schema 1)

```js
{
  schema: 1,
  trip: { title, startDate: 'YYYY-MM-DD', members },
  itinerary: [[item...], [item...], [item...]],   // 3日分
  //   item: { id, time:'HH:MM', title, place, memo, mapUrl, type: move|sight|meal|stay|shop }
  transport: [{ id, kind: shinkansen|express|local|bus|other, day: 0..2 | -1(未定),
                depTime, arrTime, from, to, trainName, seat, price, method, booked, memo }],
  hotels: [{ id, name, address, checkIn, checkOut, nights: both|n1|n2, phone, mapUrl, memo }],
  restaurants: [{ id, name, day, time, people, phone, mapUrl, memo }],
  packing: { common: [{ id, name, checked }], me: [...], wife: [...] },
  souvenirs: [{ id, category: gift|ours, recipient, item, shop,
                timingItemId,   // 行程itemのid(行程から選んだとき)
                timingText,     // 自由入力のとき
                budget, actual, bought, photo /* 縮小JPEGのdataURL */, url, memo }],
  updatedAt: ISO文字列
}
```

- 日付は「何日目か(day: 0〜2)」で持ち、表示するときに `trip.startDate` から計算する。開始日を変えても全体がずれずに追従する。
- 行程の予定を削除したとき、その予定に紐づいていたお土産は `timingText` に「1日目 11/20(金) 12:30 …」という文字で残す。
- 形式を変えるときは `schema` を上げ、`App.normalize` で古い形式を変換する。

## しおり出力の仕様

- 対象は 表紙・概要 / 行程(3日) / 交通 / 宿泊・食事 / 持ち物。**お土産は含めない**。どれを出すかは「しおり」タブのチェックで選ぶ(`App.ui.shioriOpts`)。
- 各日の行程の最後に「この日の交通・予約」(その日の交通と予約した店)を表示する(オフにできる)。
- PDF: `@page { size: A4 portrait }`。`.sheet` ごとに `break-before: page`。予定・表の行・カードは `break-inside: avoid`。ページ番号は `@page @bottom-center`(Chrome 131以降)。どのタブで印刷しても、`beforeprint` でしおりを描き直して、しおりだけが印刷されるようにしている。
- PNG: 幅390px × 最大3倍(1170px幅)。iOS の canvas 上限を超えないように、面積が1600万pxを超える場合は倍率を下げる。「日ごとに分割」(ページ単位)と「1枚にまとめる」がある。

## 動作確認の方法

1. `python3 -m http.server 8000` を実行して http://localhost:8000/ を開く(`index.html` を直接開いてもよい)。
2. 「⚙ データ」→ サンプルを読み込み、各タブを確認する。
3. 確認するポイント:
   - 行程: 追加すると時刻順の位置に入る / ▲▼ / 時刻順に並べる / 日にちを変えると別の日へ移る / タイトルが空なら必須エラー / 🎁 の表示
   - 交通: 合計金額 / 手配済みのチェック
   - 持ち物: Enter で連続して追加できる / ✕ で削除して「元に戻す」
   - お土産: 「自分たち用」を選ぶと相手欄が隠れる / 写真 / 合計・残額 / 絞り込み
   - データ: 書き出し → すべて消す → 読み込み → 再読み込みしても残っている / 壊れたJSONは拒否される
   - しおり: 印刷プレビューが A4縦で6ページ / PNG作成
4. 自動テスト(任意): Playwright で確認した。リポジトリにはテストを入れていない(ビルド・依存なしの方針のため)。

## 進捗

- [x] 段階1: 骨組み(タブ、ヘッダー、ダイアログ)、保存、JSON入出力、サンプル、初期化
- [x] 段階2: 行程(3日、日付の自動計算、追加・編集・削除・並べ替え、🎁表示)
- [x] 段階3: 交通(合計、手配済み)
- [x] 段階4: 宿・食事
- [x] 段階5: 持ち物(3区分、定番の持ち物、元に戻す)
- [x] 段階6: お土産(自分たち用、写真、購入タイミングの連動、合計・残額、絞り込み)
- [x] 段階7: しおり(A4プレビュー、PDF、スマホPNG、画像の保存・共有)
- [x] README(GitHub Pagesの公開手順、バックアップ方法)/ CLAUDE.md
- [x] Playwright で動作確認(タブレット横 1180px / タブレット縦 820px / スマホ 390px、PDF、PNG)

## 次にやること(アイデア・未着手)

- 実機確認: iPad Safari の印刷→PDF、iPhone の共有シートで画像を保存
- GitHub に push して Pages を有効にする(README の手順どおり)
- 必要なら: 持ち物の名前変更・並べ替え、行程のドラッグでの並べ替え、オフライン対応(Service Worker)、html2canvas をリポジトリに同梱してオフラインでもPNGを作れるようにする

## 既知の制約

- localStorage は端末・ブラウザごとに別々。Safari は7日間ほど使わないと消えることがある → ホーム画面に追加し、JSONでバックアップする。
- PNG作成にはネット接続が必要(CDN)。
- 絵文字の見た目は端末のフォントによって変わる。
