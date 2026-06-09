"use client";

import { Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

interface FreestyleItem {
  id: string;
  src: string;
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
}

function isMockup(src: string) {
  const cleanSrc = src.toLowerCase();
  return cleanSrc.includes("/mockups/") || cleanSrc.includes("mockups?name=") || cleanSrc.endsWith(".glb") || cleanSrc.endsWith(".gltf");
}

function isModelSrc(src: string) {
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
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
      <lineBasicMaterial color="#1687ff" transparent opacity={0.95} />
    </lineSegments>
  );
}

function MockupItem({
  imageSrc,
  designSrc,
  shirtColor,
  w,
  h,
  rotation,
}: {
  imageSrc: string;
  designSrc?: string;
  shirtColor: string;
  w: number;
  h: number;
  rotation: number;
}) {
  if (isModelSrc(imageSrc)) {
    return <ModelMockupItem imageSrc={imageSrc} designSrc={designSrc} shirtColor={shirtColor} rotation={rotation} />;
  }

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
    <group position={[0, height / 2, 0]} rotation={[0, -rotation * Math.PI / 180, 0]}>
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
      <BoundingBox width={width * 1.02} height={height * 1.02} depth={depth * 2} />
    </group>
  );
}

function ModelMockupItem({
  imageSrc,
  designSrc,
  shirtColor,
  rotation,
}: {
  imageSrc: string;
  designSrc?: string;
  shirtColor: string;
  rotation: number;
}) {
  const gltf = useGLTF(imageSrc);
  const designTexture = useTexture(designSrc || imageSrc);
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const shirtTint = new THREE.Color(shirtColor);
    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = materials.map((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
          const next = mat.clone();
          next.color = shirtTint.clone().multiply(next.color);
          next.roughness = Math.max(next.roughness, 0.55);
          return next;
        }
        return mat;
      }) as THREE.Material | THREE.Material[];
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const targetHeight = 2.1;
    clone.scale.setScalar(targetHeight / maxDim);
    clone.position.set(-center.x * clone.scale.x, -box.min.y * clone.scale.y, -center.z * clone.scale.z);
    return clone;
  }, [gltf.scene, shirtColor]);

  const modelBounds = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    return { width: Math.max(size.x, 0.8), height: Math.max(size.y, 1.2), depth: Math.max(size.z, 0.18) };
  }, [model]);

  const decalSize = useMemo(() => {
    const image = designTexture.image as HTMLImageElement | undefined;
    const aspect = image?.width && image?.height ? image.width / image.height : 1;
    const maxW = modelBounds.width * 0.34;
    const maxH = modelBounds.height * 0.28;
    return aspect >= maxW / maxH
      ? { w: maxW, h: maxW / aspect }
      : { w: maxH * aspect, h: maxH };
  }, [designTexture.image, modelBounds.height, modelBounds.width]);

  designTexture.colorSpace = THREE.SRGBColorSpace;
  designTexture.anisotropy = 8;

  return (
    <group rotation={[0, -rotation * Math.PI / 180, 0]}>
      <primitive object={model} />
      {designSrc && (
        <mesh position={[0, modelBounds.height * 0.48, modelBounds.depth * 0.52 + 0.02]} castShadow>
          <planeGeometry args={[decalSize.w, decalSize.h]} />
          <meshStandardMaterial
            map={designTexture}
            roughness={0.7}
            metalness={0.01}
            transparent
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-4}
          />
        </mesh>
      )}
      <BoundingBox width={modelBounds.width * 1.12} height={modelBounds.height * 1.04} depth={modelBounds.depth * 1.2} />
    </group>
  );
}

