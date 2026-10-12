// RPM presentation adapter. P2P source bytes and original notices live in ./vendor/phrase2play.
// This module does not accept cognition, world truth, velocity or future state.
import * as THREE from 'three';
import { createPlayerModel, createPitch, createRugbyBall } from './vendor/phrase2play/models';

export function playerModel(id: string, color: number) {
  const model = createPlayerModel({ id, color: `#${new THREE.Color(color).getHexString()}`, number: undefined, detail: 'low' });
  return { group: model.root, head: model.root.getObjectByName('head')! };
}
export function pitchModel() { return createPitch(70, 100, 'low'); }
export function ballModel() { return createRugbyBall(); }

/** Groups own their resources; shared resources within a group are freed once. */
export function disposeObjectResources(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse(node => {
    if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Points) {
      geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    }
    if (node instanceof THREE.SkinnedMesh) skeletons.add(node.skeleton);
  });
  skeletons.forEach(skeleton => skeleton.dispose());
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}
