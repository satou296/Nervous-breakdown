/**
 * ゲーム全体の調整値。マジックナンバーはすべてここに集約する。
 */
const prefersReducedMotion = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 3D空間上のカードの大きさ（ポーカーサイズ 63×88mm の比率） */
export const CARD_SIZE = Object.freeze({ width: 0.62, height: 0.868 });

/** カードのテクスチャ解像度 */
export const CARD_TEXTURE_SIZE = Object.freeze({ width: 320, height: 448 });

/** 選べる枚数 → 使う最大ランク（4スート × ランク数 = 枚数） */
export const DECK_OPTIONS = Object.freeze({ 20: 5, 32: 8, 52: 13 });
export const ATTRACT_DECK_SIZE = 52;

/** 進行のテンポ（ミリ秒） */
export const TIMING = Object.freeze({
  dealSettleMs: 900,
  resolveDelayMs: 1050,
  matchCollectDelayMs: 650,
  missHideDelayMs: 1250,
  gameOverDelayMs: 1300,
  cpuThinkMs: 900,
  cpuAimMs: 700,
  cpuBetweenPicksMs: 900,
  toastMs: 1100
});

/** アニメーション */
export const MOTION = Object.freeze({
  scale: prefersReducedMotion ? 0.4 : 1,
  revealSec: 0.8,
  collectSec: 0.85,
  hoverScale: 0.1,
  wander: { x: 0.28, y: 0.2, z: 0.28 },
  followRate: 1.5,
  spinRecoverRate: 0.9
});

/** カードが浮遊する空間（奥ほど広がる台形の箱） */
export const FLOAT_AREA = Object.freeze({
  nearZ: -2.4,
  depth: 5.2,
  baseHalfWidth: 1.5,
  widthGrowth: 0.44,
  minY: 1.2,
  baseHeight: 1.25,
  heightGrowth: 0.22,
  minSpacing: 1.05
});

/** めくったカードを並べる位置（カメラ基準のローカル座標） */
export const REVEAL_SLOTS = Object.freeze([
  Object.freeze([-0.48, 0.04, -2.25]),
  Object.freeze([0.48, 0.04, -2.25])
]);

export const TABLE = Object.freeze({ z: -4.8, top: 0.82, radius: 3.6 });

export const CAMERA = Object.freeze({
  position: [0, 1.55, 0.6],
  fov: 62,
  portraitFov: 74,
  near: 0.04,
  far: 60,
  yawLimit: 1.05,
  pitchMin: -0.6,
  pitchMax: 0.45,
  initialPitch: 0.04,
  dragSensitivity: 0.0035,
  keySpeed: 1.2,
  smoothing: 10
});

export const POINTER = Object.freeze({ dragThresholdPx: 7 });

export const CPU = Object.freeze({ rememberChance: 0.78 });

export const PILES = Object.freeze({
  handCardScale: 0.11,
  handStackStep: 0.0016,
  table: { x: 0.9, z: -7.25, seatSpacingX: -1.8, stackStep: 0.0035 }
});
