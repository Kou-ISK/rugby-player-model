import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { World } from '../contracts';
import { HORIZONTAL_FOV, visible } from '../simulation';
import { ballModel, pitchModel, playerModel } from './models';
export class View {
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60,1,.07,250);
  private spectatorCamera = new THREE.PerspectiveCamera(55,1,.1,250);
  private controls: OrbitControls;
  private actors = new Map<string, THREE.Object3D>();
  private self = playerModel(0x4bc5ee);
  spectator = false;
  constructor(private container: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)); container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','ラグビー3Dビュー');
    this.scene.background = new THREE.Color(0xb7d4de); this.scene.fog = new THREE.Fog(0xb7d4de,60,160);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x405545,2.6));
    const light=new THREE.DirectionalLight(0xfff4de,2);light.position.set(15,30,10);this.scene.add(light);
    this.scene.add(pitchModel(),this.self.group);
    this.spectatorCamera.position.set(17,21,-24);this.spectatorCamera.lookAt(0,0,4);
    this.controls=new OrbitControls(this.spectatorCamera,this.renderer.domElement);this.controls.target.set(0,0,4);this.controls.enabled=false;
    new ResizeObserver(()=>this.resize()).observe(container);this.resize();
  }
  resize() {
    const w=this.container.clientWidth,h=this.container.clientHeight;this.renderer.setSize(w,h);
    this.camera.aspect=w/h;this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(HORIZONTAL_FOV/2)/(w/h)));this.camera.updateProjectionMatrix();
    this.spectatorCamera.aspect=w/h;this.spectatorCamera.updateProjectionMatrix();
  }
  draw(world: World) {
    this.controls.enabled=this.spectator;
    const ids = new Set(world.entities.map(e=>e.id));
    for(const [id,obj] of this.actors) if(!ids.has(id)) { this.scene.remove(obj);obj.traverse(node=>{if(node instanceof THREE.Mesh){node.geometry.dispose();const mats=Array.isArray(node.material)?node.material:[node.material];mats.forEach(m=>m.dispose());}});this.actors.delete(id); }
    for(const e of world.entities) {
      if(!this.actors.has(e.id)){const obj=e.kind==='ball'?ballModel():playerModel(e.team==='blue'?0x4bc5ee:0xf17b68).group;this.actors.set(e.id,obj);this.scene.add(obj);}
      const obj=this.actors.get(e.id)!;obj.position.set(e.position.x,e.kind==='ball'?.22:0,e.position.z);obj.visible=this.spectator||visible(world,e);
    }
    const b=world.body;this.self.group.position.set(b.position.x,0,b.position.z);this.self.group.rotation.y=b.yaw;
    this.self.head.visible=this.spectator;this.self.nose.visible=this.spectator;
    this.self.nose.position.x=Math.sin(b.headYaw)*.19;this.self.nose.position.z=Math.cos(b.headYaw)*.19;
    const yaw=b.yaw+b.headYaw;
    this.camera.position.set(b.position.x,b.eyeHeight,b.position.z);
    this.camera.lookAt(b.position.x+Math.sin(yaw),b.eyeHeight,b.position.z+Math.cos(yaw));
    this.renderer.render(this.scene,this.spectator?this.spectatorCamera:this.camera);
    this.renderer.domElement.dataset.mode=this.spectator?'spectator':'first-person';
    this.renderer.domElement.dataset.heading=String(yaw);
    this.renderer.domElement.dataset.rendered=String(this.renderer.info.render.calls);
  }
}
