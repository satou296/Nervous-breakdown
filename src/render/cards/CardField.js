import { THREE } from '../../lib/three.js';
import { CardView } from './CardView.js';
import { FloatBehavior } from './behaviors/FloatBehavior.js';

const TAU = Math.PI * 2;

/**
 * 場に浮かぶカードの見た目の集合。
 * ルール上の Card から CardView を引けるようにし、配る・片付ける・毎フレーム更新するを担う。
 * どう漂うかは、配るときに渡された難易度（drift / travel / spinScale）で決まる。
 */
export class CardField {
  #views = new Map();
  #hovered = null;

  constructor({ scene, textures, layout, driftFactory, travelFactory, motion, cardSize, knockDrag, random = Math.random }) {
    this.scene = scene;
    this.travelFactory = travelFactory;
    this.knockDrag = knockDrag;
    this.textures = textures;
    this.layout = layout;
    this.driftFactory = driftFactory;
    this.motion = motion;
    this.random = random;
    this.geometry = new THREE.PlaneGeometry(cardSize.width, cardSize.height);
    this.bounds = layout.bounds;
  }

  get views() { return [...this.#views.values()]; }

  /**
   * @param {Card[]} cards
   * @param {{ drift: object, travel?: object, spinScale: number }} difficulty
   */
  populate(cards, difficulty) {
    this.clear();
    const anchors = this.layout.sample(cards.length);
    cards.forEach((card, i) => {
      const view = new CardView({
        card,
        textures: this.textures,
        geometry: this.geometry,
        floatBehavior: new FloatBehavior({
          anchor: anchors[i],
          drift: this.driftFactory.create(difficulty.drift),
          travel: this.travelFactory.create(difficulty.travel),
          home: this.scene,
          bounds: this.bounds,
          motion: this.motion,
          spinScale: difficulty.spinScale,
          knockDrag: this.knockDrag,
          random: this.random
        })
      });
      this.scene.add(view.object);
      this.#dropFromAbove(view, anchors[i]);
      view.float();
      this.#views.set(card, view);
    });
  }

  viewOf(card) {
    const view = this.#views.get(card);
    if (!view) throw new Error(`カード ${card.id} の見た目がありません`);
    return view;
  }

  /** レイキャスト対象（いま選べるカードのメッシュだけ） */
  pickTargets() {
    const meshes = [];
    for (const view of this.#views.values()) {
      if (view.isPickable) meshes.push(...view.meshes);
    }
    return meshes;
  }

  setHovered(view) {
    if (this.#hovered === view) return;
    this.#hovered?.setHovered(false);
    this.#hovered = view;
    view?.setHovered(true);
  }

  update(dt, elapsed) {
    for (const view of this.#views.values()) view.update(dt, elapsed);
  }

  clear() {
    this.#hovered = null;
    this.#views.forEach(v => v.dispose());
    this.#views.clear();
  }

  /** 配るときは定位置の少し上から降らせる */
  #dropFromAbove(view, anchor) {
    view.object.position.copy(anchor).add(new THREE.Vector3(0, 3 + this.random() * 2, 0));
    view.object.rotation.set(this.random() * TAU, this.random() * TAU, 0);
  }
}
