import * as THREE from "three";
import type { ContactPose } from "./contact-pose";

/**
 * Original, procedural display assets. Distances are metres; player feet sit at
 * local Y=0 and the face points along +Z. No downloaded artwork or model assets.
 * Each returned group owns its geometry, materials and textures.
 */
export interface PlayerModelOptions {
  id: string;
  number: string | number | undefined;
  color: string;
  accent?: string;
  /** Lower geometric detail and cheaper lighting for distant players. */
  detail?: "high" | "low";
}

export interface PlayerModel {
  root: THREE.Group;
  /** Radians of stride phase, and display speed in metres per second. */
  animate: (phase: number, speed: number, pose?: ContactPose) => void;
  setSelected: (selected: boolean) => void;
}

type Section = readonly [
  y: number,
  halfWidth: number,
  halfDepth: number,
  z?: number,
  x?: number,
];
type Part = {
  geometry: THREE.BufferGeometry;
  color: THREE.Color;
  bone: number;
  shade?: (x: number, y: number, z: number) => number;
  blend?: { bone: number; fromY: number; toY: number; invert?: boolean };
};

const UP = new THREE.Vector3(0, 1, 0);
const identity = new THREE.Quaternion();

type SurfaceOptions = Pick<
  THREE.MeshStandardMaterialParameters,
  | "color"
  | "map"
  | "vertexColors"
  | "roughness"
  | "metalness"
  | "side"
  | "polygonOffset"
  | "polygonOffsetFactor"
  | "polygonOffsetUnits"
>;

/** Preserve authored colors and texture maps while reducing lighting cost. */
function surfaceMaterial(lowDetail: boolean, options: SurfaceOptions) {
  if (!lowDetail) return new THREE.MeshStandardMaterial(options);
  const { roughness: _roughness, metalness: _metalness, ...diffuse } = options;
  return new THREE.MeshLambertMaterial(diffuse);
}

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  }
  return value >>> 0;
}

/** A rounded, tailored cross-section, with broad chest and back surfaces. */
function tailoredGeometry(
  sections: readonly Section[],
  segments = 16,
  rounding = 0.7,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const [y, width, depth, z = 0, x = 0] of sections) {
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const sx = Math.sin(angle);
      const sz = Math.cos(angle);
      positions.push(
        Math.sign(sx) * Math.pow(Math.abs(sx), rounding) * width + x,
        y,
        Math.sign(sz) * Math.pow(Math.abs(sz), rounding) * depth + z,
      );
    }
  }
  for (let ring = 0; ring < sections.length - 1; ring++) {
    for (let i = 0; i < segments; i++) {
      const a = ring * segments + i;
      const b = ring * segments + ((i + 1) % segments);
      const c = b + segments;
      const d = a + segments;
      indices.push(a, b, d, b, c, d);
    }
  }
  // Separate cap vertices keep cap normals out of the cloth/skin side normals.
  // Sharing them creates dark diagonal facets along thighs and shirt hems.
  const lastRing = (sections.length - 1) * segments;
  const bottomCap = positions.length / 3;
  positions.push(...positions.slice(0, segments * 3));
  const topCap = positions.length / 3;
  positions.push(...positions.slice(lastRing * 3, (lastRing + segments) * 3));
  for (let i = 1; i < segments - 1; i++) {
    indices.push(bottomCap, bottomCap + i + 1, bottomCap + i);
    indices.push(topCap, topCap + i, topCap + i + 1);
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}

function croppedHairGeometry(lowDetail = false): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const segments = lowDetail ? 12 : 24;
  const rows = lowDetail ? 5 : 8;
  for (let row = 0; row <= rows; row++) {
    for (let i = 0; i <= segments; i++) {
      const around = (i / segments) * Math.PI * 2;
      // Raise the fringe above the eyebrows; hair continues down the nape.
      const down = (row / rows) * (1.56 - 0.34 * Math.cos(around));
      positions.push(
        0.104 * Math.sin(down) * Math.sin(around),
        1.7 + 0.13 * Math.cos(down),
        -0.008 + 0.105 * Math.sin(down) * Math.cos(around),
      );
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < segments; i++) {
      const a = row * (segments + 1) + i;
      const b = a + 1;
      const c = a + segments + 1;
      indices.push(a, c, b, b, c, c + 1);
    }
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}

function transform(
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3,
  scale = new THREE.Vector3(1, 1, 1),
  rotation = identity,
): THREE.BufferGeometry {
  return geometry.applyMatrix4(
    new THREE.Matrix4().compose(position, rotation, scale),
  );
}

function ellipsoid(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
) {
  return transform(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.Vector3(x, y, z),
    new THREE.Vector3(rx, ry, rz),
  );
}

