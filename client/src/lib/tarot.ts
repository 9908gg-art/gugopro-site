/** Dark Glass Tarot: card selection is entirely local; Gemini only receives the chosen cards and question. */
export type TarotCard = { name: string; orientation: "正位" | "逆位" };

const majorArcana = ["愚者", "魔術師", "女祭司", "皇后", "皇帝", "教皇", "戀人", "戰車", "力量", "隱者", "命運之輪", "正義", "倒吊人", "死神", "節制", "惡魔", "高塔", "星星", "月亮", "太陽", "審判", "世界"];
const ranks = ["王牌", "二", "三", "四", "五", "六", "七", "八", "九", "十", "侍者", "騎士", "皇后", "國王"];
const suits = ["權杖", "聖杯", "寶劍", "錢幣"];

export function drawTarotCards(deckSize: 22 | 78, count: number): TarotCard[] {
  const deck = deckSize === 22 ? majorArcana : [...majorArcana, ...suits.flatMap((suit) => ranks.map((rank) => `${suit}${rank}`))];
  const pool = [...deck];
  return Array.from({ length: Math.min(count, pool.length) }, () => {
    const index = Math.floor(Math.random() * pool.length);
    const name = pool.splice(index, 1)[0];
    return { name, orientation: Math.random() > 0.5 ? "正位" : "逆位" };
  });
}
