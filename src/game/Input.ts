const PREVENT_DEFAULT_CODES = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
]);

const ACCEL_CODES = new Set(['ArrowUp', 'KeyW']);
const BRAKE_CODES = new Set(['ArrowDown', 'KeyS']);
const LEFT_CODES = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_CODES = new Set(['ArrowRight', 'KeyD']);
const START_CODES = new Set(['Space', 'Enter']);

const ACCEL_KEYS = new Set(['w', 'W', 'ArrowUp']);
const BRAKE_KEYS = new Set(['s', 'S', 'ArrowDown']);
const LEFT_KEYS = new Set(['a', 'A', 'ArrowLeft']);
const RIGHT_KEYS = new Set(['d', 'D', 'ArrowRight']);
const START_KEYS = new Set([' ', 'Enter']);

export class Input {
  private keys = new Set<string>();
  private codes = new Set<string>();

  constructor(private readonly focusTarget?: HTMLElement) {
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.key);
      this.codes.add(e.code);
      if (PREVENT_DEFAULT_CODES.has(e.code)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key);
      this.codes.delete(e.code);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => this.clear());

    if (focusTarget) {
      focusTarget.addEventListener('pointerdown', () => focusTarget.focus());
      focusTarget.addEventListener('click', () => focusTarget.focus());
    }
  }

  focus(): void {
    this.focusTarget?.focus({ preventScroll: true });
  }

  clear(): void {
    this.keys.clear();
    this.codes.clear();
  }

  private has(codes: Set<string>, keys: Set<string>): boolean {
    for (const c of codes) {
      if (this.codes.has(c)) return true;
    }
    for (const k of keys) {
      if (this.keys.has(k)) return true;
    }
    return false;
  }

  get accelerate(): boolean {
    return this.has(ACCEL_CODES, ACCEL_KEYS);
  }

  get brake(): boolean {
    return this.has(BRAKE_CODES, BRAKE_KEYS);
  }

  get steerLeft(): boolean {
    return this.has(LEFT_CODES, LEFT_KEYS);
  }

  get steerRight(): boolean {
    return this.has(RIGHT_CODES, RIGHT_KEYS);
  }

  get start(): boolean {
    return this.has(START_CODES, START_KEYS);
  }

  get anyDriveInput(): boolean {
    return this.accelerate || this.brake || this.steerLeft || this.steerRight;
  }
}
