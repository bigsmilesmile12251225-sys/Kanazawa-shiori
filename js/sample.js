/* サンプルデータ(すべて架空)
 * 宿・お店の名前、住所、電話番号、座席などは実在しないダミーです。
 * 地名・観光地名は一般的な公開情報のみを使っています。
 */
(function (App) {
  'use strict';

  App.sampleData = () => ({
    schema: 1,
    trip: { title: '金沢 二人旅(サンプル)', catchphrase: '加賀百万石の城下町をめぐる', startDate: '2026-11-20', members: '夫・妻', meName: '', wifeName: '' },
    itinerary: [
      [
        { id: 's-d0-1', time: '07:36', type: 'move', title: '東京駅から北陸新幹線で金沢へ', place: '東京駅', memo: '改札内で駅弁と飲み物を買う', mapUrl: '' },
        { id: 's-d0-2', time: '10:30', type: 'move', title: '金沢駅に到着・荷物を宿へ預ける', place: '金沢駅', memo: '鼓門の前で記念写真', mapUrl: '' },
        { id: 's-d0-3', time: '11:30', type: 'meal', title: '近江町市場で海鮮丼', place: '近江町市場', memo: '混んでいたら先に市場を一周', mapUrl: '' },
        { id: 's-d0-4', time: '13:30', type: 'sight', title: '兼六園を散策', place: '兼六園', memo: '雪吊りの時期。ことじ灯籠で写真', mapUrl: '' },
        { id: 's-d0-5', time: '15:30', type: 'sight', title: '金沢21世紀美術館', place: '金沢21世紀美術館', memo: '⚠️ 前日までに休館日と展示内容を確認', mapUrl: '' },
        { id: 's-d0-6', time: '17:30', type: 'stay', title: '宿にチェックイン', place: '(架空)ひがし旅館 ことのは', memo: '', mapUrl: '' },
        { id: 's-d0-7', time: '19:00', type: 'meal', title: '夕食(予約済み)', place: '(架空)割烹 かなえ', memo: 'コース料理', mapUrl: '' },
      ],
      [
        { id: 's-d1-1', time: '09:30', type: 'sight', title: 'ひがし茶屋街を散策', place: 'ひがし茶屋街', memo: '朝の静かなうちに', mapUrl: '' },
        { id: 's-d1-2', time: '10:30', type: 'sight', title: '金箔貼り体験', place: 'ひがし茶屋街周辺', memo: '所要60分ほど\n⚠️ 1週間前までにWebで体験を予約', mapUrl: '' },
        { id: 's-d1-3', time: '12:00', type: 'meal', title: '昼食(治部煮)', place: 'ひがし茶屋街周辺', memo: '', mapUrl: '' },
        { id: 's-d1-4', time: '14:00', type: 'shop', title: '主計町・尾張町で買い物', place: '主計町茶屋街', memo: '器や雑貨を見る', mapUrl: '' },
        { id: 's-d1-5', time: '15:30', type: 'sight', title: '長町武家屋敷跡', place: '長町武家屋敷跡', memo: '', mapUrl: '' },
        { id: 's-d1-6', time: '18:00', type: 'meal', title: '夕食(予約済み)', place: '(架空)寿司処 金扇', memo: 'おまかせ', mapUrl: '' },
      ],
      [
        { id: 's-d2-1', time: '10:00', type: 'stay', title: '宿をチェックアウト', place: '(架空)ひがし旅館 ことのは', memo: '荷物は駅のロッカーへ', mapUrl: '' },
        { id: 's-d2-2', time: '10:45', type: 'sight', title: 'にし茶屋街を散策', place: 'にし茶屋街', memo: '', mapUrl: '' },
        { id: 's-d2-3', time: '12:30', type: 'shop', title: '金沢駅でお土産を買う', place: '金沢駅', memo: '', mapUrl: '' },
        { id: 's-d2-4', time: '13:30', type: 'meal', title: '駅で昼食(金沢おでん)', place: '金沢駅', memo: '', mapUrl: '' },
        { id: 's-d2-5', time: '15:10', type: 'move', title: '北陸新幹線で東京へ', place: '金沢駅', memo: '', mapUrl: '' },
        { id: 's-d2-6', time: '17:54', type: 'move', title: '東京駅に到着', place: '東京駅', memo: 'おつかれさまでした', mapUrl: '' },
      ],
    ],
    transport: [
      { id: 's-t1', kind: 'shinkansen', day: 0, depTime: '07:36', arrTime: '10:30', from: '東京', to: '金沢', trainName: 'かがやき(例)', seat: '7号車 3D・3E(例)', price: 28760, method: 'えきねっと(新幹線eチケット)', booked: true, memo: '交通系ICカードで改札を通る' },
      { id: 's-t2', kind: 'bus', day: 0, depTime: '13:10', arrTime: '13:25', from: '金沢駅東口', to: '兼六園下', trainName: '周遊バス', seat: '', price: 420, method: 'ICカード', booked: true, memo: '' },
      { id: 's-t3', kind: 'shinkansen', day: 2, depTime: '15:10', arrTime: '17:54', from: '金沢', to: '東京', trainName: 'かがやき(例)', seat: '8号車 5A・5B(例)', price: 28760, method: '紙のきっぷ(駅で受け取り)', booked: false, memo: '指定席券売機で受け取る\n⚠️ 1か月前の発売日に指定席を予約' },
    ],
    hotels: [
      { id: 's-h1', name: '(架空)ひがし旅館 ことのは', address: '石川県金沢市〇〇町1-2-3(架空)', checkIn: '15:00', checkOut: '10:00', nights: 'both', phone: '000-0000-0000', mapUrl: '', price: 64000, memo: '朝食付き(サンプル)\n⚠️ 前日までに到着時刻を電話で連絡' },
    ],
    restaurants: [
      { id: 's-r1', name: '(架空)割烹 かなえ', day: 0, time: '19:00', people: 2, phone: '000-0000-1111', mapUrl: '', price: 22000, memo: 'カウンター席・コース(サンプル)\n⚠️ 3日前までに人数の最終連絡' },
      { id: 's-r2', name: '(架空)寿司処 金扇', day: 1, time: '18:00', people: 2, phone: '000-0000-2222', mapUrl: '', price: 18000, memo: 'おまかせ(サンプル)' },
    ],
    packing: {
      common: App.DEFAULT_PACKING.common.map((name, i) => ({ name, checked: i < 3 })),
      me: App.DEFAULT_PACKING.me.map((name) => ({ name, checked: false })),
      wife: App.DEFAULT_PACKING.wife.map((name, i) => ({ name, checked: i < 2 })),
    },
    souvenirs: [
      { category: 'gift', giver: 'both', recipient: '職場', item: '金箔入りのお菓子(個包装)', shop: '金沢駅のお土産売り場', timingItemId: 's-d2-3', timingText: '', budget: 3000, actual: '', bought: false, photo: '', url: '', memo: '20個以上入りのもの\n⚠️ 出発前に職場の人数を確認' },
      { category: 'gift', giver: 'me', recipient: '実家', item: '加賀棒茶', shop: 'ひがし茶屋街のお茶屋さん', timingItemId: 's-d1-1', timingText: '', budget: 2500, actual: 2376, bought: true, photo: '', url: '', memo: '' },
      { category: 'gift', giver: 'wife', recipient: '友人', item: 'あぶらとり紙', shop: '', timingItemId: '', timingText: '金沢駅で帰る前に', budget: 1000, actual: '', bought: false, photo: '', url: '', memo: '' },
      { category: 'ours', giver: 'both', recipient: '', item: '九谷焼の豆皿', shop: '主計町のギャラリー', timingItemId: 's-d1-4', timingText: '', budget: 5000, actual: 5500, bought: true, photo: '', url: '', memo: '2枚組' },
      { category: 'ours', giver: 'me', recipient: '', item: '地酒(四合瓶)', shop: '金沢駅のお土産売り場', timingItemId: 's-d2-3', timingText: '', budget: 2500, actual: '', bought: false, photo: '', url: '', memo: '' },
    ],
  });
})(window.App);
