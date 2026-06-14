import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = path.resolve(".");
const outDir = path.join(root, "public", "mockups", "_thumbnails");
fs.mkdirSync(outDir, { recursive: true });

const MODELS = {
  "Clothing_longsleeve": "Clothing/longsleeve.glb",
  "Clothing_hoody": "Clothing/hoody.glb",
  "Clothing_t_shirt": "Clothing/t_shirt.glb",
  "Clothing_girls_long_sweater_dress": "Clothing/girls_long_sweater_dress.glb",
  "t-shirt": "t-shirt.glb",
  "t_shirt": "t_shirt.glb",
  "t-shirt_for_female": "t-shirt_for_female.glb",
  "Hats_cap": "Hats/cap.glb",
  "bottle": "bottle.glb",
};

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(p => fs.existsSync(p));
if (!CHROME) throw new Error("No Chrome/Edge found");

function makeHTML(glbRelPath) {
  const extra = glbRelPath.includes("cap") ? "m.rotation.y=-Math.PI/2;" : "";
  const camSettings = `const cy=v.y-b.min.y;const b2=new T.Box3().setFromObject(m);const maxD=Math.max(b2.max.x-b2.min.x,b2.max.y-b2.min.y,b2.max.z-b2.min.z);const dist=maxD*3;${extra}c.position.set(0,cy-b2.max.y*0.15,dist);c.lookAt(0,cy-b2.max.y*0.35,0);`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#3a3a3e;overflow:hidden}
canvas{display:block}
</style></head><body>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/"}}</script>
<script type="module">
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const W=512,H=512;
const s=new T.Scene();s.background=new T.Color(0x3a3a3e);
const c=new T.PerspectiveCamera(28,1,0.1,2000);
const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
r.setSize(W,H);r.setPixelRatio(1);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=2.0;
document.body.appendChild(r.domElement);
s.add(new T.HemisphereLight(0xffffff,0x888888,2.0));
s.add(new T.DirectionalLight(0xffffff,3.0).position.set(1.5,2.5,2));
s.add(new T.DirectionalLight(0x8899ff,1.0).position.set(-1.5,0.5,-1));
s.add(new T.DirectionalLight(0xffffff,0.6).position.set(0,-1,-2.5));
new GLTFLoader().load("/model.glb",g=>{const m=g.scene;
m.traverse(x=>{if(x.isMesh&&x.material){
const mats=Array.isArray(x.material)?x.material:[x.material];
for(let i=0;i<mats.length;i++){const m2=mats[i].clone();m2.color.setHex(0xd4d4d4);m2.roughness=0.2;m2.metalness=0;if(m2.map)m2.map=null;m2.needsUpdate=1;mats[i]=m2;}
x.material=Array.isArray(x.material)?mats:mats[0];
}});
const b=new T.Box3().setFromObject(m);const v=new T.Vector3();
b.getCenter(v);m.position.set(-v.x,-b.min.y,-v.z);s.add(m);
${camSettings}
r.render(s,c);
setTimeout(()=>{document.title="ready"},1000);
});
</script></body></html>`;
}

async function renderModel(name, glbRelPath) {
  const glbPath = path.join(root, "public", "mockups", glbRelPath);
  const outPath = path.join(outDir, `${name}.png`);
  const HTML = makeHTML(glbRelPath);

  const server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(HTML);
    } else if (req.url === "/model.glb") {
      res.writeHead(200, { "Content-Type": "model/gltf-binary", "Access-Control-Allow-Origin": "*" });
      res.end(fs.readFileSync(glbPath));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const url = `http://localhost:${port}`;
  console.log(`[${name}] Server on ${url}`);

  const chromePort = port + 1;
  const cp = spawn(CHROME, [
    `--headless=new`,
    `--no-sandbox`,
    `--use-gl=angle`,
    `--use-angle=swiftshader`,
    `--remote-debugging-port=${chromePort}`,
    `--window-size=512,512`,
    `--hide-scrollbars`,
    url,
  ], { stdio: "pipe", shell: false, windowsHide: true });

  // Wait for Chrome to start
  await new Promise(r => setTimeout(r, 3000));

  try {
    // Get WebSocket URL from CDP
    const resp = await fetch(`http://localhost:${chromePort}/json`);
    const targets = await resp.json();
    const page = targets.find(t => t.type === "page");
    if (!page) throw new Error("No page target");

    console.log(`[${name}] Connecting to CDP...`);
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout")), 45000);

      ws.addEventListener("open", () => {
        console.log(`[${name}] CDP connected`);
        // Enable Page domain
        ws.send(JSON.stringify({ id: 1, method: "Page.enable" }));
      });

      ws.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          // Check if page title is "ready" (model loaded)
          if (msg.method === "Page.frameNavigated") {
            console.log(`[${name}] Frame navigated`);
          }

          // After 8 seconds, capture screenshot
          if (msg.id === 1) {
            setTimeout(async () => {
              // Wait for model: check title readiness by polling
              for (let attempt = 0; attempt < 30; attempt++) {
                await new Promise(r2 => setTimeout(r2, 500));
                ws.send(JSON.stringify({ id: 100 + attempt, method: "Runtime.evaluate", params: { expression: "document.title" } }));
              }
            }, 2000);
          }

          if (msg.id && msg.id >= 100 && msg.id < 130) {
            const title = msg.result?.result?.value;
            if (title === "ready") {
              console.log(`[${name}] Model ready, capturing screenshot...`);
              setTimeout(() => {
                ws.send(JSON.stringify({ id: 200, method: "Page.captureScreenshot", params: { format: "png", fromSurface: true } }));
              }, 500);
            }
          }

          if (msg.id === 200 && msg.result?.data) {
            const imgData = Buffer.from(msg.result.data, "base64");
            fs.writeFileSync(outPath, imgData);
            console.log(`[${name}] Saved: ${imgData.length} bytes`);
            clearTimeout(timeout);
            ws.close();
            cp.kill();
            server.close();
            resolve();
          }
        } catch (e) {
          console.error(`[${name}] Parse error:`, e.message);
        }
      });

      ws.addEventListener("error", (e) => {
        console.error(`[${name}] WS error:`, e.message);
        clearTimeout(timeout);
        reject(e);
      });
    });
  } catch (e) {
    console.error(`[${name}] Error:`, e.message);
    cp.kill();
    server.close();
  }
}

async function main() {
  const toRender = process.argv[2] ? Object.entries(MODELS).filter(([k]) => k.includes(process.argv[2])) : Object.entries(MODELS);
  for (const [name, path] of toRender) {
    console.log(`\n=== Rendering ${name} (${path}) ===`);
    await renderModel(name, path);
  }
  console.log("\nDone!");
}

main().catch(console.error);
