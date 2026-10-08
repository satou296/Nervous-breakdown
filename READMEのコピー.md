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
| `core/` | `EventEmitter`, `Scheduler`, `GameLoop` | 汎用の仕組み（通知・取消可能な遅延・フレームループ） |
| `domain/` | `ConcentrationGame` | 神経衰弱のルールと状態遷移。イベントを発行するだけ |
| | `Card`, `Player`, `TurnOrder`, `GameStats` | カードの状態、得点、手番、手数と時間 |
| | `DeckFactory`, `FisherYatesShuffler` | 山札の生成とシャッフル（乱数は注入可能） |
| | `SameRankRule` | ペア判定（Strategy。差し替え可能） |
| | `GameModes` | 遊び方の宣言的な定義 |
| `ai/` | `CpuMemory`, `MemoryCpuStrategy`, `CpuTurnRunner` | 記憶・選択・時間進行を分離 |
| `render/environment/` | `Room`, `CasinoTable`, `Lighting`, `DustParticles` | 部屋の各要素 |
| `render/textures/` | `SuitPainter`, `CardFacePainter`, `CardBackPainter`, `CardTextureLibrary` | カードの絵柄を描く／キャッシュする |
| `render/cards/` | `CardView` | 1枚の見た目。両面表／両面裏の切り替え |
| | `FloatBehavior`, `RevealBehavior`, `CollectBehavior` | 動き方（State パターン） |
| | `CardField`, `FloatLayout`, `CardPicker`, `RevealStage` | 場の管理、配置、クリック判定、めくった位置 |
| `render/player/` | `FirstPersonRig`, `PointingHand`, `HoldingHand`, `HandModelFactory` | 目線のカメラと両手 |
| `render/piles/` | `HandPile`, `TablePile`, `PileFactory` | 取ったカードの置き場（Pile インターフェース） |
| `input/` | `PointerInput`, `KeyboardInput`, `KeyboardLookController` | 入力の解釈 |
| `ui/` | `Hud`, `Toast`, `MenuScreen`, `ResultScreen`, `ResultFormatter` | HTML 表示 |
| `app/` | `App` | 画面遷移（メニュー → プレイ → 結果） |
| | `GameSession` | ルールのイベントを演出・HUD・CPU につなぐ仲介役 |

## 1手の流れ

1. `PointerInput` が「タップ」を通知 → `App` → `GameSession.handleTap()`
2. `CardPicker` がカーソル下の `CardView` を特定 → `ConcentrationGame.select(card)`
3. ルールが `CardRevealed` を発行 → `GameSession` が `CardView` を両面表にして `RevealBehavior` へ
4. 2枚目で `SelectionComplete` → 少し待って `resolve()` → `PairMatched` / `PairMissed`
5. 演出が終わったら `endResolution()` → 次の `TurnStarted`（CPU ならば `CpuTurnRunner` が動く）

ルールの判定（`resolve`）と確定（`endResolution`）を分けているので、演出に時間をかけてもルールの整合性は崩れません。

## 拡張の例

- **ペアの条件を変える**：`isMatch(a, b)` を持つクラスを作り、`main.js` の `matchRule` を差し替える（例：`SameRankAndColorRule`）。
- **遊び方を増やす**：`domain/GameModes.js` にエントリを追加し、`index.html` のメニューに選択肢を足す。
- **CPU を強く／弱くする**：`CpuStrategy` インターフェース（`chooseFirst` / `chooseSecond`）を実装した別クラスを `GameSession#setUpCpu` で使う。記憶率は `config/GameConfig.js` の `CPU.rememberChance`。
- **取ったカードの置き場を増やす**：`nextSlot()` を持つ Pile クラスを作り、`PileFactory.register('名前', …)` で登録する。
- **カードの絵柄を変える**：`CardFacePainter` / `CardBackPainter` を差し替える（`paint(ctx, …)` を実装）。
- **テンポや見た目の数値**：すべて `config/GameConfig.js` にあります。
