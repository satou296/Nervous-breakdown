import { MenuEvent } from '../ui/MenuScreen.js';
import { ResultEvent } from '../ui/ResultScreen.js';
import { SessionEvent } from './GameSession.js';
import { PointerInputEvent } from '../input/PointerInput.js';
import { KeyboardInputEvent } from '../input/KeyboardInput.js';

/**
 * 画面遷移（メニュー → プレイ → 結果）と、入力のプレイ中セッションへの振り分け。
 * セッションの生成方法は createSession に委ねる。Updatable。
 */
export class App {
  #session = null;
  #lastSettings = null;

  constructor({ menu, result, loading, pointer, keyboard, rig, pointingHand, attract, createSession, resultFormatter, toast, strings }) {
    Object.assign(this, { menu, result, loading, pointer, keyboard, rig, pointingHand, attract, createSession, resultFormatter, toast, strings });
  }

  boot() {
    this.#wireInput();
    this.#wireScreens();
    this.attract.show();
    this.loading.hide();
    this.menu.show();
  }

  /** いま人間が操作できるか（ホバー・手の向き・キー操作で使う） */
  canHumanAct() {
    return this.#session?.canHumanAct() ?? false;
  }

  isPlaying() {
    return this.#session !== null && !this.menu.isOpen && !this.result.isOpen;
  }

  update(dt, elapsed) {
    this.#session?.update(dt, elapsed);
  }

  /* ---------------- 配線 ---------------- */

  #wireInput() {
    this.pointer.on(PointerInputEvent.Tap, ndc => {
      if (!this.isPlaying()) return;
      this.pointingHand.poke();
      this.#session.handleTap(ndc);
    });
    this.pointer.on(PointerInputEvent.Drag, ({ dx, dy }) => this.rig.lookByPixels(dx, dy));
    this.keyboard.setLookEnabled(() => this.isPlaying());
    this.keyboard.on(KeyboardInputEvent.Escape, () => {
      if (this.isPlaying()) this.#openMenu();
    });
    this.pointingHand.setAimProvider(() => (this.canHumanAct() ? this.pointer.ndc : null));
  }

  #wireScreens() {
    this.menu.on(MenuEvent.Start, settings => this.#startSession(settings));
    this.result.on(ResultEvent.PlayAgain, () => this.#startSession(this.#lastSettings));
    this.result.on(ResultEvent.BackToMenu, () => this.#openMenu());
  }

  /* ---------------- 遷移 ---------------- */

  #startSession(settings) {
    this.#endSession();
    this.attract.hide();
    this.menu.hide();
    this.result.hide();
    this.#lastSettings = settings;
    try {
      const session = this.createSession(settings);
      session.on(SessionEvent.Finished, summary => this.#showResult(summary, session.mode));
      this.#session = session;
      session.start();
    } catch (err) {
      console.error(err);
      this.toast.show(this.strings.startFailed(err.message), 'bad');
      this.#openMenu();
    }
  }

  #showResult(summary, mode) {
    this.result.show(this.resultFormatter.format(summary, mode));
  }

  #openMenu() {
    this.#endSession();
    this.result.hide();
    this.attract.show();
    this.menu.show();
  }

  #endSession() {
    if (!this.#session) return;
    this.#session.removeAllListeners();
    this.#session.dispose();
    this.#session = null;
  }
}
