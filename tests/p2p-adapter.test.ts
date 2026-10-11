import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { ballModel, pitchModel, playerModel, disposeObjectResources } from '../src/ui/models';

test('P2P original and minimal presentation type retain verified kit bytes', () => {
  for (const [path, expected] of [
    ['models.ts', '07b7965746b80d1cb222b5e13254369a257620bc42781a95821e23b550226d86'],
    ['contact-pose.ts', '81caee0c1778d61cf9eee80c0f0943c8531686c7c9ed6b16027bc74fd3107e98'],
  ]) assert.equal(createHash('sha256').update(readFileSync(`src/ui/p2p/${path}`)).digest('hex'), expected);
});

test('procedural adapter releases shared geometry, materials, textures and skeletons once', () => {
  const root = new THREE.Group();
  const player = playerModel('synthetic-test', 0x4bc5ee);
  assert.equal(player.group.name, 'player:synthetic-test');assert.equal(player.head.name, 'head');
  root.add(player.group, pitchModel(), ballModel());
  const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
  const counts = new Map<object, number>();
  let skeletonCount = 0;
  root.traverse(node => {
    if (node instanceof THREE.Mesh || node instanceof THREE.Line) {
      resources.add(node.geometry);
      for (const m of Array.isArray(node.material) ? node.material : [node.material]) {
        resources.add(m);
        for (const value of Object.values(m)) if (value instanceof THREE.Texture) resources.add(value);
      }
    }
    if (node instanceof THREE.SkinnedMesh) {
      node.skeleton.computeBoneTexture();resources.add(node.skeleton.boneTexture!);
      const dispose = node.skeleton.dispose.bind(node.skeleton);
      node.skeleton.dispose = () => { skeletonCount++;dispose(); };
    }
  });
  for (const resource of resources) {
    counts.set(resource, 0);
    resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource)! + 1));
  }
  disposeObjectResources(root);
  assert.ok(resources.size > 10);assert.equal(skeletonCount, 1);
  for (const count of counts.values()) assert.equal(count, 1);
});
