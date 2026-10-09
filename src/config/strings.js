/**
 * 画面に出す文言。表示ロジックから文言を切り離しておく。
 */
export const TEXT = Object.freeze({
  you: 'あなた',
  cpu: 'CPU',
  player: n => `プレイヤー${n}`,
  pickPrompt: 'めくるカードを選んでください',
  turnOf: name => `${name}の番`,
  remaining: n => `残り ${n} ペア`,
  turnsSuffix: n => ` ・ ${n} 手`,
  pairUnit: 'ペア',
  clock: 'タイム',
  pair: 'ペア！',
  pairBy: name => `${name}：ペア！`,
  miss: 'ざんねん',
  startFailed: msg => `開始できませんでした：${msg}`,
  help: {
    point: 'カードをクリック（タップ）でめくる ・ ドラッグか矢印キーで見回す ・ Esc で一時停止',
    reach: 'カーソルで狙い W 長押しで腕を伸ばす ・ S で縮める ・ 手のひらがカードに触れたら左クリックでめくる ・ Esc で一時停止'
  },
  result: {
    clearedEyebrow: 'Cleared',
    gameOverEyebrow: 'Game Over',
    cleared: 'クリア！',
    draw: '引き分け',
    winnerIs: name => `${name}の勝ち！`,
    turns: '手数',
    time: 'タイム',
    misses: 'ミス',
    difficulty: '難易度',
    turnsValue: n => `${n} 手`,
    missesValue: n => `${n} 回`,
    pairsValue: n => `${n} ペア`
  }
});
