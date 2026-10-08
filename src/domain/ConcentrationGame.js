import { EventEmitter } from '../core/EventEmitter.js';
import { TurnOrder } from './TurnOrder.js';

export const GameEvent = Object.freeze({
  CardRevealed: 'cardRevealed',
  SelectionComplete: 'selectionComplete',
  PairMatched: 'pairMatched',
  PairMissed: 'pairMissed',
  TurnStarted: 'turnStarted',
  GameOver: 'gameOver'
});

export const GamePhase = Object.freeze({
  Waiting: 'waiting',
  Selecting: 'selecting',
  Resolving: 'resolving',
  Finished: 'finished'
});

const PICKS_PER_TURN = 2;

/**
 * 神経衰弱のルールエンジン。
 * 描画・タイミング・入力は一切知らず、状態遷移とイベント発行だけを行う。
 *
 *   start() → [select() ×2] → resolve() → endResolution() → …
 *
 * resolve（判定）と endResolution（結果の確定・手番移動）を分けているのは、
 * 演出側が「判定を見せる時間」を自由に取れるようにするため。
 */
export class ConcentrationGame extends EventEmitter {
  #cards;
  #turns;
  #rule;
  #stats;
  #selection = [];
  #phase = GamePhase.Waiting;
  #pendingOutcome = null;

  constructor({ cards, players, matchRule, stats }) {
    super();
    if (cards.length % PICKS_PER_TURN !== 0) throw new Error('カード枚数は偶数である必要があります');
    this.#cards = Object.freeze([...cards]);
    this.#turns = new TurnOrder(players);
    this.#rule = matchRule;
    this.#stats = stats;
  }

  get cards() { return this.#cards; }
  get players() { return this.#turns.players; }
  get currentPlayer() { return this.#turns.current; }
  get currentPlayerIndex() { return this.#turns.currentIndex; }
  get phase() { return this.#phase; }
  get stats() { return this.#stats; }
  get selection() { return [...this.#selection]; }
  get remainingPairs() { return this.#cards.filter(c => c.isInPlay).length / PICKS_PER_TURN; }
  get totalPairs() { return this.#cards.length / PICKS_PER_TURN; }

  start() {
    if (this.#phase !== GamePhase.Waiting) return;
    this.#phase = GamePhase.Selecting;
    this.emit(GameEvent.TurnStarted, { player: this.currentPlayer, continued: false });
  }

  canSelect(card) {
    return this.#phase === GamePhase.Selecting
      && card.isSelectable
      && this.#selection.length < PICKS_PER_TURN;
  }

  select(card) {
    if (!this.canSelect(card)) return false;
    this.#stats.markStarted();
    card.turnUp();
    this.#selection.push(card);
    this.emit(GameEvent.CardRevealed, {
      card,
      slot: this.#selection.length - 1,
      player: this.currentPlayer
    });
    if (this.#selection.length === PICKS_PER_TURN) {
      this.#phase = GamePhase.Resolving;
      this.#stats.countTurn();
      this.emit(GameEvent.SelectionComplete, { cards: this.selection, player: this.currentPlayer });
    }
    return true;
  }

  /** 2枚がペアかを判定し、ペアなら得点を与える */
  resolve() {
    if (this.#phase !== GamePhase.Resolving || this.#pendingOutcome) return null;
    const [a, b] = this.#selection;
    const player = this.currentPlayer;
    const matched = this.#rule.isMatch(a, b);
    if (matched) {
      a.markMatched();
      b.markMatched();
      player.awardPair();
    }
    this.#pendingOutcome = Object.freeze({ matched, player, cards: Object.freeze([a, b]) });
    this.emit(matched ? GameEvent.PairMatched : GameEvent.PairMissed, this.#pendingOutcome);
    return this.#pendingOutcome;
  }

  /** 判定結果を確定し、次の手番（または終了）へ進める */
  endResolution() {
    const outcome = this.#pendingOutcome;
    if (!outcome) return;
    this.#pendingOutcome = null;
    if (!outcome.matched) outcome.cards.forEach(c => c.turnDown());
    this.#selection = [];

    if (this.remainingPairs === 0) {
      this.#phase = GamePhase.Finished;
      this.#stats.markEnded();
      this.emit(GameEvent.GameOver, this.summary());
      return;
    }
    if (!outcome.matched) this.#turns.advance();
    this.#phase = GamePhase.Selecting;
    this.emit(GameEvent.TurnStarted, { player: this.currentPlayer, continued: outcome.matched });
  }

  summary() {
    const players = this.players;
    const best = Math.max(...players.map(p => p.pairs));
    const winners = players.filter(p => p.pairs === best);
    return Object.freeze({
      players,
      winners,
      isDraw: players.length > 1 && winners.length > 1,
      turns: this.#stats.turns,
      elapsedMs: this.#stats.elapsedMs,
      totalPairs: this.totalPairs
    });
  }
}
