import { THREE } from '../../lib/three.js';

/**
 * めくったカードを並べる「目の前の位置」を計算する。
 * 位置はめくった瞬間のカメラの向きを基準に決める。
 */
export class RevealStage {
  constructor({ camera, slots }) {
    this.camera = camera;
    this.slots = slots;
  }

  poseFor(slotIndex) {
    const local = this.slots[slotIndex % this.slots.length];
    return {
      position: this.camera.localToWorld(new THREE.Vector3(...local)),
      quaternion: this.camera.quaternion.clone()
    };
  }
}
