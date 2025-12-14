import * as THREE from './three.module.min.js';

const {
  Controls,
  MOUSE,
  Quaternion,
  Spherical,
  TOUCH,
  Vector2,
  Vector3,
  Plane,
  Ray,
  MathUtils
} = THREE;

/**
 * Fires when the camera has been transformed by the controls.
 */
const _changeEvent = { type: 'change' };
const _startEvent = { type: 'start' };
const _endEvent = { type: 'end' };

const _ray = new Ray();
const _plane = new Plane();
const _TILT_LIMIT = Math.cos(70 * MathUtils.DEG2RAD);

const _v = new Vector3();
const _twoPI = 2 * Math.PI;

const _STATE = {
  NONE: -1,
  ROTATE: 0,
  DOLLY: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_PAN: 4,
  TOUCH_DOLLY_PAN: 5,
  TOUCH_DOLLY_ROTATE: 6
};

const _EPS = 0.000001;

class OrbitControls extends Controls {

  constructor(object, domElement = null) {
    super(object, domElement);

    this.target = new Vector3();
    this.cursor = new Vector3();

    this.minDistance = 0;
    this.maxDistance = Infinity;

    this.minZoom = 0;
    this.maxZoom = Infinity;

    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;

    this.enableDamping = true;
    this.dampingFactor = 0.06;

    this.enableZoom = true;
    this.zoomSpeed = 1.0;

    this.enableRotate = true;
    this.rotateSpeed = 1.0;

    this.enablePan = true;
    this.panSpeed = 1.0;

    this.screenSpacePanning = true;

    this.mouseButtons = {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN
    };

    this.touches = {
      ONE: TOUCH.ROTATE,
      TWO: TOUCH.DOLLY_PAN
    };

    this._spherical = new Spherical();
    this._sphericalDelta = new Spherical();

    this._scale = 1;
    this._panOffset = new Vector3();

    this._rotateStart = new Vector2();
    this._rotateEnd = new Vector2();
    this._rotateDelta = new Vector2();

    this._panStart = new Vector2();
    this._panEnd = new Vector2();
    this._panDelta = new Vector2();

    this._dollyStart = new Vector2();
    this._dollyEnd = new Vector2();
    this._dollyDelta = new Vector2();

    this._quat = new Quaternion().setFromUnitVectors(object.up, new Vector3(0, 1, 0));
    this._quatInverse = this._quat.clone().invert();

    this._lastPosition = new Vector3();
    this._lastQuaternion = new Quaternion();

    if (this.domElement !== null) {
      this.connect(this.domElement);
    }

    this.update();
  }

  connect(element) {
    super.connect(element);
    element.addEventListener('contextmenu', e => e.preventDefault());
    element.addEventListener('wheel', e => this._onMouseWheel(e), { passive: false });
    element.addEventListener('mousedown', e => this._onMouseDown(e));
    element.addEventListener('mousemove', e => this._onMouseMove(e));
    element.addEventListener('mouseup', () => this._state = _STATE.NONE);
  }

  update() {
    const position = this.object.position;
    _v.copy(position).sub(this.target);
    _v.applyQuaternion(this._quat);
    this._spherical.setFromVector3(_v);

    this._spherical.theta += this._sphericalDelta.theta;
    this._spherical.phi += this._sphericalDelta.phi;

    this._spherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this._spherical.phi)
    );

    this._spherical.makeSafe();
    this._spherical.radius *= this._scale;
    this._spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this._spherical.radius));

    _v.setFromSpherical(this._spherical);
    _v.applyQuaternion(this._quatInverse);
    position.copy(this.target).add(_v);
    this.object.lookAt(this.target);

    this._sphericalDelta.set(0, 0, 0);
    this._scale = 1;

    return true;
  }

  _onMouseDown(event) {
    if (event.button === 0) this._state = _STATE.ROTATE;
    if (event.button === 1) this._state = _STATE.DOLLY;
    if (event.button === 2) this._state = _STATE.PAN;

    this._rotateStart.set(event.clientX, event.clientY);
    this._panStart.set(event.clientX, event.clientY);
    this._dollyStart.set(event.clientX, event.clientY);
  }

  _onMouseMove(event) {
    if (this._state === _STATE.ROTATE) {
      this._rotateEnd.set(event.clientX, event.clientY);
      this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart);
      this._sphericalDelta.theta -= 2 * Math.PI * this._rotateDelta.x / window.innerHeight;
      this._sphericalDelta.phi -= 2 * Math.PI * this._rotateDelta.y / window.innerHeight;
      this._rotateStart.copy(this._rotateEnd);
      this.update();
    }

    if (this._state === _STATE.DOLLY) {
      this._dollyEnd.set(event.clientX, event.clientY);
      this._dollyDelta.subVectors(this._dollyEnd, this._dollyStart);
      this._scale *= 1 + this._dollyDelta.y * 0.005;
      this._dollyStart.copy(this._dollyEnd);
      this.update();
    }
  }

  _onMouseWheel(event) {
    event.preventDefault();
    this._scale *= event.deltaY > 0 ? 1.1 : 0.9;
    this.update();
  }

}

export { OrbitControls };
