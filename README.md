# 浮遊トランプ神経衰弱（オブジェクト指向版）

宙をくるくる舞うトランプを、一人称視点で指さしてめくる 3D 神経衰弱です（three.js r149）。

## 動かし方

ES Modules を使っているため、`index.html` をダブルクリックで開くだけでは動きません（ブラウザが file:// からのモジュール読み込みを禁止しているため）。ローカルサーバー経由で開いてください。

```bash
cd floating-concentration
python3 -m http.server 8000      # または npx serve .
# → http://localhost:8000 を開く
```

ルール層の単体テスト（ブラウザ不要）：

```bash
npm test        # = node --test tests/*.mjs
```

## 層構成と依存の向き

```
main.js（組み立てのみ）
  └─ app/ ─────────┬─→ domain/   ルール（three.js にも DOM にも依存しない）
                   ├─→ ai/       CPU の思考（domain だけに依存）
                   ├─→ render/   3D の見た目（three.js に依存）
                   ├─→ input/    マウス・キーボード
                   └─→ ui/       HTML の画面
```

依存は常に上から下へ。`domain/` と `ai/` は描画を一切知らないので、Node.js だけでテストできます。

| フォルダ | 主なクラス | 責務 |
|---|---|---|
| `config/` | `GameConfig`, `strings` | 調整値と文言の置き場（マジックナンバー・文字列を排除） |
| `config/` | `Difficulties` | 難易度（漂い方・回転の速さ）の宣言的な定義 |
| `core/` | `EventEmitter`, `GameLoop` | 汎用の仕組み（通知・フレームループ） |
| | `PausableClock`, `PausableTimeline`, `Scheduler` | 一時停止できるゲーム内時計と、それで動く更新・遅延処理 |
| `domain/` | `ConcentrationGame` | 神経衰弱のルールと状態遷移。イベントを発行するだけ |
| | `Card`, `Player`, `TurnOrder`, `GameStats` | カードの状態、得点、手番、手数と時間 |
| | `DeckFactory`, `FisherYatesShuffler` | 山札の生成とシャッフル（乱数は注入可能） |
| | `SameRankRule` | ペア判定（Strategy。差し替え可能） |
| | `GameModes` | 遊び方の宣言的な定義 |
| `ai/` | `CpuMemory`, `MemoryCpuStrategy`, `CpuTurnRunner` | 記憶・選択・時間進行を分離 |
| `render/environment/` | `Room`, `CasinoTable`, `Lighting`, `DustParticles` | 部屋の各要素 |
| `render/textures/` | `SuitPainter`, `CardFacePainter`, `CardBackPainter`, `CardTextureLibrary` | カードの絵柄を描く／キャッシュする |
| `render/cards/` | `CardView` | 1枚の見た目。両面表／両面裏の切り替え |
| | `FloatBehavior`, `SequenceBehavior` | 動き方（State パターン）。浮遊と、手順の連続再生 |
| | `PoseTween`, `Wait` | 手順の部品（目標姿勢への移動・待機） |
| | `CalmDrift`, `RoamingDrift`, `DriftFactory` | 漂い方（Strategy）。むずかしいは範囲内を動き回る |
| | `CardChoreographer` | めくる・取る・宙に戻すの振り付け |
| | `CardField`, `FloatLayout`, `CardPicker`, `RevealStage` | 場の管理、配置と範囲、クリック判定、中央表示と下部の位置 |
| `render/player/` | `FirstPersonRig`, `PointingHand`, `HoldingHand`, `HandModelFactory` | 目線のカメラと両手（右手は伸びた分だけ前へ出て、肩・手首・指先の位置を返す） |
| | `StretchArm` | 伸びた腕（袖）の見た目 |
| | `ArmVisibility` | 伸ばすほど右手と袖を透かす（視界を遮らない） |
| `render/piles/` | `HandPile`, `TablePile`, `PileFactory` | 取ったカードの置き場（Pile インターフェース） |
| `input/` | `PointerInput`, `KeyboardInput`, `KeyboardLookController` | 入力の解釈 |
| | `ReachController` | W / S の長押しを腕の伸び縮みに変換 |
| `physics/` | `ArmReach` | 腕の伸び具合（0〜最大） |
| | `PalmContactSensor` | 手のひらが触れているカードを1枚特定（少し離れるまで触れたままとみなす） |
| | `PalmHold` | 触れているカードをその場に押さえる（クリックの空振り防止） |
| | `ArmCollisionResolver` | 腕に当たった他のカードを押し出して弾く（散らばる） |
| | `Knockback`, `vectorMath` | 弾かれたカードの勢いと減速、線分との距離計算（three.js 非依存でテスト可能） |
| `ui/` | `Hud`, `Toast`, `MenuScreen`, `ResultScreen`, `ResultFormatter` | HTML 表示 |
| | `PauseScreen`, `PauseButton` | ポーズ画面と一時停止ボタン |
| | `ReachMeter` | 達人モードの腕の長さメーター |
| | `ContactIndicator` | 「手のひらがカードに触れています・左クリックでめくる」の表示 |
| `app/` | `App` | 画面遷移（メニュー → プレイ ⇄ ポーズ → 結果） |
| | `PauseController` | ポーズ状態・ゲーム内時計・画面表示をそろえて切り替える |
| | `PointSelection`, `ReachSelection` | カードの選び方（Strategy）。カーソルの先を選ぶ／手のひらが触れているカードを選ぶ（どちらも左クリック） |
| | `ContactFeedback` | 触れているカードを光らせ、表示を出す |
| | `GameSession` | ルールのイベントを演出・HUD・CPU につなぐ仲介役 |

