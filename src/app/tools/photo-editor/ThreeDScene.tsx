"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture, Center, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function BoxMesh({ textureUrl, canvasAspect }: { textureUrl: string; canvasAspect: number }) {
  const texture = useTexture(textureUrl);
  const w = 2.4;
  const h = Math.max(w / canvasAspect, 1);
  const d = Math.min(1, w * 0.4);

  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial map={texture} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

export default function ThreeDScene({ canvasRef, displayW, displayH }: { canvasRef: React.RefObject<HTMLCanvasElement | null>; displayW: number; displayH: number }) {
  const [textureUrl, setTextureUrl] = useState<string>("");

  useEffect(() => {
    if (canvasRef.current) {
      setTextureUrl(canvasRef.current.toDataURL("image/png"));
    }
  }, [canvasRef]);

  const canvasAspect = displayW / displayH;

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <Canvas camera={{ position: [3, 2, 3], fov: 45 }} gl={{ alpha: true }} style={{ background: "transparent" }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} />
        <directionalLight position={[-3, 2, -5]} intensity={0.5} />
        <OrbitControls autoRotate autoRotateSpeed={2} enableDamping dampingFactor={0.15} minDistance={2} maxDistance={10} />
        <Center>
          {textureUrl && (
            <Suspense fallback={null}>
              <BoxMesh textureUrl={textureUrl} canvasAspect={canvasAspect} />
            </Suspense>
          )}
        </Center>
        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={6} blur={2.5} far={3} />
      </Canvas>
    </div>
  );
}
