export class HUD {
  private speedEl: HTMLElement;
  private timeEl: HTMLElement;
  private lapEl: HTMLElement;
  private statusEl: HTMLElement;

  constructor(container: HTMLElement) {
    container.innerHTML = `
      <div class="hud-panel">
        <div class="label">Speed</div>
        <div class="value" id="hud-speed">0</div>
        <div class="label">km/h</div>
      </div>
      <div class="hud-panel hud-center">
        <div class="label">Lap Time</div>
        <div class="value" id="hud-time">0:00.000</div>
        <div class="label" id="hud-status">Racing</div>
      </div>
      <div class="hud-panel">
        <div class="label">Lap</div>
        <div class="value small" id="hud-lap">1 / 1</div>
      </div>
    `;
    this.speedEl = container.querySelector('#hud-speed')!;
    this.timeEl = container.querySelector('#hud-time')!;
    this.lapEl = container.querySelector('#hud-lap')!;
    this.statusEl = container.querySelector('#hud-status')!;
  }

  show(): void {
    this.container().classList.remove('hidden');
  }

  hide(): void {
    this.container().classList.add('hidden');
  }

  private container(): HTMLElement {
    return this.speedEl.closest('.hud')!;
  }

  update(speedKmh: number, lapMs: number, lap: number, targetLaps: number, status: string): void {
    this.speedEl.textContent = String(speedKmh);
    this.timeEl.textContent = formatLapTime(lapMs);
    this.lapEl.textContent = `${lap} / ${targetLaps}`;
    this.statusEl.textContent = status;
  }
}

function formatLapTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const frac = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(frac).padStart(3, '0')}`;
}