## 1手の流れ

1. `PointerInput` が「タップ」を通知 → `App` → `GameSession.handleTap()`
2. `CardPicker` がカーソル下の `CardView` を特定 → `ConcentrationGame.select(card)`
3. ルールが `CardRevealed` を発行 → `CardChoreographer` が両面を表にし、中央に大きく見せてから画面下部へ寄せる（この間は次を選べない）
4. 2枚目で `SelectionComplete` → 下部に並んだら `resolve()` → `PairMatched` / `PairMissed`
5. 演出が終わったら `endResolution()` → 次の `TurnStarted`（CPU ならば `CpuTurnRunner` が動く）

ルールの判定（`resolve`）と確定（`endResolution`）を分けているので、演出に時間をかけてもルールの整合性は崩れません。

## 難易度

| 難易度 | カードの動き | 選び方 |
|---|---|---|
| ふつう | その場でゆらゆら | カーソルを合わせてクリック |
| むずかしい | 範囲内を上下左右に動き回る | カーソルを合わせてクリック |
| 達人 | 範囲内を動き回る | カーソルで狙い、**W 長押しで腕を伸ばし、S 長押しで縮める**。手のひらがカードに触れると表示が出るので、そこで**左クリック**するとめくれる。腕に当たった他のカードは弾かれて散らばる |

達人の当たり判定は、手のひらを点、腕を「肩→手首」「手首→指先」の2本のカプセル、カードを球として計算しています
（`PalmContactSensor` と `ArmCollisionResolver`）。伸ばした腕と手は半透明になり、視界を遮りにくくしています。
大きさや弾く強さは `config/GameConfig.js` の `ARM` で調整できます。

## ポーズの仕組み

カード・ゲーム進行・判定待ち・CPU の思考は、すべて `PausableTimeline`（ゲーム内時計）の中で動きます。
`PauseController.pause()` で時計を止めると、これらとタイマーがまとめて止まり、再開すると止まった所から続きます。
視点・手・描画は時計の外にあるので、ポーズ画面の背景も描かれ続けます。Esc キー、画面右上のボタン、別タブへの切り替えでポーズします。

## 拡張の例

- **難易度を増やす**：`config/Difficulties.js` にエントリを追加し、`index.html` のメニューに選択肢を足す。新しい動き方は `offsetAt(t, out)` を持つクラスを作り、`DriftFactory.register()` で登録する。
- **めくったときの見せ方を変える**：`CardChoreographer.reveal()` の手順（`PoseTween` / `Wait`）を組み替える。位置と大きさは `config/GameConfig.js` の `REVEAL_LAYOUT`。

- **ペアの条件を変える**：`isMatch(a, b)` を持つクラスを作り、`main.js` の `matchRule` を差し替える（例：`SameRankAndColorRule`）。
- **遊び方を増やす**：`domain/GameModes.js` にエントリを追加し、`index.html` のメニューに選択肢を足す。
- **CPU を強く／弱くする**：`CpuStrategy` インターフェース（`chooseFirst` / `chooseSecond`）を実装した別クラスを `GameSession#setUpCpu` で使う。記憶率は `config/GameConfig.js` の `CPU.rememberChance`。
- **取ったカードの置き場を増やす**：`nextSlot()` を持つ Pile クラスを作り、`PileFactory.register('名前', …)` で登録する。
- **カードの絵柄を変える**：`CardFacePainter` / `CardBackPainter` を差し替える（`paint(ctx, …)` を実装）。
- **テンポや見た目の数値**：すべて `config/GameConfig.js` にあります。
