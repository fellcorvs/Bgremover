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

export interface ShirtTextOverlay {
  id: string;
  text: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  rotation: number;
  effect: "none" | "shadow" | "outline" | "glow";
  effectColor: string;
  mockupSide?: "front" | "back" | "both";
  mockupOffsetX?: number;
  mockupOffsetY?: number;
}

export interface ThreeDExportApi {
  exportFrontBack: (format: "png" | "jpg") => Promise<Blob>;
}

const PERSON_MODEL_PATTERN = /(player|portrait|person|girl|man|woman|confidence|stride|casual|crossed-leg)/i;
const GARMENT_MODEL_PATTERN = /(shirt|t-shirt|tshirt|jersey|uniform|hoodie|camisa|cloth|top)/i;
const GARMENT_MESH_PATTERN = /(shirt|t-shirt|tshirt|jersey|uniform|hoodie|camisa|cloth|body[_\s-]*(front|back)|sleeve|torso|top)/i;

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

function ShirtTextMesh({
  label,
  side,
  bounds,
}: {
  label: ShirtTextOverlay;
  side: "front" | "back";
  bounds: { width: number; height: number; depth: number };
}) {
  const renderedText = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 384;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const fontSize = 220;
    context.font = `${label.italic ? "italic " : ""}${label.bold ? "700 " : "400 "}${fontSize}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const measured = Math.max(context.measureText(label.text || " ").width, 1);
    const scale = Math.min(1, (canvas.width - 80) / measured);
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.scale(scale, scale);
    if (label.effect === "shadow" || label.effect === "glow") {
      context.shadowColor = label.effectColor;
      context.shadowBlur = label.effect === "glow" ? 36 : 12;
      context.shadowOffsetX = label.effect === "shadow" ? 10 : 0;
      context.shadowOffsetY = label.effect === "shadow" ? 10 : 0;
    }
    if (label.effect === "outline") {
      context.strokeStyle = label.effectColor;
      context.lineWidth = 14;
      context.lineJoin = "round";
      context.strokeText(label.text, 0, 0);
    }
    context.fillStyle = label.color;
    context.fillText(label.text, 0, 0);
    context.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return { texture, aspect: Math.min(measured / fontSize, 7) };
  }, [label]);

  useEffect(() => () => renderedText?.texture.dispose(), [renderedText]);
  if (!renderedText || !label.text.trim()) return null;

  let height = THREE.MathUtils.clamp((label.fontSize / 100) * bounds.height * 0.22, 0.06, 0.55);
  let width = height * renderedText.aspect;
  const maxWidth = bounds.width * 0.82;
  if (width > maxWidth) {
    height *= maxWidth / width;
    width = maxWidth;
  }
  const x = (label.mockupOffsetX || 0) * bounds.width * 0.38;
  const y = bounds.height * (0.56 + (label.mockupOffsetY || 0) * 0.3);

  return (
    <mesh
      position={[x, y, side === "front" ? bounds.depth * 0.52 : -bounds.depth * 0.52]}
      rotation={[0, side === "front" ? 0 : Math.PI, THREE.MathUtils.degToRad(label.rotation)]}
      renderOrder={20}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={renderedText.texture} transparent alphaTest={0.02} depthWrite={false} toneMapped={false} />
    </mesh>
  );
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
  designSrc?: string;
  shirtColor: string;
  w: number;
  h: number;
  rotation: number;
  posX: number;
  isSelected: boolean;
  onClick: () => void;
  assetType?: FreestyleItem["assetType"];
  decalSettings: DecalSettings;
  shirtTexts: ShirtTextOverlay[];
}) {
  if (isModelSrc(props.imageSrc, props.assetType)) {
    return <ModelMockupItem {...props} />;
  }
  const { decalSettings: _decalSettings, shirtTexts: _shirtTexts, assetType: _assetType, modelName: _modelName, ...pngProps } = props;
  return <PngMockupItem {...pngProps} />;
}

const FALLBACK_DECAL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function ModelMockupItem({
  imageSrc,
  modelName,
  designSrc,
  shirtColor,
  rotation,
  posX,
  isSelected,
  onClick,
  decalSettings,
  shirtTexts,
}: {
  imageSrc: string;
  modelName?: string;
  designSrc?: string;
  shirtColor: string;
  rotation: number;
  posX: number;
  isSelected: boolean;
  onClick: () => void;
  decalSettings: DecalSettings;
  shirtTexts: ShirtTextOverlay[];
}) {
  const gltf = useGLTF(imageSrc);
  const designTexture = useTexture(designSrc || FALLBACK_DECAL);
  const modelIdentity = `${modelName || ""} ${imageSrc}`;
  const isPerson = PERSON_MODEL_PATTERN.test(modelIdentity);
  const isGarment = GARMENT_MODEL_PATTERN.test(modelIdentity);
  const isStandaloneGarment = isGarment && !isPerson;
  const wrappedDesignTexture = useMemo(() => {
    if (!designSrc) return null;
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
    const coverScale = Math.max(size / image.width, size / image.height) * decalSettings.scale;
    const drawWidth = image.width * coverScale;
    const drawHeight = image.height * coverScale;
    context.translate(
      size * 0.5 + decalSettings.offsetX * size * 0.45,
      size * 0.5 - decalSettings.offsetY * size * 0.45,
    );
    context.rotate(THREE.MathUtils.degToRad(decalSettings.rotation));
    context.drawImage(image, -drawWidth * 0.5, -drawHeight * 0.5, drawWidth, drawHeight);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [decalSettings, designSrc, designTexture.image, shirtColor]);

  useEffect(() => () => wrappedDesignTexture?.dispose(), [wrappedDesignTexture]);

  const preparedModel = useMemo(() => {
    const clone = cloneSkeleton(gltf.scene) as THREE.Group;
    const shirtTint = new THREE.Color(shirtColor);
    const generatedTextures: THREE.Texture[] = [];
    const generatedGeometries: THREE.BufferGeometry[] = [];
    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const materialNames = (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        .map((material) => material?.name || "")
        .join(" ");
      const isGarmentMesh = isStandaloneGarment || GARMENT_MESH_PATTERN.test(`${mesh.name} ${materialNames}`);
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

    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
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
  }, [gltf.scene, imageSrc, isPerson, isStandaloneGarment, shirtColor, wrappedDesignTexture]);

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

  designTexture.colorSpace = THREE.SRGBColorSpace;
  designTexture.anisotropy = 8;

  return (
    <group position={[posX, 0, 0]} rotation={[0, -rotation * Math.PI / 180, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <primitive object={preparedModel.object} />
      {isStandaloneGarment && shirtTexts.flatMap((label) => {
        const sides = label.mockupSide === "both" || !label.mockupSide ? ["front", "back"] as const : [label.mockupSide] as const;
        return sides.map((side) => (
          <ShirtTextMesh key={`${label.id}-${side}`} label={label} side={side} bounds={modelBounds} />
        ));
      })}
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
  useEffect(() => {
    camera.position.set(0, target[1] + distance * 0.2, distance);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, distance, target]);
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
        const gradient = context.createLinearGradient(0, 0, 0, finalHeight);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(1, "#eef1f5");
        context.fillStyle = gradient;
        context.fillRect(0, 0, finalWidth, finalHeight);

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
          scene.background = new THREE.Color("#f7f8fa");
          gl.setRenderTarget(renderTarget);
          gl.setClearColor("#f7f8fa", 1);
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
  activeDecalSrc,
  shirtColor,
  zoom,
  onRemoveMockup,
  decalSettings,
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
  activeDecalSrc?: string | null;
  shirtColor?: string;
  zoom?: number;
  onRemoveMockup?: (id: string) => void;
  decalSettings?: DecalSettings;
  shirtTexts?: ShirtTextOverlay[];
  exportApiRef?: React.MutableRefObject<ThreeDExportApi | null>;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const [selectedMockupId, setSelectedMockupId] = useState<string | null>(null);
  const helpersRef = useRef<THREE.Group>(null);
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
                designSrc={activeDecalSrc || undefined}
                shirtColor={shirtColor || "#ffffff"}
                w={item.w}
                h={item.h}
                rotation={item.rotation || 0}
                posX={posX}
                isSelected={selectedMockupId === item.id}
                onClick={() => setSelectedMockupId(item.id)}
                assetType={item.assetType}
                decalSettings={decalSettings || { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 }}
                shirtTexts={shirtTexts || []}
              />
              </Suspense>
            </MockupErrorBoundary>
          );
        })}

        <CameraRig target={controlTarget} distance={cameraDist} />
        <OrbitControls
          target={controlTarget}
          enableDamping
          dampingFactor={0.12}
          minPolarAngle={0.18}
          maxPolarAngle={Math.PI * 0.48}
          minDistance={minDistance}
          maxDistance={maxDistance}
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
