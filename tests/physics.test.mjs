// 腕の伸縮・当たり判定・カードの選び方の単体テスト：npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArmReach } from '../src/physics/ArmReach.js';
import { Knockback } from '../src/physics/Knockback.js';
import { closestPointOnSegment } from '../src/physics/vectorMath.js';
import { ArmContactSystem } from '../src/physics/ArmContactSystem.js';
import { PointSelection, ReachSelection } from '../src/app/selection/CardSelectionMethods.js';
import { DIFFICULTIES } from '../src/config/Difficulties.js';

const v = (x, y, z) => ({ x, y, z });
const CONFIG = {
  armRadius: 0.1, cardRadius: 0.35, touchRadius: 0.5,
  impulseBase: 2, impulseFromSpeed: 0.5, maxImpulse: 7, spinKick: 2
};

/** CardView の代わり：位置と、押された／弾かれた記録だけ持つ */
function fakeCard(name, position) {
  return {
    name, isPickable: true, object: { position: { ...position } },
    pushes: [], knocks: [],
    push(o) { this.pushes.push(o); this.object.position.x += o.x; this.object.position.y += o.y; this.object.position.z += o.z; },
    knock(i, s) { this.knocks.push({ i, s }); }
  };
}

function makeSystem(cards, tip, onTouch = () => true) {
  const points = { shoulder: v(0, 0, 0), wrist: v(0, 0, -1), tip };
  return new ArmContactSystem({
    arm: { contactPoints: () => points },
    field: { views: cards },
    isEnabled: () => true,
    onTouch,
    config: CONFIG
  });
}

test('W で伸び、S で縮み、0〜最大の範囲に収まる', () => {
  const reach = new ArmReach({ maxReach: 9, extendSpeed: 3, relaxSpeed: 6 });
  reach.adjust(+1, 1);
  assert.equal(reach.length, 3);
  reach.adjust(+1, 10);
  assert.equal(reach.length, 9);
  reach.adjust(-1, 1);
  assert.equal(reach.length, 6);
  reach.adjust(-1, 10);
  assert.equal(reach.length, 0);
});

test('線分上の最も近い点', () => {
  const out = v(0, 0, 0);
  closestPointOnSegment(v(1, 5, 0), v(0, 0, 0), v(0, 10, 0), out);
  assert.deepEqual(out, v(0, 5, 0));
  closestPointOnSegment(v(0, -3, 0), v(0, 0, 0), v(0, 10, 0), out);
  assert.deepEqual(out, v(0, 0, 0));
});

test('弾かれたカードは動き、やがて止まる', () => {
  const k = new Knockback({ drag: 2 });
  k.apply(v(3, 0, 0), 1);
  let moved = 0;
  for (let i = 0; i < 300; i++) moved += k.step(1 / 60).x;
  assert.ok(moved > 1, '押された方向へ進む');
  assert.equal(k.isMoving, false);
});

test('指先が触れたカードは選ばれ、弾かれない', () => {
  const target = fakeCard('target', v(0, 0, -3.2));
  const touched = [];
  makeSystem([target], v(0, 0, -3), view => { touched.push(view.name); return true; }).update(1 / 60);
  assert.deepEqual(touched, ['target']);
  assert.equal(target.knocks.length, 0);
});

test('腕の途中に当たったカードは押し出され、弾かれる（散らばる）', () => {
  const side = fakeCard('side', v(0.2, 0, -2)); // 指先からは遠いが、腕（肩→指先）のすぐ横
  makeSystem([side], v(0, 0, -4)).update(1 / 60);
  assert.equal(side.knocks.length, 1);
  assert.ok(side.knocks[0].i.x > 0, '腕から離れる向き（+x）へ弾く');
  assert.ok(side.object.position.x >= 0.45 - 1e-9, 'めり込まない位置まで押し出す');
});

test('触れても受け付けられなかったカードは、弾かれる', () => {
  const card = fakeCard('busy', v(0, 0.05, -3.1));
  makeSystem([card], v(0, 0, -3), () => false).update(1 / 60);
  assert.equal(card.knocks.length, 1);
});

test('当たり続けていても、弾くのは当たった瞬間の1回だけ', () => {
  const card = fakeCard('stay', v(0.1, 0, -2));
  const system = makeSystem([card], v(0, 0, -4));
  system.update(1 / 60);
  card.object.position.x = 0.1; // まだめり込んでいる
  system.update(1 / 60);
  assert.equal(card.knocks.length, 1);
  assert.equal(card.pushes.length, 2);
});

test('達人だけが「触れて選ぶ」、他はクリックで選ぶ', () => {
  assert.equal(DIFFICULTIES.expert.interaction, 'reach');
  assert.equal(DIFFICULTIES.hard.interaction, 'point');
  const card = { id: 1 };
  const point = new PointSelection({ picker: { pick: () => ({ card }) } });
  assert.equal(point.cardFromTap({ x: 0, y: 0 }), card);
  assert.equal(point.cardFromTouch({ card }), null);
  const reach = new ReachSelection();
  assert.equal(reach.cardFromTap({ x: 0, y: 0 }), null, '達人ではクリックで選べない');
  assert.equal(reach.cardFromTouch({ card }), card);
});