function tube(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radiusStart: number,
  radiusEnd: number,
  segments = 12,
) {
  const direction = end.clone().sub(start);
  return transform(
    new THREE.CylinderGeometry(
      radiusEnd,
      radiusStart,
      direction.length(),
      segments,
    ),
    start.clone().add(end).multiplyScalar(0.5),
    new THREE.Vector3(1, 1, 1),
    new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()),
  );
}

/**
 * Index vertex attributes by exact stored bytes, without welding nearby values.
 * The index follows the original triangle order. Normals, color/UV seams, bone
 * weights, custom attributes and morph targets all participate in equality.
 * Call before upload; the geometry retains its identity, groups and draw range.
 */
export function indexGeometryExactly(
  geometry: THREE.BufferGeometry,
): THREE.BufferGeometry {
  const count = geometry.getAttribute("position").count;
  type Attribute = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
  const sources: {
    attribute: Attribute;
    bytes: Uint8Array;
    stride: number;
    offset: number;
    size: number;
    replace: (attribute: THREE.BufferAttribute) => void;
  }[] = [];
  function source(
    attribute: Attribute,
    replace: (value: THREE.BufferAttribute) => void,
  ) {
    if (attribute.count !== count) {
      throw new Error(
        "Exact indexing requires equally sized vertex attributes",
      );
    }
    const interleaved = attribute instanceof THREE.InterleavedBufferAttribute;
    const array = attribute.array;
    const bytesPerComponent = array.BYTES_PER_ELEMENT;
    sources.push({
      attribute,
      bytes: new Uint8Array(array.buffer, array.byteOffset, array.byteLength),
      stride:
        (interleaved ? attribute.data.stride : attribute.itemSize) *
        bytesPerComponent,
      offset: (interleaved ? attribute.offset : 0) * bytesPerComponent,
      size: attribute.itemSize * bytesPerComponent,
      replace,
    });
  }
  for (const name of Object.keys(geometry.attributes).sort()) {
    source(geometry.getAttribute(name), (attribute) =>
      geometry.setAttribute(name, attribute),
    );
  }
  for (const [, attributes] of Object.entries(geometry.morphAttributes).sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    attributes.forEach((attribute, i) => {
      source(attribute, (value) => {
        attributes[i] = value;
      });
    });
  }

  function equal(a: number, b: number) {
    for (const source of sources) {
      const aStart = a * source.stride + source.offset;
      const bStart = b * source.stride + source.offset;
      for (let i = 0; i < source.size; i++) {
        if (source.bytes[aStart + i] !== source.bytes[bStart + i]) return false;
      }
    }
    return true;
  }

  const representatives: number[] = [];
  const buckets = new Map<number, number[]>();
  const indices: number[] = [];
  const originalIndex = geometry.getIndex();
  const vertexCount = originalIndex?.count ?? count;
  for (let i = 0; i < vertexCount; i++) {
    const vertex = originalIndex ? originalIndex.getX(i) : i;
    let hash = 2166136261;
    for (const source of sources) {
      const start = vertex * source.stride + source.offset;
      for (let byte = 0; byte < source.size; byte++) {
        hash = Math.imul(hash ^ source.bytes[start + byte], 16777619);
      }
    }
    const bucket = buckets.get(hash);
    // Hash collisions never merge vertices: compare all bytes in the bucket.
    let index = bucket?.find((candidate) =>
      equal(vertex, representatives[candidate]),
    );
    if (index === undefined) {
      index = representatives.length;
      representatives.push(vertex);
      if (bucket) bucket.push(index);
      else buckets.set(hash, [index]);
    }
    indices.push(index);
  }

  for (const source of sources) {
    const { attribute } = source;
    const ArrayType = attribute.array
      .constructor as THREE.TypedArrayConstructor;
    const array = new ArrayType(representatives.length * attribute.itemSize);
    const bytes = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength,
    );
    representatives.forEach((vertex, i) => {
      const start = vertex * source.stride + source.offset;
      bytes.set(
        source.bytes.subarray(start, start + source.size),
        i * source.size,
      );
    });
    const interleaved = attribute instanceof THREE.InterleavedBufferAttribute;
    const AttributeType = interleaved
      ? THREE.BufferAttribute
      : (attribute.constructor as typeof THREE.BufferAttribute);
    const indexedAttribute = new AttributeType(
      array,
      attribute.itemSize,
      attribute.normalized,
    );
    indexedAttribute.name = attribute.name;
    indexedAttribute.setUsage(
      interleaved ? attribute.data.usage : attribute.usage,
    );
    if (!interleaved) indexedAttribute.gpuType = attribute.gpuType;
    source.replace(indexedAttribute);
  }
  geometry.setIndex(indices);
  return geometry;
}

