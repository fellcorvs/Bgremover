"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

interface FreestyleItem {
  id: string; src: string; x: number; y: number; w: number; h: number; rotation: number;
  flipH?: boolean; flipV?: boolean; offsetX?: number; offsetY?: number; imgScale?: number;
  shape?: string; borderWidth?: number; borderColor?: string; brightness?: number;
  contrast?: number; saturation?: number; blendMode?: string; perspectiveX?: number; perspectiveY?: number;
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
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} />
        <directionalLight position={[-3, 2, -5]} intensity={0.5} />
        <OrbitControls autoRotate autoRotateSpeed={1.5} enableDamping dampingFactor={0.15} minDistance={2} maxDistance={cameraDist * 3} />
        <Suspense fallback={null}>
          {items.map((item, idx) => {
            const srcIdx = imageSrcs.indexOf(item.src);
            if (srcIdx === -1 || !item.src) return null;
            return (
              <PhotoPlane key={item.id} imageSrc={item.src} x={item.x} y={item.y} w={item.w} h={item.h}
                rotation={item.rotation || 0} displayW={displayW} displayH={displayH} />
            );
          })}
        </Suspense>
        <ContactShadows position={[0, -sceneH / 2 - 0.3, 0]} opacity={0.4} scale={maxDim * 2} blur={2.5} far={3} />
      </Canvas>
    </div>
  );
}
