/**
 * カードの選び方（Strategy）。難易度の interaction で使い分ける。
 *
 * interface CardSelectionMethod {
 *   cardFromTap(ndc): Card | null     … クリック（タップ）で選ぶカード
 *   cardFromTouch(view): Card | null  … 指先で触れて選ぶカード
 *   usesReach: boolean                … 腕を伸ばす操作を使うか
 * }
 */

/** カーソルを合わせてクリックで選ぶ */
export class PointSelection {
  usesReach = false;

  constructor({ picker }) {
    this.picker = picker;
  }

  cardFromTap(ndc) {
    return this.picker.pick(ndc)?.card ?? null;
  }

  cardFromTouch() {
    return null;
  }
}

/** 腕を伸ばして、指先で触れたカードを選ぶ（クリックでは選べない） */
export class ReachSelection {
  usesReach = true;

  cardFromTap() {
    return null;
  }

  cardFromTouch(view) {
    return view.card;
  }
}

/** interaction 名から選び方を作る。register() で追加できる */
export class CardSelectionFactory {
  #creators = new Map();

  constructor({ picker }) {
    this.register('point', () => new PointSelection({ picker }));
    this.register('reach', () => new ReachSelection());
  }

  register(interaction, creator) {
    this.#creators.set(interaction, creator);
  }

  create(interaction) {
    const creator = this.#creators.get(interaction);
    if (!creator) throw new Error(`未知の選び方です: ${interaction}`);
    return creator();
  }
}
