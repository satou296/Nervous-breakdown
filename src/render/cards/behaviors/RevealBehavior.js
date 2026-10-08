import { THREE } from '../../../lib/three.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/**
 * めくり状態：くるっと一回転しながら目の前の位置へ移動し、そこで静止する。
 */
export class RevealBehavior {
  pickable = false;
  #t = 0;
  #from = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: 1 };
  #spin = new THREE.Quaternion();

  constructor({ position, quaternion, durationSec, arcHeight = 0.18 }) {
    this.toPosition = position.clone();
    this.toQuaternion = quaternion.clone();
    this.durationSec = durationSec;
    this.arcHeight = arcHeight;
  }

  get isSettled() { return this.#t >= 1; }

  enter(view) {
    const obj = view.object;
    this.#from.position.copy(obj.position);
    this.#from.quaternion.copy(obj.quaternion);
    this.#from.scale = obj.scale.x;
    this.#t = 0;
  }

  update(view) {
    if (this.isSettled) return;
    this.#advance(view);
  }

  #advance(view) {
    const obj = view.object;
    this.#t = Math.min(1, this.#t + view.lastDelta / this.durationSec);
    const e = easeOutCubic(this.#t);
    obj.position.lerpVectors(this.#from.position, this.toPosition, e);
    obj.position.y += Math.sin(Math.PI * e) * this.arcHeight;
    obj.quaternion.slerpQuaternions(this.#from.quaternion, this.toQuaternion, e);
    this.#spin.setFromAxisAngle(UP, (1 - e) * TAU);
    obj.quaternion.multiply(this.#spin);
    obj.scale.setScalar(this.#from.scale + (1 - this.#from.scale) * e);
  }
}
