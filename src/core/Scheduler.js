/**
 * 遅延実行をまとめて取り消せるタイマー。
 * cancelAll() 以前に予約された処理は、時間が来ても実行されない。
 */
export class Scheduler {
  #generation = 0;
  #timers = new Set();

  after(ms, task) {
    const generation = this.#generation;
    const id = setTimeout(() => {
      this.#timers.delete(id);
      if (generation === this.#generation) task();
    }, ms);
    this.#timers.add(id);
    return id;
  }

  cancelAll() {
    this.#generation++;
    this.#timers.forEach(clearTimeout);
    this.#timers.clear();
  }
}
