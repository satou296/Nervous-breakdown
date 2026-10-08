import { THREE } from '../../lib/three.js';
import { lookQuaternion, ndcToCameraDirection } from './handMath.js';

const REST_AIM = Object.freeze({ x: 0.15, y: -0.35 });
const POKE_DECAY = 3.2;
const POKE_REACH = 0.07;

/**
 * 右手：カーソルの方向を人差し指でさし、クリックすると突く。
 * どこを指すかは aimProvider（NDC か null を返す関数）から受け取る。Updatable。
 */
export class PointingHand {
  #poke = 0;
  #aimProvider = () => null;
  #dir = new THREE.Vector3();
  #pos = new THREE.Vector3();
  #target = new THREE.Vector3();
  #quat = new THREE.Quaternion();

  constructor({ camera, model, basePosition, scale = 0.9 }) {
    this.camera = camera;
    this.base = basePosition.clone();
    this.root = new THREE.Group();
    this.root.add(model);
    this.root.scale.setScalar(scale);
    this.root.position.copy(this.base);
    camera.add(this.root);
  }

  setAimProvider(provider) {
    this.#aimProvider = provider;
  }

  poke() {
    this.#poke = 1;
  }

  update(dt, elapsed) {
    const aim = this.#aimProvider() ?? REST_AIM;
    const dir = ndcToCameraDirection(aim, this.camera, this.#dir);

    this.#poke = Math.max(0, this.#poke - dt * POKE_DECAY);
    const reach = this.#poke > 0 ? Math.sin(Math.PI * (1 - this.#poke)) * POKE_REACH : 0;

    this.#pos.set(
      this.base.x + aim.x * 0.06,
      this.base.y + aim.y * 0.05 + Math.sin(elapsed * 1.6) * 0.003,
      this.base.z
    ).addScaledVector(dir, reach);
    this.root.position.lerp(this.#pos, 1 - Math.exp(-dt * 14));

    this.#target.copy(dir).multiplyScalar(1.6);
    lookQuaternion(this.root.position, this.#target, this.#quat);
    this.root.quaternion.slerp(this.#quat, 1 - Math.exp(-dt * 12));
  }
}
