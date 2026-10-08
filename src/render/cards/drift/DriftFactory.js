import { CalmDrift } from './CalmDrift.js';
import { RoamingDrift } from './RoamingDrift.js';

/**
 * 難易度の drift 定義（{ type, ... }）から DriftPattern を作る。
 * register() で新しい動き方を追加できる（Open/Closed）。
 */
export class DriftFactory {
  #creators = new Map();

  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.register('calm', spec => new CalmDrift({ amplitude: spec.amplitude, random: this.random }));
    this.register('roam', spec => new RoamingDrift({ range: spec.range, speed: spec.speed, random: this.random }));
  }

  register(type, creator) {
    this.#creators.set(type, creator);
  }

  create(spec) {
    const creator = this.#creators.get(spec.type);
    if (!creator) throw new Error(`未知の漂い方です: ${spec.type}`);
    return creator(spec);
  }
}
