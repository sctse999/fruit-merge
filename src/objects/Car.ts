import * as THREE from 'three';

export class Car {
  readonly group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe10600, metalness: 0.6, roughness: 0.35 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.5 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(80, 28, 160), bodyMat);
    body.position.y = 20;
    this.group.add(body);

    const cockpit = new THREE.Mesh(
      new THREE.BoxGeometry(50, 18, 50),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 })
    );
    cockpit.position.set(0, 38, -10);
    this.group.add(cockpit);

    const frontWing = new THREE.Mesh(new THREE.BoxGeometry(140, 6, 30), wingMat);
    frontWing.position.set(0, 12, 88);
    this.group.add(frontWing);

    const rearWing = new THREE.Mesh(new THREE.BoxGeometry(120, 50, 8), wingMat);
    rearWing.position.set(0, 48, -72);
    this.group.add(rearWing);

    const wheelGeo = new THREE.CylinderGeometry(18, 18, 14, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelPositions: [number, number, number][] = [
      [-52, 14, 50],
      [52, 14, 50],
      [-58, 14, -55],
      [58, 14, -55],
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(wx, wy, wz);
      this.group.add(w);
    }

    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(82, 4, 162),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    accent.position.y = 34;
    this.group.add(accent);
  }
}
