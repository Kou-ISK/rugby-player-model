import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { World } from '../../../simulation/src/contracts';
import { HORIZONTAL_FOV, horizontalFov, visible } from '../../../simulation/src/index';
import { ballModel, pitchModel, playerModel, addBodyFacingGuide, disposeObjectResources } from './models';
export class View {
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60,1,.07,250);
  private spectatorCamera = new THREE.PerspectiveCamera(55,1,.1,250);
  private controls: OrbitControls;
  private actors = new Map<string, THREE.Object3D>();
  private appearances = new Map<string,string>();
  private selfTeam='blue';
  private self = playerModel('self', 0x4bc5ee);
  private resizeObserver: ResizeObserver;
  private disposed = false;
  private fieldOfView = HORIZONTAL_FOV;
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
    this.camera.aspect=w/h;this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(this.fieldOfView/2)/(w/h)));this.camera.updateProjectionMatrix();
    this.spectatorCamera.aspect=w/h;this.spectatorCamera.updateProjectionMatrix();
    this.renderScene();
  }
  draw(world: World) {
    if(this.disposed)return;
    this.fieldOfView=horizontalFov(world);
    this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(this.fieldOfView/2)/this.camera.aspect));
    this.camera.updateProjectionMatrix();
    this.renderer.domElement.dataset.horizontalFov=String(this.fieldOfView*180/Math.PI);
    this.controls.enabled=this.spectator;
    const team=world.dynamic?.scene.definition.actors.find(a=>a.id===world.dynamic!.scene.definition.controlledPlayerId)?.team??'blue';
    const ids = new Set(world.entities.map(e=>e.id));
    for(const [id,obj] of this.actors) if(!ids.has(id)) { this.scene.remove(obj);disposeObjectResources(obj);this.actors.delete(id);this.appearances.delete(id); }
    for(const e of world.entities) {
      const appearanceId=world.dynamic?`actor-${world.dynamic.scene.definition.actors.findIndex(a=>a.id===e.id)}`:e.id;
      const appearanceKey=`${e.kind}:${e.team}:${appearanceId}:${team}`;
      if(this.actors.has(e.id)&&this.appearances.get(e.id)!==appearanceKey){const old=this.actors.get(e.id)!;this.scene.remove(old);disposeObjectResources(old);this.actors.delete(e.id);}
      if(!this.actors.has(e.id)){const obj=e.kind==='ball'?ballModel():playerModel(appearanceId,e.team==='blue'?0x4bc5ee:0xf17b68).group;if(e.kind==='player')addBodyFacingGuide(obj);this.actors.set(e.id,obj);this.appearances.set(e.id,appearanceKey);this.scene.add(obj);}
      const obj=this.actors.get(e.id)!;obj.position.set(e.position.x,e.kind==='ball'?.22:0,e.position.z);obj.rotation.y=e.yaw??0;obj.visible=this.spectator||visible(world,e);
    }
    if(team!==this.selfTeam){this.scene.remove(this.self.group);disposeObjectResources(this.self.group);this.self=playerModel('self',team==='blue'?0x4bc5ee:0xf17b68);this.selfTeam=team;this.scene.add(this.self.group);}
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
    if(this.disposed)return;
    this.renderer.domElement.dataset.projection='perspective';
    this.renderer.render(this.scene,this.spectator?this.spectatorCamera:this.camera);
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;
    this.resizeObserver.disconnect();this.controls.dispose();
    disposeObjectResources(this.scene);this.scene.clear();this.actors.clear();this.appearances.clear();
    this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();
  }
}
