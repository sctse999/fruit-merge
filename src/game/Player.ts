import type { Input } from './Input';
import { ROAD_WIDTH, Track } from './Track';

const MAX_SPEED_ROAD = 420;
const MAX_SPEED_OFF = 160;
const ACCEL = 680;
const BRAKE = 900;
const COAST_FRICTION = 120;
const STEER_ACCEL = 5.5;
const STEER_DAMPING = 4.2;
const CURVE_PUSH = 28;
const CURVE_SMOOTH = 10;
const OFF_ROAD_GRIP = 0.55;

export class Player {
  z = 0;
  speed = 0;
  /** Normalized lateral position -1 (left) to 1 (right) */
  playerX = 0;
  /** Lateral velocity in playerX units per second */
  playerXVel = 0;
  private smoothCurve = 0;
  offRoadTime = 0;

  constructor(readonly track: Track) {}

  reset(): void {
    this.z = 0;
    this.speed = 0;
    this.playerX = 0;
    this.playerXVel = 0;
    this.smoothCurve = 0;
    this.offRoadTime = 0;
  }

  update(input: Input, dt: number): void {
    const seg = this.track.findSegment(this.z);
    const onRoad = this.track.isOnRoad(this.z, this.playerX);
    const onRumble = this.track.isOnRumble(this.z, this.playerX);

    let maxSpeed = MAX_SPEED_ROAD;
    let steerMult = 1;
    if (!onRoad) {
      maxSpeed = MAX_SPEED_OFF;
      steerMult = OFF_ROAD_GRIP;
      this.offRoadTime += dt;
    } else {
      this.offRoadTime = 0;
    }
    if (onRumble) maxSpeed *= 0.94;

    if (input.accelerate) {
      this.speed += ACCEL * dt;
    } else if (input.brake) {
      this.speed -= BRAKE * dt;
    } else if (this.speed > 0) {
      this.speed = Math.max(0, this.speed - COAST_FRICTION * dt);
    }

    this.speed = Math.max(0, Math.min(this.speed, maxSpeed));

    this.z += this.speed * dt;
    if (this.z >= this.track.totalLength) {
      this.z -= this.track.totalLength;
    }

    const speedRatio = this.speed / MAX_SPEED_ROAD;
    const curveBlend = 1 - Math.exp(-CURVE_SMOOTH * dt);
    this.smoothCurve += (seg.curve - this.smoothCurve) * curveBlend;

    let steerInput = 0;
    if (input.steerLeft) steerInput += 1;
    if (input.steerRight) steerInput -= 1;

    const curvePush = this.smoothCurve * speedRatio * speedRatio * CURVE_PUSH * dt;
    const steerForce = steerInput * STEER_ACCEL * steerMult * (0.5 + speedRatio * 0.5);

    this.playerXVel += (steerForce + curvePush) * dt;
    this.playerXVel *= Math.exp(-STEER_DAMPING * dt);

    this.playerX += this.playerXVel * dt;
    this.playerX = Math.max(-1.2, Math.min(1.2, this.playerX));

    if (Math.abs(this.playerX) >= 1.2) {
      this.playerXVel *= 0.5;
    }
  }

  get speedKmh(): number {
    return Math.round(this.speed * 0.36);
  }

  get lateralWorld(): number {
    return this.playerX * ROAD_WIDTH * 0.5;
  }
}
