import { THREE } from '../../lib/three.js';
import { RevealBehavior } from './behaviors/RevealBehavior.js';
import { CollectBehavior } from './behaviors/CollectBehavior.js';

const HOVER_GLOW = new THREE.Color(0x5a3e10);
const AIM_GLOW = new THREE.Color(0x8a6a20);

/**
 * 1枚のカードの見た目。
 * 両面の板ポリゴンを持ち、「両面とも表」「両面とも裏」を切り替えられる。
 * 動き方は Behavior（State パターン）に委ねる。
 */
export class CardView {
  #behavior = null;
  #hoverTarget = 0;
  #aimed = false;
  #elapsed = 0;

  constructor({ card, textures, geometry, floatBehavior, motion }) {
    this.card = card;
    this.textures = textures;
    this.floatBehavior = floatBehavior;
    this.motion = motion;
    this.hover = 0;
    this.lastDelta = 0;

    this.materials = [0, 1].map(() => new THREE.MeshStandardMaterial({
      map: textures.back, roughness: 0.48, metalness: 0, alphaTest: 0.5, emissive: 0x000000
    }));
    const front = new THREE.Mesh(geometry, this.materials[0]);
    const back = new THREE.Mesh(geometry, this.materials[1]);
    front.position.z = 0.0025;
    back.position.z = -0.0025;
    back.rotation.y = Math.PI;
    this.meshes = [front, back];
    for (const mesh of this.meshes) {
      mesh.castShadow = true;
      mesh.userData.cardView = this;
    }
    this.object = new THREE.Group();
    this.object.add(front, back);
  }

  get isPickable() { return this.#behavior?.pickable === true; }

  /* ---- 見た目の面 ---- */
  showFaceOnBothSides() {
    const face = this.textures.face(this.card.rank, this.card.suit);
    this.materials.forEach(m => { m.map = face; });
  }

  showBackOnBothSides() {
    this.materials.forEach(m => { m.map = this.textures.back; });
  }

  /* ---- 動きの切り替え ---- */
  float({ fromRest = false } = {}) {
    this.#setBehavior(this.floatBehavior, { fromRest });
  }

  revealTo(pose) {
    this.#setBehavior(new RevealBehavior({ ...pose, durationSec: this.motion.revealSec }));
  }

  collectInto(slot) {
    this.#setBehavior(new CollectBehavior({ slot, durationSec: this.motion.collectSec }));
  }

  /* ---- 強調表示 ---- */
  setHovered(hovered) { this.#hoverTarget = hovered ? 1 : 0; }
  setAimed(aimed) { this.#aimed = aimed; }

  update(dt, elapsed) {
    this.lastDelta = dt;
    this.#elapsed = elapsed;
    const target = this.isPickable ? this.#hoverTarget : 0;
    this.hover += (target - this.hover) * (1 - Math.exp(-dt * 12));
    this.#behavior?.update(this, dt, elapsed);
    this.#updateGlow();
  }

  dispose() {
    this.object.parent?.remove(this.object);
    this.materials.forEach(m => m.dispose());
  }

  #setBehavior(behavior, options) {
    this.#behavior = behavior;
    behavior.enter(this, options);
  }

  #updateGlow() {
    let strength = 0;
    let color = HOVER_GLOW;
    if (this.isPickable) {
      if (this.#aimed) {
        color = AIM_GLOW;
        strength = 0.6 + 0.4 * Math.sin(this.#elapsed * 14);
      } else {
        strength = this.hover * 0.8;
      }
    }
    for (const m of this.materials) m.emissive.copy(color).multiplyScalar(strength);
  }
}
