import { THREE } from '../../../lib/three.js';

/**
 * 浮遊状態：定位置（anchor）＋漂い方（drift）の位置へ向かいながら回転する。
 * カードごとに1つ持ち、裏に戻ったときに再利用する。
 *
 * Behavior インターフェース：
 *   pickable: boolean
 *   enter(view, options?)
 *   update(view, dt, elapsed)
 */
export class FloatBehavior {
  pickable = true;
  #target = new THREE.Vector3();
  #offset = new THREE.Vector3();

  /**
   * @param {object} p
   * @param {THREE.Vector3} p.anchor   定位置
   * @param {object} p.drift           DriftPattern（offsetAt を持つ）
   * @param {THREE.Object3D} p.home    浮遊中の親（シーン）
   * @param {THREE.Box3} [p.bounds]    はみ出してはいけない範囲
   */
  constructor({ anchor, drift, home, bounds = null, motion, spinScale = 1, random = Math.random }) {
    const signed = () => (random() < 0.5 ? -1 : 1);
    this.anchor = anchor.clone();
    this.drift = drift;
    this.home = home;
    this.bounds = bounds;
    this.motion = motion;
    this.axis = new THREE.Vector3((random() - 0.5) * 0.7, 1, (random() - 0.5) * 0.7).normalize();
    this.spinSpeed = (1.1 + random() * 1.3) * signed() * spinScale;
    this.tumbleSpeed = (0.25 + random() * 0.5) * signed() * spinScale;
    this.spin = 1;
  }

  /** @param {{ fromRest?: boolean }} options 静止状態から戻るときは回転を0から立ち上げる */
  enter(view, { fromRest = false } = {}) {
    if (view.object.parent !== this.home) this.home.attach(view.object);
    if (fromRest) this.spin = 0;
  }

  update(view, dt, t) {
    const { followRate, spinRecoverRate, scale, hoverScale, returnScaleRate } = this.motion;
    const obj = view.object;

    this.#target.copy(this.anchor).add(this.drift.offsetAt(t, this.#offset));
    if (this.bounds) this.bounds.clampPoint(this.#target, this.#target);
    obj.position.lerp(this.#target, 1 - Math.exp(-dt * followRate));

    this.spin += (1 - this.spin) * (1 - Math.exp(-dt * spinRecoverRate));
    obj.rotateOnAxis(this.axis, this.spinSpeed * dt * this.spin * scale);
    obj.rotateX(this.tumbleSpeed * dt * this.spin * scale);

    const targetScale = 1 + view.hover * hoverScale;
    const s = obj.scale.x + (targetScale - obj.scale.x) * (1 - Math.exp(-dt * returnScaleRate * 3));
    obj.scale.setScalar(s);
  }
}
