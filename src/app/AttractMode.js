/**
 * メニュー表示中の背景演出：フルデッキを宙に浮かべておく。
 */
export class AttractMode {
  constructor({ field, deckFactory, maxRank }) {
    this.field = field;
    this.deckFactory = deckFactory;
    this.maxRank = maxRank;
  }

  show() {
    this.field.populate(this.deckFactory.create(this.maxRank));
  }

  hide() {
    this.field.clear();
  }
}
