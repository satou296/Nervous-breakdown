/**
 * 難易度の定義。カードの漂い方（drift）と回転の速さを宣言的に決める。
 * 新しい難易度は、ここにエントリを追加するだけで増やせる。
 *
 * drift.type: 'calm'  … 定位置のまわりで小さく揺れる
 *             'roam'  … 決められた範囲の中を上下左右に大きく動き回る
 */
export const DIFFICULTIES = Object.freeze({
  normal: Object.freeze({
    id: 'normal',
    label: 'ふつう',
    drift: Object.freeze({ type: 'calm', amplitude: { x: 0.28, y: 0.2, z: 0.28 } }),
    spinScale: 1
  }),
  hard: Object.freeze({
    id: 'hard',
    label: 'むずかしい',
    drift: Object.freeze({
      type: 'roam',
      range: { x: 1.15, y: 0.55, z: 0.7 },   // 定位置からこの距離までの範囲で動き回る
      speed: { min: 0.28, max: 0.5 }         // 動きの速さ（周波数 rad/s の目安）
    }),
    spinScale: 1.35
  })
});

export const DEFAULT_DIFFICULTY_ID = 'normal';

export function getDifficulty(id) {
  const difficulty = DIFFICULTIES[id];
  if (!difficulty) throw new Error(`未知の難易度です: ${id}`);
  return difficulty;
}
