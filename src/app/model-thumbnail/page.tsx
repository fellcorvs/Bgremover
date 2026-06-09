"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useSearchParams } from "next/navigation";

function Model({ src, onReady }: { src: string; onReady: () => void }) {
  const gltf = useGLTF(src);
  const model = useMemo(() => {
    const clone = cloneSkeleton(gltf.scene) as THREE.Group;
    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
    });
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    if (box.isEmpty()) throw new Error("GLB does not contain a visible mesh.");

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 2.3 / Math.max(size.x, size.y, size.z, 0.001);
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.updateMatrixWorld(true);
    return clone;
  }, [gltf.scene]);

  useEffect(() => {
    const frame = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(frame);
  }, [model, onReady]);

  return <primitive object={model} />;
}

function Camera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(3.1, 2.1, 4.6);
    camera.lookAt(0, 1.05, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

export default function ModelThumbnailPage() {
  const params = useSearchParams();
  const src = params.get("src") || "";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [src]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#e2e8f0]" data-thumbnail-ready={ready ? "true" : "false"}>
      {src ? (
        <Canvas
          shadows
          camera={{ fov: 34, near: 0.01, far: 100 }}
          gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
        >
          <color attach="background" args={["#e2e8f0"]} />
          <ambientLight intensity={0.62} />
          <directionalLight position={[3, 5, 4]} intensity={1.7} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.42} />
          <hemisphereLight args={["#ffffff", "#94a3b8", 0.72]} />
          <Camera />
          <Suspense fallback={null}>
            <Model src={src} onReady={() => setReady(true)} />
          </Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[12, 12]} />
            <shadowMaterial color="#64748b" opacity={0.18} />
          </mesh>
        </Canvas>
      ) : null}
    </main>
  );
}
