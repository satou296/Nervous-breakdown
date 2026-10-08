import { THREE } from '../../../lib/three.js';

const TAU = Math.PI * 2;

/**
 * 浮遊状態：定位置のまわりをゆらゆら漂いながら回転する。
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

  constructor({ anchor, motion, random = Math.random }) {
    const signed = () => (random() < 0.5 ? -1 : 1);
    this.anchor = anchor.clone();
    this.motion = motion;
    this.axis = new THREE.Vector3((random() - 0.5) * 0.7, 1, (random() - 0.5) * 0.7).normalize();
    this.spinSpeed = (1.1 + random() * 1.3) * signed();
    this.tumbleSpeed = (0.25 + random() * 0.5) * signed();
    this.frequency = [0.25 + random() * 0.35, 0.3 + random() * 0.4, 0.2 + random() * 0.35];
    this.phase = [random() * TAU, random() * TAU, random() * TAU];
    this.spin = 1;
  }

  /** @param {{ fromRest?: boolean }} options 静止状態から戻るときは回転を0から立ち上げる */
  enter(_view, { fromRest = false } = {}) {
    if (fromRest) this.spin = 0;
  }

  update(view, dt, t) {
    const { wander, followRate, spinRecoverRate, scale, hoverScale } = this.motion;
    const obj = view.object;
    this.#target.set(
      this.anchor.x + Math.sin(t * this.frequency[0] + this.phase[0]) * wander.x,
      this.anchor.y + Math.sin(t * this.frequency[1] + this.phase[1]) * wander.y,
      this.anchor.z + Math.cos(t * this.frequency[2] + this.phase[2]) * wander.z
    );
    obj.position.lerp(this.#target, 1 - Math.exp(-dt * followRate));
    this.spin += (1 - this.spin) * (1 - Math.exp(-dt * spinRecoverRate));
    obj.rotateOnAxis(this.axis, this.spinSpeed * dt * this.spin * scale);
    obj.rotateX(this.tumbleSpeed * dt * this.spin * scale);
    obj.scale.setScalar(1 + view.hover * hoverScale);
  }
}
