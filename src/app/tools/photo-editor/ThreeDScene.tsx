"use client";
import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

interface FreestyleItem {
  id: string; src: string; x: number; y: number; w: number; h: number; rotation: number;
  flipH?: boolean; flipV?: boolean; offsetX?: number; offsetY?: number; imgScale?: number;
  shape?: string; borderWidth?: number; borderColor?: string; brightness?: number;
  contrast?: number; saturation?: number; blendMode?: string; perspectiveX?: number; perspectiveY?: number;
}

function isMockup(src: string) {
  return src.includes("/mockups/") || src.includes("mockups?name=") || src.includes("-bg-removed");
}

function createTshirtGeometry(w: number, h: number, depth: number, segW: number, segH: number) {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segH; j++) {
    const v = j / segH;
    for (let i = 0; i <= segW; i++) {
      const u = i / segW;

      let sx = (u - 0.5) * w;
      let sy = (0.5 - v) * h;

      const shoulderY = 0.22;
      const neckCenter = 0.05;
      const neckWidth = 0.18;

      const distFromCenter = Math.abs(u - 0.5) * 2;
      const isNeck = v < 0.15 && distFromCenter < 0.4;
      const neckDepth = isNeck ? Math.max(0, 1 - distFromCenter * 3) * (0.15 - v) / 0.15 * 0.3 : 0;

      const shoulderTaper = v < shoulderY
        ? 1 - (shoulderY - v) / shoulderY * 0.08
        : 1;

      const bodyTaper = v > 0.45
        ? 1 - (v - 0.45) / (1 - 0.45) * 0.12
        : 1;

      const armCurve = v < 0.35
        ? 1 - (1 - distFromCenter) * (0.35 - v) / 0.35 * 0.06
        : 1;

      sx = sx * shoulderTaper * bodyTaper * armCurve;

      if (isNeck) {
        const nf = Math.max(0, 1 - distFromCenter / 0.4);
        sy += nf * neckDepth * h;
      }

      const chestCurve = Math.sin(v * Math.PI) * 0.15;
      const distFromEdge = Math.min(u, 1 - u) * 2;
      const sideWrap = Math.pow(1 - distFromEdge, 2) * 0.3;
      const zCurve = v > 0.05 && v < 0.7
        ? chestCurve * (1 - sideWrap)
        : 0;

      const sz = zCurve * depth;

      positions.push(sx, sy, sz);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segH; j++) {
    for (let i = 0; i < segW; i++) {
      const a = j * (segW + 1) + i;
      const b = a + 1;
      const c = (j + 1) * (segW + 1) + i;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function TshirtPlane({ imageSrc, x, y, w, h, rotation, displayW, displayH }: {
  imageSrc: string; x: number; y: number; w: number; h: number; rotation: number;
  displayW: number; displayH: number;
}) {
  const texture = useTexture(imageSrc);
  const scale = 200;
  const px = (x + w / 2 - displayW / 2) / scale;
  const py = -(y + h / 2 - displayH / 2) / scale;
  const pw = w / scale;
  const ph = h / scale;

  const geometry = useMemo(() => createTshirtGeometry(pw, ph, Math.min(pw, ph) * 0.08, 24, 28), [pw, ph]);

  return (
    <mesh position={[px, py, 0]} rotation={[0, 0, -rotation * Math.PI / 180]}>
      <primitive object={geometry} />
      <meshStandardMaterial map={texture} transparent side={THREE.DoubleSide} roughness={0.5} metalness={0.02} />
    </mesh>
  );
}

function PhotoPlane({ imageSrc, x, y, w, h, rotation, displayW, displayH }: {
  imageSrc: string; x: number; y: number; w: number; h: number; rotation: number;
  displayW: number; displayH: number;
}) {
  const texture = useTexture(imageSrc);
  const scale = 200;
  const px = (x + w / 2 - displayW / 2) / scale;
  const py = -(y + h / 2 - displayH / 2) / scale;
  const pw = w / scale;
  const ph = h / scale;

  return (
    <mesh position={[px, py, 0]} rotation={[0, 0, -rotation * Math.PI / 180]}>
      <planeGeometry args={[pw, ph]} />
      <meshStandardMaterial map={texture} transparent side={THREE.DoubleSide} roughness={0.3} metalness={0.05} />
    </mesh>
  );
}

export default function ThreeDScene({ canvasRef, displayW, displayH, items, imageSrcs }: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>; displayW: number; displayH: number;
  items: FreestyleItem[]; imageSrcs: string[];
}) {
  const scale = 200;
  const sceneW = displayW / scale;
  const sceneH = displayH / scale;
  const maxDim = Math.max(sceneW, sceneH);
  const cameraDist = maxDim * 1.5 + 2;

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <Canvas camera={{ position: [0, 0, cameraDist], fov: 45 }} gl={{ alpha: true }} style={{ background: "transparent" }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 10, 8]} intensity={1.8} />
        <directionalLight position={[-4, 3, -6]} intensity={0.6} />
        <directionalLight position={[0, -3, 4]} intensity={0.3} />
        <OrbitControls autoRotate autoRotateSpeed={1.2} enableDamping dampingFactor={0.15} minDistance={2} maxDistance={cameraDist * 3} />
        <Suspense fallback={null}>
          {items.map((item, idx) => {
            const srcIdx = imageSrcs.indexOf(item.src);
            if (srcIdx === -1 || !item.src) return null;
            const Plane = isMockup(item.src) ? TshirtPlane : PhotoPlane;
            return (
              <Plane key={item.id} imageSrc={item.src} x={item.x} y={item.y} w={item.w} h={item.h}
                rotation={item.rotation || 0} displayW={displayW} displayH={displayH} />
            );
          })}
        </Suspense>
        <ContactShadows position={[0, -sceneH / 2 - 0.3, 0]} opacity={0.5} scale={maxDim * 2.5} blur={3} far={3.5} />
      </Canvas>
    </div>
  );
}
