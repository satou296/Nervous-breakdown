/**
 * 手のひらが触れているカードを押さえて、その場に止める。Updatable。
 * 触れている間に漂って離れてしまい、クリックが空振りするのを防ぐ。
 */
export class PalmHold {
  #held = null;

  constructor({ sensor }) {
    this.sensor = sensor;
  }

  update() {
    const view = this.sensor.current;
    if (view === this.#held) return;
    this.#held?.setHeld(false);
    view?.setHeld(true);
    this.#held = view;
  }
}