/** Bake cloth tones and garment-joint weights into one draw call per player. */
function combine(parts: Part[], skin = false): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const bones: number[] = [];
  const weights: number[] = [];
  for (const part of parts) {
    const geometry = part.geometry.index
      ? part.geometry.toNonIndexed()
      : part.geometry;
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    for (let i = 0; i < position.count; i++) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i));
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      const shade =
        part.shade?.(position.getX(i), position.getY(i), position.getZ(i)) ?? 1;
      colors.push(
        part.color.r * shade,
        part.color.g * shade,
        part.color.b * shade,
      );
      if (skin) {
        const blend = part.blend;
        const t = blend
          ? THREE.MathUtils.smoothstep(position.getY(i), blend.fromY, blend.toY)
          : 0;
        const weight = blend?.invert ? 1 - t : t;
        bones.push(part.bone, blend?.bone ?? 0, 0, 0);
        weights.push(1 - weight, weight, 0, 0);
      }
    }
    if (geometry !== part.geometry) geometry.dispose();
    part.geometry.dispose();
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  result.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  if (skin) {
    result.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(bones, 4));
    result.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(weights, 4),
    );
  }
  indexGeometryExactly(result);
  result.computeBoundingSphere();
  return result;
}

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  if (typeof document === "undefined") return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function numberTexture(number: string, lightJersey: boolean) {
  return canvasTexture(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const size =
      number.length > 2 ? Math.max(56, 195 / (number.length * 0.62)) : 184;
    ctx.font = `900 ${size}px Arial, sans-serif`;
    ctx.lineJoin = "round";
    ctx.strokeStyle = lightJersey ? "#ffffff" : "#111820";
    ctx.lineWidth = 10;
    ctx.strokeText(number, 128, 137, 230);
    ctx.fillStyle = lightJersey ? "#111820" : "#ffffff";
    ctx.fillText(number, 128, 137, 230);
  });
}

