"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
  posX,
  posY,
  isSelected,
  onClick,
}: {
  imageSrc: string;
  designSrc?: string;
  shirtColor: string;
  w: number;
  h: number;
  rotation: number;
  posX: number;
  posY: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  if (isModelSrc(imageSrc)) {
    return <ModelMockupItem imageSrc={imageSrc} designSrc={designSrc} shirtColor={shirtColor} rotation={rotation} posX={posX} posY={posY} isSelected={isSelected} onClick={onClick} />;
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

  const offsetX = posX / scale;
  const offsetY = posY / scale;

  shirtTexture.colorSpace = THREE.SRGBColorSpace;
  shirtTexture.anisotropy = 8;
  designTexture.colorSpace = THREE.SRGBColorSpace;
  designTexture.anisotropy = 8;

  return (
    <group position={[offsetX, height / 2 + offsetY, 0]} rotation={[0, -rotation * Math.PI / 180, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
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

function ModelMockupItem({
  imageSrc,
  designSrc,
  shirtColor,
  rotation,
  posX,
  posY,
  isSelected,
  onClick,
}: {
  imageSrc: string;
  designSrc?: string;
  shirtColor: string;
  rotation: number;
  posX: number;
  posY: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const gltf = useGLTF(imageSrc);
  const designTexture = useTexture(designSrc || imageSrc);
  const scale = 220;
  const offsetX = posX / scale;
  const offsetY = posY / scale;
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
    clone.position.set(-center.x * clone.scale.x + offsetX, -box.min.y * clone.scale.y + offsetY, -center.z * clone.scale.z);
    return clone;
  }, [gltf.scene, shirtColor, offsetX, offsetY]);

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
    <group rotation={[0, -rotation * Math.PI / 180, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
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
      {isSelected && <BoundingBox width={modelBounds.width * 1.12} height={modelBounds.height * 1.04} depth={modelBounds.depth * 1.2} />}
    </group>
  );
}

function CameraRig({ target }: { target: [number, number, number] }) {
  useFrame(({ camera }) => {
    camera.lookAt(...target);
  });

  return null;
}

function CameraZoom({ zoom }: { zoom: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.zoom = zoom / 100;
    camera.updateProjectionMatrix();
  }, [zoom, camera]);
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
}) {
  const [selectedMockupId, setSelectedMockupId] = useState<string | null>(null);
  const scale = 220;
  const sceneW = displayW / scale;
  const sceneH = displayH / scale;
  const floorSize = Math.max(sceneW, sceneH, 4.5) * 2.35;
  const mockupItems = items.filter((item) => item.src && isMockup(item.src));

  const objectBounds = useMemo(() => {
    if (mockupItems.length === 0) return { size: 1, height: 1, centerX: 0, centerY: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const item of mockupItems) {
      const hw = item.w / scale / 2;
      const hh = item.h / scale / 2;
      const cx = item.x / scale;
      const cy = item.y / scale;
      if (cx - hw < minX) minX = cx - hw;
      if (cx + hw > maxX) maxX = cx + hw;
      if (cy - hh < minY) minY = cy - hh;
      if (cy + hh > maxY) maxY = cy + hh;
    }
    const w = maxX - minX;
    const h = maxY - minY;
    return { size: Math.max(w, h, 1), height: Math.max(h, 1), centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
  }, [mockupItems, scale]);

  const controlTarget: [number, number, number] = [objectBounds.centerX, objectBounds.height * 0.4, 0];
  const minDistance = Math.max(objectBounds.size * 0.9, 1.2);
  const maxDistance = Math.max(objectBounds.size * 3.2, 3.2);
  const cameraDist = Math.max(objectBounds.size * 1.65, 2.2);

  const handleSceneClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('canvas')) return;
    setSelectedMockupId(null);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0, background: "linear-gradient(#cfd1d3, #eceeef)" }} onClick={handleSceneClick}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [cameraDist * 0.85 + objectBounds.centerX, cameraDist * 0.72 + objectBounds.centerY * 0.5, cameraDist], fov: 42 }}
        gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
        style={{ background: "transparent" }}
        onPointerMissed={() => setSelectedMockupId(null)}
      >
        <color attach="background" args={["#d8dadd"]} />
        <fog attach="fog" args={["#d8dadd", floorSize * 0.55, floorSize * 1.7]} />
        <CameraZoom zoom={zoom ?? 100} />
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
          {mockupItems.map((item) => (
            <MockupItem
              key={item.id}
              imageSrc={item.src}
              designSrc={activeDecalSrc || undefined}
              shirtColor={shirtColor || "#ffffff"}
              w={item.w}
              h={item.h}
              rotation={item.rotation || 0}
              posX={item.x}
              posY={item.y}
              isSelected={selectedMockupId === item.id}
              onClick={() => setSelectedMockupId(item.id)}
            />
          ))}
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
