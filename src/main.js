/**
 * コンポジションルート：すべての部品をここで組み立てて接続する。
 * 各クラスは自分で依存先を new せず、ここから受け取る（依存性の注入）。
 */
import { THREE } from './lib/three.js';
import {
  CARD_SIZE, CARD_TEXTURE_SIZE, DECK_OPTIONS, ATTRACT_DECK_SIZE, TIMING, MOTION,
  FLOAT_AREA, REVEAL_SLOTS, TABLE, CAMERA, POINTER, CPU, PILES
} from './config/GameConfig.js';
import { TEXT } from './config/strings.js';

import { GameLoop } from './core/GameLoop.js';
import { FisherYatesShuffler } from './domain/Shuffler.js';
import { DeckFactory } from './domain/DeckFactory.js';
import { SameRankRule } from './domain/MatchRule.js';
import { getGameMode } from './domain/GameModes.js';

import { RenderContext } from './render/RenderContext.js';
import { Lighting } from './render/environment/Lighting.js';
import { Room } from './render/environment/Room.js';
import { CasinoTable } from './render/environment/CasinoTable.js';
import { DustParticles } from './render/environment/DustParticles.js';
import { CanvasTextureFactory } from './render/textures/CanvasTextureFactory.js';
import { SuitPainter } from './render/textures/SuitPainter.js';
import { CardFacePainter } from './render/textures/CardFacePainter.js';
import { CardBackPainter } from './render/textures/CardBackPainter.js';
import { CardTextureLibrary } from './render/textures/CardTextureLibrary.js';
import { FloatLayout } from './render/cards/FloatLayout.js';
import { CardField } from './render/cards/CardField.js';
import { CardPicker } from './render/cards/CardPicker.js';
import { RevealStage } from './render/cards/RevealStage.js';
import { FirstPersonRig } from './render/player/FirstPersonRig.js';
import { HandModelFactory } from './render/player/HandModelFactory.js';
import { HAND_POSES } from './render/player/HandPoses.js';
import { PointingHand } from './render/player/PointingHand.js';
import { HoldingHand } from './render/player/HoldingHand.js';
import { PileFactory } from './render/piles/PileFactory.js';

import { PointerInput } from './input/PointerInput.js';
import { KeyboardInput } from './input/KeyboardInput.js';
import { KeyboardLookController } from './input/KeyboardLookController.js';

import { Hud } from './ui/Hud.js';
import { Toast } from './ui/Toast.js';
import { MenuScreen } from './ui/MenuScreen.js';
import { ResultScreen } from './ui/ResultScreen.js';
import { ResultFormatter } from './ui/ResultFormatter.js';
import { LoadingScreen } from './ui/LoadingScreen.js';

import { App } from './app/App.js';
import { GameSession } from './app/GameSession.js';
import { AttractMode } from './app/AttractMode.js';
import { HoverHighlighter } from './app/HoverHighlighter.js';
import { ViewportBinder } from './app/ViewportBinder.js';
import { waitForFont } from './app/fontLoader.js';

const $ = id => document.getElementById(id);

async function main() {
  /* ---- 3D の土台 ---- */
  const renderContext = new RenderContext($('stage'));
  const { scene } = renderContext;
  const rig = new FirstPersonRig({ scene, config: CAMERA });
  renderContext.setCamera(rig.camera);
  new ViewportBinder({ renderContext, rig }).bind();

  const textureFactory = new CanvasTextureFactory(renderContext.renderer);
  new Lighting({ scene, camera: rig.camera, table: TABLE });
  new Room({ scene, textureFactory });
  new CasinoTable({ scene, textureFactory, table: TABLE });
  const dust = new DustParticles({ scene });

  /* ---- 手 ---- */
  const handModels = new HandModelFactory();
  const pointingHand = new PointingHand({
    camera: rig.camera,
    model: handModels.create(HAND_POSES.point),
    basePosition: new THREE.Vector3(0.21, -0.25, -0.44)
  });
  const holdingHand = new HoldingHand({
    camera: rig.camera,
    model: handModels.create(HAND_POSES.open, { mirror: true }),
    basePosition: new THREE.Vector3(-0.27, -0.28, -0.48)
  });

  /* ---- カード ---- */
  const suitPainter = new SuitPainter();
  const textures = new CardTextureLibrary({
    textureFactory,
    facePainter: new CardFacePainter({ suitPainter, ...CARD_TEXTURE_SIZE }),
    backPainter: new CardBackPainter({ suitPainter, ...CARD_TEXTURE_SIZE }),
    ...CARD_TEXTURE_SIZE
  });
  const field = new CardField({
    scene, textures, motion: MOTION, cardSize: CARD_SIZE,
    layout: new FloatLayout({ area: FLOAT_AREA })
  });
  const picker = new CardPicker({ camera: rig.camera, field });
  const revealStage = new RevealStage({ camera: rig.camera, slots: REVEAL_SLOTS });
  const pileFactory = new PileFactory({ scene, holdingHand, piles: PILES, table: TABLE });

  /* ---- ルール ---- */
  const deckFactory = new DeckFactory(new FisherYatesShuffler());
  const matchRule = new SameRankRule();

  /* ---- 入力と画面 ---- */
  const pointer = new PointerInput(renderContext.canvas, POINTER);
  const keyboard = new KeyboardInput();
  const hud = new Hud({ root: $('hud'), turnEl: $('turn'), scoresEl: $('scores'), helpEl: $('help') });
  const toast = new Toast($('toast'), { durationMs: TIMING.toastMs });
  const menu = new MenuScreen({ root: $('menu'), startButton: $('startBtn'), defaults: { modeId: 'solo', deckSize: 32 } });
  const result = new ResultScreen({
    root: $('result'), eyebrowEl: $('resEyebrow'), titleEl: $('resTitle'), statsEl: $('resStats'),
    againButton: $('againBtn'), menuButton: $('menuBtn')
  });

  /* ---- アプリ ---- */
  const sessionServices = {
    deckFactory, deckOptions: DECK_OPTIONS, matchRule, field, picker, revealStage,
    pileFactory, hud, toast, timing: TIMING, cpuConfig: CPU
  };
  const app = new App({
    menu, result, toast, strings: TEXT, pointer, keyboard, rig, pointingHand,
    loading: new LoadingScreen($('loading')),
    resultFormatter: new ResultFormatter(),
    attract: new AttractMode({ field, deckFactory, maxRank: DECK_OPTIONS[ATTRACT_DECK_SIZE] }),
    createSession: ({ modeId, deckSize }) =>
      new GameSession({ mode: getGameMode(modeId), deckSize, services: sessionServices })
  });

  /* ---- フレームループ（登録順に更新される） ---- */
  new GameLoop()
    .add(rig)
    .add(new KeyboardLookController({ keyboard, rig }))
    .add(new HoverHighlighter({ pointer, picker, field, isEnabled: () => app.canHumanAct(), cursorTarget: renderContext.canvas }))
    .add(field)
    .add(pointingHand)
    .add(holdingHand)
    .add(dust)
    .add(app)
    .add(renderContext)
    .start();

  await waitForFont('800 92px "Shippori Mincho B1"', 'AJQK', 1800);
  textures.invalidateFaces();
  app.boot();
}

main().catch(err => {
  console.error(err);
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = `起動できませんでした：${err.message}`;
});
