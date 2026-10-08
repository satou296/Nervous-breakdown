import { THREE } from '../../lib/three.js';
import { CardView } from './CardView.js';
import { FloatBehavior } from './behaviors/FloatBehavior.js';

const TAU = Math.PI * 2;

/**
 * 場に浮かぶカードの見た目の集合。
 * ルール上の Card から CardView を引けるようにし、配る・片付ける・毎フレーム更新するを担う。
 */
export class CardField {
  #views = new Map();
  #hovered = null;

  constructor({ scene, textures, layout, motion, cardSize, random = Math.random }) {
    this.scene = scene;
    this.textures = textures;
    this.layout = layout;
    this.motion = motion;
    this.random = random;
    this.geometry = new THREE.PlaneGeometry(cardSize.width, cardSize.height);
  }

  get views() { return [...this.#views.values()]; }

  populate(cards) {
    this.clear();
    const anchors = this.layout.sample(cards.length);
    cards.forEach((card, i) => {
      const view = new CardView({
        card,
        textures: this.textures,
        geometry: this.geometry,
        motion: this.motion,
        floatBehavior: new FloatBehavior({ anchor: anchors[i], motion: this.motion, random: this.random })
      });
      this.#dropFromAbove(view, anchors[i]);
      view.float();
      this.scene.add(view.object);
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
