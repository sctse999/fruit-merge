import * as THREE from 'three';
import { Car } from '../objects/Car';
import { HUD } from '../ui/HUD';
import { Input } from './Input';
import { Player } from './Player';
import { RoadRenderer } from './RoadRenderer';
import { ROAD_WIDTH, Track } from './Track';

export type GameState = 'menu' | 'racing' | 'finished' | 'crashed';

const TARGET_LAPS = 1;
const OFF_ROAD_CRASH_SEC = 4;
const CAMERA_HEIGHT = 280;
const CAMERA_DISTANCE = 520;
const CAMERA_LERP = 6;
const MAX_DT = 1 / 30;

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly track: Track;
  private readonly input: Input;
  private readonly player: Player;
  private readonly road: RoadRenderer;
  private readonly car: Car;
  private readonly hud: HUD;

  private state: GameState = 'menu';
  private lap = 0;
  private lapStartTime = 0;
  private elapsedMs = 0;
  private finishedTime = 0;
  private minRaceBeforeLap = 8000;
  private cameraPos = new THREE.Vector3();
  private cameraLook = new THREE.Vector3();
  private displayYaw = 0;
  private displayPlayerX = 0;
  private lastTime = 0;
  private spaceWasDown = false;

  constructor(
    canvas: HTMLCanvasElement,
    hudEl: HTMLElement,
    private readonly overlayEl: HTMLElement
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x6eb5e8);
    this.scene.fog = new THREE.Fog(0x8ec8f0, 800, 14000);

    this.camera = new THREE.PerspectiveCamera(60, 1, 10, 20000);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.1);
    sun.position.set(3000, 8000, -2000);
    sun.castShadow = true;
    this.scene.add(ambient, sun);

    this.track = new Track();
    this.input = new Input(canvas);
    this.player = new Player(this.track);
    this.road = new RoadRenderer(this.scene, this.track);
    this.car = new Car();
    this.scene.add(this.car.group);
    this.hud = new HUD(hudEl);
    this.road.addFinishLine();
    this.initCameraAtStart();

    this.resize();
    window.addEventListener('resize', () => this.resize());
    overlayEl.addEventListener('click', () => this.tryStartFromMenu());
    canvas.addEventListener('click', () => this.tryStartFromMenu());
    queueMicrotask(() => this.input.focus());
  }

  start(): void {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - this.lastTime) / 1000, MAX_DT);
      this.lastTime = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private update(dt: number): void {
    const spaceDown = this.input.start;
    const spacePressed = spaceDown && !this.spaceWasDown;
    this.spaceWasDown = spaceDown;

    if (this.state === 'menu') {
      if (spacePressed || this.input.anyDriveInput) {
        this.beginRace();
      }
      this.road.update(this.player.z);
      this.updateCarAndCamera(dt);
      return;
    }

    if (this.state === 'finished' || this.state === 'crashed') {
      if (spacePressed) this.resetToMenu();
      this.updateCarAndCamera(dt);
      return;
    }

    const prevZ = this.player.z;
    this.player.update(this.input, dt);
    this.road.update(this.player.z);

    if (this.state === 'racing') {
      this.elapsedMs = performance.now() - this.lapStartTime;

      const lapCross =
        this.elapsedMs > this.minRaceBeforeLap &&
        prevZ > this.track.totalLength * 0.4 &&
        this.player.z < this.track.totalLength * 0.15 &&
        this.player.speed > 80;
      if (lapCross) {
        this.completeLap();
      }

      if (this.player.offRoadTime >= OFF_ROAD_CRASH_SEC) {
        this.state = 'crashed';
        this.showOverlay('Off track!', `Time: ${formatTime(this.elapsedMs)} — Press Space to retry`);
      }
    }

    this.updateCarAndCamera(dt);
    this.hud.update(
      this.player.speedKmh,
      this.elapsedMs,
      Math.min(this.lap + 1, TARGET_LAPS),
      TARGET_LAPS,
      this.state === 'racing' ? 'Racing' : this.state
    );
  }

  private tryStartFromMenu(): void {
    if (this.state === 'menu') this.beginRace();
  }

  private beginRace(): void {
    this.state = 'racing';
    this.player.reset();
    this.displayPlayerX = 0;
    const startPose = this.track.getWorldPose(0);
    this.displayYaw = startPose.yaw;
    this.lap = 0;
    this.lapStartTime = performance.now();
    this.elapsedMs = 0;
    this.overlayEl.classList.add('hidden');
    this.hud.show();
    this.input.focus();
  }

  private completeLap(): void {
    this.lap++;
    if (this.lap >= TARGET_LAPS) {
      this.state = 'finished';
      this.finishedTime = this.elapsedMs;
      this.player.speed *= 0.3;
      this.showOverlay(
        'Lap complete!',
        `Time: ${formatTime(this.finishedTime)} — Press Space to race again`
      );
    } else {
      this.lapStartTime = performance.now();
    }
  }

  private initCameraAtStart(): void {
    const pose = this.track.getWorldPose(0);
    this.displayYaw = pose.yaw;
    this.displayPlayerX = 0;
    this.cameraPos.set(pose.x, pose.y + CAMERA_HEIGHT, pose.z - CAMERA_DISTANCE);
    this.cameraLook.set(pose.x, pose.y + 40, pose.z + 400);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.cameraLook);
    this.road.update(0);
  }

  private resetToMenu(): void {
    this.state = 'menu';
    this.player.reset();
    this.lap = 0;
    this.initCameraAtStart();
    this.overlayEl.classList.remove('hidden');
    this.overlayEl.querySelector('h1')!.textContent = 'Grand Prix';
    this.overlayEl.querySelector('.prompt')!.textContent = 'Press Space to start';
    this.overlayEl.querySelector('.result')?.remove();
    this.hud.hide();
    this.input.focus();
  }

  private showOverlay(title: string, message: string): void {
    this.overlayEl.classList.remove('hidden');
    this.overlayEl.querySelector('h1')!.textContent = title;
    this.overlayEl.querySelector('.prompt')!.textContent = 'Press Space to continue';
    let result = this.overlayEl.querySelector('.result');
    if (!result) {
      result = document.createElement('p');
      result.className = 'result';
      this.overlayEl.appendChild(result);
    }
    result.textContent = message;
  }

  private updateCarAndCamera(dt: number): void {
    const pose = this.track.getWorldPose(this.player.z);
    const follow = 1 - Math.exp(-10 * dt);

    this.displayPlayerX += (this.player.playerX - this.displayPlayerX) * follow;
    this.displayYaw = lerpAngle(this.displayYaw, pose.yaw, follow);

    const lateral = this.displayPlayerX * (ROAD_WIDTH * 0.5);
    const cos = Math.cos(this.displayYaw);
    const sin = Math.sin(this.displayYaw);
    const wx = pose.x + cos * lateral;
    const wz = pose.z - sin * lateral;

    this.car.group.position.set(wx, pose.y + 24, wz);
    this.car.group.rotation.set(0, this.displayYaw, 0, 'YXZ');

    const camBack = CAMERA_DISTANCE + this.player.speed * 0.4;
    const camX = wx - sin * camBack;
    const camZ = wz - cos * camBack;
    const camY = pose.y + CAMERA_HEIGHT + this.player.speed * 0.08;

    const targetPos = new THREE.Vector3(camX, camY, camZ);
    const targetLook = new THREE.Vector3(wx, pose.y + 40, wz + cos * 200);

    const t = 1 - Math.exp(-CAMERA_LERP * dt);
    this.cameraPos.lerp(targetPos, t);
    this.cameraLook.lerp(targetLook, t);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.cameraLook);
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(3);
  return `${m}:${Number(s) < 10 ? '0' : ''}${s}`;
}

function lerpAngle(a: number, b: number, t: number): number {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}
