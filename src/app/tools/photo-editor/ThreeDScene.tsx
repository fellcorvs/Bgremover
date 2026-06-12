"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
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
const GARMENT_MODEL_PATTERN = /(shirt|t-shirt|tshirt|jersey|uniform|hoodie|camisa|cloth|top)/i;
const GARMENT_MESH_PATTERN = /(shirt|t-shirt|tshirt|jersey|uniform|hoodie|camisa|cloth|body[_\s-]*(front|back)|sleeve|torso|top)/i;
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

function isMockup(item: FreestyleItem) {
  if (item.assetType === "model") return true;
  const cleanSrc = item.src.toLowerCase();
  return cleanSrc.includes("/mockups/") || cleanSrc.includes("mockups?name=") || cleanSrc.endsWith(".glb") || cleanSrc.endsWith(".gltf");
}

function isModelSrc(src: string, assetType?: FreestyleItem["assetType"]) {
  if (assetType === "model") return true;
  const cleanSrc = src.toLowerCase();
  return cleanSrc.endsWith(".glb") || cleanSrc.endsWith(".gltf") || cleanSrc.includes(".glb") || cleanSrc.includes(".gltf");
}

function SceneGrid({ size }: { size: number }) {
  const grid = useMemo(() => {
    const helper = new THREE.GridHelper(size, Math.max(12, Math.round(size * 2)), 0xbfc3c7, 0xe2e4e6);
    helper.position.y = -0.01;
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
  const spanX = Math.max(bounds.max.x - bounds.min.x, 0.000001);
  const spanZ = Math.max(bounds.max.z - bounds.min.z, 0.000001);
  const widthAxis: "x" | "z" = spanX >= spanZ ? "x" : "z";
  const depthAxis: "x" | "z" = widthAxis === "x" ? "z" : "x";
  const widthMin = widthAxis === "x" ? bounds.min.x : bounds.min.z;
  const width = widthAxis === "x" ? spanX : spanZ;
  const height = Math.max(bounds.max.y - bounds.min.y, 0.000001);
  const depthCenter = depthAxis === "x"
    ? (bounds.min.x + bounds.max.x) * 0.5
    : (bounds.min.z + bounds.max.z) * 0.5;
  const atlasUvs = new Float32Array(position.count * 2);

  for (let index = 0; index < position.count; index += 3) {
    const averageDepth = (
      (depthAxis === "x" ? position.getX(index) : position.getZ(index))
      + (depthAxis === "x" ? position.getX(index + 1) : position.getZ(index + 1))
      + (depthAxis === "x" ? position.getX(index + 2) : position.getZ(index + 2))
    ) / 3;
    const side = forcedSide || (averageDepth >= depthCenter ? "front" : "back");
    const sideOffset = side === "front" ? 0 : 0.5;
    for (let corner = 0; corner < 3; corner += 1) {
      const vertexIndex = index + corner;
      const widthPosition = widthAxis === "x" ? position.getX(vertexIndex) : position.getZ(vertexIndex);
      const rawU = (widthPosition - widthMin) / width;
      const u = side === "back" && unmirrorBack ? 1 - rawU : rawU;
      const v = (position.getY(vertexIndex) - bounds.min.y) / height;
      atlasUvs[vertexIndex * 2] = sideOffset + THREE.MathUtils.clamp(u, 0, 1) * 0.5;
      atlasUvs[vertexIndex * 2 + 1] = THREE.MathUtils.clamp(v, 0, 1);
    }
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
    const zone = zoneOnTorso
      ? region === "left-shoulder"
        ? { x: sideStart, y: 0, width: sideSize * 0.38, height: sideSize * 0.36 }
        : region === "right-shoulder"
          ? { x: sideStart + sideSize * 0.62, y: 0, width: sideSize * 0.38, height: sideSize * 0.36 }
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
  texture.flipY = false;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function PngMockupItem({
  imageSrc,
  designSrc,
  shirtColor,
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
  const decalSize = useMemo(() => {
    const image = designTexture.image as HTMLImageElement | undefined;
    const aspect = image?.width && image?.height ? image.width / image.height : 1;
    const maxW = width * 0.28;
    const maxH = height * 0.3;
    return aspect >= maxW / maxH
      ? { w: maxW, h: maxW / aspect }
      : { w: maxH * aspect, h: maxH };
  }, [designTexture.image, height, width]);

  shirtTexture.colorSpace = THREE.SRGBColorSpace;
  shirtTexture.anisotropy = 8;
  designTexture.colorSpace = THREE.SRGBColorSpace;
  designTexture.anisotropy = 8;

  return (
    <group position={[posX, height / 2, 0]} rotation={[0, -rotation * Math.PI / 180, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh castShadow receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={shirtTexture} color={shirtColor} roughness={0.58} metalness={0.02} transparent side={THREE.DoubleSide} />
      </mesh>
      {designSrc && (
        <mesh position={[0, -height * 0.04, depth]} castShadow>
          <planeGeometry args={[decalSize.w, decalSize.h]} />
          <meshStandardMaterial
            map={designTexture}
            roughness={0.72}
            metalness={0.01}
            transparent
            opacity={0.82}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-4}
          />
        </mesh>
      )}
      {isSelected && <BoundingBox width={width * 1.02} height={height * 1.02} depth={depth * 2} />}
    </group>
  );
}

function MockupItem(props: {
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
    ...pngProps
  } = props;
  return <PngMockupItem {...pngProps} designSrc={garmentDesigns.overall || undefined} shirtColor={garmentColors.overall || "#ffffff"} />;
}

const FALLBACK_DECAL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function ModelMockupItem({
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
}: {
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
}) {
  const gltf = useGLTF(imageSrc);
  const designTextures = useTexture(GARMENT_REGIONS.map((region) => garmentDesigns[region] || FALLBACK_DECAL)) as THREE.Texture[];
  const shirtColor = garmentColors.overall || "#ffffff";
  const designTexture = designTextures[0];
  const modelIdentity = `${modelName || ""} ${imageSrc}`;
  const isPerson = PERSON_MODEL_PATTERN.test(modelIdentity);
  const isGarment = GARMENT_MODEL_PATTERN.test(modelIdentity);
  const sceneHasGarmentHints = useMemo(() => {
    let names = "";
    gltf.scene.traverse((child) => {
      names += ` ${child.name || ""}`;
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        names += ` ${materials.map((material) => material?.name || "").join(" ")}`;
      }
    });
    return GARMENT_MESH_PATTERN.test(names);
  }, [gltf.scene]);
  const hasGarmentEdits = useMemo(
    () => Object.values(garmentDesigns).some(Boolean)
      || Object.entries(garmentColors).some(([region, color]) => region !== "overall" ? Boolean(color) : color !== "#ffffff")
      || shirtTexts.length > 0,
    [garmentColors, garmentDesigns, shirtTexts.length],
  );
  const isStandaloneGarment = !isPerson && (isGarment || sceneHasGarmentHints || hasGarmentEdits);
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
      );
      if (texture) textures[regional] = texture;
    });
    return textures;
  }, [designTextures, garmentColors, garmentDesignSettings, garmentDesigns]);
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
      );
      if (texture) textures[regional] = texture;
    });
    return textures;
  }, [designTextures, garmentColors, garmentDesignSettings, garmentDesigns]);

  useEffect(() => () => wrappedDesignTexture?.dispose(), [wrappedDesignTexture]);
  useEffect(() => () => Object.values(regionTextures).forEach((texture) => texture?.dispose()), [regionTextures]);
  useEffect(() => () => Object.values(torsoRegionTextures).forEach((texture) => texture?.dispose()), [torsoRegionTextures]);
  useEffect(() => () => bodyTextAtlas?.dispose(), [bodyTextAtlas]);
  useEffect(() => () => leftShoulderTextAtlas?.dispose(), [leftShoulderTextAtlas]);
  useEffect(() => () => rightShoulderTextAtlas?.dispose(), [rightShoulderTextAtlas]);

  const preparedModel = useMemo(() => {
    const clone = cloneSkeleton(gltf.scene) as THREE.Group;
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
      if (isGarmentMesh) garmentMeshes.push({ mesh, label: meshLabel });
      if (isGarmentMesh && wrappedDesignTexture) {
        const normalizedGeometry = normalizeMalformedGarmentUvs(mesh);
        if (normalizedGeometry) generatedGeometries.push(normalizedGeometry);
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
              next.color = shirtTint.clone().multiply(next.color);
            }
          }
          next.roughness = Math.max(next.roughness, 0.55);
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
    ) => {
      const overlayGeometry = createGarmentTextGeometry(mesh.geometry, side, unmirrorBack);
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

    const torsoMeshes = garmentMeshes.filter(({ label }) => !/(sleeve|ribbing|collar|neck)/i.test(label));
    const namedTorsoSides = torsoMeshes.filter(({ label }) => /(front|back)/i.test(label));
    const torsoSurfaces: Array<{ mesh: THREE.Mesh; side?: "front" | "back" }> = [];
    if (namedTorsoSides.length > 0) {
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

    const frontTexture = regionTextures.front;
    const backTexture = regionTextures.back;
    torsoSurfaces.forEach(({ mesh, side }) => {
      if (frontTexture && side !== "back") {
        attachGarmentOverlay(mesh, frontTexture, side === "front" ? "front" : undefined);
      }
      if (backTexture && side !== "front") {
        attachGarmentOverlay(mesh, backTexture, side === "back" ? "back" : undefined);
      }
    });

    clone.updateMatrixWorld(true);
    const sleeveMeshes = garmentMeshes
      .filter(({ label }) => /sleeve/i.test(label))
      .map((entry) => ({
        ...entry,
        centerX: new THREE.Box3().setFromObject(entry.mesh).getCenter(new THREE.Vector3()).x,
      }))
      .sort((a, b) => a.centerX - b.centerX);
    const leftSleeve = sleeveMeshes[0]?.mesh;
    const rightSleeve = sleeveMeshes[sleeveMeshes.length - 1]?.mesh;
    if (regionTextures["left-shoulder"] && leftSleeve) {
      attachGarmentOverlay(leftSleeve, regionTextures["left-shoulder"]);
    } else if (torsoRegionTextures["left-shoulder"]) {
      torsoSurfaces.forEach(({ mesh, side }) => attachGarmentOverlay(mesh, torsoRegionTextures["left-shoulder"]!, side));
    }
    if (regionTextures["right-shoulder"] && rightSleeve) {
      attachGarmentOverlay(rightSleeve, regionTextures["right-shoulder"]);
    } else if (torsoRegionTextures["right-shoulder"]) {
      torsoSurfaces.forEach(({ mesh, side }) => attachGarmentOverlay(mesh, torsoRegionTextures["right-shoulder"]!, side));
    }

    if (regionTextures["round-neck"]) {
      const neckMeshes = garmentMeshes.filter(({ label }) => /(ribbing|collar|neck)/i.test(label));
      if (neckMeshes.length > 0) {
        neckMeshes.forEach(({ mesh }) => attachGarmentOverlay(mesh, regionTextures["round-neck"]!));
      } else if (torsoRegionTextures["round-neck"]) {
        torsoSurfaces.forEach(({ mesh, side }) => attachGarmentOverlay(mesh, torsoRegionTextures["round-neck"]!, side));
      }
    }

    if (bodyTextAtlas) {
      torsoSurfaces.forEach(({ mesh, side }) => {
        attachGarmentOverlay(mesh, bodyTextAtlas, side, "shirt-text-sublimation", true, true);
      });
    }

    if (leftShoulderTextAtlas || rightShoulderTextAtlas) {
      if (leftShoulderTextAtlas && leftSleeve) {
        attachGarmentOverlay(leftSleeve, leftShoulderTextAtlas, undefined, "shirt-text-sublimation", true);
      }
      if (rightShoulderTextAtlas && rightSleeve) {
        attachGarmentOverlay(rightSleeve, rightShoulderTextAtlas, undefined, "shirt-text-sublimation", true);
      }
    }

    clone.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(clone);
    if (box.isEmpty()) throw new Error("This GLB does not contain a visible mesh.");

    let size = box.getSize(new THREE.Vector3());
    if (isStandaloneGarment && size.z > size.x * 1.2) {
      clone.rotation.y -= Math.PI / 2;
      clone.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(clone);
      size = box.getSize(new THREE.Vector3());
    }
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

    return {
      object: clone,
      generatedTextures,
      generatedGeometries,
      bounds: {
        width: Math.max(size.x * normalizedScale, 0.35),
        height: Math.max(size.y * normalizedScale, 0.35),
        depth: Math.max(size.z * normalizedScale, 0.12),
      },
    };
  }, [
    bodyTextAtlas,
    gltf.scene,
    imageSrc,
    isPerson,
    isStandaloneGarment,
    leftShoulderTextAtlas,
    regionTextures,
    rightShoulderTextAtlas,
    shirtColor,
    torsoRegionTextures,
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

  return (
    <group position={[posX, 0, 0]} rotation={[0, -rotation * Math.PI / 180, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <primitive object={preparedModel.object} />
      {isSelected && <BoundingBox width={modelBounds.width * 1.12} height={modelBounds.height * 1.04} depth={modelBounds.depth * 1.2} />}
    </group>
  );
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
  { children: React.ReactNode; posX: number; resetKey: string },
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
      return (
        <group position={[this.props.posX, 1.2, 0]}>
          <mesh>
            <boxGeometry args={[1.6, 0.5, 0.1]} />
            <meshStandardMaterial color="#dc2626" transparent opacity={0.15} />
          </mesh>
          <Html center>
            <div style={{
              background: "rgba(220,38,38,0.85)", color: "#fff",
              padding: "3px 7px", borderRadius: 4,
              fontSize: 10, maxWidth: 180, fontFamily: "monospace",
              lineHeight: 1.3, textAlign: "center", pointerEvents: "none",
            }}>
              {this.state.error}
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
  controlsRef,
}: {
  region: GarmentRegion;
  target: [number, number, number];
  distance: number;
  objectHeight: number;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera } = useThree();
  const [targetX, targetY, targetZ] = target;
  useEffect(() => {
    const closeDistance = distance * 0.62;
    const shoulderHeight = targetY + objectHeight * 0.25;
    const neckHeight = targetY + objectHeight * 0.34;
    const focusTarget = new THREE.Vector3(targetX, targetY, targetZ);
    const cameraPosition = new THREE.Vector3(targetX, targetY + distance * 0.2, targetZ + distance);

    if (region === "back") {
      cameraPosition.set(targetX, targetY + distance * 0.2, targetZ - distance);
    } else if (region === "left-shoulder") {
      focusTarget.y = shoulderHeight;
      cameraPosition.set(targetX - closeDistance * 0.8, shoulderHeight + closeDistance * 0.12, targetZ + closeDistance * 0.65);
    } else if (region === "right-shoulder") {
      focusTarget.y = shoulderHeight;
      cameraPosition.set(targetX + closeDistance * 0.8, shoulderHeight + closeDistance * 0.12, targetZ + closeDistance * 0.65);
    } else if (region === "round-neck") {
      focusTarget.y = neckHeight;
      cameraPosition.set(targetX, neckHeight + closeDistance * 0.18, targetZ + closeDistance);
    }

    camera.position.copy(cameraPosition);
    camera.lookAt(focusTarget);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(focusTarget);
      controls.update();
    }
  }, [camera, controlsRef, distance, objectHeight, region, targetX, targetY, targetZ]);
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
  shirtTexts?: ShirtTextOverlay[];
  exportApiRef?: React.MutableRefObject<ThreeDExportApi | null>;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const [selectedMockupId, setSelectedMockupId] = useState<string | null>(null);
  const helpersRef = useRef<THREE.Group>(null);
  const orbitControlsRef = useRef<any>(null);
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
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0, background: "linear-gradient(#cfd1d3, #eceeef)" }}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, cameraDist * 0.55, cameraDist], fov: 42 }}
        gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
        style={{ background: "transparent" }}
        onPointerMissed={() => setSelectedMockupId(null)}
      >
        <color attach="background" args={["#d8dadd"]} />
        <fog attach="fog" args={["#d8dadd", floorSize * 0.55, floorSize * 1.7]} />
        <CameraZoom zoom={zoom ?? 100} />
        <ExportController
          exportApiRef={exportApiRef}
          target={controlTarget}
          objectWidth={objectBounds.size}
          objectHeight={objectBounds.height}
          helpersRef={helpersRef}
        />
        <ambientLight intensity={0.72} />
        <directionalLight
          position={[floorSize * 0.25, floorSize * 0.62, floorSize * 0.2]}
          intensity={2.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-floorSize * 0.18, floorSize * 0.28, -floorSize * 0.3]} intensity={0.7} />
        <hemisphereLight args={["#ffffff", "#b9bdc1", 1.1]} />

        <group ref={helpersRef}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[floorSize, floorSize]} />
            <shadowMaterial color="#8d9399" opacity={0.18} />
          </mesh>
          <SceneGrid size={floorSize} />
          <ContactShadows position={[0, 0.02, 0]} opacity={0.38} scale={floorSize * 0.42} blur={2.8} far={floorSize * 0.35} />
        </group>

        {mockupItems.map((item, i) => {
          const posX = itemSpreads[i] ?? 0;
          return (
            <MockupErrorBoundary key={item.id} posX={posX} resetKey={item.src}>
              <Suspense fallback={<ModelLoadingPlaceholder posX={posX} />}>
              <MockupItem
                imageSrc={item.src}
                modelName={item.assetName}
                garmentDesigns={garmentDesigns}
                garmentColors={garmentColors}
                w={item.w}
                h={item.h}
                rotation={item.rotation || 0}
                posX={posX}
                isSelected={selectedMockupId === item.id}
                onClick={() => setSelectedMockupId(item.id)}
                assetType={item.assetType}
                garmentDesignSettings={garmentDesignSettings}
                shirtTexts={shirtTexts || []}
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
          minPolarAngle={0.18}
          maxPolarAngle={Math.PI * 0.48}
          minDistance={minDistance}
          maxDistance={maxDistance}
        />
        <RegionCameraFocus
          region={activeGarmentRegion}
          target={controlTarget}
          distance={cameraDist}
          objectHeight={objectBounds.height}
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
