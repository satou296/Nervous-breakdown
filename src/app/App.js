import { MenuEvent } from '../ui/MenuScreen.js';
import { ResultEvent } from '../ui/ResultScreen.js';
import { PauseScreenEvent } from '../ui/PauseScreen.js';
import { PauseButtonEvent } from '../ui/PauseButton.js';
import { SessionEvent } from './GameSession.js';
import { PointerInputEvent } from '../input/PointerInput.js';
import { KeyboardInputEvent } from '../input/KeyboardInput.js';

/**
 * 画面遷移（メニュー → プレイ ⇄ ポーズ → 結果）と、入力のプレイ中セッションへの振り分け。
 * セッションの生成方法は createSession に、ポーズの切り替えは pause（PauseController）に委ねる。
 * Updatable（PausableTimeline の中で動かす）。
 */
export class App {
  #session = null;
  #lastSettings = null;

  constructor({
    menu, result, loading, pauseScreen, pauseButton, pause, pointer, keyboard, rig, pointingHand,
    attract, createSession, resultFormatter, toast, strings, documentRef = document
  }) {
    Object.assign(this, {
      menu, result, loading, pauseScreen, pauseButton, pause, pointer, keyboard, rig, pointingHand,
      attract, createSession, resultFormatter, toast, strings, documentRef
    });
  }

  boot() {
    this.#wireInput();
    this.#wireScreens();
    this.attract.show();
    this.loading.hide();
    this.menu.show();
  }

  /** いま人間が操作できるか（ホバー・手の向き・タップで使う） */
  canHumanAct() {
    return this.isPlaying() && (this.#session?.canHumanAct() ?? false);
  }

  /** 腕を伸ばす操作を受け付けるか（達人モードのプレイ中） */
  canReach() {
    return this.isPlaying() && (this.#session?.usesReach ?? false);
  }

  /** カーソルを合わせたカードを光らせるか */
  canHover() {
    return this.canHumanAct() && (this.#session?.usesHover ?? false);
  }

  /** プレイ画面が前面にあり、ポーズもしていない */
  isPlaying() {
    return this.#session !== null
      && !this.pause.isPaused
      && !this.menu.isOpen
      && !this.result.isOpen;
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
    this.pointer.on(PointerInputEvent.Drag, ({ dx, dy }) => {
      if (this.isPlaying() || this.menu.isOpen) this.rig.lookByPixels(dx, dy);
    });
    this.keyboard.setLookEnabled(() => this.isPlaying());
    this.keyboard.setReachEnabled(() => this.canReach());
    this.keyboard.on(KeyboardInputEvent.Escape, () => this.#togglePause());
    this.pointingHand.setAimProvider(() => (this.canHumanAct() ? this.pointer.ndc : null));
    // 別のタブに切り替えたら自動でポーズ
    this.documentRef.addEventListener('visibilitychange', () => {
      if (this.documentRef.hidden && this.isPlaying()) this.pause.pause();
    });
  }

  #wireScreens() {
    this.menu.on(MenuEvent.Start, settings => this.#startSession(settings));
    this.result.on(ResultEvent.PlayAgain, () => this.#startSession(this.#lastSettings));
    this.result.on(ResultEvent.BackToMenu, () => this.#openMenu());
    this.pauseButton.on(PauseButtonEvent.Press, () => this.#togglePause());
    this.pauseScreen.on(PauseScreenEvent.Resume, () => this.pause.resume());
    this.pauseScreen.on(PauseScreenEvent.Quit, () => this.#openMenu());
  }

  /* ---------------- 遷移 ---------------- */

  #togglePause() {
    if (this.pause.isPaused) this.pause.resume();
    else if (this.isPlaying()) this.pause.pause();
  }

  #startSession(settings) {
    this.#endSession();
    this.attract.hide();
    this.menu.hide();
    this.result.hide();
    this.#lastSettings = settings;
    try {
      const session = this.createSession(settings);
      session.on(SessionEvent.Finished, summary => this.#showResult(summary, session));
      this.#session = session;
      this.pause.activate();
      session.start();
    } catch (err) {
      console.error(err);
      this.toast.show(this.strings.startFailed(err.message), 'bad');
      this.#openMenu();
    }
  }

  #showResult(summary, session) {
    this.pause.reset();
    this.result.show(this.resultFormatter.format(summary, session.mode, session.difficulty));
  }

  #openMenu() {
    this.#endSession();
    this.pause.reset();
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
