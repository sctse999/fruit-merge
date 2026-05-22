import * as THREE from 'three';
import {
  GRASS_WIDTH,
  ROAD_WIDTH,
  RUMBLE_WIDTH,
  SEGMENT_LENGTH,
  Track,
} from './Track';

const POOL_SIZE = 340;
const SEGMENTS_BEHIND = 12;

interface SegmentMeshes {
  group: THREE.Group;
  road: THREE.Mesh;
  centerLine: THREE.Mesh;
  rumbleL: THREE.Mesh;
  rumbleR: THREE.Mesh;
  grassL: THREE.Mesh;
  grassR: THREE.Mesh;
  barrierL: THREE.Mesh;
  barrierR: THREE.Mesh;
  treeL: THREE.Mesh;
  treeR: THREE.Mesh;
}

export class RoadRenderer {
  private readonly track: Track;
  private readonly scene: THREE.Scene;
  private readonly pool: SegmentMeshes[] = [];
  private readonly roadMat: THREE.MeshStandardMaterial;
  private readonly rumbleRed: THREE.MeshStandardMaterial;
  private readonly rumbleWhite: THREE.MeshStandardMaterial;
  private readonly grassMat: THREE.MeshStandardMaterial;
  private readonly barrierMat: THREE.MeshStandardMaterial;
  private readonly centerMat: THREE.MeshStandardMaterial;
  private readonly treeMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, track: Track) {
    this.scene = scene;
    this.track = track;

    this.roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.95 });
    this.rumbleRed = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
    this.rumbleWhite = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    this.grassMat = new THREE.MeshStandardMaterial({ color: 0x1a4d1a, roughness: 1 });
    this.barrierMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.3 });
    this.centerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    this.treeMat = new THREE.MeshStandardMaterial({ color: 0x0d3d0d, roughness: 1 });

    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(this.createSegmentMeshes());
    }
  }

  private createSegmentMeshes(): SegmentMeshes {
    const group = new THREE.Group();
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH);
    roadGeo.rotateX(-Math.PI / 2);

    const rumbleGeo = new THREE.PlaneGeometry(RUMBLE_WIDTH, SEGMENT_LENGTH);
    rumbleGeo.rotateX(-Math.PI / 2);

    const grassGeo = new THREE.PlaneGeometry(GRASS_WIDTH, SEGMENT_LENGTH);
    grassGeo.rotateX(-Math.PI / 2);

    const road = new THREE.Mesh(roadGeo, this.roadMat);
    road.receiveShadow = true;
    group.add(road);

    const centerGeo = new THREE.PlaneGeometry(24, SEGMENT_LENGTH * 0.4);
    centerGeo.rotateX(-Math.PI / 2);
    const centerLine = new THREE.Mesh(centerGeo, this.centerMat);
    centerLine.position.y = 4;
    group.add(centerLine);

    const rumbleL = new THREE.Mesh(rumbleGeo, this.rumbleRed);
    const rumbleR = new THREE.Mesh(rumbleGeo.clone(), this.rumbleWhite);
    group.add(rumbleL, rumbleR);

    const grassL = new THREE.Mesh(grassGeo, this.grassMat);
    const grassR = new THREE.Mesh(grassGeo.clone(), this.grassMat);
    group.add(grassL, grassR);

    const barrierGeo = new THREE.BoxGeometry(40, 80, SEGMENT_LENGTH * 0.9);
    const barrierL = new THREE.Mesh(barrierGeo, this.barrierMat);
    const barrierR = new THREE.Mesh(barrierGeo.clone(), this.barrierMat);
    group.add(barrierL, barrierR);

    const treeGeo = new THREE.ConeGeometry(60, 140, 6);
    const treeL = new THREE.Mesh(treeGeo, this.treeMat);
    const treeR = new THREE.Mesh(treeGeo.clone(), this.treeMat);
    group.add(treeL, treeR);

    this.scene.add(group);
    return { group, road, centerLine, rumbleL, rumbleR, grassL, grassR, barrierL, barrierR, treeL, treeR };
  }

  addFinishLine(): void {
    const pose = this.track.getWorldPose(SEGMENT_LENGTH * 0.5);
    const group = new THREE.Group();
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const checkMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (let i = 0; i < 10; i++) {
      const mat = i % 2 === 0 ? stripeMat : checkMat;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH / 10, 4, 40), mat);
      stripe.position.set((i - 4.5) * (ROAD_WIDTH / 10), 6, 0);
      group.add(stripe);
    }
    group.position.set(pose.x, pose.y + 4, pose.z);
    group.rotation.set(0, pose.yaw, 0, 'YXZ');
    this.scene.add(group);
  }

  update(playerZ: number): void {
    const baseZ = playerZ - SEGMENTS_BEHIND * SEGMENT_LENGTH;

    for (let n = 0; n < POOL_SIZE; n++) {
      const sliceZ = baseZ + n * SEGMENT_LENGTH;
      const midZ = sliceZ + SEGMENT_LENGTH * 0.5;
      const pose = this.track.getWorldPose(midZ);
      const segIndex = this.track.getSegmentIndex(midZ);
      this.positionSegment(this.pool[n]!, pose, segIndex);
      this.pool[n]!.group.visible = true;
    }
  }

  private positionSegment(meshes: SegmentMeshes, pose: { x: number; y: number; z: number; yaw: number; banking: number }, segIndex: number): void {
    const halfRoad = ROAD_WIDTH / 2;
    const rumbleOffset = halfRoad + RUMBLE_WIDTH / 2;
    const grassOffset = halfRoad + RUMBLE_WIDTH + GRASS_WIDTH / 2;
    const barrierOffset = grassOffset + GRASS_WIDTH / 2 + 60;

    meshes.group.position.set(pose.x, pose.y, pose.z);
    meshes.group.rotation.set(0, pose.yaw, pose.banking, 'YXZ');

    const rumbleMat = segIndex % 2 === 0 ? this.rumbleRed : this.rumbleWhite;
    const rumbleMatAlt = segIndex % 2 === 0 ? this.rumbleWhite : this.rumbleRed;
    meshes.rumbleL.material = rumbleMat;
    meshes.rumbleR.material = rumbleMatAlt;

    meshes.road.position.set(0, 2, 0);
    meshes.rumbleL.position.set(-rumbleOffset, 3, 0);
    meshes.rumbleR.position.set(rumbleOffset, 3, 0);
    meshes.grassL.position.set(-grassOffset, 1, 0);
    meshes.grassR.position.set(grassOffset, 1, 0);
    meshes.barrierL.position.set(-barrierOffset, 40, 0);
    meshes.barrierR.position.set(barrierOffset, 40, 0);

    meshes.centerLine.visible = segIndex % 3 === 0;
    const showTrees = segIndex % 5 === 0;
    meshes.treeL.visible = showTrees;
    meshes.treeR.visible = showTrees;
    meshes.treeL.position.set(-barrierOffset - 120, 70, 0);
    meshes.treeR.position.set(barrierOffset + 120, 70, 0);
  }
}
