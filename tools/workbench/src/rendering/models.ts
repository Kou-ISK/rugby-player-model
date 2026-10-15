// RPM presentation adapter. P2P source bytes and original notices live in ./vendor/phrase2play.
// This module does not accept cognition, world truth, velocity or future state.
import * as THREE from 'three';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { createPlayerModel, createPitch, createRugbyBall } from './vendor/phrase2play/models';

export function playerModel(id: string, color: number) {
  const model = createPlayerModel({ id, color: `#${new THREE.Color(color).getHexString()}`, number: undefined, detail: 'low' });
  return { group: model.root, head: model.root.getObjectByName('head')! };
}
export function pitchModel() {
  const pitch=createPitch(70,100,'low');
  const turf=pitch.getObjectByName('mown-grass') as THREE.Mesh;
  // Keep near-eye ground triangles small; pitch-wide triangles crossing the
  // near plane can incorrectly occlude players on software WebGL renderers.
  const original=turf.geometry;
  turf.geometry=new TessellateModifier(5,10).modify(original);
  original.dispose();
  return pitch;
}
export function ballModel() { return createRugbyBall(); }

/** Presentation aids inherit the actor's visibility; never mark hidden actors. */
export function addBodyFacingGuide(group: THREE.Object3D) {
  // +Z is the preserved procedural model's front, not its velocity or intention.
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(0,.04,0),1.25,0xffffff,.4,.25);
  arrow.name='body-facing';group.add(arrow);
}

/** Groups own their resources; shared resources within a group are freed once. */
export function disposeObjectResources(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse(node => {
    if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Points || node instanceof THREE.Sprite) {
      // Sprite geometry is shared by Three.js; only its owned material/texture is released.
      if (!(node instanceof THREE.Sprite)) geometries.add(node.geometry);
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
