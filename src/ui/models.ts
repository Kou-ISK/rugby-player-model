// Independently authored fallback geometry; NOT the unavailable P2P models.ts.
// No external assets. Replace only this view adapter when the verified kit arrives.
import * as THREE from 'three';
const material = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: .85 });
export function playerModel(color: number) {
  const group = new THREE.Group(), shirt = material(color), skin = material(0xd8ad8d), shorts = material(0x182333);
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); mesh.position.set(x,y,z); group.add(mesh); return mesh;
  };
  box(.58,.65,.32,0,1.18,0,shirt); box(.5,.28,.34,0,.74,0,shorts);
  for (const sign of [-1,1]) { box(.17,.57,.19,sign*.16,.34,0,skin); box(.18,.65,.2,sign*.39,1.1,0,shirt); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(.19,12,10),skin); head.position.y=1.68; group.add(head);
  const nose = box(.09,.09,.12,0,1.68,.19,skin);
  return { group, head, nose };
}
export function pitchModel() {
  const group = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70,100),material(0x28664d)); ground.rotation.x=-Math.PI/2; group.add(ground);
  const lineMat = new THREE.LineBasicMaterial({color:0xc9dfca});
  for(const z of [-50,-40,-22,0,22,40,50]) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-35,.015,z),new THREE.Vector3(35,.015,z)]),lineMat); group.add(line);
  }
  for(const x of [-35,35]) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,.015,-50),new THREE.Vector3(x,.015,50)]),lineMat));
  for(const z of [-50,50]) {
    for(const x of [-2.8,2.8]) { const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,8),material(0xffffff));post.position.set(x,4,z);group.add(post); }
    const cross=new THREE.Mesh(new THREE.BoxGeometry(5.6,.12,.12),material(0xffffff));cross.position.set(0,3,z);group.add(cross);
  }
  return group;
}
export function ballModel() { const mesh=new THREE.Mesh(new THREE.SphereGeometry(.18,16,12),material(0xf5dcc0));mesh.scale.set(1,1,1.6);return mesh; }
