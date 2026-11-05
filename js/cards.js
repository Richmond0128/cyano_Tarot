// 偉特塔羅 78 張牌資料（圖片來源見 assets/images/塔羅牌/LICENSE_README.txt）

const MAJOR_ARCANA = [
  "愚者", "魔術師", "女祭司", "女皇", "皇帝", "教皇", "戀人", "戰車",
  "力量", "隱者", "命運之輪", "正義", "吊人", "死神", "節制", "惡魔",
  "塔", "星星", "月亮", "太陽", "審判", "世界",
];

const MAJOR_ARCANA_EN = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
  "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
  "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
  "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World",
];

const SUITS = [
  { key: "wands", zh: "權杖", en: "Wands" },
  { key: "cups", zh: "聖杯", en: "Cups" },
  { key: "swords", zh: "寶劍", en: "Swords" },
  { key: "pentacles", zh: "錢幣", en: "Pentacles" },
];

const RANKS = [
  { key: "ace", zh: "一", en: "Ace" },
  { key: "two", zh: "二", en: "Two" },
  { key: "three", zh: "三", en: "Three" },
  { key: "four", zh: "四", en: "Four" },
  { key: "five", zh: "五", en: "Five" },
  { key: "six", zh: "六", en: "Six" },
  { key: "seven", zh: "七", en: "Seven" },
  { key: "eight", zh: "八", en: "Eight" },
  { key: "nine", zh: "九", en: "Nine" },
  { key: "ten", zh: "十", en: "Ten" },
  { key: "page", zh: "侍從", en: "Page" },
  { key: "knight", zh: "騎士", en: "Knight" },
  { key: "queen", zh: "皇后", en: "Queen" },
  { key: "king", zh: "國王", en: "King" },
];

const CARD_BACK_IMAGE = "assets/images/塔羅牌/卡背/經典.jpg";

function buildDeck() {
  const deck = [];

  MAJOR_ARCANA.forEach((zhName, i) => {
    const num = String(i).padStart(2, "0");
    deck.push({
      id: `major-${num}`,
      nameZh: zhName,
      nameEn: MAJOR_ARCANA_EN[i],
      image: `assets/images/塔羅牌/大阿爾克那/${num}_${zhName}.jpg`,
    });
  });

  SUITS.forEach((suit) => {
    RANKS.forEach((rank, i) => {
      const num = String(i + 1).padStart(2, "0");
      deck.push({
        id: `${suit.key}-${rank.key}`,
        nameZh: `${suit.zh}${rank.zh}`,
        nameEn: `${rank.en} of ${suit.en}`,
        image: `assets/images/塔羅牌/${suit.zh}/${num}_${rank.zh}.jpg`,
      });
    });
  });

  return deck;
}
