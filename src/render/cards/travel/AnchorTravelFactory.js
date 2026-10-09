import { StationaryAnchor } from './StationaryAnchor.js';
import { RandomWaypointTravel } from './RandomWaypointTravel.js';

/**
 * 難易度の travel 定義（{ type, ... }、なければ動かない）から AnchorTravel を作る。
 * register() で新しい移動のしかたを追加できる（Open/Closed）。
 */
export class AnchorTravelFactory {
  #creators = new Map();

  /** @param {{ layout: { randomPoint(): {x,y,z} } }} p 目的地は浮遊範囲の中から選ぶ */
  constructor({ layout, random = Math.random }) {
    this.register('stationary', () => new StationaryAnchor());
    this.register('waypoint', spec => new RandomWaypointTravel({
      pickPoint: () => layout.randomPoint(),
      speed: spec.speed,
      random
    }));
  }

  register(type, creator) {
    this.#creators.set(type, creator);
  }

  create(spec) {
    const type = spec?.type ?? 'stationary';
    const creator = this.#creators.get(type);
    if (!creator) throw new Error(`未知の移動のしかたです: ${type}`);
    return creator(spec);
  }
}
