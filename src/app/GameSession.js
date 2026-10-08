import { EventEmitter } from '../core/EventEmitter.js';
import { Scheduler } from '../core/Scheduler.js';
import { ConcentrationGame, GameEvent, GamePhase } from '../domain/ConcentrationGame.js';
import { GameStats } from '../domain/GameStats.js';
import { createPlayers, isSolo } from '../domain/GameModes.js';
import { CpuMemory } from '../ai/CpuMemory.js';
import { MemoryCpuStrategy } from '../ai/MemoryCpuStrategy.js';
import { CpuTurnRunner } from '../ai/CpuTurnRunner.js';
import { TEXT } from '../config/strings.js';

export const SessionEvent = Object.freeze({ Finished: 'finished' });

/**
 * 1回分のゲーム進行。
 * ルール（ConcentrationGame）のイベントを受けて、カードの演出・HUD・CPU の手番を
 * 適切なタイミングでつなぐ「仲介役」。ルール判定そのものは行わない。
 *
 * 時間はすべてゲーム内時計（services.clock）で数えるので、ポーズ中は
 * タイマー・判定待ち・CPU の思考がまとめて止まる。Updatable（PausableTimeline の中で動かす）。
 */
export class GameSession extends EventEmitter {
  #scheduler;
  #game;
  #piles;
  #cpuMemory = null;
  #cpuRunner = null;
  #inputLocked = true;
  #revealInProgress = false;

  constructor({ mode, difficulty, deckSize, services }) {
    super();
    this.mode = mode;
    this.difficulty = difficulty;
    this.deckSize = deckSize;
    this.s = services;
    this.#scheduler = new Scheduler(services.clock);
  }

  get game() { return this.#game; }

  start() {
    const { deckFactory, deckOptions, matchRule, field, pileFactory, hud, timing } = this.s;
    const maxRank = deckOptions[this.deckSize];
    if (!maxRank) throw new Error(`選べない枚数です: ${this.deckSize}`);

    this.#game = new ConcentrationGame({
      cards: deckFactory.create(maxRank),
      players: createPlayers(this.mode),
      matchRule,
      stats: new GameStats(() => this.s.clock.nowMs)
    });
    this.#piles = this.mode.seats.map((seat, i) => pileFactory.create(seat.pile, i));
    this.#setUpCpu();
    this.#subscribe();

    field.populate(this.#game.cards, this.difficulty);
    hud.show();
    this.#renderHud();
    this.#scheduler.after(timing.dealSettleMs, () => {
      this.#inputLocked = false;
      this.#game.start();
    });
  }

  /** 人間のプレイヤーがいまカードを選べるか */
  canHumanAct() {
    return !this.#inputLocked
      && !this.#revealInProgress
      && this.#game?.phase === GamePhase.Selecting
      && !this.#game.currentPlayer.isCpu;
  }

  /** 人間が画面上のある位置をタップした */
  handleTap(ndc) {
    if (!this.canHumanAct()) return;
    const view = this.s.picker.pick(ndc);
    if (view) this.#game.select(view.card);
  }

  update() {
    this.#scheduler.update();
    if (this.mode.showClock) this.s.hud.updateClock(this.#game.stats.elapsedMs);
  }

  dispose() {
    this.#scheduler.cancelAll();
    this.#game?.removeAllListeners();
    this.s.field.clear();
    this.s.hud.hide();
  }

  /* ---------------- 準備 ---------------- */

  #setUpCpu() {
    if (!this.#game.players.some(p => p.isCpu)) return;
    const { cpuConfig, matchRule, timing } = this.s;
    this.#cpuMemory = new CpuMemory({ rememberChance: cpuConfig.rememberChance });
    this.#cpuRunner = new CpuTurnRunner({
      strategy: new MemoryCpuStrategy({ memory: this.#cpuMemory, matchRule }),
      scheduler: this.#scheduler,
      timing,
      aim: (card, done) => this.#aimAt(card, done),
      select: card => this.#game.select(card)
    });
  }

  #subscribe() {
    const g = this.#game;
    g.on(GameEvent.CardRevealed, e => this.#onCardRevealed(e));
    g.on(GameEvent.SelectionComplete, () => this.#onSelectionComplete());
    g.on(GameEvent.PairMatched, e => this.#onPairMatched(e));
    g.on(GameEvent.PairMissed, e => this.#onPairMissed(e));
    g.on(GameEvent.TurnStarted, e => this.#onTurnStarted(e));
    g.on(GameEvent.GameOver, e => this.#onGameOver(e));
  }

  /* ---------------- ルールのイベント → 演出 ---------------- */

  #onCardRevealed({ card, slot }) {
    const { choreographer, field } = this.s;
    choreographer.reveal(field.viewOf(card), slot);
    this.#cpuMemory?.observe(card);
    // 大きく表示している間は次のカードを選ばせない（重なって見えなくなるのを防ぐ）
    this.#revealInProgress = true;
    this.#scheduler.after(choreographer.revealDurationMs, () => { this.#revealInProgress = false; });
  }

  #onSelectionComplete() {
    this.#renderHud();
    this.#scheduler.after(this.s.timing.resolveDelayMs, () => this.#game.resolve());
  }

  #onPairMatched({ player, cards }) {
    this.s.toast.show(isSolo(this.mode) ? TEXT.pair : TEXT.pairBy(player.name), 'good');
    cards.forEach(c => this.#cpuMemory?.forget(c));
    this.#scheduler.after(this.s.timing.matchCollectDelayMs, () => {
      const pile = this.#piles[this.#game.currentPlayerIndex];
      cards.forEach(c => this.s.choreographer.collect(this.s.field.viewOf(c), pile.nextSlot()));
      this.#renderHud();
      this.#game.endResolution();
    });
  }

  #onPairMissed({ cards }) {
    this.s.toast.show(TEXT.miss, 'bad');
    this.#scheduler.after(this.s.timing.missHideDelayMs, () => {
      cards.forEach(c => this.s.choreographer.returnToAir(this.s.field.viewOf(c)));
      this.#game.endResolution();
    });
  }

  #onTurnStarted({ player, continued }) {
    this.#renderHud();
    if (this.mode.announceTurns && !continued) this.s.toast.show(TEXT.turnOf(player.name));
    if (player.isCpu) this.#cpuRunner?.play(this.#game);
  }

  #onGameOver(summary) {
    this.#renderHud();
    this.#scheduler.after(this.s.timing.gameOverDelayMs, () => this.emit(SessionEvent.Finished, summary));
  }

  /* ---------------- 補助 ---------------- */

  /** CPU が狙っているカードを少し光らせてから選ぶ */
  #aimAt(card, done) {
    const view = this.s.field.viewOf(card);
    view.setAimed(true);
    this.#scheduler.after(this.s.timing.cpuAimMs, () => {
      view.setAimed(false);
      done();
    });
  }

  #renderHud() {
    const g = this.#game;
    const solo = isSolo(this.mode);
    this.s.hud.render({
      turnLabel: solo ? TEXT.pickPrompt : TEXT.turnOf(g.currentPlayer.name),
      remainingPairs: g.remainingPairs,
      turnCount: this.mode.showTurnCount ? g.stats.turns : null,
      players: g.players.map(p => ({ name: p.name, pairs: p.pairs })),
      activeIndex: solo ? null : g.currentPlayerIndex,
      showClock: this.mode.showClock
    });
  }
}
