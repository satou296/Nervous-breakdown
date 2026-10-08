import { EventEmitter } from '../core/EventEmitter.js';

export const KeyboardInputEvent = Object.freeze({ Escape: 'escape' });

const LOOK_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/**
 * キーボード入力。矢印キーの押下状態と Esc の通知だけを扱う。
 */
export class KeyboardInput extends EventEmitter {
  #pressed = new Set();
  #lookEnabled = () => true;

  constructor(target = window) {
    super();
    target.addEventListener('keydown', this.#onDown);
    target.addEventListener('keyup', e => this.#pressed.delete(e.key));
    target.addEventListener('blur', () => this.#pressed.clear());
  }

  /** 見回しキーを受け付けるかどうか（メニュー表示中は無効にする等） */
  setLookEnabled(predicate) {
    this.#lookEnabled = predicate;
  }

  /** 見回しの入力軸。yaw: 左が +1、pitch: 上が +1 */
  get lookAxis() {
    if (!this.#lookEnabled()) return { yaw: 0, pitch: 0 };
    const has = k => (this.#pressed.has(k) ? 1 : 0);
    return {
      yaw: has('ArrowLeft') - has('ArrowRight'),
      pitch: has('ArrowUp') - has('ArrowDown')
    };
  }

  #onDown = (e) => {
    if (e.key === 'Escape') {
      this.emit(KeyboardInputEvent.Escape);
      return;
    }
    if (LOOK_KEYS.has(e.key) && this.#lookEnabled()) {
      this.#pressed.add(e.key);
      e.preventDefault();
    }
  };
}
