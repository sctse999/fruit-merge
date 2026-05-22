import { CIRCUIT_01 } from '../data/circuit01';

export const SEGMENT_LENGTH = 200;
export const ROAD_WIDTH = 2000;
export const RUMBLE_WIDTH = 400;
export const GRASS_WIDTH = 1200;

export interface SegmentDef {
  /** Number of uniform road slices (each SEGMENT_LENGTH world units). */
  length: number;
  curve: number;
  hill: number;
  banking?: number;
}

export interface WorldPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  banking: number;
}

export interface BuiltSegment {
  index: number;
  z: number;
  length: number;
  curve: number;
  hill: number;
  banking: number;
  p1: WorldPose;
  p2: WorldPose;
}

export class Track {
  readonly segments: BuiltSegment[] = [];
  readonly totalLength: number;

  constructor(defs: SegmentDef[] = CIRCUIT_01) {
    let x = 0;
    let y = 0;
    let z = 0;
    let yaw = 0;
    let index = 0;

    for (const def of defs) {
      const steps = Math.max(1, Math.round(def.length));
      const curve = def.curve;
      const hill = def.hill;
      const banking = def.banking ?? 0;

      for (let s = 0; s < steps; s++) {
        const len = SEGMENT_LENGTH;
        const p1: WorldPose = { x, y, z, yaw, pitch: 0, banking };

        const dy = hill * len;
        const dx = curve * len * len * 0.5;
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + len;
        const segYaw = Math.atan2(dx, len);
        const pitch = Math.atan2(dy, len);

        x = nx;
        y = ny;
        z = nz;
        yaw = segYaw;

        const p2: WorldPose = { x, y, z, yaw, pitch, banking };

        this.segments.push({
          index: index++,
          z: p1.z,
          length: len,
          curve,
          hill,
          banking,
          p1,
          p2,
        });
      }
    }

    this.totalLength = z;
  }

  normalizeZ(z: number): number {
    if (this.totalLength <= 0) return 0;
    let t = z % this.totalLength;
    if (t < 0) t += this.totalLength;
    return t;
  }

  findSegment(z: number): BuiltSegment {
    const nz = this.normalizeZ(z);
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i]!;
      if (nz >= seg.z) return seg;
    }
    return this.segments[0]!;
  }

  getSegmentIndex(z: number): number {
    return this.findSegment(z).index;
  }

  getWorldPose(z: number): WorldPose {
    const nz = this.normalizeZ(z);
    const seg = this.findSegment(nz);
    const t = Math.min(1, Math.max(0, (nz - seg.z) / seg.length));

    const p1 = seg.p1;
    const p2 = seg.p2;

    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
      z: nz,
      yaw: lerpAngle(p1.yaw, p2.yaw, t),
      pitch: p1.pitch + (p2.pitch - p1.pitch) * t,
      banking: p1.banking + (p2.banking - p1.banking) * t,
    };
  }

  isOnRoad(_z: number, playerX: number): boolean {
    return Math.abs(playerX) <= 1;
  }

  isOnRumble(_z: number, playerX: number): boolean {
    const a = Math.abs(playerX);
    return a > 1 && a <= 1.35;
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}
