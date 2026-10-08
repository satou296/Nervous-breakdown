import { THREE } from '../../../lib/three.js';

const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * 獲得状態：取ったプレイヤーの置き場（手のひら・テーブル）へ飛んでいき、積まれる。
 * slot = { parent: Object3D, position: Vector3, quaternion: Quaternion, scale: number }
 */
export class CollectBehavior {
  pickable = false;
  #t = 0;
  #from = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: 1 };

  constructor({ slot, durationSec }) {
    this.slot = slot;
    this.durationSec = durationSec;
  }

  enter(view) {
    const obj = view.object;
    this.slot.parent.attach(obj); // ワールド上の見た目を保ったまま親を付け替える
    this.#from.position.copy(obj.position);
    this.#from.quaternion.copy(obj.quaternion);
    this.#from.scale = obj.scale.x;
    this.#t = 0;
  }

  update(view) {
    if (this.#t >= 1) return;
    const obj = view.object;
    this.#t = Math.min(1, this.#t + view.lastDelta / this.durationSec);
    const e = easeInOutCubic(this.#t);
    obj.position.lerpVectors(this.#from.position, this.slot.position, e);
    obj.quaternion.slerpQuaternions(this.#from.quaternion, this.slot.quaternion, e);
    obj.scale.setScalar(this.#from.scale + (this.slot.scale - this.#from.scale) * e);
  }
}
