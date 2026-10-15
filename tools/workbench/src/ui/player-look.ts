/** Manual observation intervention, not a simulated motor action or reaction-time measure. */
export type LookTarget = 'head' | 'body';
type Pose = { yaw: number; headYaw: number };
const SAMPLE_MS = 50; // Bound recorded/displayed updates together; never render unrecorded angles.
const HEAD_LIMIT = 137 * Math.PI / 180;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export class PlayerLookControls {
  private abort = new AbortController();
  private frame = 0;
  private lastSample = -Infinity;
  private pending: { target: LookTarget; delta: number } | null = null;
  private drag: { id: number; x: number } | null = null;
  private lockRequested = false;
  private disposed = false;
  private fallback = false;

  constructor(private canvas: HTMLCanvasElement, private button: HTMLButtonElement,
    private center: HTMLButtonElement, private status: HTMLElement,
    private options: {
      unavailable: () => string | null;
      pose: () => Pose;
      begin: () => void;
      commit: (target: LookTarget, angle: number, bodyYaw?: number) => boolean;
      sensitivity: () => number;
    }) {
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-describedby', 'look-help look-status');
    const listen = <K extends keyof DocumentEventMap>(target: EventTarget, name: K, fn: (event: DocumentEventMap[K]) => void) =>
      target.addEventListener(name, fn as EventListener, { signal: this.abort.signal });
    listen(button, 'click', () => {
      if (document.pointerLockElement === canvas) this.stop();
      else void this.requestLock();
    });
    listen(center, 'click', () => this.centerHead());
    listen(canvas, 'pointerdown', e => {
      if (e.button !== 0 || this.options.unavailable() || document.pointerLockElement === canvas) return;
      e.preventDefault();this.options.begin();canvas.focus({ preventScroll: true });
      this.drag = { id: e.pointerId, x: e.clientX };canvas.setPointerCapture(e.pointerId);this.update();
    });
    listen(document, 'pointermove', e => {
      let pixels: number;
      if (document.pointerLockElement === canvas) pixels = e.movementX;
      else if (this.drag?.id === e.pointerId) {
        pixels = e.clientX - this.drag.x;this.drag.x = e.clientX;
      } else return;
      // +yaw turns screen-left in the simulation's +Z-forward coordinates.
      this.queue(e.shiftKey ? 'body' : 'head', -pixels * .003 * this.options.sensitivity());
    });
    listen(canvas, 'pointerup', e => {
      if (this.drag?.id !== e.pointerId) return;
      this.flush();this.stop();
    });
    listen(canvas, 'pointercancel', () => this.stop());
    listen(canvas, 'lostpointercapture', () => { if (this.drag) this.stop(); });
    listen(document, 'pointerlockchange', () => {
      if (document.pointerLockElement === canvas) {
        if (!this.lockRequested || this.options.unavailable() || this.disposed) { document.exitPointerLock();return; }
        this.options.begin();canvas.focus({ preventScroll: true });this.update();
      } else this.stop();
    });
    listen(document, 'pointerlockerror', () => this.lockFailed());
    listen(document, 'keydown', e => {
      if (e.key === 'Escape') { this.stop();return; }
      if ((document.activeElement !== canvas && document.pointerLockElement !== canvas) || e.altKey || e.ctrlKey || e.metaKey || this.options.unavailable()) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();this.options.begin();
        this.queue(e.shiftKey ? 'body' : 'head', (e.key === 'ArrowLeft' ? 1 : -1) * 5 * Math.PI / 180);
      } else if (e.key.toLowerCase() === 'r') { e.preventDefault();this.centerHead(); }
    });
    listen(window, 'blur', () => this.stop());
    listen(canvas, 'blur', () => this.stop());
    listen(document, 'visibilitychange', () => { if (document.hidden) this.stop(); });
    this.update();
  }

  private async requestLock() {
    if (this.options.unavailable() || this.disposed || this.lockRequested) return;
    this.options.begin();this.lockRequested = true;
    try {
      if (!this.canvas.requestPointerLock) throw new Error('Pointer lock unavailable');
      await this.canvas.requestPointerLock();
      if ((this.disposed || !this.lockRequested || this.options.unavailable()) && document.pointerLockElement === this.canvas) document.exitPointerLock();
    } catch { this.lockFailed(); }
  }
  private lockFailed() {
    if (this.disposed) return;
    this.lockRequested = false;this.fallback = true;this.update();
  }
  private queue(target: LookTarget, delta: number) {
    if (!Number.isFinite(delta) || !delta || this.options.unavailable()) return;
    // Preserve acquisition order across neck/body mode changes.
    if (this.pending && this.pending.target !== target) this.flush();
    if (this.options.unavailable()) return;
    if (!this.pending) this.pending = { target, delta: 0 };
    this.pending.delta += delta;
    if (!this.frame) this.frame = requestAnimationFrame(this.sample);
  }
  private sample = (time: number) => {
    this.frame = 0;
    if (time - this.lastSample >= SAMPLE_MS) { this.lastSample = time;this.flush(); }
    if (this.pending) this.frame = requestAnimationFrame(this.sample);
  };
  private flush() {
    const pending = this.pending;this.pending = null;
    if (!pending || this.options.unavailable()) return;
    const pose = this.options.pose();
    const requested=pose.headYaw+pending.delta;
    const next = pending.target === 'head' ? Math.max(-HEAD_LIMIT,Math.min(HEAD_LIMIT,requested)) : wrap(pose.yaw+pending.delta);
    // Continue the view turn with the body when the neck reaches its model bound.
    // Both angles are committed atomically and observed together; no free hidden camera.
    const bodyYaw=pending.target==='head'?wrap(pose.yaw+requested-next):undefined;
    if (Math.abs(next-(pending.target==='head'?pose.headYaw:pose.yaw))<1e-8 && (bodyYaw===undefined||Math.abs(bodyYaw-pose.yaw)<1e-8)) return;
    if (!this.options.commit(pending.target,next,bodyYaw)) this.stop();
  }
  private centerHead() {
    if (this.options.unavailable()) return;
    this.pending = null;this.options.begin();this.options.commit('head', 0);
  }
  /** Drop only unshown input; all displayed poses already have observation records. */
  stop() {
    this.pending = null;
    const drag = this.drag;this.drag = null;
    if (drag && this.canvas.hasPointerCapture(drag.id)) this.canvas.releasePointerCapture(drag.id);
    this.lockRequested = false;
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    if (this.frame) cancelAnimationFrame(this.frame);this.frame = 0;
    if (!this.disposed) this.update();
  }
  update() {
    const unavailable = this.options.unavailable();
    if (unavailable && (this.pending || this.drag || this.lockRequested)) { this.stop();return; }
    const locked = document.pointerLockElement === this.canvas;
    this.button.disabled = !!unavailable;this.center.disabled = !!unavailable;
    this.button.textContent = locked ? '見回しを終了（Esc）' : 'マウスで見回す';
    this.button.setAttribute('aria-pressed', String(locked));
    this.canvas.dataset.lookMode = unavailable ? 'unavailable' : locked ? 'locked' : this.drag ? 'drag' : 'ready';
    this.status.textContent = unavailable ?? (locked || this.drag
      ? '手動観測中 · マウス左右：首 ／ Shift＋左右：身体ごと ／ Esc：終了'
      : this.fallback ? 'このブラウザではドラッグで見回してください。画面を選択して ← → でも操作できます。'
        : '画面のドラッグでも見回せます。画面を選択して ← →、Shift＋← →、R（首を正面）も使えます。');
  }
  dispose() { this.disposed = true;this.stop();this.abort.abort(); }
}
