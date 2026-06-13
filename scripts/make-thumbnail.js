globalThis.self = globalThis;
const THREE = require("three");
const path = require("path");
const fs = require("fs");

// Patch FileLoader to use fs
const origLoad = THREE.FileLoader.prototype.load;
THREE.FileLoader.prototype.load = function(url, onLoad, onProgress, onError) {
  const isLocal = !url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("blob:") && !url.startsWith("data:");
  if (isLocal) {
    try {
      const data = fs.readFileSync(url.replace(/^file:\/\//, ""));
      const result = this.responseType === "json" ? JSON.parse(data.toString("utf8")) : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      if (onLoad) onLoad(result);
    } catch (err) { if (onError) onError(err); }
    return { close() {} };
  }
  return origLoad.call(this, url, onLoad, onProgress, onError);
};

const { GLTFLoader } = require("three-stdlib");
const root = path.resolve(__dirname, "..");
const glbPath = path.join(root, "public/mockups/Clothing/longsleeve.glb");
const outPath = path.join(root, "public/mockups/_thumbnails/Clothing_longsleeve.png");

new GLTFLoader().load(glbPath, (gltf) => {
  const scene = gltf.scene;
  const meshes = [];
  scene.traverse(c => { if (c.isMesh) meshes.push(c); });

  // Compute bounding box
  const box = new THREE.Box3();
  meshes.forEach(m => box.expandByObject(m));
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  console.log("BBox size:", size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3), "maxDim:", maxDim.toFixed(3));
  console.log("Center:", center.x.toFixed(3), center.y.toFixed(3), center.z.toFixed(3));

  // Collect all triangles in world space, centered
  const verts = [];
  const norms = [];
  meshes.forEach(m => {
    m.updateWorldMatrix(true, false);
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    const pos = geo.getAttribute("position");
    const norm = geo.getAttribute("normal");
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m.matrixWorld).sub(center);
      verts.push(p.x, p.y, p.z);
      if (norm) {
        const n = new THREE.Vector3(norm.getX(i), norm.getY(i), norm.getZ(i)).applyMatrix4(m.matrixWorld).normalize();
        norms.push(n.x, n.y, n.z);
      } else { norms.push(0, 0, 1); }
    }
  });

  // Build triangles with depth sorting
  const W = 512, H = 512;
  const scale = Math.min(W * 0.9, H * 0.9) / maxDim * 1.0;
  const ox = W / 2, oy = H * 0.55;
  const toScreen = v => [Math.round(v[0] * scale + ox), Math.round(-v[1] * scale + oy)];

  const tri = [];
  for (let i = 0; i < verts.length; i += 9) {
    const z = (verts[i+2] + verts[i+5] + verts[i+8]) / 3;
    tri.push({ v: [verts.slice(i, i+3), verts.slice(i+3, i+6), verts.slice(i+6, i+9)], n: [norms.slice(i, i+3), norms.slice(i+3, i+6), norms.slice(i+6, i+9)], depth: z });
  }
  tri.sort((a, b) => b.depth - a.depth);

  // Lighting
  const ld = new THREE.Vector3(0.3, 0.6, 0.7).normalize();
  const amb = 0.5;
  const baseColor = 0.7;

  // Rasterize
  const pixels = new Float32Array(W * H * 3);
  pixels.fill(0.15); // dark bg

  const edge = (ax, ay, bx, by, cx, cy) => (cx - ax) * (by - ay) - (cy - ay) * (bx - ax);

  tri.forEach(t => {
    const s = [toScreen(t.v[0]), toScreen(t.v[1]), toScreen(t.v[2])];
    const mx = Math.max(0, Math.min(s[0][0], s[1][0], s[2][0]));
    const xx = Math.min(W-1, Math.max(s[0][0], s[1][0], s[2][0]));
    const my = Math.max(0, Math.min(s[0][1], s[1][1], s[2][1]));
    const xy = Math.min(H-1, Math.max(s[0][1], s[1][1], s[2][1]));
    const area = edge(s[0][0], s[0][1], s[1][0], s[1][1], s[2][0], s[2][1]);
    if (Math.abs(area) < 0.01) return;

    // Flat shading via average normal
    const an = [
      (t.n[0][0] + t.n[1][0] + t.n[2][0]) / 3,
      (t.n[0][1] + t.n[1][1] + t.n[2][1]) / 3,
      (t.n[0][2] + t.n[1][2] + t.n[2][2]) / 3,
    ];
    const nl = Math.sqrt(an[0]**2 + an[1]**2 + an[2]**2) || 1;
    const nd = an[0]/nl * ld.x + an[1]/nl * ld.y + an[2]/nl * ld.z;
    const intensity = Math.max(amb, Math.min(1, amb + (1-amb) * Math.max(0, nd)));
    const c = baseColor * intensity;

    for (let y = my; y <= xy; y++) {
      for (let x = mx; x <= xx; x++) {
        const w0 = edge(s[1][0], s[1][1], s[2][0], s[2][1], x, y);
        const w1 = edge(s[2][0], s[2][1], s[0][0], s[0][1], x, y);
        const w2 = edge(s[0][0], s[0][1], s[1][0], s[1][1], x, y);
        if ((area > 0 && w0 >= 0 && w1 >= 0 && w2 >= 0) || (area < 0 && w0 <= 0 && w1 <= 0 && w2 <= 0)) {
          const idx = (y * W + x) * 3;
          pixels[idx] = c; pixels[idx+1] = c; pixels[idx+2] = c;
        }
      }
    }
  });

  // Write PNG
  const sharp = require("sharp");
  const buf = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const pi = i * 3;
    const val = Math.round(Math.min(1, Math.max(0, pixels[pi])) * 255);
    const isBg = val < 42;
    buf[i*4] = isBg ? 38 : val;
    buf[i*4+1] = isBg ? 38 : Math.round(Math.min(1, Math.max(0, pixels[pi+1])) * 255);
    buf[i*4+2] = isBg ? 40 : Math.round(Math.min(1, Math.max(0, pixels[pi+2])) * 255);
    buf[i*4+3] = 255;
  }
  sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(outPath).then(() => {
    console.log("Thumbnail saved:", outPath);
    const stat = fs.statSync(outPath);
    console.log("Size:", stat.size, "bytes");
  });
}, undefined, (err) => console.error("Error:", err));
