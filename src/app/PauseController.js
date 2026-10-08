/**
 * ポーズの状態を一か所で管理する。
 * 止める・再開するときに、ゲーム内時計と画面表示を必ず揃えて切り替える。
 */
export class PauseController {
  #paused = false;

  constructor({ clock, screen, button }) {
    this.clock = clock;
    this.screen = screen;
    this.button = button;
  }

  get isPaused() { return this.#paused; }

  pause() {
    if (this.#paused) return;
    this.#paused = true;
    this.clock.pause();
    this.button.hide();
    this.screen.show();
  }

  resume() {
    if (!this.#paused) return;
    this.#paused = false;
    this.screen.hide();
    this.button.show();
    this.clock.resume();
  }

  /** プレイを終えるとき：ポーズを解除し、ボタンも隠す */
  reset() {
    this.#paused = false;
    this.screen.hide();
    this.button.hide();
    this.clock.resume();
  }

  /** プレイを始めるとき：ボタンを出す */
  activate() {
    this.reset();
    this.button.show();
  }
}
