import { THREE } from '../../lib/three.js';

/**
 * カードの浮遊位置を、互いに重なりすぎないようにランダム配置する。
 * 置き場所が見つからなくなったら最小間隔を少しずつ縮める。
 */
export class FloatLayout {
  constructor({ area, random = Math.random }) {
    this.area = area;
    this.random = random;
  }

  sample(count) {
    const { minSpacing } = this.area;
    const points = [];
    let spacing = minSpacing;
    let failures = 0;
    while (points.length < count) {
      const p = this.#randomPoint();
      if (points.every(o => o.distanceTo(p) > spacing)) {
        points.push(p);
        failures = 0;
      } else if (++failures > 300) {
        spacing *= 0.94;
        failures = 0;
      }
    }
    return points;
  }

  #randomPoint() {
    const a = this.area;
    const z = a.nearZ - this.random() * a.depth;
    const depthIn = -z + a.nearZ; // 0 = 手前
    const halfWidth = a.baseHalfWidth + depthIn * a.widthGrowth;
    const height = a.baseHeight + depthIn * a.heightGrowth;
    return new THREE.Vector3(
      (this.random() * 2 - 1) * halfWidth,
      a.minY + this.random() * height,
      z
    );
  }
}
