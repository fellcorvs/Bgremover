"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, TransformControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

interface FreestyleItem {
  id: string;
  src: string;
  assetName?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  flipH?: boolean;
  flipV?: boolean;
  offsetX?: number;
  offsetY?: number;
  imgScale?: number;
  shape?: string;
  borderWidth?: number;
  borderColor?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blendMode?: string;
  perspectiveX?: number;
  perspectiveY?: number;
  assetType?: "image" | "model";
  designs?: Record<string, string | null>;
  colors?: Record<string, string | null>;
}

interface DecalSettings {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

type GarmentRegion = "overall" | "front" | "back" | "left-shoulder" | "right-shoulder" | "round-neck";
type GarmentDesigns = Record<GarmentRegion, string | null>;
type GarmentColors = Record<GarmentRegion, string | null>;
type GarmentDesignSettings = Record<GarmentRegion, DecalSettings>;
export type RegionMeshAssignments = Record<string, Exclude<GarmentRegion, "overall">>;
export type ThreeDEditorTool = "select" | "orbit" | "pan" | "move" | "rotate" | "scale";
export type ThreeDViewPreset = "front" | "back" | "left" | "right" | "top" | "home";

const GARMENT_REGIONS: GarmentRegion[] = ["overall", "front", "back", "left-shoulder", "right-shoulder", "round-neck"];
const EMPTY_GARMENT_DESIGNS: GarmentDesigns = {
  overall: null,
  front: null,
  back: null,
  "left-shoulder": null,
  "right-shoulder": null,
  "round-neck": null,
};
const DEFAULT_GARMENT_COLORS: GarmentColors = {
  overall: "#ffffff",
  front: null,
  back: null,
  "left-shoulder": null,
  "right-shoulder": null,
  "round-neck": null,
};
const DEFAULT_GARMENT_DESIGN_SETTINGS: GarmentDesignSettings = {
  overall: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  front: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  back: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  "left-shoulder": { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  "right-shoulder": { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  "round-neck": { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
};

export interface ShirtTextOverlay {
  id: string;
  text: string;
  fontSize: number;
  fontFamily?: string;
  color: string;
  opacity?: number;
  bold: boolean;
  italic: boolean;
  rotation: number;
  effect: "none" | "shadow" | "outline" | "glow";
  effectColor: string;
  mockupSide?: "front" | "back" | "both";
  mockupPlacement?: "body" | "left-shoulder" | "right-shoulder";
  mockupRegion?: "overall" | "front" | "back" | "left-shoulder" | "right-shoulder";
  mockupOffsetX?: number;
  mockupOffsetY?: number;
  mockupCurve?: number;
  letterSpacing?: number;
}

export interface ThreeDExportApi {
  exportFrontBack: (format: "png" | "jpg") => Promise<Blob>;
}

const PERSON_MODEL_PATTERN = /(player|portrait|person|girl|man|woman|confidence|stride|casual|crossed-leg)/i;
const GARMENT_MODEL_PATTERN = /(shirt|t-shirt|tshirt|jersey|uniform|hoodie|sweater|dress|camisa|cloth|top|cap|hat)/i;
const GARMENT_MESH_PATTERN = /(shirt|t-shirt|tshirt|jersey|uniform|hoodie|sweater|dress|camisa|cloth|body[_\s-]*(front|back)|sleeve|torso|top|cap|hat|crown|brim)/i;
const GENERIC_FONT_FAMILIES = new Set(["sans-serif", "serif", "monospace", "cursive", "fantasy"]);

function getCanvasFontFamily(fontFamily?: string) {
  const family = (fontFamily || "Arial").replace(/["\\]/g, "");
  return GENERIC_FONT_FAMILIES.has(family) ? family : `"${family}", sans-serif`;
}

function normalizeMalformedGarmentUvs(mesh: THREE.Mesh) {
  const uv = mesh.geometry.getAttribute("uv");
  if (!uv || uv.count === 0) return null;

  let minU = Infinity;
  let minV = Infinity;
  let maxU = -Infinity;
  let maxV = -Infinity;
  for (let index = 0; index < uv.count; index += 1) {
    const u = uv.getX(index);
    const v = uv.getY(index);
    minU = Math.min(minU, u);
    minV = Math.min(minV, v);
    maxU = Math.max(maxU, u);
    maxV = Math.max(maxV, v);
  }

  const spanU = maxU - minU;
  const spanV = maxV - minV;
  const isMalformed = minU < -2 || minV < -2 || maxU > 3 || maxV > 3 || spanU > 4 || spanV > 4;
  if (!isMalformed || spanU < 0.000001 || spanV < 0.000001) return null;

  const normalizedUvs = new Float32Array(uv.count * 2);
  for (let index = 0; index < uv.count; index += 1) {
    normalizedUvs[index * 2] = (uv.getX(index) - minU) / spanU;
    normalizedUvs[index * 2 + 1] = (uv.getY(index) - minV) / spanV;
  }

  mesh.geometry = mesh.geometry.clone();
  mesh.geometry.setAttribute("uv", new THREE.BufferAttribute(normalizedUvs, 2));
  return mesh.geometry;
}

function getConnectedComponentGeometries(source: THREE.BufferGeometry) {
  const index = source.getIndex();
  const position = source.getAttribute("position");
  if (!index || !position) return [];
  const parent = Int32Array.from({ length: position.count }, (_, vertex) => vertex);
  const find = (vertex: number): number => {
    let root = vertex;
    while (parent[root] !== root) root = parent[root];
    while (parent[vertex] !== vertex) {
      const next = parent[vertex];
      parent[vertex] = root;
      vertex = next;
    }
    return root;
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
  };
  for (let offset = 0; offset < index.count; offset += 3) {
    union(index.getX(offset), index.getX(offset + 1));
    union(index.getX(offset + 1), index.getX(offset + 2));
  }
  const componentIndices = new Map<number, number[]>();
  for (let offset = 0; offset < index.count; offset += 3) {
    const root = find(index.getX(offset));
    const indices = componentIndices.get(root) || [];
    indices.push(index.getX(offset), index.getX(offset + 1), index.getX(offset + 2));
    componentIndices.set(root, indices);
  }
  return Array.from(componentIndices.values()).map((indices) => {
    const geometry = source.clone();
    geometry.setIndex(indices);
    const bounds = new THREE.Box3();
    const point = new THREE.Vector3();
    indices.forEach((vertex) => {
      point.fromBufferAttribute(position, vertex);
      bounds.expandByPoint(point);
    });
    geometry.boundingBox = bounds;
    geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
    return geometry;
  });
}

function mergeGeometryParts(parts: THREE.BufferGeometry[]) {
  if (parts.length === 0) return null;
  const geometries = parts.map((part) => part.index ? part.toNonIndexed() : part.clone());
  const attributeNames = Object.keys(geometries[0].attributes).filter((name) => (
    geometries.every((geometry) => {
      const first = geometries[0].getAttribute(name);
      const current = geometry.getAttribute(name);
      return current && current.itemSize === first.itemSize;
    })
  ));
  const result = new THREE.BufferGeometry();
  attributeNames.forEach((name) => {
    const first = geometries[0].getAttribute(name);
    const totalCount = geometries.reduce((sum, geometry) => sum + geometry.getAttribute(name).count, 0);
    const values = new Float32Array(totalCount * first.itemSize);
    let offset = 0;
    geometries.forEach((geometry) => {
      const attribute = geometry.getAttribute(name);
      for (let index = 0; index < attribute.count; index += 1) {
        for (let component = 0; component < attribute.itemSize; component += 1) {
          values[offset++] = attribute.getComponent(index, component);
        }
      }
    });
    result.setAttribute(name, new THREE.BufferAttribute(values, first.itemSize, first.normalized));
  });
  result.computeBoundingBox();
  result.computeBoundingSphere();
  geometries.forEach((geometry) => geometry.dispose());
  return result;
}

type GarmentProjection = {
  widthAxis: "x" | "y" | "z";
  heightAxis: "x" | "y" | "z";
  depthAxis: "x" | "y" | "z";
  frontIsGreater: boolean;
};

type AutoRegionProfile = {
  kind: "garment" | "pants" | "box" | "cylinder" | "package" | "bag" | "mug" | "generic";
  source: number[];
  torso: number[];
  front: number[];
  back: number[];
  left: number[];
  right: number[];
  collar: number[];
  confidence: number;
};

const MODEL_REGION_PROFILE_CACHE = new WeakMap<THREE.Object3D, Map<string, AutoRegionProfile>>();

function inferGarmentProjection(scene: THREE.Object3D, frontIsGreater: boolean): GarmentProjection {
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  const spans = { x: size.x, y: size.y, z: size.z };
  const axes: Array<"x" | "y" | "z"> = ["x", "y", "z"];
  axes.sort((left, right) => spans[right] - spans[left]);
  const heightAxis = size.y >= Math.max(size.x, size.z) * 0.58 ? "y" : axes[0];
  const remaining = axes.filter((axis) => axis !== heightAxis);
  const widthAxis = heightAxis === "y" && size.x >= size.z * 0.75
    ? "x"
    : spans[remaining[0]] >= spans[remaining[1]] ? remaining[0] : remaining[1];
  const depthAxis = remaining.find((axis) => axis !== widthAxis) || "z";
  return { widthAxis, heightAxis, depthAxis, frontIsGreater };
}

function detectMockupKind(identity: string, labels: string): AutoRegionProfile["kind"] {
  const searchable = `${identity} ${labels}`;
  if (/(pants|trouser|shorts|legging|jogger)/i.test(searchable)) return "pants";
  if (/(carton|cardboard|box|cube)/i.test(searchable)) return "box";
  if (/(bottle|can\b|jar|tube|flask|container)/i.test(searchable)) return "cylinder";
  if (/(pouch|sachet|wrapper|food.?pack|plastic.?pack|packet)/i.test(searchable)) return "package";
  if (/(backpack|handbag|tote|bag)/i.test(searchable)) return "bag";
  if (/(mug|cup)/i.test(searchable)) return "mug";
  if (/(shirt|t-shirt|tshirt|jersey|uniform|hoodie|sweater|dress|camisa|cloth|top|cap|hat|garment)/i.test(searchable)) return "garment";
  return "generic";
}

function analyzeModelRegions(
  scene: THREE.Object3D,
  projection: GarmentProjection,
  modelIdentity: string,
): AutoRegionProfile {
  let sceneLabels = "";
  scene.traverse((child) => {
    sceneLabels += ` ${child.name || ""}`;
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials: THREE.Material[] = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      sceneLabels += ` ${materials.map((material) => material?.name || "").join(" ")}`;
    }
  });
  const kind = detectMockupKind(modelIdentity, sceneLabels);
  const cacheKey = `${kind}:${projection.widthAxis}:${projection.heightAxis}:${projection.depthAxis}:${projection.frontIsGreater}`;
  const cachedProfiles = MODEL_REGION_PROFILE_CACHE.get(scene);
  const cached = cachedProfiles?.get(cacheKey);
  if (cached) return cached;

  const meshes: Array<{ mesh: THREE.Mesh; label: string; index: number }> = [];
  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const materialNames = (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      .map((material) => material?.name || "")
      .join(" ");
    meshes.push({ mesh, label: `${mesh.name} ${materialNames}`, index: meshes.length });
  });
  const modelBounds = new THREE.Box3().setFromObject(scene);
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const axisValue = (vector: THREE.Vector3, axis: "x" | "y" | "z") => vector[axis];
  const widthMinimum = axisValue(modelBounds.min, projection.widthAxis);
  const heightMinimum = axisValue(modelBounds.min, projection.heightAxis);
  const width = Math.max(axisValue(modelSize, projection.widthAxis), 0.000001);
  const height = Math.max(axisValue(modelSize, projection.heightAxis), 0.000001);
  const parts = meshes.map(({ mesh, label, index }) => {
    const bounds = new THREE.Box3().setFromObject(mesh);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    return {
      index,
      label,
      vertexCount: mesh.geometry.getAttribute("position")?.count || 0,
      widthCenter: (axisValue(center, projection.widthAxis) - widthMinimum) / width,
      heightCenter: (axisValue(center, projection.heightAxis) - heightMinimum) / height,
      widthSize: axisValue(size, projection.widthAxis) / width,
      heightSize: axisValue(size, projection.heightAxis) / height,
    };
  }).filter(({ vertexCount, widthSize, heightSize }) => (
    vertexCount >= 24 && widthSize >= 0.015 && heightSize >= 0.015
  ));
  const isGarmentLike = kind === "garment" || kind === "pants";
  const collar = parts.filter(({ label, widthCenter, heightCenter, widthSize, heightSize }) => (
    /(collar|neck|rib|hood|brim|visor|crown|top|cap|lid|seal|waistband|handle)/i.test(label)
    || (heightCenter >= (isGarmentLike ? 0.82 : 0.78)
      && (!isGarmentLike || (widthCenter >= 0.28 && widthCenter <= 0.72))
      && widthSize <= (isGarmentLike ? 0.55 : 0.9)
      && heightSize <= 0.3)
  ));
  const left = parts.filter((part) => (
    (/(left.*(sleeve|arm|side)|(sleeve|arm|side).*left)/i.test(part.label)
      || (part.widthCenter < 0.34 && part.heightSize >= 0.22))
    && !collar.includes(part)
  ));
  const right = parts.filter((part) => (
    (/(right.*(sleeve|arm|side)|(sleeve|arm|side).*right)/i.test(part.label)
      || (part.widthCenter > 0.66 && part.heightSize >= 0.22))
    && !collar.includes(part)
  ));
  const front = parts.filter(({ label }) => /(^|[\s_.-])front([\s_.-]|$)/i.test(label));
  const back = parts.filter(({ label }) => /(^|[\s_.-])back([\s_.-]|$)/i.test(label));
  let torso = parts.filter((part) => (
    (/(front|back|body|torso|shirt|dress|jacket|hoodie|sweater|panel|main|container|bottle|can|box|carton|pouch|bag|cup|mug)/i.test(part.label)
      || (!isGarmentLike
        ? part.widthSize >= 0.08 && part.heightSize >= 0.08
        : part.widthCenter >= 0.2 && part.widthCenter <= 0.8
          && part.widthSize >= 0.18 && part.heightSize >= 0.25))
    && !left.includes(part)
    && !right.includes(part)
    && !collar.includes(part)
  ));
  if (torso.length === 0) {
    torso = [...parts]
      .filter((part) => !left.includes(part) && !right.includes(part) && !collar.includes(part))
      .sort((a, b) => b.vertexCount - a.vertexCount)
      .slice(0, 2);
  }
  if (!isGarmentLike) {
    torso = parts.filter((part) => !collar.includes(part));
  }
  const assignedCount = new Set([...torso, ...front, ...back, ...left, ...right, ...collar].map(({ index }) => index)).size;
  const profile = {
    kind,
    source: parts.map(({ index }) => index),
    torso: torso.map(({ index }) => index),
    front: front.map(({ index }) => index),
    back: back.map(({ index }) => index),
    left: left.map(({ index }) => index),
    right: right.map(({ index }) => index),
    collar: collar.map(({ index }) => index),
    confidence: parts.length > 0 ? assignedCount / parts.length : 0,
  };
  const profiles = cachedProfiles || new Map<string, AutoRegionProfile>();
  profiles.set(cacheKey, profile);
  MODEL_REGION_PROFILE_CACHE.set(scene, profiles);
  return profile;
}

function maskGarmentTextureHorizontally(
  texture: THREE.Texture,
  minimum: number,
  maximum: number,
) {
  const image = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
  if (!image?.width || !image?.height) return texture;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return texture;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "destination-in";
  const sideWidth = canvas.width / 2;
  for (let side = 0; side < 2; side += 1) {
    const start = side * sideWidth + sideWidth * minimum;
    const end = side * sideWidth + sideWidth * maximum;
    const feather = Math.max(2, sideWidth * 0.006);
    const gradient = context.createLinearGradient(start - feather, 0, end + feather, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(feather / (end - start + feather * 2), "rgba(255,255,255,1)");
    gradient.addColorStop(1 - feather / (end - start + feather * 2), "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(start - feather, 0, end - start + feather * 2, canvas.height);
  }
  const masked = new THREE.CanvasTexture(canvas);
  masked.colorSpace = THREE.SRGBColorSpace;
  masked.flipY = false;
  masked.anisotropy = 8;
  masked.needsUpdate = true;
  return masked;
}

function createShoulderRegionGeometry(
  source: THREE.BufferGeometry,
  region: "left-shoulder" | "right-shoulder",
  projection: {
    widthAxis: "x" | "y" | "z";
    heightAxis: "x" | "y" | "z";
  },
) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute("position");
  if (!position || position.count < 3) {
    geometry.dispose();
    return null;
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) {
    geometry.dispose();
    return null;
  }
  const axisValue = (attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, axis: "x" | "y" | "z", index: number) => (
    axis === "x" ? attribute.getX(index) : axis === "y" ? attribute.getY(index) : attribute.getZ(index)
  );
  const axisMin = (axis: "x" | "y" | "z") => axis === "x" ? bounds.min.x : axis === "y" ? bounds.min.y : bounds.min.z;
  const axisMax = (axis: "x" | "y" | "z") => axis === "x" ? bounds.max.x : axis === "y" ? bounds.max.y : bounds.max.z;
  const widthMin = axisMin(projection.widthAxis);
  const heightMin = axisMin(projection.heightAxis);
  const widthSpan = Math.max(axisMax(projection.widthAxis) - widthMin, 0.000001);
  const heightSpan = Math.max(axisMax(projection.heightAxis) - heightMin, 0.000001);
  const selectedVertices: number[] = [];

  for (let index = 0; index < position.count; index += 3) {
    let widthCenter = 0;
    let heightCenter = 0;
    for (let corner = 0; corner < 3; corner += 1) {
      widthCenter += axisValue(position, projection.widthAxis, index + corner);
      heightCenter += axisValue(position, projection.heightAxis, index + corner);
    }
    const normalizedWidth = (widthCenter / 3 - widthMin) / widthSpan;
    const normalizedHeight = (heightCenter / 3 - heightMin) / heightSpan;
    const inUpperGarment = normalizedHeight >= 0.55 && normalizedHeight <= 0.88;
    const inShoulder = region === "left-shoulder" ? normalizedWidth <= 0.2 : normalizedWidth >= 0.8;
    if (inUpperGarment && inShoulder) {
      selectedVertices.push(index, index + 1, index + 2);
    }
  }

  if (selectedVertices.length < 3) {
    geometry.dispose();
    return null;
  }
  const result = new THREE.BufferGeometry();
  Object.entries(geometry.attributes).forEach(([name, attribute]) => {
    const sourceAttribute = attribute as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    const values = new Float32Array(selectedVertices.length * sourceAttribute.itemSize);
    selectedVertices.forEach((vertexIndex, outputIndex) => {
      for (let component = 0; component < sourceAttribute.itemSize; component += 1) {
        values[outputIndex * sourceAttribute.itemSize + component] = sourceAttribute.getComponent(vertexIndex, component);
      }
    });
    result.setAttribute(name, new THREE.BufferAttribute(values, sourceAttribute.itemSize, sourceAttribute.normalized));
  });
  result.computeBoundingBox();
  result.computeBoundingSphere();
  geometry.dispose();
  return result;
}

function createProjectedRegionGeometry(
  source: THREE.BufferGeometry,
  region: "front" | "back" | "left" | "right" | "round-neck" | "top",
  projection: {
    widthAxis: "x" | "y" | "z";
    heightAxis: "x" | "y" | "z";
    depthAxis: "x" | "y" | "z";
    frontIsGreater: boolean;
  },
) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  if (!position || position.count < 3) {
    geometry.dispose();
    return null;
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) {
    geometry.dispose();
    return null;
  }
  const axisValue = (axis: "x" | "y" | "z", index: number) => (
    axis === "x" ? position.getX(index) : axis === "y" ? position.getY(index) : position.getZ(index)
  );
  const axisMin = (axis: "x" | "y" | "z") => axis === "x" ? bounds.min.x : axis === "y" ? bounds.min.y : bounds.min.z;
  const axisMax = (axis: "x" | "y" | "z") => axis === "x" ? bounds.max.x : axis === "y" ? bounds.max.y : bounds.max.z;
  const widthMin = axisMin(projection.widthAxis);
  const heightMin = axisMin(projection.heightAxis);
  const depthMin = axisMin(projection.depthAxis);
  const widthSpan = Math.max(axisMax(projection.widthAxis) - widthMin, 0.000001);
  const heightSpan = Math.max(axisMax(projection.heightAxis) - heightMin, 0.000001);
  const depthSpan = Math.max(axisMax(projection.depthAxis) - depthMin, 0.000001);
  const selectedVertices: number[] = [];

  for (let index = 0; index < position.count; index += 3) {
    let widthCenter = 0;
    let heightCenter = 0;
    let depthCenter = 0;
    let depthNormal = 0;
    for (let corner = 0; corner < 3; corner += 1) {
      widthCenter += axisValue(projection.widthAxis, index + corner);
      heightCenter += axisValue(projection.heightAxis, index + corner);
      depthCenter += axisValue(projection.depthAxis, index + corner);
      if (normal) {
        depthNormal += projection.depthAxis === "x"
          ? normal.getX(index + corner)
          : projection.depthAxis === "y"
            ? normal.getY(index + corner)
            : normal.getZ(index + corner);
      }
    }
    const normalizedWidth = (widthCenter / 3 - widthMin) / widthSpan;
    const normalizedHeight = (heightCenter / 3 - heightMin) / heightSpan;
    const normalizedDepth = (depthCenter / 3 - depthMin) / depthSpan;
    const averageDepthNormal = depthNormal / 3;
    let widthNormal = 0;
    let heightNormal = 0;
    if (normal) {
      for (let corner = 0; corner < 3; corner += 1) {
        widthNormal += projection.widthAxis === "x"
          ? normal.getX(index + corner)
          : projection.widthAxis === "y"
            ? normal.getY(index + corner)
            : normal.getZ(index + corner);
        heightNormal += projection.heightAxis === "x"
          ? normal.getX(index + corner)
          : projection.heightAxis === "y"
            ? normal.getY(index + corner)
            : normal.getZ(index + corner);
      }
    }
    const isFront = Math.abs(averageDepthNormal) > 0.08
      ? projection.frontIsGreater ? averageDepthNormal > 0 : averageDepthNormal < 0
      : projection.frontIsGreater ? normalizedDepth >= 0.5 : normalizedDepth <= 0.5;
    const selected = region === "front"
      ? isFront
      : region === "back"
        ? !isFront
        : region === "left"
          ? Math.abs(widthNormal / 3) > 0.08 ? widthNormal < 0 : normalizedWidth <= 0.5
          : region === "right"
            ? Math.abs(widthNormal / 3) > 0.08 ? widthNormal > 0 : normalizedWidth >= 0.5
            : region === "top"
              ? Math.abs(heightNormal / 3) > 0.08 ? heightNormal > 0 : normalizedHeight >= 0.72
              : normalizedHeight >= 0.84 && normalizedWidth >= 0.32 && normalizedWidth <= 0.68;
    if (selected) selectedVertices.push(index, index + 1, index + 2);
  }
  if (selectedVertices.length < 3) {
    geometry.dispose();
    return null;
  }
  const result = new THREE.BufferGeometry();
  Object.entries(geometry.attributes).forEach(([name, attribute]) => {
    const sourceAttribute = attribute as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    const values = new Float32Array(selectedVertices.length * sourceAttribute.itemSize);
    selectedVertices.forEach((vertexIndex, outputIndex) => {
      for (let component = 0; component < sourceAttribute.itemSize; component += 1) {
        values[outputIndex * sourceAttribute.itemSize + component] = sourceAttribute.getComponent(vertexIndex, component);
      }
    });
    result.setAttribute(name, new THREE.BufferAttribute(values, sourceAttribute.itemSize, sourceAttribute.normalized));
  });
  result.computeBoundingBox();
  result.computeBoundingSphere();
  geometry.dispose();
  return result;
}

function createMaterialRegionGeometry(
  mesh: THREE.Mesh,
  materialPattern: RegExp,
) {
  const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const selectedVertices: number[] = [];
  source.groups.forEach((group) => {
    const materialName = materials[group.materialIndex ?? 0]?.name || "";
    if (!materialPattern.test(materialName)) return;
    for (let index = group.start; index < group.start + group.count; index += 1) selectedVertices.push(index);
  });
  if (selectedVertices.length < 3) {
    source.dispose();
    return null;
  }
  const result = new THREE.BufferGeometry();
  Object.entries(source.attributes).forEach(([name, attribute]) => {
    const sourceAttribute = attribute as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    const values = new Float32Array(selectedVertices.length * sourceAttribute.itemSize);
    selectedVertices.forEach((vertexIndex, outputIndex) => {
      for (let component = 0; component < sourceAttribute.itemSize; component += 1) {
        values[outputIndex * sourceAttribute.itemSize + component] = sourceAttribute.getComponent(vertexIndex, component);
      }
    });
    result.setAttribute(name, new THREE.BufferAttribute(values, sourceAttribute.itemSize, sourceAttribute.normalized));
  });
  result.computeBoundingBox();
  result.computeBoundingSphere();
  source.dispose();
  return result;
}

function isMockup(item: FreestyleItem) {
  if (item.assetType === "model") return true;
  const cleanSrc = item.src.toLowerCase();
  return cleanSrc.includes("/mockups/") || cleanSrc.includes("mockups?name=") || cleanSrc.endsWith(".glb") || cleanSrc.endsWith(".gltf");
}

function isModelSrc(src: string, assetType?: FreestyleItem["assetType"]) {
  if (assetType === "model") return true;
  const cleanSrc = src.toLowerCase();
  return /\.(glb|gltf|fbx|obj)(?:$|[?#])/i.test(cleanSrc);
}

function SceneGrid({ size }: { size: number }) {
  const grid = useMemo(() => {
    const helper = new THREE.GridHelper(size, Math.max(20, Math.round(size * 3)), 0x858a92, 0x4d5158);
    helper.position.y = 0.012;
    helper.renderOrder = -10;
    const materials = Array.isArray(helper.material) ? helper.material : [helper.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.72;
      material.depthTest = true;
      material.depthWrite = true;
    });
    return helper;
  }, [size]);

  return <primitive object={grid} />;
}

function BoundingBox({ width, height, depth }: { width: number; height: number; depth: number }) {
  return (
    <lineSegments name="editor-selection">
      <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
      <lineBasicMaterial color="#1687ff" transparent opacity={0.95} />
    </lineSegments>
  );
}

function useLoadedFontRevision(labels: ShirtTextOverlay[]) {
  const [revision, setRevision] = useState(0);
  const fontRequestKey = useMemo(
    () => Array.from(new Set(labels.map((label) => {
      const family = getCanvasFontFamily(label.fontFamily);
      return `${label.italic ? "italic " : ""}${label.bold ? "700 " : "400 "}64px ${family}`;
    }))).sort().join("\n"),
    [labels],
  );

  useEffect(() => {
    let cancelled = false;
    const fontRequests = fontRequestKey ? fontRequestKey.split("\n") : [];
    Promise.all(fontRequests.map((font) => document.fonts.load(font)))
      .then(() => document.fonts.ready)
      .then(() => {
        if (!cancelled) setRevision((value) => value + 1);
      })
      .catch(() => {
        if (!cancelled) setRevision((value) => value + 1);
      });
    return () => { cancelled = true; };
  }, [fontRequestKey]);

  return revision;
}

function createShirtTextAtlas(
  labels: ShirtTextOverlay[],
  placement: "body" | "left-shoulder" | "right-shoulder",
) {
  const getRegion = (label: ShirtTextOverlay) => {
    if (label.mockupRegion) return label.mockupRegion;
    if (label.mockupPlacement === "left-shoulder" || label.mockupPlacement === "right-shoulder") {
      return label.mockupPlacement;
    }
    return label.mockupSide === "front" || label.mockupSide === "back" ? label.mockupSide : "overall";
  };
  const printableLabels = labels.filter(
    (label) => {
      const region = getRegion(label);
      const labelPlacement = region === "left-shoulder" || region === "right-shoulder" ? region : "body";
      return label.text.trim() && label.fontSize > 0 && labelPlacement === placement;
    },
  );
  if (printableLabels.length === 0) return null;

  const canvas = document.createElement("canvas");
  const sideSize = 1536;
  canvas.width = sideSize * 2;
  canvas.height = sideSize;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const drawLabel = (label: ShirtTextOverlay, side: "front" | "back") => {
    const region = getRegion(label);
    if (region === "front" && side !== "front") return;
    if (region === "back" && side !== "back") return;
    const sideStart = side === "front" ? 0 : sideSize;
    const fontSize = THREE.MathUtils.clamp(label.fontSize * 3.2, 0, 460);
    const fontFamily = getCanvasFontFamily(label.fontFamily);
    context.save();
    context.globalAlpha = THREE.MathUtils.clamp((label.opacity ?? 100) / 100, 0, 1);
    context.font = `${label.italic ? "italic " : ""}${label.bold ? "700 " : "400 "}${fontSize}px ${fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const letterSpacing = (label.letterSpacing || 0) * 3.2;
    const glyphs = Array.from(label.text);
    const glyphWidths = glyphs.map((glyph) => context.measureText(glyph).width);
    const measured = Math.max(
      glyphWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, glyphs.length - 1) * letterSpacing,
      1,
    );
    const fitScale = Math.min(1, (sideSize * 0.82) / measured);
    context.translate(
      sideStart + sideSize * (0.5 + (label.mockupOffsetX || 0) * 0.38),
      sideSize * (0.44 - (label.mockupOffsetY || 0) * 0.3),
    );
    context.rotate(THREE.MathUtils.degToRad(label.rotation));
    context.scale(fitScale, fitScale);

    const drawGlyph = (glyph: string) => {
      if (label.effect === "shadow" || label.effect === "glow") {
        context.shadowColor = label.effectColor;
        context.shadowBlur = label.effect === "glow" ? 30 : 10;
        context.shadowOffsetX = label.effect === "shadow" ? 8 : 0;
        context.shadowOffsetY = label.effect === "shadow" ? 8 : 0;
      }
      if (label.effect === "outline") {
        context.strokeStyle = label.effectColor;
        context.lineWidth = Math.max(6, fontSize * 0.06);
        context.lineJoin = "round";
        context.strokeText(glyph, 0, 0);
      }
      context.fillStyle = label.color;
      context.fillText(glyph, 0, 0);
    };

    const curve = THREE.MathUtils.clamp(label.mockupCurve || 0, -100, 100);
    if (curve === 0) {
      context.letterSpacing = `${letterSpacing}px`;
      drawGlyph(label.text);
    } else {
      const halfWidth = Math.max(measured * 0.5, 1);
      const curveHeight = (curve / 100) * sideSize * 0.24;
      let cursor = -halfWidth;
      glyphs.forEach((glyph, index) => {
        const width = glyphWidths[index];
        const x = cursor + width * 0.5;
        const normalizedX = x / halfWidth;
        const y = curveHeight * normalizedX * normalizedX - curveHeight * 0.5;
        const tangent = (2 * curveHeight * x) / (halfWidth * halfWidth);
        context.save();
        context.translate(x, y);
        context.rotate(Math.atan(tangent));
        drawGlyph(glyph);
        context.restore();
        cursor += width + letterSpacing;
      });
    }
    context.restore();
  };

  printableLabels.forEach((label) => {
    drawLabel(label, "front");
    drawLabel(label, "back");
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createGarmentTextGeometry(
  source: THREE.BufferGeometry,
  forcedSide?: "front" | "back",
  unmirrorBack = false,
  projection?: {
    widthAxis: "x" | "y" | "z";
    heightAxis: "x" | "y" | "z";
    depthAxis: "x" | "y" | "z";
    frontIsGreater: boolean;
  },
) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute("position");
  if (!position || position.count < 3) {
    geometry.dispose();
    return null;
  }

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) {
    geometry.dispose();
    return null;
  }
  const widthAxis = projection?.widthAxis || "x";
  const heightAxis = projection?.heightAxis || "y";
  const depthAxis = projection?.depthAxis || "z";
  const frontIsGreater = projection?.frontIsGreater ?? true;
  const getAxis = (axis: "x" | "y" | "z", index: number) => (
    axis === "x" ? position.getX(index) : axis === "y" ? position.getY(index) : position.getZ(index)
  );
  const getMinimum = (axis: "x" | "y" | "z") => (
    axis === "x" ? bounds.min.x : axis === "y" ? bounds.min.y : bounds.min.z
  );
  const getMaximum = (axis: "x" | "y" | "z") => (
    axis === "x" ? bounds.max.x : axis === "y" ? bounds.max.y : bounds.max.z
  );
  const widthMin = getMinimum(widthAxis);
  const heightMin = getMinimum(heightAxis);
  const width = Math.max(getMaximum(widthAxis) - widthMin, 0.000001);
  const height = Math.max(getMaximum(heightAxis) - heightMin, 0.000001);
  const depthCenter = (getMinimum(depthAxis) + getMaximum(depthAxis)) * 0.5;
  const atlasUvs = new Float32Array(position.count * 2);

  for (let index = 0; index < position.count; index += 3) {
    const averageDepth = (
      getAxis(depthAxis, index)
      + getAxis(depthAxis, index + 1)
      + getAxis(depthAxis, index + 2)
    ) / 3;
    const isFront = frontIsGreater ? averageDepth >= depthCenter : averageDepth <= depthCenter;
    const side = forcedSide || (isFront ? "front" : "back");
    const sideOffset = side === "front" ? 0 : 0.5;
    const margin = 0.01;
    const halfSpan = 0.5 - margin * 2;
    for (let corner = 0; corner < 3; corner += 1) {
      const vertexIndex = index + corner;
      const widthPosition = getAxis(widthAxis, vertexIndex);
      const rawU = (widthPosition - widthMin) / width;
      const u = side === "back" && unmirrorBack ? 1 - rawU : rawU;
      const v = (getAxis(heightAxis, vertexIndex) - heightMin) / height;
      atlasUvs[vertexIndex * 2] = sideOffset + margin + THREE.MathUtils.clamp(u, 0, 1) * halfSpan;
      atlasUvs[vertexIndex * 2 + 1] = THREE.MathUtils.clamp(v, 0, 1);
    }
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(atlasUvs, 2));
  return geometry;
}

function createCylindricalTextGeometry(
  source: THREE.BufferGeometry,
  side: "front" | "back",
  projection: GarmentProjection,
) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute("position");
  if (!position || position.count < 3) {
    geometry.dispose();
    return null;
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) {
    geometry.dispose();
    return null;
  }
  const axisValue = (axis: "x" | "y" | "z", index: number) => (
    axis === "x" ? position.getX(index) : axis === "y" ? position.getY(index) : position.getZ(index)
  );
  const axisMinimum = (axis: "x" | "y" | "z") => axis === "x" ? bounds.min.x : axis === "y" ? bounds.min.y : bounds.min.z;
  const axisMaximum = (axis: "x" | "y" | "z") => axis === "x" ? bounds.max.x : axis === "y" ? bounds.max.y : bounds.max.z;
  const widthCenter = (axisMinimum(projection.widthAxis) + axisMaximum(projection.widthAxis)) * 0.5;
  const depthCenter = (axisMinimum(projection.depthAxis) + axisMaximum(projection.depthAxis)) * 0.5;
  const heightMinimum = axisMinimum(projection.heightAxis);
  const heightSpan = Math.max(axisMaximum(projection.heightAxis) - heightMinimum, 0.000001);
  const frontDirection = projection.frontIsGreater ? 1 : -1;
  const atlasUvs = new Float32Array(position.count * 2);

  for (let index = 0; index < position.count; index += 1) {
    const width = axisValue(projection.widthAxis, index) - widthCenter;
    const depth = axisValue(projection.depthAxis, index) - depthCenter;
    const facingDepth = depth * frontDirection * (side === "front" ? 1 : -1);
    const facingWidth = width * (side === "front" ? 1 : -1);
    const angle = Math.atan2(facingWidth, facingDepth);
    const wrappedU = THREE.MathUtils.clamp(angle / Math.PI + 0.5, 0, 1);
    const sideOffset = side === "front" ? 0 : 0.5;
    atlasUvs[index * 2] = sideOffset + wrappedU * 0.5;
    atlasUvs[index * 2 + 1] = THREE.MathUtils.clamp(
      (axisValue(projection.heightAxis, index) - heightMinimum) / heightSpan,
      0,
      1,
    );
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(atlasUvs, 2));
  return geometry;
}

function createRigidPlanarTextGeometry(
  source: THREE.BufferGeometry,
  region: "front" | "back" | "left" | "right" | "top",
  projection: GarmentProjection,
) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute("position");
  if (!position || position.count < 3) {
    geometry.dispose();
    return null;
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) {
    geometry.dispose();
    return null;
  }
  const axisValue = (axis: "x" | "y" | "z", index: number) => (
    axis === "x" ? position.getX(index) : axis === "y" ? position.getY(index) : position.getZ(index)
  );
  const axisMinimum = (axis: "x" | "y" | "z") => axis === "x" ? bounds.min.x : axis === "y" ? bounds.min.y : bounds.min.z;
  const axisMaximum = (axis: "x" | "y" | "z") => axis === "x" ? bounds.max.x : axis === "y" ? bounds.max.y : bounds.max.z;
  const horizontalAxis = region === "left" || region === "right" ? projection.depthAxis : projection.widthAxis;
  const verticalAxis = region === "top" ? projection.depthAxis : projection.heightAxis;
  const horizontalMinimum = axisMinimum(horizontalAxis);
  const verticalMinimum = axisMinimum(verticalAxis);
  const horizontalSpan = Math.max(axisMaximum(horizontalAxis) - horizontalMinimum, 0.000001);
  const verticalSpan = Math.max(axisMaximum(verticalAxis) - verticalMinimum, 0.000001);
  const sideOffset = region === "back" ? 0.5 : 0;
  const atlasUvs = new Float32Array(position.count * 2);

  for (let index = 0; index < position.count; index += 1) {
    let u = (axisValue(horizontalAxis, index) - horizontalMinimum) / horizontalSpan;
    if (region === "back" || region === "left") u = 1 - u;
    const v = (axisValue(verticalAxis, index) - verticalMinimum) / verticalSpan;
    atlasUvs[index * 2] = sideOffset + THREE.MathUtils.clamp(u, 0, 1) * 0.5;
    atlasUvs[index * 2 + 1] = THREE.MathUtils.clamp(v, 0, 1);
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(atlasUvs, 2));
  return geometry;
}

function createGarmentRegionTexture(
  image: HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined,
  color: string | null,
  settings: DecalSettings,
  region: Exclude<GarmentRegion, "overall">,
  zoneOnTorso = false,
  flipY = true,
  narrowShoulders = false,
) {
  if (!color && (!image?.width || !image?.height)) return null;
  const sideSize = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = sideSize * 2;
  canvas.height = sideSize;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const sides = region === "front" ? [0] : region === "back" ? [1] : [0, 1];
  sides.forEach((side) => {
    const sideStart = side * sideSize;
    const shoulderWidth = narrowShoulders ? 0.27 : 0.38;
    const shoulderHeight = narrowShoulders ? 0.34 : 0.36;
    const zone = zoneOnTorso
      ? region === "left-shoulder"
        ? { x: sideStart, y: 0, width: sideSize * shoulderWidth, height: sideSize * shoulderHeight }
        : region === "right-shoulder"
          ? {
            x: sideStart + sideSize * (1 - shoulderWidth),
            y: 0,
            width: sideSize * shoulderWidth,
            height: sideSize * shoulderHeight,
          }
          : region === "round-neck"
            ? { x: sideStart + sideSize * 0.32, y: 0, width: sideSize * 0.36, height: sideSize * 0.28 }
            : { x: sideStart, y: 0, width: sideSize, height: sideSize }
      : { x: sideStart, y: 0, width: sideSize, height: sideSize };
    context.save();
    context.beginPath();
    context.rect(zone.x, zone.y, zone.width, zone.height);
    context.clip();
    if (color) {
      context.fillStyle = color;
      context.fillRect(zone.x, zone.y, zone.width, zone.height);
    }
    if (!image?.width || !image?.height) {
      context.restore();
      return;
    }
    const coverScale = Math.max(zone.width / image.width, zone.height / image.height) * settings.scale;
    const drawWidth = image.width * coverScale;
    const drawHeight = image.height * coverScale;
    context.translate(
      zone.x + zone.width * 0.5 + settings.offsetX * zone.width * 0.45,
      zone.y + zone.height * 0.5 - settings.offsetY * zone.height * 0.45,
    );
    context.rotate(THREE.MathUtils.degToRad(settings.rotation));
    context.drawImage(image, -drawWidth * 0.5, -drawHeight * 0.5, drawWidth, drawHeight);
    context.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = flipY;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function PngMockupItem({
  imageSrc,
  designSrc,
  shirtColor,
  designRegion,
  designSettings,
  w,
  h,
  rotation,
  posX,
  isSelected,
  onClick,
}: {
  imageSrc: string;
  modelName?: string;
  designSrc?: string;
  shirtColor: string;
  designRegion: GarmentRegion;
  designSettings: DecalSettings;
  w: number;
  h: number;
  rotation: number;
  posX: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const shirtTexture = useTexture(imageSrc);
  const designTexture = useTexture(designSrc || imageSrc);
  const scale = 220;
  const width = w / scale;
  const height = h / scale;
  const depth = Math.min(width, height) * 0.04;
  const compositeTexture = useMemo(() => {
    const shirtImage = shirtTexture.image as HTMLImageElement | undefined;
    const designImage = designTexture.image as HTMLImageElement | undefined;
    if (!shirtImage?.width || !shirtImage?.height || !designSrc || !designImage?.width || !designImage?.height) {
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(Math.max(shirtImage.width, 1024), 2048);
    canvas.height = Math.round(canvas.width * shirtImage.height / shirtImage.width);
    const context = canvas.getContext("2d");
    if (!context) return null;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    context.drawImage(shirtImage, 0, 0, canvasWidth, canvasHeight);

    const isShoulder = designRegion === "left-shoulder" || designRegion === "right-shoulder";
    const isNeck = designRegion === "round-neck";
    const regionWidth = canvasWidth * (isShoulder ? 0.27 : isNeck ? 0.24 : 0.64);
    const regionHeight = canvasHeight * (isShoulder ? 0.28 : isNeck ? 0.18 : 0.72);
    const baseX = designRegion === "left-shoulder"
      ? canvasWidth * 0.27
      : designRegion === "right-shoulder"
        ? canvasWidth * 0.73
        : canvasWidth * 0.5;
    const baseY = designRegion === "round-neck"
      ? canvasHeight * 0.22
      : designRegion === "left-shoulder" || designRegion === "right-shoulder"
        ? canvasHeight * 0.35
        : canvasHeight * 0.52;
    const coverScale = Math.max(regionWidth / designImage.width, regionHeight / designImage.height) * designSettings.scale;
    const drawWidth = designImage.width * coverScale;
    const drawHeight = designImage.height * coverScale;

    const artwork = document.createElement("canvas");
    artwork.width = canvasWidth;
    artwork.height = canvasHeight;
    const artworkContext = artwork.getContext("2d");
    if (!artworkContext) return null;
    artworkContext.translate(
      baseX + designSettings.offsetX * canvasWidth * 0.3,
      baseY - designSettings.offsetY * canvasHeight * 0.3,
    );
    artworkContext.rotate(THREE.MathUtils.degToRad(designSettings.rotation));
    artworkContext.drawImage(designImage, -drawWidth * 0.5, -drawHeight * 0.5, drawWidth, drawHeight);
    artworkContext.setTransform(1, 0, 0, 1, 0, 0);
    artworkContext.globalCompositeOperation = "destination-in";
    artworkContext.drawImage(shirtImage, 0, 0, canvasWidth, canvasHeight);

    context.drawImage(artwork, 0, 0);
    context.globalCompositeOperation = "multiply";
    context.globalAlpha = 0.42;
    context.drawImage(shirtImage, 0, 0, canvasWidth, canvasHeight);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [
    designRegion,
    designSettings.offsetX,
    designSettings.offsetY,
    designSettings.rotation,
    designSettings.scale,
    designSrc,
    designTexture.image,
    shirtTexture.image,
  ]);
  useEffect(() => () => compositeTexture?.dispose(), [compositeTexture]);

  shirtTexture.colorSpace = THREE.SRGBColorSpace;
  shirtTexture.anisotropy = 8;
  designTexture.colorSpace = THREE.SRGBColorSpace;
  designTexture.anisotropy = 8;

  return (
    <group position={[posX, height / 2, 0]} rotation={[0, -rotation * Math.PI / 180, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh castShadow receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={compositeTexture || shirtTexture}
          color={shirtColor}
          roughness={0.58}
          metalness={0.02}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      {isSelected && <BoundingBox width={width * 1.02} height={height * 1.02} depth={depth * 2} />}
    </group>
  );
}

function MockupItem(props: {
  mappingKey: string;
  imageSrc: string;
  modelName?: string;
  garmentDesigns: GarmentDesigns;
  garmentColors: GarmentColors;
  w: number;
  h: number;
  rotation: number;
  posX: number;
  isSelected: boolean;
  onClick: () => void;
  assetType?: FreestyleItem["assetType"];
  garmentDesignSettings: GarmentDesignSettings;
  shirtTexts: ShirtTextOverlay[];
  activeGarmentRegion: GarmentRegion;
  editorTool: ThreeDEditorTool;
  wireframe: boolean;
  regionMapperEnabled: boolean;
  regionMeshAssignments: RegionMeshAssignments;
  onAssignRegionMesh?: (mappingKey: string, meshIndex: number, region: Exclude<GarmentRegion, "overall">) => void;
}) {
  if (isModelSrc(props.imageSrc, props.assetType)) {
    return <ModelMockupItem {...props} />;
  }
  const {
    garmentDesignSettings: _garmentDesignSettings,
    shirtTexts: _shirtTexts,
    assetType: _assetType,
    modelName: _modelName,
    garmentDesigns,
    garmentColors,
    activeGarmentRegion,
    editorTool: _editorTool,
    wireframe: _wireframe,
    ...pngProps
  } = props;
  const regionalDesign = garmentDesigns[activeGarmentRegion] || (
    activeGarmentRegion === "overall" ? null : garmentDesigns.overall
  );
  return (
    <PngMockupItem
      {...pngProps}
      designSrc={regionalDesign || undefined}
      designRegion={activeGarmentRegion}
      designSettings={props.garmentDesignSettings[activeGarmentRegion]}
      shirtColor={garmentColors[activeGarmentRegion] || garmentColors.overall || "#ffffff"}
    />
  );
}

const FALLBACK_DECAL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function ModelMockupItem({
  mappingKey,
  imageSrc,
  modelName,
  garmentDesigns,
  garmentColors,
  rotation,
  posX,
  isSelected,
  onClick,
  garmentDesignSettings,
  shirtTexts,
  editorTool,
  wireframe,
  activeGarmentRegion,
  regionMapperEnabled,
  regionMeshAssignments,
  onAssignRegionMesh,
}: {
  mappingKey: string;
  imageSrc: string;
  modelName?: string;
  garmentDesigns: GarmentDesigns;
  garmentColors: GarmentColors;
  rotation: number;
  posX: number;
  isSelected: boolean;
  onClick: () => void;
  garmentDesignSettings: GarmentDesignSettings;
  shirtTexts: ShirtTextOverlay[];
  activeGarmentRegion: GarmentRegion;
  editorTool: ThreeDEditorTool;
  wireframe: boolean;
  regionMapperEnabled: boolean;
  regionMeshAssignments: RegionMeshAssignments;
  onAssignRegionMesh?: (mappingKey: string, meshIndex: number, region: Exclude<GarmentRegion, "overall">) => void;
}) {
  const extension = (modelName || imageSrc).split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  const Loader = extension === "fbx" ? FBXLoader : extension === "obj" ? OBJLoader : GLTFLoader;
  const loadedModel = useLoader(Loader as typeof GLTFLoader, imageSrc) as unknown as THREE.Group | { scene: THREE.Group };
  const sourceScene = loadedModel instanceof THREE.Object3D ? loadedModel : loadedModel.scene;
  const designTextures = useTexture(GARMENT_REGIONS.map((region) => garmentDesigns[region] || FALLBACK_DECAL)) as THREE.Texture[];
  const shirtColor = garmentColors.overall || "#ffffff";
  const designTexture = designTextures[0];
  const modelIdentity = `${modelName || ""} ${imageSrc}`;
  const isLongSweater = /girls_long_sweater/i.test(modelIdentity);
  const isLongSleeve = /longsleeve/i.test(modelIdentity);
  const isCap = /(?:^|[\\/])cap\.glb(?:$|[?#])/i.test(imageSrc)
    || /(?:^|[\\/])cap\.glb$/i.test(modelName || "");
  const isDarkBlueShirt = false;
  const isVerifiedMaleShirt = /(?:^|[\\/])t_shirt\.glb(?:$|[?#])/i.test(imageSrc)
    || /(?:^|[\\/])t_shirt\.glb$/i.test(modelName || "");
  const isPerson = PERSON_MODEL_PATTERN.test(modelIdentity) && !isLongSweater;
  const isGarment = GARMENT_MODEL_PATTERN.test(modelIdentity);
  const isFemaleShirt = /t-shirt_for_female/i.test(modelIdentity);
  const isHoodie = /(hoody|hoodie)/i.test(modelIdentity);
  const isFbx = extension === "fbx";
  const inferredProjection = useMemo(
    () => inferGarmentProjection(sourceScene, !isFbx),
    [isFbx, sourceScene],
  );
  const garmentProjection = useMemo(
    () => isDarkBlueShirt
      ? inferredProjection
      : isFemaleShirt
      ? { widthAxis: "y" as const, heightAxis: "z" as const, depthAxis: "x" as const, frontIsGreater: false }
      : inferredProjection,
    [inferredProjection, isDarkBlueShirt, isFemaleShirt],
  );
  const sceneHasGarmentHints = useMemo(() => {
    let names = "";
    sourceScene.traverse((child) => {
      names += ` ${child.name || ""}`;
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        names += ` ${materials.map((material) => material?.name || "").join(" ")}`;
      }
    });
    return GARMENT_MESH_PATTERN.test(names);
  }, [sourceScene]);
  const hasGarmentEdits = useMemo(
    () => Object.values(garmentDesigns).some(Boolean)
      || Object.entries(garmentColors).some(([region, color]) => region !== "overall" ? Boolean(color) : color !== "#ffffff")
      || shirtTexts.length > 0,
    [garmentColors, garmentDesigns, shirtTexts.length],
  );
  const isStandaloneGarment = !isPerson && (
    isGarment
    || sceneHasGarmentHints
    || hasGarmentEdits
    || ["glb", "gltf", "fbx", "obj"].includes(extension || "")
  );
  const usesVerifiedRegionProfile = isCap
    || isDarkBlueShirt
    || isFemaleShirt
    || isHoodie
    || isLongSleeve
    || isLongSweater
    || isVerifiedMaleShirt;
  const [autoRegionProfile, setAutoRegionProfile] = useState<AutoRegionProfile | null>(null);
  useEffect(() => {
    setAutoRegionProfile(null);
    if (!isStandaloneGarment || usesVerifiedRegionProfile) return;
    let cancelled = false;
    const analyze = () => {
      const profile = analyzeModelRegions(sourceScene, garmentProjection, modelIdentity);
      if (!cancelled) setAutoRegionProfile(profile);
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      const requestId = idleWindow.requestIdleCallback(analyze, { timeout: 300 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(requestId);
      };
    }
    const timeoutId = globalThis.setTimeout(analyze, 0);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, [garmentProjection, isStandaloneGarment, modelIdentity, sourceScene, usesVerifiedRegionProfile]);
  const fontRevision = useLoadedFontRevision(shirtTexts);
  const bodyTextAtlas = useMemo(
    () => isStandaloneGarment ? createShirtTextAtlas(shirtTexts, "body") : null,
    [fontRevision, isStandaloneGarment, shirtTexts],
  );
  const leftShoulderTextAtlas = useMemo(
    () => isStandaloneGarment ? createShirtTextAtlas(shirtTexts, "left-shoulder") : null,
    [fontRevision, isStandaloneGarment, shirtTexts],
  );
  const rightShoulderTextAtlas = useMemo(
    () => isStandaloneGarment ? createShirtTextAtlas(shirtTexts, "right-shoulder") : null,
    [fontRevision, isStandaloneGarment, shirtTexts],
  );
  const wrappedDesignTexture = useMemo(() => {
    if (!garmentDesigns.overall) return null;
    const image = designTexture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
    if (!image?.width || !image?.height) return null;
    const canvas = document.createElement("canvas");
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.fillStyle = shirtColor;
    context.fillRect(0, 0, size, size);
    const settings = garmentDesignSettings.overall;
    const coverScale = Math.max(size / image.width, size / image.height) * settings.scale;
    const drawWidth = image.width * coverScale;
    const drawHeight = image.height * coverScale;
    context.translate(
      size * 0.5 + settings.offsetX * size * 0.45,
      size * 0.5 - settings.offsetY * size * 0.45,
    );
    context.rotate(THREE.MathUtils.degToRad(settings.rotation));
    context.drawImage(image, -drawWidth * 0.5, -drawHeight * 0.5, drawWidth, drawHeight);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [designTexture.image, garmentDesignSettings.overall, garmentDesigns.overall, shirtColor]);

  const regionTextures = useMemo(() => {
    const textures = {} as Partial<Record<Exclude<GarmentRegion, "overall">, THREE.Texture>>;
    GARMENT_REGIONS.slice(1).forEach((region, index) => {
      const regional = region as Exclude<GarmentRegion, "overall">;
      const sourceTexture = designTextures[index + 1];
      const image = garmentDesigns[regional]
        ? sourceTexture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined
        : undefined;
      const texture = createGarmentRegionTexture(
        image,
        garmentColors[regional],
        garmentDesignSettings[regional],
        regional,
        false,
        true,
      );
      if (texture) textures[regional] = texture;
    });
    return textures;
  }, [designTextures, garmentColors, garmentDesignSettings, garmentDesigns, isFemaleShirt]);
  const torsoRegionTextures = useMemo(() => {
    const textures = {} as Partial<Record<"left-shoulder" | "right-shoulder" | "round-neck", THREE.Texture>>;
    (["left-shoulder", "right-shoulder", "round-neck"] as const).forEach((regional) => {
      const sourceTexture = designTextures[GARMENT_REGIONS.indexOf(regional)];
      const image = garmentDesigns[regional]
        ? sourceTexture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined
        : undefined;
      const texture = createGarmentRegionTexture(
        image,
        garmentColors[regional],
        garmentDesignSettings[regional],
        regional,
        true,
        true,
        isFemaleShirt,
      );
      if (texture) textures[regional] = texture;
    });
    return textures;
  }, [designTextures, garmentColors, garmentDesignSettings, garmentDesigns, isFemaleShirt]);

  useEffect(() => () => wrappedDesignTexture?.dispose(), [wrappedDesignTexture]);
  useEffect(() => () => Object.values(regionTextures).forEach((texture) => texture?.dispose()), [regionTextures]);
  useEffect(() => () => Object.values(torsoRegionTextures).forEach((texture) => texture?.dispose()), [torsoRegionTextures]);
  useEffect(() => () => bodyTextAtlas?.dispose(), [bodyTextAtlas]);
  useEffect(() => () => leftShoulderTextAtlas?.dispose(), [leftShoulderTextAtlas]);
  useEffect(() => () => rightShoulderTextAtlas?.dispose(), [rightShoulderTextAtlas]);

  const preparedModel = useMemo(() => {
    const clone = cloneSkeleton(sourceScene) as THREE.Group;
    const shirtTint = new THREE.Color(shirtColor);
    const generatedTextures: THREE.Texture[] = [];
    const generatedGeometries: THREE.BufferGeometry[] = [];
    const garmentMeshes: Array<{ mesh: THREE.Mesh; label: string }> = [];
    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const materialNames = (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        .map((material) => material?.name || "")
        .join(" ");
      const hierarchyNames: string[] = [];
      let ancestor: THREE.Object3D | null = mesh;
      while (ancestor && ancestor !== clone) {
        hierarchyNames.push(ancestor.name || "");
        ancestor = ancestor.parent;
      }
      const meshLabel = `${mesh.name} ${materialNames} ${hierarchyNames.join(" ")}`;
      const isGarmentMesh = isStandaloneGarment || GARMENT_MESH_PATTERN.test(meshLabel);
      if (isGarmentMesh) {
        const regionMeshIndex = garmentMeshes.length;
        mesh.userData.regionMeshIndex = regionMeshIndex;
        garmentMeshes.push({ mesh, label: meshLabel });
      }
      if (isGarmentMesh && wrappedDesignTexture) {
        let hasUv = !!mesh.geometry.getAttribute("uv");
        if (!hasUv && mesh.geometry.getAttribute("position")) {
          const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
          mesh.geometry.computeBoundingBox();
          const bounds = mesh.geometry.boundingBox;
          if (bounds) {
            const size = bounds.getSize(new THREE.Vector3());
            const heightAxis = size.y >= Math.max(size.x, size.z) * 0.58 ? "y" : (["x","y","z"] as const).slice().sort((a,b) => (a==="x"?size.x:a==="y"?size.y:size.z) - (b==="x"?size.x:b==="y"?size.y:size.z)).pop()!;
            const widthCenter = (bounds.min.x + bounds.max.x) * 0.5;
            const depthCenter = (bounds.min.z + bounds.max.z) * 0.5;
            const heightMin = bounds.min[heightAxis as "x"|"y"|"z"];
            const heightSpan = Math.max(bounds.max[heightAxis as "x"|"y"|"z"] - heightMin, 0.001);
            const uvs = new Float32Array(position.count * 2);
            const posVec = new THREE.Vector3();
            for (let i = 0; i < position.count; i++) {
              posVec.fromBufferAttribute(position, i);
              const angle = Math.atan2(posVec.x - widthCenter, posVec.z - depthCenter);
              uvs[i * 2] = THREE.MathUtils.clamp(angle / Math.PI + 0.5, 0, 1);
              uvs[i * 2 + 1] = THREE.MathUtils.clamp((posVec[heightAxis as "x"|"y"|"z"] - heightMin) / heightSpan, 0, 1);
            }
            mesh.geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
            hasUv = true;
          }
        }
        if (hasUv) {
          const normalizedGeometry = normalizeMalformedGarmentUvs(mesh);
          if (normalizedGeometry) generatedGeometries.push(normalizedGeometry);
        }
      }
      const prepareMaterial = (mat: THREE.Material) => {
        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
          const next = mat.clone();
          if (isGarmentMesh) {
            if (wrappedDesignTexture && mesh.geometry.getAttribute("uv")) {
              const garmentTexture = wrappedDesignTexture.clone();
              if (mat.map) {
                garmentTexture.offset.copy(mat.map.offset);
                garmentTexture.repeat.copy(mat.map.repeat);
                garmentTexture.center.copy(mat.map.center);
                garmentTexture.rotation = mat.map.rotation;
                garmentTexture.wrapS = mat.map.wrapS;
                garmentTexture.wrapT = mat.map.wrapT;
                garmentTexture.matrixAutoUpdate = mat.map.matrixAutoUpdate;
                garmentTexture.matrix.copy(mat.map.matrix);
              }
              garmentTexture.colorSpace = THREE.SRGBColorSpace;
              garmentTexture.flipY = false;
              garmentTexture.needsUpdate = true;
              generatedTextures.push(garmentTexture);
              next.map = garmentTexture;
              next.color.set("#ffffff");
              next.transparent = false;
              next.alphaMap = null;
            } else {
              next.color = shirtTint.clone();
            }
            const assignedRegion = regionMeshAssignments[String(mesh.userData.regionMeshIndex)];
            if (regionMapperEnabled && assignedRegion) {
              const highlightColors: Record<Exclude<GarmentRegion, "overall">, string> = {
                front: "#ef4444",
                back: "#3b82f6",
                "left-shoulder": "#22c55e",
                "right-shoulder": "#f97316",
                "round-neck": "#a855f7",
              };
              next.emissive = new THREE.Color(highlightColors[assignedRegion]);
              next.emissiveIntensity = 0.28;
            }
          }
          next.roughness = Math.max(next.roughness, 0.55);
          next.wireframe = wireframe;
          next.needsUpdate = true;
          return next;
        }
        return mat;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(prepareMaterial)
        : prepareMaterial(mesh.material);
    });

    const attachGarmentOverlay = (
      mesh: THREE.Mesh,
      texture: THREE.Texture,
      side?: "front" | "back",
      name = "shirt-region-sublimation",
      preserveArtworkColor = false,
      unmirrorBack = false,
      sourceGeometry = mesh.geometry,
      rigidRegion?: "front" | "back" | "left" | "right" | "top",
    ) => {
      const resolvedRigidRegion = rigidRegion || side;
      const useCylindricalProjection = Boolean(
        side
        && autoRegionProfile
        && (autoRegionProfile.kind === "cylinder" || autoRegionProfile.kind === "mug"),
      );
      const useRigidPlanarProjection = Boolean(
        resolvedRigidRegion
        && autoRegionProfile
        && (autoRegionProfile.kind === "box" || autoRegionProfile.kind === "package"),
      );
      const overlayGeometry = useRigidPlanarProjection
        ? createRigidPlanarTextGeometry(sourceGeometry, resolvedRigidRegion!, garmentProjection)
        : useCylindricalProjection
        ? createCylindricalTextGeometry(sourceGeometry, side!, garmentProjection)
        : createGarmentTextGeometry(sourceGeometry, side, unmirrorBack, garmentProjection);
      if (!overlayGeometry) return;
      generatedGeometries.push(overlayGeometry);
      const commonMaterialSettings = {
        map: texture,
        transparent: true,
        alphaTest: 0.01,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        side: THREE.DoubleSide,
      };
      const overlayMaterial = preserveArtworkColor
        ? new THREE.MeshBasicMaterial({ ...commonMaterialSettings, toneMapped: false })
        : new THREE.MeshStandardMaterial({
          ...commonMaterialSettings,
          roughness: 0.62,
          metalness: 0.01,
        });
      const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
      overlay.name = name;
      overlay.castShadow = false;
      overlay.receiveShadow = false;
      overlay.frustumCulled = false;
      overlay.renderOrder = mesh.renderOrder + 10;
      overlay.raycast = () => null;
      mesh.add(overlay);
    };

    const garmentBounds = garmentMeshes.reduce(
      (bounds, { mesh }) => bounds.union(new THREE.Box3().setFromBufferAttribute(mesh.geometry.getAttribute("position") as THREE.BufferAttribute)),
      new THREE.Box3(),
    );
    const garmentSize = garmentBounds.getSize(new THREE.Vector3());
    const garmentCenter = garmentBounds.getCenter(new THREE.Vector3());
    const manuallyAssignedIndices = new Set(
      Object.keys(regionMeshAssignments).map(Number).filter(Number.isFinite),
    );
    const profileIndices = (indices: number[]) => indices.filter((index) => !manuallyAssignedIndices.has(index));
    const effectiveAutoProfile = autoRegionProfile ? {
      ...autoRegionProfile,
      source: profileIndices(autoRegionProfile.source),
      torso: profileIndices(autoRegionProfile.torso),
      front: profileIndices(autoRegionProfile.front),
      back: profileIndices(autoRegionProfile.back),
      left: profileIndices(autoRegionProfile.left),
      right: profileIndices(autoRegionProfile.right),
      collar: profileIndices(autoRegionProfile.collar),
    } : null;
    const rigidBodyIndex = effectiveAutoProfile && (
      effectiveAutoProfile.kind === "box" || effectiveAutoProfile.kind === "package"
    )
      ? [...effectiveAutoProfile.source].sort((leftIndex, rightIndex) => {
        const volume = (index: number) => {
          const mesh = garmentMeshes[index]?.mesh;
          if (!mesh) return 0;
          const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
          return size.x * size.y * size.z;
        };
        return volume(rightIndex) - volume(leftIndex);
      })[0]
      : undefined;
    const autoAnchorMesh = effectiveAutoProfile
      ? garmentMeshes[rigidBodyIndex ?? effectiveAutoProfile.torso[0] ?? effectiveAutoProfile.source[0]]?.mesh || garmentMeshes[0]?.mesh
      : undefined;
    clone.updateMatrixWorld(true);
    const mergeMeshesIntoAnchorSpace = (indices: number[]) => {
      if (!autoAnchorMesh) return null;
      autoAnchorMesh.updateWorldMatrix(true, false);
      const anchorWorldInverse = autoAnchorMesh.matrixWorld.clone().invert();
      const geometries = indices
        .map((index) => garmentMeshes[index]?.mesh)
        .filter((mesh): mesh is THREE.Mesh => Boolean(mesh))
        .map((mesh) => {
          mesh.updateWorldMatrix(true, false);
          const geometry = mesh.geometry.clone();
          geometry.applyMatrix4(anchorWorldInverse.clone().multiply(mesh.matrixWorld));
          return geometry;
        });
      const merged = mergeGeometryParts(geometries);
      geometries.forEach((geometry) => geometry.dispose());
      return merged;
    };
    const autoTorsoGeometry = effectiveAutoProfile
      ? mergeMeshesIntoAnchorSpace(
        rigidBodyIndex !== undefined
          ? [rigidBodyIndex]
          : effectiveAutoProfile.torso.length > 0 ? effectiveAutoProfile.torso : effectiveAutoProfile.source,
      )
      : null;
    const autoFullGeometry = effectiveAutoProfile
      ? mergeMeshesIntoAnchorSpace(effectiveAutoProfile.source)
      : null;
    const mergeProfileGeometry = (indices: number[]) => mergeMeshesIntoAnchorSpace(indices);
    const namedAutoFrontGeometry = effectiveAutoProfile ? mergeProfileGeometry(effectiveAutoProfile.front) : null;
    const namedAutoBackGeometry = effectiveAutoProfile ? mergeProfileGeometry(effectiveAutoProfile.back) : null;
    const autoFrontGeometry = namedAutoFrontGeometry || (autoTorsoGeometry
      ? createProjectedRegionGeometry(autoTorsoGeometry, "front", garmentProjection)
      : null);
    const autoBackGeometry = namedAutoBackGeometry || (autoTorsoGeometry
      ? createProjectedRegionGeometry(autoTorsoGeometry, "back", garmentProjection)
      : null);
    const autoLeftParts = effectiveAutoProfile ? mergeProfileGeometry(effectiveAutoProfile.left) : null;
    const autoRightParts = effectiveAutoProfile ? mergeProfileGeometry(effectiveAutoProfile.right) : null;
    const autoCollarParts = effectiveAutoProfile ? mergeProfileGeometry(effectiveAutoProfile.collar) : null;
    const autoLeftGeometry = autoLeftParts || (
      effectiveAutoProfile && effectiveAutoProfile.kind !== "garment" && autoTorsoGeometry
        ? createProjectedRegionGeometry(autoTorsoGeometry, "left", garmentProjection)
        : null
    );
    const autoRightGeometry = autoRightParts || (
      effectiveAutoProfile && effectiveAutoProfile.kind !== "garment" && autoTorsoGeometry
        ? createProjectedRegionGeometry(autoTorsoGeometry, "right", garmentProjection)
        : null
    );
    const autoCollarGeometry = autoCollarParts || (
      effectiveAutoProfile && effectiveAutoProfile.kind !== "garment" && (autoFullGeometry || autoTorsoGeometry)
        ? createProjectedRegionGeometry(autoFullGeometry || autoTorsoGeometry!, "top", garmentProjection)
        : null
    );
    const manualGeometry = (region: Exclude<GarmentRegion, "overall">) => mergeProfileGeometry(
      Object.entries(regionMeshAssignments)
        .filter(([, assignedRegion]) => assignedRegion === region)
        .map(([index]) => Number(index))
        .filter(Number.isFinite),
    );
    const manualFrontGeometry = manualGeometry("front");
    const manualBackGeometry = manualGeometry("back");
    const manualLeftGeometry = manualGeometry("left-shoulder");
    const manualRightGeometry = manualGeometry("right-shoulder");
    const manualTopGeometry = manualGeometry("round-neck");
    [
      autoTorsoGeometry,
      autoFullGeometry,
      autoFrontGeometry,
      autoBackGeometry,
      autoLeftGeometry,
      autoRightGeometry,
      autoCollarGeometry,
      namedAutoFrontGeometry,
      namedAutoBackGeometry,
      autoLeftParts,
      autoRightParts,
      autoCollarParts,
      manualFrontGeometry,
      manualBackGeometry,
      manualLeftGeometry,
      manualRightGeometry,
      manualTopGeometry,
    ].forEach((geometry) => {
      if (geometry) generatedGeometries.push(geometry);
    });
    const hoodieParts = isHoodie
      ? garmentMeshes.map((entry) => {
        entry.mesh.geometry.computeBoundingBox();
        const bounds = entry.mesh.geometry.boundingBox!.clone();
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const crossesCenter = bounds.min.x <= garmentCenter.x && bounds.max.x >= garmentCenter.x;
        const isTorso = crossesCenter
          && size.x >= garmentSize.x * 0.55
          && size.y >= garmentSize.y * 0.65
          && bounds.min.y <= garmentBounds.min.y + garmentSize.y * 0.18;
        const isSleeve = !crossesCenter
          && size.y >= garmentSize.y * 0.55
          && Math.abs(center.x - garmentCenter.x) >= garmentSize.x * 0.3;
        const isHood = !isTorso && !isSleeve
          && bounds.min.y >= garmentBounds.min.y + garmentSize.y * 0.55;
        return { ...entry, bounds, size, center, isTorso, isSleeve, isHood };
      })
      : [];
    const sweaterMainMesh = isLongSweater
      ? [...garmentMeshes].sort((left, right) => {
        const leftCount = left.mesh.geometry.getAttribute("position")?.count || 0;
        const rightCount = right.mesh.geometry.getAttribute("position")?.count || 0;
        return rightCount - leftCount;
      })[0]?.mesh
      : undefined;
    const sweaterTrimMesh = isLongSweater
      ? garmentMeshes.find(({ mesh }) => mesh !== sweaterMainMesh)?.mesh
      : undefined;
    const sweaterComponents = sweaterMainMesh ? getConnectedComponentGeometries(sweaterMainMesh.geometry) : [];
    const sweaterTrimComponents = sweaterTrimMesh ? getConnectedComponentGeometries(sweaterTrimMesh.geometry) : [];
    generatedGeometries.push(...sweaterComponents, ...sweaterTrimComponents);
    const sweaterTorsoParts = sweaterComponents
      .filter((geometry) => {
        const bounds = geometry.boundingBox!;
        const size = bounds.getSize(new THREE.Vector3());
        return size.y >= garmentSize.y * 0.78 && size.x >= garmentSize.x * 0.7;
      })
      .sort((left, right) => {
        const leftCenter = left.boundingBox!.getCenter(new THREE.Vector3()).z;
        const rightCenter = right.boundingBox!.getCenter(new THREE.Vector3()).z;
        return leftCenter - rightCenter;
      });
    const sweaterSleeveParts = sweaterComponents
      .filter((geometry) => !sweaterTorsoParts.includes(geometry))
      .sort((left, right) => (
        left.boundingBox!.getCenter(new THREE.Vector3()).x
        - right.boundingBox!.getCenter(new THREE.Vector3()).x
      ));
    const sweaterCollarParts = sweaterTrimComponents.filter((geometry) => {
      const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
      return center.y >= garmentBounds.min.y + garmentSize.y * 0.82
        && Math.abs(center.x - garmentCenter.x) <= garmentSize.x * 0.25;
    });
    const sweaterCuffParts = sweaterTrimComponents
      .filter((geometry) => !sweaterCollarParts.includes(geometry))
      .sort((left, right) => (
        left.boundingBox!.getCenter(new THREE.Vector3()).x
        - right.boundingBox!.getCenter(new THREE.Vector3()).x
      ));
    const longSleeveMeshesByName = new Map(
      isLongSleeve ? garmentMeshes.map(({ mesh }) => [mesh.name, mesh] as const) : [],
    );
    const mergeLongSleevePanels = (names: string[]) => mergeGeometryParts(
      names
        .map((name) => longSleeveMeshesByName.get(name)?.geometry)
        .filter((geometry): geometry is THREE.BufferGeometry => Boolean(geometry)),
    );
    const longSleeveAnchorMesh = longSleeveMeshesByName.get("Object_6");
    const longSleeveFrontGeometry = longSleeveAnchorMesh?.geometry;
    const longSleeveBackGeometry = mergeLongSleevePanels(["Object_10", "Object_12"]);
    const longSleeveLeftSleeveGeometry = mergeLongSleevePanels([
      "Object_14", "Object_16", "Object_18", "Object_36", "Object_40",
    ]);
    const longSleeveRightSleeveGeometry = mergeLongSleevePanels([
      "Object_22", "Object_24", "Object_26", "Object_38", "Object_42",
    ]);
    const longSleeveCollarGeometry = mergeLongSleevePanels([
      "Object_28", "Object_30", "Object_32", "Object_34",
    ]);
    [
      longSleeveBackGeometry,
      longSleeveLeftSleeveGeometry,
      longSleeveRightSleeveGeometry,
      longSleeveCollarGeometry,
    ].forEach((geometry) => {
      if (geometry) generatedGeometries.push(geometry);
    });
    const capMeshesByName = new Map(
      isCap ? garmentMeshes.map(({ mesh }) => [mesh.name, mesh] as const) : [],
    );
    const mergeCapPanels = (names: string[]) => mergeGeometryParts(
      names
        .map((name) => capMeshesByName.get(name)?.geometry)
        .filter((geometry): geometry is THREE.BufferGeometry => Boolean(geometry)),
    );
    const capAnchorMesh = capMeshesByName.get("Object_10") || capMeshesByName.get("Object_6");
    const capFrontGeometry = mergeCapPanels(["Object_10", "Object_12"]);
    const capBackGeometry = mergeCapPanels(["Object_6", "Object_16", "Object_18", "Object_24"]);
    const capLeftGeometry = mergeCapPanels(["Object_8", "Object_38"]);
    const capRightGeometry = mergeCapPanels(["Object_14", "Object_40"]);
    const capBrimGeometry = mergeCapPanels(["Object_20", "Object_22"]);
    [
      capFrontGeometry,
      capBackGeometry,
      capLeftGeometry,
      capRightGeometry,
      capBrimGeometry,
    ].forEach((geometry) => {
      if (geometry) generatedGeometries.push(geometry);
    });
    const darkBlueMesh = isDarkBlueShirt ? garmentMeshes[0]?.mesh : undefined;
    const darkBlueComponents = darkBlueMesh ? getConnectedComponentGeometries(darkBlueMesh.geometry) : [];
    generatedGeometries.push(...darkBlueComponents);
    const darkBlueRawTorsoParts = [...darkBlueComponents]
      .sort((left, right) => (right.getIndex()?.count || 0) - (left.getIndex()?.count || 0))
      .slice(0, 2)
      .sort((left, right) => (
        left.boundingBox!.getCenter(new THREE.Vector3()).y
        - right.boundingBox!.getCenter(new THREE.Vector3()).y
      ));
    const darkBlueBodyHalfWidth = garmentSize.x * 0.285;
    const darkBlueRawSleeveParts = darkBlueComponents
      .filter((geometry) => {
        if (darkBlueRawTorsoParts.includes(geometry)) return false;
        const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
        return (geometry.getIndex()?.count || 0) >= 500
          && Math.abs(center.x - garmentCenter.x) >= garmentSize.x * 0.34
          && center.z >= garmentBounds.min.z + garmentSize.z * 0.45;
      })
      .sort((left, right) => (
        left.boundingBox!.getCenter(new THREE.Vector3()).x
        - right.boundingBox!.getCenter(new THREE.Vector3()).x
      ));
    const darkBlueLeftSleeveGeometry = mergeGeometryParts(darkBlueRawSleeveParts.filter((geometry) => (
      geometry.boundingBox!.getCenter(new THREE.Vector3()).x < garmentCenter.x
    )));
    const darkBlueRightSleeveGeometry = mergeGeometryParts(darkBlueRawSleeveParts.filter((geometry) => (
      geometry.boundingBox!.getCenter(new THREE.Vector3()).x >= garmentCenter.x
    )));
    if (darkBlueLeftSleeveGeometry) generatedGeometries.push(darkBlueLeftSleeveGeometry);
    if (darkBlueRightSleeveGeometry) generatedGeometries.push(darkBlueRightSleeveGeometry);
    const darkBlueCollarParts = darkBlueComponents.filter((geometry) => {
      if (darkBlueRawTorsoParts.includes(geometry) || darkBlueRawSleeveParts.includes(geometry)) return false;
      const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
      return Math.abs(center.x - garmentCenter.x) <= garmentSize.x * 0.22
        && center.z >= garmentBounds.min.z + garmentSize.z * 0.78;
    });
    const hoodieTorsoParts = hoodieParts.filter((entry) => entry.isTorso);
    const hoodieSleeveParts = hoodieParts.filter((entry) => entry.isSleeve);
    const hoodieHoodParts = hoodieParts.filter((entry) => entry.isHood);
    const torsoMeshes = isHoodie
      ? hoodieTorsoParts
      : garmentMeshes.filter(({ label }) => !/(sleeve|ribbing|collar|neck)/i.test(label));
    const namedTorsoSides = torsoMeshes.filter(({ label }) => /(front|back)/i.test(label));
    const torsoSurfaces: Array<{ mesh: THREE.Mesh; side?: "front" | "back"; geometry?: THREE.BufferGeometry }> = [];
    if (isCap && capAnchorMesh && capFrontGeometry && capBackGeometry) {
      torsoSurfaces.push({ mesh: capAnchorMesh, side: "front", geometry: capFrontGeometry });
      torsoSurfaces.push({ mesh: capAnchorMesh, side: "back", geometry: capBackGeometry });
    } else if (isLongSleeve && longSleeveAnchorMesh && longSleeveFrontGeometry && longSleeveBackGeometry) {
      torsoSurfaces.push({ mesh: longSleeveAnchorMesh, side: "front", geometry: longSleeveFrontGeometry });
      torsoSurfaces.push({ mesh: longSleeveAnchorMesh, side: "back", geometry: longSleeveBackGeometry });
    } else if (isDarkBlueShirt && darkBlueMesh && darkBlueRawTorsoParts.length >= 2) {
      torsoSurfaces.push({ mesh: darkBlueMesh, side: "front", geometry: darkBlueRawTorsoParts[0] });
      torsoSurfaces.push({ mesh: darkBlueMesh, side: "back", geometry: darkBlueRawTorsoParts[darkBlueRawTorsoParts.length - 1] });
    } else if (isLongSweater && sweaterMainMesh && sweaterTorsoParts.length >= 2) {
      torsoSurfaces.push({ mesh: sweaterMainMesh, side: "front", geometry: sweaterTorsoParts[sweaterTorsoParts.length - 1] });
      torsoSurfaces.push({ mesh: sweaterMainMesh, side: "back", geometry: sweaterTorsoParts[0] });
    } else if (isHoodie && hoodieTorsoParts.length >= 2) {
      const sortedTorso = [...hoodieTorsoParts].sort((left, right) => left.center.z - right.center.z);
      const backPart = garmentProjection.frontIsGreater ? sortedTorso[0] : sortedTorso[sortedTorso.length - 1];
      const frontPart = garmentProjection.frontIsGreater ? sortedTorso[sortedTorso.length - 1] : sortedTorso[0];
      torsoSurfaces.push({ mesh: frontPart.mesh, side: "front" });
      torsoSurfaces.push({ mesh: backPart.mesh, side: "back" });
    } else if (autoAnchorMesh && (manualFrontGeometry || autoFrontGeometry) && (manualBackGeometry || autoBackGeometry)) {
      torsoSurfaces.push({ mesh: autoAnchorMesh, side: "front", geometry: manualFrontGeometry || autoFrontGeometry! });
      torsoSurfaces.push({ mesh: autoAnchorMesh, side: "back", geometry: manualBackGeometry || autoBackGeometry! });
    } else if (namedTorsoSides.length > 0) {
      namedTorsoSides.forEach(({ mesh, label }) => {
        torsoSurfaces.push({ mesh, side: /back/i.test(label) ? "back" : "front" });
      });
    } else {
      const candidates = [...(torsoMeshes.length > 0 ? torsoMeshes : garmentMeshes)].sort((a, b) => {
        const aPosition = a.mesh.geometry.getAttribute("position");
        const bPosition = b.mesh.geometry.getAttribute("position");
        return (bPosition?.count || 0) - (aPosition?.count || 0);
      });
      if (candidates[0]) torsoSurfaces.push({ mesh: candidates[0].mesh });
    }

    let frontTexture = regionTextures.front;
    let backTexture = regionTextures.back;
    if (isDarkBlueShirt) {
      const bodyMinimum = 0.5 - darkBlueBodyHalfWidth / garmentSize.x;
      const bodyMaximum = 0.5 + darkBlueBodyHalfWidth / garmentSize.x;
      if (frontTexture) {
        const masked = maskGarmentTextureHorizontally(frontTexture, bodyMinimum, bodyMaximum);
        if (masked !== frontTexture) {
          generatedTextures.push(masked);
          frontTexture = masked;
        }
      }
      if (backTexture) {
        const masked = maskGarmentTextureHorizontally(backTexture, bodyMinimum, bodyMaximum);
        if (masked !== backTexture) {
          generatedTextures.push(masked);
          backTexture = masked;
        }
      }
    }
    const combinedTorsoMesh = torsoSurfaces.length === 1 && !torsoSurfaces[0].side ? torsoSurfaces[0].mesh : undefined;
    const fbxFrontGeometry = isFbx && combinedTorsoMesh
      ? createProjectedRegionGeometry(combinedTorsoMesh.geometry, "front", garmentProjection)
      : null;
    const fbxBackGeometry = isFbx && combinedTorsoMesh
      ? createProjectedRegionGeometry(combinedTorsoMesh.geometry, "back", garmentProjection)
      : null;
    if (fbxFrontGeometry) generatedGeometries.push(fbxFrontGeometry);
    if (fbxBackGeometry) generatedGeometries.push(fbxBackGeometry);
    const femaleMesh = isFemaleShirt ? garmentMeshes[0]?.mesh : undefined;
    const femaleComponents = femaleMesh ? getConnectedComponentGeometries(femaleMesh.geometry) : [];
    generatedGeometries.push(...femaleComponents);
    const femaleSleeves = femaleComponents
      .filter((geometry) => {
        const bounds = geometry.boundingBox!;
        return Math.abs((bounds.min.y + bounds.max.y) * 0.5) > 0.2;
      });
    const femaleTorso = femaleComponents
      .filter((geometry) => !femaleSleeves.includes(geometry))
      .sort((left, right) => {
        const leftCenter = (left.boundingBox!.min.x + left.boundingBox!.max.x) * 0.5;
        const rightCenter = (right.boundingBox!.min.x + right.boundingBox!.max.x) * 0.5;
        return leftCenter - rightCenter;
      });

    if (femaleMesh && femaleTorso.length >= 2) {
      if (frontTexture) attachGarmentOverlay(femaleMesh, frontTexture, "front", "shirt-region-sublimation", false, false, femaleTorso[0]);
      if (backTexture) attachGarmentOverlay(femaleMesh, backTexture, "back", "shirt-region-sublimation", false, false, femaleTorso[femaleTorso.length - 1]);
    } else if (combinedTorsoMesh && (fbxFrontGeometry || fbxBackGeometry)) {
      if (frontTexture && fbxFrontGeometry) {
        attachGarmentOverlay(combinedTorsoMesh, frontTexture, "front", "shirt-region-sublimation", false, false, fbxFrontGeometry);
      }
      if (backTexture && fbxBackGeometry) {
        attachGarmentOverlay(combinedTorsoMesh, backTexture, "back", "shirt-region-sublimation", false, false, fbxBackGeometry);
      }
    } else {
      torsoSurfaces.forEach(({ mesh, side, geometry }) => {
        if (frontTexture && side !== "back") {
          attachGarmentOverlay(mesh, frontTexture, side === "front" ? "front" : undefined, "shirt-region-sublimation", false, false, geometry);
        }
        if (backTexture && side !== "front") {
          attachGarmentOverlay(mesh, backTexture, side === "back" ? "back" : undefined, "shirt-region-sublimation", false, false, geometry);
        }
      });
    }

    clone.updateMatrixWorld(true);
    const sleeveMeshes = (isCap && capAnchorMesh
      ? [capLeftGeometry, capRightGeometry]
        .filter((geometry): geometry is THREE.BufferGeometry => Boolean(geometry))
        .map((geometry) => ({
          mesh: capAnchorMesh,
          label: "cap side panel",
          geometry,
          centerX: geometry.boundingBox!.getCenter(new THREE.Vector3()).x,
        }))
      : isLongSleeve && longSleeveAnchorMesh
      ? [longSleeveLeftSleeveGeometry, longSleeveRightSleeveGeometry]
        .filter((geometry): geometry is THREE.BufferGeometry => Boolean(geometry))
        .map((geometry) => ({
          mesh: longSleeveAnchorMesh,
          label: "long sleeve garment sleeve",
          geometry,
          centerX: geometry.boundingBox!.getCenter(new THREE.Vector3()).x,
        }))
      : isDarkBlueShirt && darkBlueMesh
      ? [darkBlueLeftSleeveGeometry, darkBlueRightSleeveGeometry]
        .filter((geometry): geometry is THREE.BufferGeometry => Boolean(geometry))
        .map((geometry) => ({
        mesh: darkBlueMesh,
        label: "plain dark blue shirt sleeve",
        geometry,
        centerX: geometry.boundingBox!.getCenter(new THREE.Vector3()).x,
      }))
      : isLongSweater && sweaterMainMesh
      ? sweaterSleeveParts.map((geometry) => ({
        mesh: sweaterMainMesh,
        label: "long sweater sleeve",
        geometry,
        centerX: geometry.boundingBox!.getCenter(new THREE.Vector3()).x,
      }))
      : autoAnchorMesh && (manualLeftGeometry || manualRightGeometry || autoLeftGeometry || autoRightGeometry)
      ? [manualLeftGeometry || autoLeftGeometry, manualRightGeometry || autoRightGeometry]
        .filter((geometry): geometry is THREE.BufferGeometry => Boolean(geometry))
        .map((geometry) => ({
          mesh: autoAnchorMesh,
          label: "agent-detected side region",
          geometry,
          centerX: geometry.boundingBox!.getCenter(new THREE.Vector3())[garmentProjection.widthAxis],
        }))
      : (isHoodie ? hoodieSleeveParts : garmentMeshes.filter(({ label }) => /sleeve/i.test(label)))
        .map((entry) => ({
          ...entry,
          geometry: undefined as THREE.BufferGeometry | undefined,
          centerX: new THREE.Box3().setFromObject(entry.mesh).getCenter(new THREE.Vector3()).x,
        })))
      .sort((a, b) => a.centerX - b.centerX);
    const leftSleeve = sleeveMeshes[0];
    const rightSleeve = sleeveMeshes[sleeveMeshes.length - 1];
    const fallbackShoulderMesh = torsoSurfaces[0]?.mesh;
    const fallbackLeftShoulder = !leftSleeve?.mesh && fallbackShoulderMesh
      ? createShoulderRegionGeometry(fallbackShoulderMesh.geometry, "left-shoulder", garmentProjection)
      : null;
    const fallbackRightShoulder = !rightSleeve?.mesh && fallbackShoulderMesh
      ? createShoulderRegionGeometry(fallbackShoulderMesh.geometry, "right-shoulder", garmentProjection)
      : null;
    if (fallbackLeftShoulder) generatedGeometries.push(fallbackLeftShoulder);
    if (fallbackRightShoulder) generatedGeometries.push(fallbackRightShoulder);
    const femaleLeftSleeve = femaleSleeves
      .slice()
      .sort((left, right) => {
        const leftCenter = (left.boundingBox!.min.y + left.boundingBox!.max.y) * 0.5;
        const rightCenter = (right.boundingBox!.min.y + right.boundingBox!.max.y) * 0.5;
        return rightCenter - leftCenter;
      })[0];
    const femaleRightSleeve = femaleSleeves
      .slice()
      .sort((left, right) => {
        const leftCenter = (left.boundingBox!.min.y + left.boundingBox!.max.y) * 0.5;
        const rightCenter = (right.boundingBox!.min.y + right.boundingBox!.max.y) * 0.5;
        return leftCenter - rightCenter;
      })[0];
    if (regionTextures["left-shoulder"] && isCap && capAnchorMesh && capLeftGeometry) {
      attachGarmentOverlay(capAnchorMesh, regionTextures["left-shoulder"], "front", "shirt-region-sublimation", false, false, capLeftGeometry);
    } else if (regionTextures["left-shoulder"] && femaleMesh && femaleLeftSleeve) {
      attachGarmentOverlay(femaleMesh, regionTextures["left-shoulder"], undefined, "shirt-region-sublimation", false, false, femaleLeftSleeve);
    } else if (regionTextures["left-shoulder"] && isDarkBlueShirt && darkBlueMesh && darkBlueLeftSleeveGeometry) {
      attachGarmentOverlay(darkBlueMesh, regionTextures["left-shoulder"], undefined, "shirt-region-sublimation", false, false, darkBlueLeftSleeveGeometry);
    } else if (regionTextures["left-shoulder"] && leftSleeve?.mesh) {
      attachGarmentOverlay(leftSleeve.mesh, regionTextures["left-shoulder"], undefined, "shirt-region-sublimation", false, false, leftSleeve.geometry, "left");
      if (isLongSweater && sweaterTrimMesh && sweaterCuffParts[0]) {
        attachGarmentOverlay(sweaterTrimMesh, regionTextures["left-shoulder"], undefined, "shirt-region-sublimation", false, false, sweaterCuffParts[0]);
      }
    } else if (regionTextures["left-shoulder"] && fallbackShoulderMesh && fallbackLeftShoulder) {
      attachGarmentOverlay(fallbackShoulderMesh, regionTextures["left-shoulder"], undefined, "shirt-region-sublimation", false, false, fallbackLeftShoulder);
    } else if (torsoRegionTextures["left-shoulder"]) {
      torsoSurfaces.forEach(({ mesh, side }) => attachGarmentOverlay(mesh, torsoRegionTextures["left-shoulder"]!, side));
    }
    if (regionTextures["right-shoulder"] && isCap && capAnchorMesh && capRightGeometry) {
      attachGarmentOverlay(capAnchorMesh, regionTextures["right-shoulder"], "front", "shirt-region-sublimation", false, false, capRightGeometry);
    } else if (regionTextures["right-shoulder"] && femaleMesh && femaleRightSleeve) {
      attachGarmentOverlay(femaleMesh, regionTextures["right-shoulder"], undefined, "shirt-region-sublimation", false, false, femaleRightSleeve);
    } else if (regionTextures["right-shoulder"] && isDarkBlueShirt && darkBlueMesh && darkBlueRightSleeveGeometry) {
      attachGarmentOverlay(darkBlueMesh, regionTextures["right-shoulder"], undefined, "shirt-region-sublimation", false, false, darkBlueRightSleeveGeometry);
    } else if (regionTextures["right-shoulder"] && rightSleeve?.mesh) {
      attachGarmentOverlay(rightSleeve.mesh, regionTextures["right-shoulder"], undefined, "shirt-region-sublimation", false, false, rightSleeve.geometry, "right");
      if (isLongSweater && sweaterTrimMesh && sweaterCuffParts[sweaterCuffParts.length - 1]) {
        attachGarmentOverlay(sweaterTrimMesh, regionTextures["right-shoulder"], undefined, "shirt-region-sublimation", false, false, sweaterCuffParts[sweaterCuffParts.length - 1]);
      }
    } else if (regionTextures["right-shoulder"] && fallbackShoulderMesh && fallbackRightShoulder) {
      attachGarmentOverlay(fallbackShoulderMesh, regionTextures["right-shoulder"], undefined, "shirt-region-sublimation", false, false, fallbackRightShoulder);
    } else if (torsoRegionTextures["right-shoulder"]) {
      torsoSurfaces.forEach(({ mesh, side }) => attachGarmentOverlay(mesh, torsoRegionTextures["right-shoulder"]!, side));
    }

    if (regionTextures["round-neck"]) {
      const neckMeshes = isHoodie ? hoodieHoodParts : garmentMeshes.filter(({ label }) => /(ribbing|collar|neck)/i.test(label));
      if (isCap && capAnchorMesh && capBrimGeometry) {
        attachGarmentOverlay(capAnchorMesh, regionTextures["round-neck"], "front", "shirt-region-sublimation", false, false, capBrimGeometry);
      } else if (isLongSleeve && longSleeveAnchorMesh && longSleeveCollarGeometry) {
        attachGarmentOverlay(longSleeveAnchorMesh, regionTextures["round-neck"], undefined, "shirt-region-sublimation", false, false, longSleeveCollarGeometry);
      } else if (isDarkBlueShirt && darkBlueMesh && darkBlueCollarParts.length > 0) {
        darkBlueCollarParts.forEach((geometry) => {
          attachGarmentOverlay(darkBlueMesh, regionTextures["round-neck"]!, undefined, "shirt-region-sublimation", false, false, geometry);
        });
      } else if (isLongSweater && sweaterTrimMesh && sweaterCollarParts.length > 0) {
        sweaterCollarParts.forEach((geometry) => {
          attachGarmentOverlay(sweaterTrimMesh, regionTextures["round-neck"]!, undefined, "shirt-region-sublimation", false, false, geometry);
        });
      } else if (autoAnchorMesh && (manualTopGeometry || autoCollarGeometry)) {
        attachGarmentOverlay(autoAnchorMesh, regionTextures["round-neck"], undefined, "shirt-region-sublimation", false, false, manualTopGeometry || autoCollarGeometry!, "top");
      } else if (neckMeshes.length > 0) {
        neckMeshes.forEach(({ mesh }) => attachGarmentOverlay(mesh, regionTextures["round-neck"]!));
      } else if (isFbx && combinedTorsoMesh) {
        const neckGeometry = createMaterialRegionGeometry(combinedTorsoMesh, /(ribana|ribbing|collar|neck)/i)
          || createProjectedRegionGeometry(combinedTorsoMesh.geometry, "round-neck", garmentProjection);
        if (neckGeometry) {
          generatedGeometries.push(neckGeometry);
          attachGarmentOverlay(combinedTorsoMesh, regionTextures["round-neck"]!, undefined, "shirt-region-sublimation", false, false, neckGeometry);
        }
      } else if (torsoRegionTextures["round-neck"]) {
        torsoSurfaces.forEach(({ mesh, side }) => attachGarmentOverlay(mesh, torsoRegionTextures["round-neck"]!, side));
      }
    }

    if (bodyTextAtlas) {
      torsoSurfaces.forEach(({ mesh, side, geometry }) => {
        attachGarmentOverlay(mesh, bodyTextAtlas, side, "shirt-text-sublimation", true, true, geometry);
      });
    }

    if (leftShoulderTextAtlas || rightShoulderTextAtlas) {
      if (leftShoulderTextAtlas && isCap && capAnchorMesh && capLeftGeometry) {
        attachGarmentOverlay(capAnchorMesh, leftShoulderTextAtlas, "front", "shirt-text-sublimation", true, false, capLeftGeometry);
      } else if (leftShoulderTextAtlas && isDarkBlueShirt && darkBlueMesh && darkBlueLeftSleeveGeometry) {
        attachGarmentOverlay(darkBlueMesh, leftShoulderTextAtlas, undefined, "shirt-text-sublimation", true, false, darkBlueLeftSleeveGeometry);
      } else if (leftShoulderTextAtlas && leftSleeve?.mesh) {
        attachGarmentOverlay(leftSleeve.mesh, leftShoulderTextAtlas, undefined, "shirt-text-sublimation", true, false, leftSleeve.geometry);
      }
      if (rightShoulderTextAtlas && isCap && capAnchorMesh && capRightGeometry) {
        attachGarmentOverlay(capAnchorMesh, rightShoulderTextAtlas, "front", "shirt-text-sublimation", true, false, capRightGeometry);
      } else if (rightShoulderTextAtlas && isDarkBlueShirt && darkBlueMesh && darkBlueRightSleeveGeometry) {
        attachGarmentOverlay(darkBlueMesh, rightShoulderTextAtlas, undefined, "shirt-text-sublimation", true, false, darkBlueRightSleeveGeometry);
      } else if (rightShoulderTextAtlas && rightSleeve?.mesh) {
        attachGarmentOverlay(rightSleeve.mesh, rightShoulderTextAtlas, undefined, "shirt-text-sublimation", true, false, rightSleeve.geometry);
      }
    }

    clone.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(clone);
    if (box.isEmpty()) throw new Error("This GLB does not contain a visible mesh.");

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const targetHeight = 2.1;
    const normalizedScale = targetHeight / maxDim;
    clone.scale.setScalar(normalizedScale);
    clone.position.set(
      -center.x * normalizedScale,
      -box.min.y * normalizedScale,
      -center.z * normalizedScale,
    );
    clone.updateMatrixWorld(true);

    const displayObject = new THREE.Group();
    if (isFemaleShirt) displayObject.rotation.y = Math.PI / 2;
    displayObject.add(clone);
    displayObject.updateMatrixWorld(true);

    return {
      object: displayObject,
      generatedTextures,
      generatedGeometries,
      bounds: {
        width: Math.max(size.x * normalizedScale, 0.35),
        height: Math.max(size.y * normalizedScale, 0.35),
        depth: Math.max(size.z * normalizedScale, 0.12),
      },
    };
  }, [
    autoRegionProfile,
    bodyTextAtlas,
    sourceScene,
    garmentProjection,
    imageSrc,
    isDarkBlueShirt,
    isFemaleShirt,
    isFbx,
    isHoodie,
    isCap,
    isLongSleeve,
    isLongSweater,
    isPerson,
    isStandaloneGarment,
    leftShoulderTextAtlas,
    regionTextures,
    regionMapperEnabled,
    regionMeshAssignments,
    rightShoulderTextAtlas,
    shirtColor,
    torsoRegionTextures,
    wireframe,
    wrappedDesignTexture,
  ]);

  const modelBounds = preparedModel.bounds;
  useEffect(() => {
    return () => {
      preparedModel.generatedTextures.forEach((texture) => texture.dispose());
      preparedModel.generatedGeometries.forEach((geometry) => geometry.dispose());
      preparedModel.object.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      });
    };
  }, [preparedModel]);

  designTextures.forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  });

  const modelRef = useRef<THREE.Group>(null);
  const content = (
    <group
      ref={modelRef}
      position={[posX, 0, 0]}
      rotation={[0, -rotation * Math.PI / 180, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (regionMapperEnabled && activeGarmentRegion !== "overall") {
          const meshIndex = Number(e.object.userData.regionMeshIndex);
          if (Number.isFinite(meshIndex)) {
            onAssignRegionMesh?.(mappingKey, meshIndex, activeGarmentRegion);
            return;
          }
        }
        onClick();
      }}
    >
      <primitive object={preparedModel.object} />
      {isSelected && <BoundingBox width={modelBounds.width * 1.12} height={modelBounds.height * 1.04} depth={modelBounds.depth * 1.2} />}
    </group>
  );
  if (isSelected && (editorTool === "move" || editorTool === "rotate" || editorTool === "scale")) {
    return (
      <TransformControls mode={editorTool === "move" ? "translate" : editorTool}>
        {content}
      </TransformControls>
    );
  }
  return content;
}

function ModelLoadingPlaceholder({ posX }: { posX: number }) {
  return (
    <group position={[posX, 1.1, 0]}>
      <mesh>
        <boxGeometry args={[1.5, 0.48, 0.08]} />
        <meshStandardMaterial color="#111827" transparent opacity={0.82} />
      </mesh>
      <Html center>
        <div style={{
          color: "#fff",
          fontSize: 11,
          fontFamily: "sans-serif",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          Loading 3D model...
        </div>
      </Html>
    </group>
  );
}

function CameraRig({ target, distance }: { target: [number, number, number]; distance: number }) {
  const { camera } = useThree();
  const [targetX, targetY, targetZ] = target;
  useEffect(() => {
    camera.position.set(0, targetY + distance * 0.2, distance);
    camera.lookAt(targetX, targetY, targetZ);
    camera.updateProjectionMatrix();
  }, [camera, distance, targetX, targetY, targetZ]);
  return null;
}

class MockupErrorBoundary extends React.Component<
  { children: React.ReactNode; posX: number; resetKey: string; modelName?: string },
  { error: string | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    console.error("[ModelErrorBoundary]", error);
  }

  componentDidUpdate(previousProps: { resetKey: string }) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      const displayName = this.props.modelName?.split(/[\\/]/).pop()?.replace(/\.(glb|gltf|fbx|obj)$/i, "")
        || "3D model";
      return (
        <group position={[this.props.posX, 1.1, 0]}>
          <Html center>
            <div style={{
              width: 150,
              background: "rgba(39,39,42,0.94)",
              color: "#e4e4e7",
              border: "1px solid rgba(113,113,122,0.8)",
              padding: "8px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.3,
              textAlign: "center",
              pointerEvents: "none",
              overflow: "hidden",
            }}>
              <div style={{ fontWeight: 600 }}>Model unavailable</div>
              <div style={{
                marginTop: 3,
                color: "#a1a1aa",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {displayName}
              </div>
            </div>
          </Html>
        </group>
      );
    }
    return this.props.children;
  }
}

function CameraZoom({ zoom }: { zoom: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.zoom = zoom / 100;
    camera.updateProjectionMatrix();
  }, [zoom, camera]);
  return null;
}

function RegionCameraFocus({
  region,
  target,
  distance,
  objectHeight,
  frontAxis,
  controlsRef,
}: {
  region: GarmentRegion;
  target: [number, number, number];
  distance: number;
  objectHeight: number;
  frontAxis: "x" | "z";
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera } = useThree();
  const [targetX, targetY, targetZ] = target;
  useEffect(() => {
    const closeDistance = distance * 0.62;
    const shoulderHeight = targetY + objectHeight * 0.25;
    const neckHeight = targetY + objectHeight * 0.34;
    const focusTarget = new THREE.Vector3(targetX, targetY, targetZ);
    const cameraPosition = frontAxis === "x"
      ? new THREE.Vector3(targetX - distance, targetY + distance * 0.2, targetZ)
      : new THREE.Vector3(targetX, targetY + distance * 0.2, targetZ + distance);

    if (region === "back") {
      if (frontAxis === "x") {
        cameraPosition.set(targetX + distance, targetY + distance * 0.2, targetZ);
      } else {
        cameraPosition.set(targetX, targetY + distance * 0.2, targetZ - distance);
      }
    } else if (region === "left-shoulder") {
      focusTarget.y = shoulderHeight;
      cameraPosition.set(
        targetX - closeDistance * 0.8,
        shoulderHeight + closeDistance * 0.12,
        targetZ + closeDistance * 0.65,
      );
    } else if (region === "right-shoulder") {
      focusTarget.y = shoulderHeight;
      cameraPosition.set(
        targetX + closeDistance * 0.8,
        shoulderHeight + closeDistance * 0.12,
        targetZ + closeDistance * 0.65,
      );
    } else if (region === "round-neck") {
      focusTarget.y = neckHeight;
      if (frontAxis === "x") {
        cameraPosition.set(targetX - closeDistance, neckHeight + closeDistance * 0.18, targetZ);
      } else {
        cameraPosition.set(targetX, neckHeight + closeDistance * 0.18, targetZ + closeDistance);
      }
    }

    camera.position.copy(cameraPosition);
    camera.lookAt(focusTarget);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(focusTarget);
      controls.update();
    }
  }, [camera, controlsRef, distance, frontAxis, objectHeight, region, targetX, targetY, targetZ]);
  return null;
}

function ViewPresetCamera({
  preset,
  revision,
  target,
  distance,
  controlsRef,
}: {
  preset: ThreeDViewPreset;
  revision: number;
  target: [number, number, number];
  distance: number;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera } = useThree();
  useEffect(() => {
    if (revision === 0) return;
    const focus = new THREE.Vector3(...target);
    const position = new THREE.Vector3(0, target[1] + distance * 0.2, distance);
    if (preset === "back") position.set(0, target[1] + distance * 0.2, -distance);
    if (preset === "left") position.set(-distance, target[1] + distance * 0.2, 0);
    if (preset === "right") position.set(distance, target[1] + distance * 0.2, 0);
    if (preset === "top") position.set(0, target[1] + distance, 0.001);
    if (preset === "home") position.set(distance * 0.72, target[1] + distance * 0.42, distance * 0.72);
    camera.position.copy(position);
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
    controlsRef.current?.target.copy(focus);
    controlsRef.current?.update();
  }, [camera, controlsRef, distance, preset, revision, target]);
  return null;
}

function ExportController({
  exportApiRef,
  target,
  objectWidth,
  objectHeight,
  helpersRef,
}: {
  exportApiRef?: React.MutableRefObject<ThreeDExportApi | null>;
  target: [number, number, number];
  objectWidth: number;
  objectHeight: number;
  helpersRef: React.RefObject<THREE.Group | null>;
}) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (!exportApiRef) return;

    exportApiRef.current = {
      exportFrontBack: async (format) => {
        if (!(camera instanceof THREE.PerspectiveCamera)) {
          throw new Error("The 3D export camera is unavailable.");
        }

        const finalWidth = 3840;
        const finalHeight = 2160;
        const margin = 120;
        const gutter = 80;
        const labelHeight = 120;
        const shotWidth = Math.floor((finalWidth - margin * 2 - gutter) / 2);
        const shotHeight = finalHeight - margin * 2 - labelHeight;
        const renderTarget = new THREE.WebGLRenderTarget(shotWidth, shotHeight, {
          depthBuffer: true,
          stencilBuffer: false,
        });
        renderTarget.texture.colorSpace = THREE.SRGBColorSpace;

        const originalTarget = gl.getRenderTarget();
        const originalBackground = scene.background;
        const originalPosition = camera.position.clone();
        const originalQuaternion = camera.quaternion.clone();
        const originalAspect = camera.aspect;
        const originalZoom = camera.zoom;
        const hiddenObjects: THREE.Object3D[] = [];
        scene.traverse((object) => {
          if (object.name === "editor-selection" && object.visible) {
            object.visible = false;
            hiddenObjects.push(object);
          }
        });
        const helpersWereVisible = helpersRef.current?.visible ?? true;
        if (helpersRef.current) helpersRef.current.visible = false;

        const output = document.createElement("canvas");
        output.width = finalWidth;
        output.height = finalHeight;
        const context = output.getContext("2d");
        if (!context) throw new Error("Unable to create the 3D export canvas.");
        if (format === "jpg") {
          const gradient = context.createLinearGradient(0, 0, 0, finalHeight);
          gradient.addColorStop(0, "#ffffff");
          gradient.addColorStop(1, "#eef1f5");
          context.fillStyle = gradient;
          context.fillRect(0, 0, finalWidth, finalHeight);
        } else {
          context.clearRect(0, 0, finalWidth, finalHeight);
        }

        const renderShot = (back: boolean) => {
          camera.aspect = shotWidth / shotHeight;
          camera.zoom = 1;
          camera.updateProjectionMatrix();
          const verticalFov = THREE.MathUtils.degToRad(camera.fov);
          const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
          const distanceForHeight = (objectHeight * 0.58) / Math.tan(verticalFov / 2);
          const distanceForWidth = (objectWidth * 0.58) / Math.tan(horizontalFov / 2);
          const distance = Math.max(distanceForHeight, distanceForWidth, 2.4);
          camera.position.set(0, target[1] + objectHeight * 0.03, back ? -distance : distance);
          camera.lookAt(...target);
          scene.background = format === "jpg" ? new THREE.Color("#f7f8fa") : null;
          gl.setRenderTarget(renderTarget);
          gl.setClearColor(format === "jpg" ? "#f7f8fa" : "#000000", format === "jpg" ? 1 : 0);
          gl.clear(true, true, true);
          gl.render(scene, camera);

          const pixels = new Uint8Array(shotWidth * shotHeight * 4);
          gl.readRenderTargetPixels(renderTarget, 0, 0, shotWidth, shotHeight, pixels);
          const flipped = new Uint8ClampedArray(pixels.length);
          const rowLength = shotWidth * 4;
          for (let row = 0; row < shotHeight; row += 1) {
            const sourceStart = (shotHeight - row - 1) * rowLength;
            flipped.set(pixels.subarray(sourceStart, sourceStart + rowLength), row * rowLength);
          }
          const shot = document.createElement("canvas");
          shot.width = shotWidth;
          shot.height = shotHeight;
          shot.getContext("2d")?.putImageData(new ImageData(flipped, shotWidth, shotHeight), 0, 0);
          return shot;
        };

        try {
          const front = renderShot(false);
          const back = renderShot(true);
          context.drawImage(front, margin, margin + labelHeight, shotWidth, shotHeight);
          context.drawImage(back, margin + shotWidth + gutter, margin + labelHeight, shotWidth, shotHeight);
          context.fillStyle = "#111827";
          context.font = "700 56px Arial, sans-serif";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText("FRONT", margin + shotWidth / 2, margin + labelHeight / 2);
          context.fillText("BACK", margin + shotWidth + gutter + shotWidth / 2, margin + labelHeight / 2);
          return await new Promise<Blob>((resolve, reject) => {
            output.toBlob(
              (blob) => blob ? resolve(blob) : reject(new Error("Unable to encode the 3D export.")),
              format === "jpg" ? "image/jpeg" : "image/png",
              format === "jpg" ? 0.96 : undefined,
            );
          });
        } finally {
          gl.setRenderTarget(originalTarget);
          scene.background = originalBackground;
          camera.position.copy(originalPosition);
          camera.quaternion.copy(originalQuaternion);
          camera.aspect = originalAspect;
          camera.zoom = originalZoom;
          camera.updateProjectionMatrix();
          if (helpersRef.current) helpersRef.current.visible = helpersWereVisible;
          hiddenObjects.forEach((object) => { object.visible = true; });
          renderTarget.dispose();
        }
      },
    };

    return () => {
      exportApiRef.current = null;
    };
  }, [camera, exportApiRef, gl, helpersRef, objectHeight, objectWidth, scene, target]);

  return null;
}

export default function ThreeDScene({
  canvasRef: _canvasRef,
  displayW,
  displayH,
  items,
  imageSrcs,
  selectedIndex: _selectedIndex,
  garmentDesigns = EMPTY_GARMENT_DESIGNS,
  garmentColors = DEFAULT_GARMENT_COLORS,
  zoom,
  onRemoveMockup,
  garmentDesignSettings = DEFAULT_GARMENT_DESIGN_SETTINGS,
  activeGarmentRegion = "overall",
  editorTool = "orbit",
  showGrid = true,
  wireframe = false,
  viewPreset = "home",
  viewRevision = 0,
  regionMapperEnabled = false,
  regionMappings = {},
  onAssignRegionMesh,
  shirtTexts,
  exportApiRef,
  onDragOver,
  onDrop,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  displayW: number;
  displayH: number;
  items: FreestyleItem[];
  imageSrcs: string[];
  selectedIndex?: number | null;
  garmentDesigns?: GarmentDesigns;
  garmentColors?: GarmentColors;
  zoom?: number;
  onRemoveMockup?: (id: string) => void;
  garmentDesignSettings?: GarmentDesignSettings;
  activeGarmentRegion?: GarmentRegion;
  editorTool?: ThreeDEditorTool;
  showGrid?: boolean;
  wireframe?: boolean;
  viewPreset?: ThreeDViewPreset;
  viewRevision?: number;
  regionMapperEnabled?: boolean;
  regionMappings?: Record<string, RegionMeshAssignments>;
  onAssignRegionMesh?: (mappingKey: string, meshIndex: number, region: Exclude<GarmentRegion, "overall">) => void;
  shirtTexts?: ShirtTextOverlay[];
  exportApiRef?: React.MutableRefObject<ThreeDExportApi | null>;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const [selectedMockupId, setSelectedMockupId] = useState<string | null>(null);
  const [belowHorizon, setBelowHorizon] = useState(false);
  const helpersRef = useRef<THREE.Group>(null);
  const orbitControlsRef = useRef<any>(null);

  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls) return;
    const handler = () => setBelowHorizon(controls.getPolarAngle() > Math.PI / 2);
    controls.addEventListener("change", handler);
    handler();
    return () => controls.removeEventListener("change", handler);
  }, []);
  const scale = 220;
  const sceneW = displayW / scale;
  const sceneH = displayH / scale;
  const floorSize = Math.max(sceneW, sceneH, 4.5) * 2.35;
  const mockupItems = items.filter((item) => item.src && isMockup(item));

  const itemSpreads = useMemo(() => {
    const count = mockupItems.length;
    if (count === 0) return [];
    const totalWidth = mockupItems.reduce((sum, item) => sum + item.w / scale, 0);
    const gap = Math.max(totalWidth / count * 0.3, 0.25);
    const total = totalWidth + gap * (count - 1);
    let cursor = -total / 2;
    return mockupItems.map((item, i) => {
      const halfW = (item.w / scale) / 2;
      const center = cursor + halfW;
      cursor += item.w / scale + gap;
      return center;
    });
  }, [mockupItems, scale]);

  const objectBounds = useMemo(() => {
    if (mockupItems.length === 0) return { size: 1, height: 1, centerX: 0, centerY: 0 };
    const maxW = Math.max(...mockupItems.map((item) => isModelSrc(item.src, item.assetType) ? 1.45 : item.w / scale), 1);
    const maxH = Math.max(...mockupItems.map((item) => isModelSrc(item.src, item.assetType) ? 2.1 : item.h / scale), 1);
    const totalW = itemSpreads.length > 1 ? itemSpreads[itemSpreads.length - 1] - itemSpreads[0] + maxW : maxW;
    return { size: Math.max(totalW, maxH, 1), height: Math.max(maxH, 1), centerX: 0, centerY: 0 };
  }, [mockupItems, itemSpreads, scale]);

  const controlTarget: [number, number, number] = [0, objectBounds.height * 0.5, 0];
  const minDistance = Math.max(objectBounds.size * 0.9, 1.2);
  const maxDistance = Math.max(objectBounds.size * 3.2, 3.2);
  const cameraDist = Math.max(objectBounds.size * 1.85, 2.8);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e); }}
      onDrop={(e) => onDrop?.(e)}
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0, background: "linear-gradient(#25272b, #1d1f22)" }}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, cameraDist * 0.55, cameraDist], fov: 42 }}
        gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
        style={{ background: "transparent" }}
        onPointerMissed={() => setSelectedMockupId(null)}
      >
        <color attach="background" args={["#25272b"]} />
        <fog attach="fog" args={["#25272b", floorSize * 0.65, floorSize * 1.9]} />
        <CameraZoom zoom={zoom ?? 100} />
        <ExportController
          exportApiRef={exportApiRef}
          target={controlTarget}
          objectWidth={objectBounds.size}
          objectHeight={objectBounds.height}
          helpersRef={helpersRef}
        />
        <ambientLight intensity={0.9} />
        <directionalLight
          position={[floorSize * 0.25, floorSize * 0.62, floorSize * 0.2]}
          intensity={2.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-floorSize * 0.18, floorSize * 0.28, -floorSize * 0.3]} intensity={0.7} />
        <hemisphereLight args={["#ffffff", "#3c4046", 1.2]} />

        <group ref={helpersRef} visible={showGrid && !belowHorizon}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={-20}>
            <planeGeometry args={[floorSize, floorSize]} />
            <meshStandardMaterial
              color="#303238"
              roughness={0.95}
              metalness={0.02}
              polygonOffset
              polygonOffsetFactor={1}
              polygonOffsetUnits={1}
            />
          </mesh>
          <SceneGrid size={floorSize} />
          <ContactShadows position={[0, 0.02, 0]} opacity={0.38} scale={floorSize * 0.42} blur={2.8} far={floorSize * 0.35} />
        </group>

        {mockupItems.map((item, i) => {
          const posX = itemSpreads[i] ?? 0;
          return (
            <MockupErrorBoundary key={item.id} posX={posX} resetKey={item.src} modelName={item.assetName || item.src}>
              <Suspense fallback={<ModelLoadingPlaceholder posX={posX} />}>
              <MockupItem
                mappingKey={item.assetName || item.src}
                imageSrc={item.src}
                modelName={item.assetName}
                garmentDesigns={item.designs ? ({ ...item.designs } as GarmentDesigns) : garmentDesigns}
                garmentColors={item.colors ? ({ ...item.colors } as GarmentColors) : garmentColors}
                w={item.w}
                h={item.h}
                rotation={item.rotation || 0}
                posX={posX}
                isSelected={selectedMockupId === item.id}
                onClick={() => setSelectedMockupId(item.id)}
                assetType={item.assetType}
                garmentDesignSettings={garmentDesignSettings}
                shirtTexts={shirtTexts || []}
                activeGarmentRegion={activeGarmentRegion}
                editorTool={editorTool}
                wireframe={wireframe}
                regionMapperEnabled={regionMapperEnabled}
                regionMeshAssignments={regionMappings[item.assetName || item.src] || {}}
                onAssignRegionMesh={onAssignRegionMesh}
              />
              </Suspense>
            </MockupErrorBoundary>
          );
        })}

        <CameraRig target={controlTarget} distance={cameraDist} />
        <OrbitControls
          ref={orbitControlsRef}
          target={controlTarget}
          enableDamping
          dampingFactor={0.12}
          enableRotate={!regionMapperEnabled && (editorTool === "orbit" || editorTool === "select")}
          enablePan={!regionMapperEnabled && (editorTool === "orbit" || editorTool === "pan")}
          enableZoom
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          minDistance={minDistance}
          maxDistance={maxDistance}
        />
        <RegionCameraFocus
          region={activeGarmentRegion}
          target={controlTarget}
          distance={cameraDist}
          objectHeight={objectBounds.height}
          frontAxis="z"
          controlsRef={orbitControlsRef}
        />
        <ViewPresetCamera
          preset={viewPreset}
          revision={viewRevision}
          target={controlTarget}
          distance={cameraDist}
          controlsRef={orbitControlsRef}
        />
      </Canvas>

      {selectedMockupId && onRemoveMockup && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveMockup(selectedMockupId); setSelectedMockupId(null); }}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 20,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}
          title="Remove mockup"
        >×</button>
      )}
    </div>
  );
}
