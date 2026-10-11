import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { World } from '../contracts';
import { HORIZONTAL_FOV, visible } from '../simulation';
import { ballModel, pitchModel, playerModel, disposeObjectResources } from './models';
export class View {
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60,1,.07,250);
  private spectatorCamera = new THREE.PerspectiveCamera(55,1,.1,250);
  private controls: OrbitControls;
  private actors = new Map<string, THREE.Object3D>();
  private self = playerModel('self', 0x4bc5ee);
  private resizeObserver: ResizeObserver;
  private disposed = false;
  spectator = false;
  constructor(private container: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','ラグビー3Dビュー');
    this.scene.background = new THREE.Color(0xb7d4de); this.scene.fog = new THREE.Fog(0xb7d4de,60,160);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x405545,2.6));
    const light=new THREE.DirectionalLight(0xfff4de,2);light.position.set(15,30,10);this.scene.add(light);
    this.scene.add(pitchModel(),this.self.group);
    this.spectatorCamera.position.set(17,21,-24);this.spectatorCamera.lookAt(0,0,4);
    this.controls=new OrbitControls(this.spectatorCamera,this.renderer.domElement);this.controls.target.set(0,0,4);this.controls.enabled=false;
    this.controls.addEventListener('change',()=>this.renderScene());
    this.resizeObserver = new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
  }
  resize() {
    if(this.disposed)return;
    const w=this.container.clientWidth,h=this.container.clientHeight;this.renderer.setSize(w,h);
    this.camera.aspect=w/h;this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(HORIZONTAL_FOV/2)/(w/h)));this.camera.updateProjectionMatrix();
    this.spectatorCamera.aspect=w/h;this.spectatorCamera.updateProjectionMatrix();
    this.renderScene();
  }
  draw(world: World) {
    if(this.disposed)return;
    this.controls.enabled=this.spectator;
    const ids = new Set(world.entities.map(e=>e.id));
    for(const [id,obj] of this.actors) if(!ids.has(id)) { this.scene.remove(obj);disposeObjectResources(obj);this.actors.delete(id); }
    for(const e of world.entities) {
      if(!this.actors.has(e.id)){const obj=e.kind==='ball'?ballModel():playerModel(e.id,e.team==='blue'?0x4bc5ee:0xf17b68).group;this.actors.set(e.id,obj);this.scene.add(obj);}
      const obj=this.actors.get(e.id)!;obj.position.set(e.position.x,e.kind==='ball'?.22:0,e.position.z);obj.visible=this.spectator||visible(world,e);
    }
    const b=world.body;this.self.group.position.set(b.position.x,0,b.position.z);this.self.group.rotation.y=b.yaw;
    // The original skinned body merges its head. Hide the whole self in first
    // person to avoid camera clipping; the camera never follows model bones.
    this.self.group.visible=this.spectator;this.self.head.rotation.y=b.headYaw;
    const yaw=b.yaw+b.headYaw;
    this.camera.position.set(b.position.x,b.eyeHeight,b.position.z);
    this.camera.lookAt(b.position.x+Math.sin(yaw),b.eyeHeight,b.position.z+Math.cos(yaw));
    this.renderScene();
    this.renderer.domElement.dataset.mode=this.spectator?'spectator':'first-person';
    this.renderer.domElement.dataset.heading=String(yaw);
    this.renderer.domElement.dataset.rendered=String(this.renderer.info.render.calls);
  }
  private renderScene() {
    if(!this.disposed)this.renderer.render(this.scene,this.spectator?this.spectatorCamera:this.camera);
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;
    this.resizeObserver.disconnect();this.controls.dispose();
    disposeObjectResources(this.scene);this.scene.clear();this.actors.clear();
    this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();
  }
}