function PhotoItem({
  imageSrc,
  w,
  h,
  rotation,
}: {
  imageSrc: string;
  w: number;
  h: number;
  rotation: number;
}) {
  const texture = useTexture(imageSrc);
  const scale = 220;
  const width = w / scale;
  const height = h / scale;
  const thickness = Math.min(width, height) * 0.035;

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  return (
    <group position={[0, height / 2, 0]} rotation={[0, -rotation * Math.PI / 180, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial map={texture} roughness={0.38} metalness={0.04} transparent />
      </mesh>
      <BoundingBox width={width * 1.02} height={height * 1.02} depth={thickness * 1.3} />
    </group>
  );
}

function CameraRig({ target }: { target: [number, number, number] }) {
  useFrame(({ camera }) => {
    camera.lookAt(...target);
  });

  return null;
}

export default function ThreeDScene({
  canvasRef: _canvasRef,
  displayW,
  displayH,
  items,
  imageSrcs,
  selectedIndex,
  activeDecalSrc,
  shirtColor,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  displayW: number;
  displayH: number;
  items: FreestyleItem[];
  imageSrcs: string[];
  selectedIndex?: number | null;
  activeDecalSrc?: string | null;
  shirtColor?: string;
}) {
  const scale = 220;
  const sceneW = displayW / scale;
  const sceneH = displayH / scale;
  const floorSize = Math.max(sceneW, sceneH, 4.5) * 2.35;
  const availableItems = items.filter((item) => imageSrcs.includes(item.src));
  const mockupItems = availableItems.filter((item) => isMockup(item.src));
  const selectedItem = selectedIndex != null && items[selectedIndex] && imageSrcs.includes(items[selectedIndex].src)
    ? items[selectedIndex]
    : availableItems[availableItems.length - 1];
  const selectedMockup = selectedItem && isMockup(selectedItem.src) ? selectedItem : null;
  const selectedDesign = selectedItem && !isMockup(selectedItem.src) ? selectedItem : null;
  const baseMockup = selectedMockup || mockupItems[mockupItems.length - 1];
  const activeDesignSrc = activeDecalSrc && !isMockup(activeDecalSrc) ? activeDecalSrc : selectedDesign?.src;
  const renderItem = baseMockup || selectedItem;
  const objectSize = renderItem ? Math.max(renderItem.w, renderItem.h) / scale : 1;
  const objectHeight = renderItem ? renderItem.h / scale : 1;
  const controlTarget: [number, number, number] = [0, objectHeight * 0.5, 0];
  const minDistance = Math.max(objectSize * 0.9, 1.2);
  const maxDistance = Math.max(objectSize * 3.2, 3.2);
  const cameraDist = Math.max(objectSize * 1.65, 2.2);

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0, background: "linear-gradient(#cfd1d3, #eceeef)" }}>
      <Canvas
        shadows
        camera={{ position: [cameraDist * 0.85, cameraDist * 0.72, cameraDist], fov: 42 }}
        gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
        style={{ background: "transparent" }}
      >
        <color attach="background" args={["#d8dadd"]} />
        <fog attach="fog" args={["#d8dadd", floorSize * 0.55, floorSize * 1.7]} />
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

        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[floorSize, floorSize]} />
          <shadowMaterial color="#8d9399" opacity={0.18} />
        </mesh>
        <SceneGrid size={floorSize} />

        <Suspense fallback={null}>
          {renderItem && (() => {
            const item = renderItem;
            if (isMockup(item.src)) {
              return (
                <MockupItem
                  key={item.id}
                  imageSrc={item.src}
                  designSrc={activeDesignSrc || undefined}
                  shirtColor={shirtColor || "#ffffff"}
                  w={item.w}
                  h={item.h}
                  rotation={item.rotation || 0}
                />
              );
            }

            return (
              <PhotoItem key={item.id} imageSrc={item.src} w={item.w} h={item.h} rotation={item.rotation || 0} />
            );
          })()}
        </Suspense>

        <ContactShadows position={[0, 0.02, 0]} opacity={0.38} scale={floorSize * 0.42} blur={2.8} far={floorSize * 0.35} />
        <CameraRig target={controlTarget} />
        <OrbitControls
          target={controlTarget}
          autoRotate
          autoRotateSpeed={0.65}
          enableDamping
          dampingFactor={0.12}
          minPolarAngle={0.18}
          maxPolarAngle={Math.PI * 0.48}
          minDistance={minDistance}
          maxDistance={maxDistance}
        />
      </Canvas>
    </div>
  );
}
