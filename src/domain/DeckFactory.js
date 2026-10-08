import { Card } from './Card.js';
import { SUITS, MAX_RANK } from './Suit.js';

/**
 * 山札を作る。A〜maxRank の4スートを揃え、シャッフルして返す。
 */
export class DeckFactory {
  constructor(shuffler) {
    this.shuffler = shuffler;
  }

  create(maxRank) {
    if (maxRank < 1 || maxRank > MAX_RANK) throw new RangeError(`maxRank は 1〜${MAX_RANK} です`);
    const cards = [];
    let id = 0;
    for (let rank = 1; rank <= maxRank; rank++) {
      for (const suit of SUITS) cards.push(new Card(id++, rank, suit.id));
    }
    return this.shuffler.shuffle(cards);
  }
}