export function createPlayerModel(options: PlayerModelOptions): PlayerModel {
  const lowDetail = options.detail === "low";
  function form(sections: readonly Section[], segments = 16, rounding = 0.7) {
    return tailoredGeometry(
      sections,
      lowDetail ? Math.min(segments, 8) : segments,
      rounding,
    );
  }
  function bodyEllipsoid(
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
  ) {
    if (!lowDetail) return ellipsoid(x, y, z, rx, ry, rz);
    return transform(
      new THREE.SphereGeometry(1, 6, 4),
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(rx, ry, rz),
    );
  }
  function bodyTube(
    start: THREE.Vector3,
    end: THREE.Vector3,
    from: number,
    to: number,
    segments = 12,
  ) {
    return tube(
      start,
      end,
      from,
      to,
      lowDetail ? Math.min(segments, 6) : segments,
    );
  }
  const root = new THREE.Group();
  root.name = `player:${options.id}`;
  root.userData.playerId = options.id;
  const seed = hash(options.id);
  const strideOffset = ((seed % 997) / 997) * Math.PI * 2;
  const jersey = new THREE.Color(options.color);
  const lightJersey =
    jersey.r * 0.2126 + jersey.g * 0.7152 + jersey.b * 0.0722 > 0.4;
  const accent = new THREE.Color(
    options.accent ?? (lightJersey ? "#172536" : "#f4f5ed"),
  );
  const shorts = jersey.clone().multiplyScalar(lightJersey ? 0.28 : 0.48);
  const skin = new THREE.Color(
    ["#dca77e", "#ae7652", "#845238", "#edc19d", "#62432f"][seed % 5],
  );
  const hair = new THREE.Color(
    ["#251c19", "#403024", "#171a20", "#5b422e"][(seed >>> 5) % 4],
  );
  const boots = new THREE.Color(
    ["#e3e8e2", "#1a222e", "#c6d781"][(seed >>> 8) % 3],
  );
  const sole = new THREE.Color("#18222a");
  const parts: Part[] = [];
  const bones: THREE.Bone[] = [];
  const bindPositions: THREE.Vector3[] = [];
  function bone(
    name: string,
    x: number,
    y: number,
    z: number,
    parent?: number,
  ) {
    const joint = new THREE.Bone();
    joint.name = name;
    const world = new THREE.Vector3(x, y, z);
    joint.position.copy(world);
    if (parent !== undefined) {
      joint.position.sub(bindPositions[parent]);
      bones[parent].add(joint);
    }
    bindPositions.push(world);
    bones.push(joint);
    return bones.length - 1;
  }
  function add(
    geometry: THREE.BufferGeometry,
    color: THREE.Color,
    joint: number,
    options: Pick<Part, "shade" | "blend"> = {},
  ) {
    parts.push({ geometry, color, bone: joint, ...options });
  }
  const hips = bone("hips", 0, 0.97, 0);
  const chest = bone("chest", 0, 1.18, 0, hips);
  const head = bone("head", 0, 1.56, 0, chest);
  const legs: { thigh: number; knee: number; ankle: number }[] = [];
  const arms: { shoulder: number; elbow: number }[] = [];

  add(
    form([
      [1.065, 0.17, 0.11],
      [1.1, 0.179, 0.12],
      [1.27, 0.208, 0.139],
      [1.4, 0.233, 0.143],
      [1.48, 0.213, 0.109],
      [1.525, 0.09, 0.074],
    ]),
    jersey,
    chest,
    {
      // Tonal side panels keep the source team hue and the existing material.
      shade: (x, y) =>
        1 -
        0.14 * THREE.MathUtils.smoothstep(Math.abs(x), 0.12, 0.22) -
        0.035 * THREE.MathUtils.smoothstep(y, 1.43, 1.525),
      blend: { bone: hips, fromY: 1.075, toY: 1.21, invert: true },
    },
  );
  // A tapered pelvis and hip-bound shorts tops form a continuous waist instead
  // of the rotating semicircular caps of two disconnected trouser legs.
  add(
    form([
      [0.935, 0.055, 0.092],
      [1.085, 0.17, 0.116],
    ]),
    shorts,
    hips,
  );
  add(
    form([
      [1.06, 0.173, 0.116],
      [1.083, 0.171, 0.115],
    ]),
    shorts.clone().multiplyScalar(0.9),
    hips,
  );
  add(
    bodyTube(
      new THREE.Vector3(0, 1.49, 0),
      new THREE.Vector3(0, 1.588, 0),
      0.066,
      0.063,
    ),
    skin,
    head,
  );
  const collar = new THREE.TorusGeometry(
    0.069,
    0.007,
    lowDetail ? 3 : 5,
    lowDetail ? 8 : 16,
  );
  collar
    .rotateX(Math.PI / 2)
    .scale(1.14, 1, 1)
    .translate(0, 1.531, 0);
  add(collar, accent, chest);

  for (const side of [-1, 1]) {
    const x = side * 0.108;
    const thigh = bone(
      side < 0 ? "left-thigh" : "right-thigh",
      x,
      0.972,
      0,
      hips,
    );
    const knee = bone(
      side < 0 ? "left-knee" : "right-knee",
      x,
      0.527,
      0.014,
      thigh,
    );
    const ankle = bone(
      side < 0 ? "left-ankle" : "right-ankle",
      x,
      0.122,
      0.008,
      knee,
    );
    legs.push({ thigh, knee, ankle });
    const trouser = form(
      [
        [0.827, 0.093, 0.101],
        [0.92, 0.105, 0.11],
        [1.074, 0.085, 0.104],
      ],
      20,
      0.85,
    );
    trouser.translate(x, 0, 0);
    add(trouser, shorts, thigh, {
      shade: (px) =>
        1 - 0.08 * THREE.MathUtils.smoothstep(Math.abs(px), 0.16, 0.215),
      blend: { bone: hips, fromY: 0.9, toY: 1.035 },
    });
    const hem = form([
      [0.823, 0.095, 0.104],
      [0.835, 0.096, 0.106],
    ]).translate(x, 0, 0);
    add(hem, accent, thigh);
    // One continuous leg surface replaces the exposed spherical knee joint.
    add(
      form(
        [
          [0.132, 0.042, 0.045],
          [0.3, 0.061, 0.071, -0.012],
          [0.43, 0.065, 0.073],
          [0.5, 0.062, 0.064, 0.013],
          [0.545, 0.063, 0.068, 0.01],
          [0.62, 0.077, 0.083],
          [0.825, 0.087, 0.095],
        ],
        16,
        1,
      ).translate(x, 0, 0),
      skin,
      knee,
      { blend: { bone: thigh, fromY: 0.48, toY: 0.59 } },
    );
    add(
      form(
        [
          [0.116, 0.043, 0.047, 0.008],
          [0.28, 0.064, 0.074, -0.012],
          [0.433, 0.068, 0.075],
        ],
        16,
        0.9,
      ).translate(x, 0, 0),
      jersey,
      knee,
    );
    add(
      form([
        [0.4, 0.069, 0.077],
        [0.416, 0.07, 0.077],
      ]).translate(x, 0, 0),
      accent,
      knee,
    );
    // Shaped boot upper and a low, separate sole; neutral-pose sole rests at Y=0.
    add(bodyEllipsoid(x, 0.065, 0.05, 0.057, 0.051, 0.134), boots, ankle);
    add(
      form([
        [0, 0.055, 0.126, 0.05],
        [0.024, 0.06, 0.134, 0.05],
      ]).translate(x, 0, 0),
      sole,
      ankle,
    );
    add(
      bodyTube(
        new THREE.Vector3(x - 0.025, 0.101, 0.082),
        new THREE.Vector3(x + 0.025, 0.101, 0.082),
        0.004,
        0.004,
        6,
      ),
      accent,
      ankle,
    );

    const shoulderX = side * 0.225;
    const elbowX = side * 0.332;
    const shoulder = bone(
      side < 0 ? "left-shoulder" : "right-shoulder",
      shoulderX,
      1.45,
      0,
      chest,
    );
    const elbow = bone(
      side < 0 ? "left-elbow" : "right-elbow",
      elbowX,
      1.163,
      0.01,
      shoulder,
    );
    arms.push({ shoulder, elbow });
    add(
      form(
        [
          [1.271, 0.066, 0.068, 0, side * 0.296],
          [1.326, 0.07, 0.075, 0, side * 0.275],
          [1.422, 0.08, 0.089, -0.001, side * 0.23],
          [1.486, 0.061, 0.077, -0.003, side * 0.211],
          [1.506, 0.032, 0.069, -0.005, side * 0.157],
        ],
        lowDetail ? 6 : 12,
        0.9,
      ),
      jersey,
      shoulder,
      {
        shade: (_x, y) =>
          0.94 - 0.07 * THREE.MathUtils.smoothstep(y, 1.36, 1.49),
        blend: { bone: chest, fromY: 1.36, toY: 1.49 },
      },
    );
    add(
      bodyTube(
        new THREE.Vector3(side * 0.291, 1.3, 0),
        new THREE.Vector3(side * 0.302, 1.275, 0),
        0.069,
        0.067,
      ),
      accent,
      shoulder,
    );
    add(
      form(
        [
          [0.986, 0.032, 0.032, 0.067, side * 0.357],
          [1.065, 0.047, 0.047, 0.042, side * 0.35],
          [1.14, 0.051, 0.052, 0.018, side * 0.338],
          [1.182, 0.053, 0.054, 0.008, side * 0.326],
          [1.288, 0.063, 0.063, 0, side * 0.298],
        ],
        lowDetail ? 6 : 12,
        1,
      ),
      skin,
      elbow,
      { blend: { bone: shoulder, fromY: 1.12, toY: 1.215 } },
    );
    add(
      bodyTube(
        new THREE.Vector3(side * 0.356, 1.005, 0.061),
        new THREE.Vector3(side * 0.357, 0.993, 0.066),
        0.037,
        0.035,
      ),
      accent,
      elbow,
    );
    add(
      bodyEllipsoid(side * 0.357, 0.948, 0.081, 0.038, 0.055, 0.029),
      skin,
      elbow,
    );
    add(
      bodyEllipsoid(side * 0.327, 0.958, 0.095, 0.019, 0.029, 0.02),
      skin,
      elbow,
    );
  }

  add(
    form(
      [
        [1.579, 0.047, 0.056, 0.028],
        [1.588, 0.065, 0.068, 0.027],
        [1.624, 0.085, 0.079, 0.018],
        [1.679, 0.097, 0.09, 0.003],
        [1.723, 0.094, 0.089, -0.002],
        [1.764, 0.084, 0.082, -0.005],
        [1.8, 0.062, 0.064, -0.01],
        [1.819, 0.03, 0.035, -0.01],
        [1.823, 0.005, 0.008, -0.01],
      ],
      24,
      1,
    ),
    skin,
    head,
  );
  for (const side of [-1, 1]) {
    add(
      bodyEllipsoid(side * 0.096, 1.678, -0.002, 0.015, 0.026, 0.012),
      skin,
      head,
    );
    add(
      bodyEllipsoid(side * 0.035, 1.695, 0.086, 0.009, 0.0033, 0.003),
      sole,
      head,
    );
    add(
      bodyTube(
        new THREE.Vector3(side * 0.023, 1.708, 0.085),
        new THREE.Vector3(side * 0.047, 1.707, 0.081),
        0.0025,
        0.002,
        5,
      ),
      hair,
      head,
    );
  }
  add(
    form(
      [
        [1.651, 0.012, 0.01, 0.096],
        [1.663, 0.016, 0.015, 0.096],
        [1.695, 0.007, 0.007, 0.089],
      ],
      12,
      1,
    ),
    skin,
    head,
  );
  add(
    bodyTube(
      new THREE.Vector3(-0.021, 1.634, 0.095),
      new THREE.Vector3(0.021, 1.634, 0.095),
      0.0017,
      0.0017,
      5,
    ),
    skin.clone().multiplyScalar(0.57),
    head,
  );
  add(croppedHairGeometry(lowDetail), hair, head);

  const geometry = combine(parts, true);
  const material = surfaceMaterial(lowDetail, {
    vertexColors: true,
    roughness: 0.78,
    metalness: 0,
  });
  const body = new THREE.SkinnedMesh(geometry, material);
  body.name = "rugby-kit-and-body";
  body.castShadow = true;
  body.receiveShadow = true;
  body.add(bones[hips]);
  body.bind(new THREE.Skeleton(bones));
  // The animation stays in a small local envelope. A fixed conservative bound
  // avoids walking limbs being clipped by the bind-pose bounding sphere.
  body.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0), 1.35);
  body.boundingBox = new THREE.Box3(
    new THREE.Vector3(-0.75, -0.25, -0.8),
    new THREE.Vector3(0.75, 1.95, 0.8),
  );
  root.add(body);

  if (options.number !== undefined && String(options.number).length) {
    const texture = numberTexture(String(options.number), lightJersey);
    if (texture) {
      const numberMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
        toneMapped: false,
      });
      const front = new THREE.Mesh(
        new THREE.PlaneGeometry(0.25, 0.26),
        numberMaterial,
      );
      front.name = "jersey-number-front";
      front.position.set(0, 0.164, 0.147);
      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.295),
        numberMaterial,
      );
      back.name = "jersey-number-back";
      back.position.set(0, 0.151, -0.147);
      back.rotation.y = Math.PI;
      bones[chest].add(front, back);
    }
  }

  const selected = new THREE.Mesh(
    new THREE.RingGeometry(0.34, 0.395, 48),
    new THREE.MeshBasicMaterial({
      color: "#ffd46b",
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  selected.name = "player-selection-ring";
  selected.rotation.x = -Math.PI / 2;
  selected.position.y = 0.025;
  selected.visible = false;
  root.add(selected);
  root.traverse((object) => {
    object.userData.playerId = options.id;
  });

  function animate(phase: number, speed: number, pose?: ContactPose) {
    body.rotation.set(0, 0, 0);
    body.position.set(0, 0, 0);
    const movement = THREE.MathUtils.clamp(
      Math.abs(Number.isFinite(speed) ? speed : 0) / 5.8,
      0,
      1,
    );
    const stride = (Number.isFinite(phase) ? phase : 0) + strideOffset;
    bones[hips].position.y =
      0.97 + Math.abs(Math.sin(stride)) * 0.022 * movement;
    bones[hips].rotation.y = Math.sin(stride) * 0.035 * movement;
    bones[chest].rotation.x = 0.095 * movement;
    bones[chest].rotation.y = -Math.sin(stride) * 0.05 * movement;
    bones[head].rotation.x = -0.065 * movement;
    legs.forEach((leg, index) => {
      const p = stride + index * Math.PI;
      bones[leg.thigh].rotation.x = Math.sin(p) * 0.57 * movement;
      bones[leg.knee].rotation.x = Math.max(0, Math.cos(p)) * 0.95 * movement;
      bones[leg.ankle].rotation.x = -Math.max(0, Math.cos(p)) * 0.28 * movement;
    });
    arms.forEach((arm, index) => {
      const swing = Math.sin(stride + index * Math.PI);
      bones[arm.shoulder].rotation.x = -swing * 0.42 * movement - 0.09;
      bones[arm.elbow].rotation.x = -0.22 - 0.95 * movement;
      bones[arm.shoulder].rotation.z = 0;
    });
    if (!pose) return;
    const weight = THREE.MathUtils.clamp(pose.weight, 0, 1);
    const bend =
      pose.kind === "pickup"
        ? 0.85
        : pose.kind === "over"
          ? 0.7
          : pose.kind === "tackle"
            ? 0.65
            : 0.3;
    bones[chest].rotation.x += bend * weight;
    bones[head].rotation.x -= bend * 0.65 * weight;
    arms.forEach((arm, index) => {
      bones[arm.shoulder].rotation.x = THREE.MathUtils.lerp(
        bones[arm.shoulder].rotation.x,
        pose.kind === "pickup" ? -0.2 : -1.05,
        weight,
      );
      bones[arm.elbow].rotation.x = THREE.MathUtils.lerp(
        bones[arm.elbow].rotation.x,
        pose.kind === "pickup" ? -0.15 : -0.8,
        weight,
      );
      if (pose.kind === "latch")
        bones[arm.shoulder].rotation.z = pose.side * 0.65 * weight;
    });
    if (pose.kind === "ground") {
      body.rotation.x = (Math.PI / 2) * weight;
      body.position.y = 0.18 * weight;
      body.position.z = -0.85 * weight;
      bones[chest].rotation.x *= 1 - weight;
      legs.forEach((leg) => {
        bones[leg.thigh].rotation.x *= 1 - weight;
        bones[leg.knee].rotation.x *= 1 - weight;
      });
    }
  }
  animate(0, 0);
  return {
    root,
    animate,
    setSelected: (value) => {
      selected.visible = value;
    },
  };
}

export function createRugbyBall(): THREE.Group {
  const root = new THREE.Group();
  root.name = "rugby-ball";
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = (i / 20) * Math.PI;
    profile.push(
      new THREE.Vector2(
        0.089 * Math.pow(Math.sin(t), 1.18),
        -0.14 * Math.cos(t),
      ),
    );
  }
  const geometry = new THREE.LatheGeometry(profile, 32);
  // The long axis is local X; the adapter may set the ball's presentation pose.
  geometry.rotateZ(Math.PI / 2);
  const map = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#f3f0df";
    ctx.fillRect(0, 0, 512, 512);
    for (let panel = 0; panel < 4; panel++) {
      const x = panel * 128;
      ctx.strokeStyle = "#7c878b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
      ctx.fillStyle = panel % 2 ? "#233c4c" : "#326375";
      for (const end of [0, 1]) {
        ctx.save();
        ctx.translate(x + 64, end ? 512 : 0);
        ctx.scale(1, end ? -1 : 1);
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(40, 0);
        ctx.lineTo(32, 135);
        ctx.lineTo(0, 199);
        ctx.lineTo(-32, 135);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    // Fine dimples are authored into the leather without any external image.
    ctx.fillStyle = "rgba(31,45,48,.15)";
    for (let y = 8; y < 512; y += 9) {
      for (let x = 6; x < 512; x += 9) {
        ctx.beginPath();
        ctx.arc(x + (y % 2) * 3, y, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: map ? "#ffffff" : "#f3f0df",
      map: map ?? null,
      roughness: 0.73,
      metalness: 0,
    }),
  );
  mesh.name = "stitched-oval-ball";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Own the shadow material with the ball. The shared r186 depth material can
  // otherwise re-upload a disposed leather map from its cached uniforms when
  // quality changes replace the ball. Release this with the main material.
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial();
  root.add(mesh);
  return root;
}

function turfTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const bladeShades = new Float32Array(size);
  let random = 51371;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      // Small correlated strokes read as mown blades instead of coarse static.
      // Keep the existing 128-square map shared by pitch and surroundings.
      if (y % 3 === 0) bladeShades[x] = (random % 17) - 8;
      const shade =
        230 + bladeShades[x] * 0.6 + (((random >>> 8) % 7) - 3) * 0.7;
      const index = (y * size + x) * 4;
      data[index] = shade;
      data[index + 1] = shade;
      data[index + 2] = shade;
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** Board (x,y) maps to world (x-width/2, 0, y-height/2). */
export function createPitch(
  width: number,
  height: number,
  detail: "high" | "low" = "high",
): THREE.Group {
  const lowDetail = detail === "low";
  const root = new THREE.Group();
  root.name = "rugby-pitch";
  const halfW = width / 2;
  const halfH = height / 2;
  const inGoal = Math.min(10, height * 0.1);
  const turfLength = height + inGoal * 2;
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(width + 18, 0.2, turfLength + 16),
    // Match the textured pitch's average tone at the shallow runoff edge.
    surfaceMaterial(lowDetail, { color: "#406e47", roughness: 1 }),
  );
  apron.name = "pitch-surround";
  apron.position.y = -0.14;
  apron.receiveShadow = true;
  root.add(apron);

  // One vertex-colored surface retains the mowing bands at long camera ranges;
  // tiled grain supplies close detail without creating thousands of grass meshes.
  const strips: Part[] = [];
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    const strip = new THREE.PlaneGeometry(width, turfLength / bands);
    strip
      .rotateX(-Math.PI / 2)
      .translate(0, 0, -turfLength / 2 + ((i + 0.5) * turfLength) / bands);
    strips.push({
      geometry: strip,
      color: new THREE.Color(i % 2 ? "#477a50" : "#407349"),
      bone: 0,
    });
  }
  const grassGeometry = combine(strips);
  const positions = grassGeometry.getAttribute("position");
  const uv: number[] = [];
  for (let i = 0; i < positions.count; i++)
    uv.push(positions.getX(i) / 3, positions.getZ(i) / 3);
  grassGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  const texture = turfTexture();
  const surroundingGeometry = new THREE.PlaneGeometry(1000, 1000);
  surroundingGeometry.rotateX(-Math.PI / 2).translate(0, -0.245, 0);
  const surroundingUv = surroundingGeometry.getAttribute("uv");
  for (let i = 0; i < surroundingUv.count; i++) {
    surroundingUv.setXY(
      i,
      surroundingUv.getX(i) * 250,
      surroundingUv.getY(i) * 250,
    );
  }
  const surroundingGrass = new THREE.Mesh(
    surroundingGeometry,
    surfaceMaterial(lowDetail, {
      map: texture,
      color: "#477a50",
      roughness: 1,
    }),
  );
  surroundingGrass.name = "grass-to-horizon";
  surroundingGrass.receiveShadow = true;
  root.add(surroundingGrass);
  const grass = new THREE.Mesh(
    grassGeometry,
    surfaceMaterial(lowDetail, {
      map: texture,
      vertexColors: true,
      roughness: 0.98,
      metalness: 0,
    }),
  );
  grass.name = "mown-grass";
  grass.receiveShadow = true;
  root.add(grass);

  const paint: Part[] = [];
  const white = new THREE.Color("#eef3df");
  function line(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    thickness = 0.12,
  ) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    if (length < 0.001) return;
    const geometry = new THREE.PlaneGeometry(thickness, length);
    geometry.rotateX(-Math.PI / 2).rotateY(Math.atan2(x2 - x1, z2 - z1));
    geometry.translate((x1 + x2) / 2, 0.013, (z1 + z2) / 2);
    paint.push({ geometry, color: white, bone: 0 });
  }
  function dashed(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    dash = 1.8,
    gap = 1.4,
  ) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    for (let offset = 0; offset < length; offset += dash + gap) {
      const end = Math.min(offset + dash, length);
      line(
        x1 + ((x2 - x1) * offset) / length,
        z1 + ((z2 - z1) * offset) / length,
        x1 + ((x2 - x1) * end) / length,
        z1 + ((z2 - z1) * end) / length,
        0.1,
      );
    }
  }
  for (const side of [-1, 1]) {
    line(side * halfW, -halfH - inGoal, side * halfW, halfH + inGoal);
    line(-halfW, side * (halfH + inGoal), halfW, side * (halfH + inGoal));
    line(-halfW, side * halfH, halfW, side * halfH, 0.16);
    line(
      -halfW,
      side * (halfH - Math.min(22, height * 0.22)),
      halfW,
      side * (halfH - Math.min(22, height * 0.22)),
    );
    dashed(
      -halfW,
      side * Math.min(10, height * 0.1),
      halfW,
      side * Math.min(10, height * 0.1),
    );
    dashed(
      -halfW,
      side * (halfH - Math.min(5, height * 0.05)),
      halfW,
      side * (halfH - Math.min(5, height * 0.05)),
    );
    for (const inset of [
      Math.min(5, width / 14),
      Math.min(15, (width * 3) / 14),
    ]) {
      dashed(side * (halfW - inset), -halfH, side * (halfW - inset), halfH);
    }
  }
  line(-halfW, 0, halfW, 0, 0.14);
  line(0, -0.25, 0, 0.25, 0.14);
  const lines = new THREE.Mesh(
    combine(paint),
    surfaceMaterial(lowDetail, {
      vertexColors: true,
      roughness: 0.93,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  lines.name = "rugby-field-markings";
  lines.receiveShadow = true;
  root.add(lines);

  const hardware: Part[] = [];
  const postWhite = new THREE.Color("#f1f4ef");
  const padColor = new THREE.Color("#173c48");
  function hardwarePart(geometry: THREE.BufferGeometry, color: THREE.Color) {
    hardware.push({ geometry, color, bone: 0 });
  }
  const postSpacing = Math.min(5.6, width * 0.24);
  for (const end of [-1, 1]) {
    const z = end * halfH;
    for (const side of [-1, 1]) {
      const x = (side * postSpacing) / 2;
      hardwarePart(
        tube(
          new THREE.Vector3(x, 0, z),
          new THREE.Vector3(x, 8.5, z),
          0.065,
          0.052,
        ),
        postWhite,
      );
      hardwarePart(
        new THREE.BoxGeometry(0.38, 1.55, 0.38).translate(x, 0.775, z),
        padColor,
      );
      hardwarePart(
        new THREE.BoxGeometry(0.39, 0.07, 0.39).translate(x, 1.43, z),
        postWhite,
      );
    }
    hardwarePart(
      tube(
        new THREE.Vector3(-postSpacing / 2, 2.94, z),
        new THREE.Vector3(postSpacing / 2, 2.94, z),
        0.06,
        0.06,
      ),
      postWhite,
    );
  }
  const flagColor = new THREE.Color("#e0b965");
  const flagPositions: [number, number][] = [];
  for (const side of [-1, 1]) {
    for (const z of [-halfH - inGoal, -halfH, halfH, halfH + inGoal])
      flagPositions.push([side * halfW, z]);
    for (const z of [
      -halfH + Math.min(22, height * 0.22),
      0,
      halfH - Math.min(22, height * 0.22),
    ])
      flagPositions.push([side * (halfW + 2), z]);
  }
  for (const [x, z] of flagPositions) {
    hardwarePart(
      tube(
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x, 1.5, z),
        0.022,
        0.018,
        6,
      ),
      postWhite,
    );
    const flag = new THREE.BufferGeometry();
    flag.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          x,
          1.46,
          z,
          x + 0.22,
          1.43,
          z + 0.04,
          x,
          1.17,
          z,
          x + 0.22,
          1.43,
          z + 0.04,
          x + 0.37,
          1.4,
          z - 0.01,
          x + 0.22,
          1.2,
          z + 0.04,
          x,
          1.17,
          z,
          x + 0.22,
          1.43,
          z + 0.04,
          x + 0.22,
          1.2,
          z + 0.04,
        ],
        3,
      ),
    );
    flag.computeVertexNormals();
    hardwarePart(flag, flagColor);
  }
  const posts = new THREE.Mesh(
    combine(hardware),
    surfaceMaterial(lowDetail, {
      vertexColors: true,
      roughness: 0.6,
      side: THREE.DoubleSide,
    }),
  );
  posts.name = "goal-posts-pads-and-flags";
  posts.castShadow = true;
  posts.receiveShadow = true;
  root.add(posts);
  return root;
}
