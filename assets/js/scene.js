// Hero VFX (INTENT FR-1, SPEC "Hero scene"): noise-displaced particle sphere,
// neural shell, data-packet orbit, starfield, bloom. Mouse + scroll reactive.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('scene');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lite = new URLSearchParams(location.search).has('lite');
const isMobile = matchMedia('(max-width: 760px)').matches || navigator.hardwareConcurrency <= 4;

const ready = (ok) => {
  window.__sceneReady = true;
  document.body.classList.toggle('no-webgl', !ok);
  window.dispatchEvent(new CustomEvent('scene:ready', { detail: { ok } }));
};

// Ashima Arts 3D simplex noise (MIT)
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

function init() {
  let renderer;
  try {
    // 'default' (not 'high-performance'): forcing the discrete GPU makes macOS switch GPUs, a common cause of context loss
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'default' });
  } catch {
    return ready(false);
  }
  // PERF (ADR-005): pixel-ratio cap — fill-rate is the main GPU cost of a full-screen canvas
  const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x05060b, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060b); // color-managed (setClearColor double-encodes through the composer)
  scene.fog = new THREE.FogExp2(0x05060b, 0.035);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  const root = new THREE.Group();
  scene.add(root);

  // ---- 1. Noise-displaced particle sphere ----
  const COUNT = isMobile ? 2600 : 7000;
  const R = 1.7;
  const pos = new Float32Array(COUNT * 3);
  const rnd = new Float32Array(COUNT);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    pos.set([Math.cos(t) * r * R, y * R, Math.sin(t) * r * R], i * 3);
    rnd[i] = Math.random();
  }
  const sphereGeo = new THREE.BufferGeometry();
  sphereGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sphereGeo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uFade: { value: 1 },
    uSize: { value: isMobile ? 34 : 30 },
    uPixelRatio: { value: dpr },
    uColorA: { value: new THREE.Color('#22d3ee') },
    uColorB: { value: new THREE.Color('#7c3aed') },
    uColorC: { value: new THREE.Color('#f472b6') },
  };
  const sphereMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      ${NOISE}
      uniform float uTime, uMorph, uSize, uPixelRatio;
      attribute float aRand;
      varying float vNoise; varying float vAlpha;
      void main(){
        vec3 p = position;
        float n = snoise(p * 0.9 + uTime * 0.22);
        float n2 = snoise(p * 2.4 - uTime * 0.35) * 0.35;
        float disp = (n + n2) * (0.22 + uMorph * 0.9);
        vec3 pos = p * (1.0 + disp);
        pos += normalize(p) * sin(uTime * 1.4 + aRand * 6.2831) * 0.025;
        vNoise = n;
        vAlpha = 0.35 + 0.65 * smoothstep(-0.8, 0.9, n);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uSize * (0.45 + aRand * 0.9) * uPixelRatio / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA, uColorB, uColorC; uniform float uFade;
      varying float vNoise; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = pow(1.0 - d * 2.0, 1.7);
        vec3 col = mix(uColorA, uColorB, smoothstep(-0.5, 0.5, vNoise));
        col = mix(col, uColorC, smoothstep(0.55, 0.95, vNoise));
        gl_FragColor = vec4(col, a * vAlpha * uFade);
      }`,
  });
  const sphere = new THREE.Points(sphereGeo, sphereMat);
  root.add(sphere);

  // ---- 2. Inner core: wireframe icosahedron ----
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 1),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.45 })
  );
  root.add(core);
  const coreGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.9 })
  );
  root.add(coreGlow);

  // ---- 3. Neural shell: nodes + proximity connections ----
  const NODES = isMobile ? 90 : 150;
  const shellR = 2.75;
  const nodes = [];
  for (let i = 0; i < NODES; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(shellR * (0.92 + Math.random() * 0.16));
    nodes.push(v);
  }
  const linePos = [];
  for (let i = 0; i < NODES; i++) {
    for (let j = i + 1; j < NODES; j++) {
      if (nodes[i].distanceTo(nodes[j]) < 0.95) linePos.push(...nodes[i].toArray(), ...nodes[j].toArray());
    }
  }
  const shell = new THREE.Group();
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
  shell.add(new THREE.LineSegments(lineGeo, lineMat));
  const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes);
  const nodeMat = new THREE.PointsMaterial({ color: 0xa5b4fc, size: 0.05, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  shell.add(new THREE.Points(nodeGeo, nodeMat));
  root.add(shell);

  // ---- 4. Orbit rings with travelling data packets ----
  const rings = [];
  const ringDefs = [
    { r: 3.3, tilt: [1.2, 0.2, 0], color: 0x22d3ee, speed: 0.35, packets: 6 },
    { r: 3.75, tilt: [1.85, -0.5, 0.3], color: 0xa855f7, speed: -0.22, packets: 4 },
  ];
  for (const def of ringDefs) {
    const g = new THREE.Group();
    g.rotation.set(...def.tilt);
    const pts = [];
    for (let i = 0; i <= 160; i++) { const a = (i / 160) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * def.r, Math.sin(a) * def.r, 0)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: def.color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })));
    const pk = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(def.packets * 3), 3)),
      new THREE.PointsMaterial({ color: def.color, size: 0.12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    g.add(pk);
    root.add(g);
    rings.push({ def, pk });
  }

  // ---- 5. Starfield ----
  const STARS = isMobile ? 700 : 1600;
  const starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(12 + Math.random() * 28);
    starPos.set(v.toArray(), i * 3);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(starPos, 3)),
    new THREE.PointsMaterial({ color: 0xc7d2fe, size: 0.06, transparent: true, opacity: 0.7, depthWrite: false })
  );
  scene.add(stars);

  // ---- Post-processing ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const BLOOM = isMobile ? 0.75 : 1.0;
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), BLOOM, 0.6, 0.08);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- Layout (desktop: sphere sits right of the hero copy) ----
  const layout = { x: 0, y: 0, s: 1 };
  function computeLayout() {
    const w = innerWidth;
    if (w >= 1100) Object.assign(layout, { x: 2.35, y: 0.05, s: 1 });
    else if (w >= 760) Object.assign(layout, { x: 1.6, y: 0.2, s: 0.85 });
    else Object.assign(layout, { x: 0.55, y: 2.35, s: 0.66 }); // phone: crown above the name, not behind it
  }
  computeLayout();
  root.position.set(layout.x, layout.y, 0);
  root.scale.setScalar(layout.s);

  // ---- Interaction ----
  const mouse = new THREE.Vector2();
  const smooth = new THREE.Vector2();
  let scrollP = 0, lastScroll = scrollY, velocity = 0, burst = 0;
  addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (!e.target.closest('a, button, input, textarea, label')) burst = 1;
  }, { passive: true });
  addEventListener('scroll', () => { scrollP = scrollY / innerHeight; }, { passive: true });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    computeLayout();
  });

  const clock = new THREE.Clock();
  let running = true, rafId = 0, contextLost = false, lossCount = 0;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden && !contextLost;
    cancelAnimationFrame(rafId);
    if (running) { clock.getDelta(); rafId = requestAnimationFrame(tick); }
  });

  // GPU reset / memory pressure / GPU switch → Chrome drops the WebGL context and paints the canvas
  // white with a "sad" icon. Hide it (dark CSS fallback shows), then rebuild when Chrome restores it.
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // tells the browser we want the context back
    contextLost = true; running = false; lossCount++;
    cancelAnimationFrame(rafId);
    document.body.classList.add('no-webgl');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    if (lossCount > 2) return; // GPU keeps dropping us → stay on the static fallback for this visit
    document.body.classList.remove('no-webgl');
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    running = !document.hidden;
    clock.getDelta();
    if (running) rafId = requestAnimationFrame(tick);
  });

  // ---- Adaptive quality (ADR-005) ----
  // Levels: 0 = full · 1 = DPR 1 · 2 = DPR 1 + no bloom · 3 = DPR 0.75 + no bloom. Only ever steps down.
  let quality = lite ? 2 : 0, sampleSum = 0, samples = 0, lastFrame = 0, lastRender = 0;
  const startedAt = performance.now();
  function setQuality(q) {
    quality = q;
    const r = q === 0 ? dpr : q === 3 ? 0.75 : Math.min(dpr, 1);
    renderer.setPixelRatio(r);
    composer.setPixelRatio(r);
    uniforms.uPixelRatio.value = r;
  }
  if (quality) setQuality(quality);
  const stats = (window.__sceneStats = { quality, mode: 'hero', fps: 0 });

  const lerp = (a, b, t) => a + (b - a) * t;
  function tick(now = performance.now()) {
    if (!running) return;
    // Below the hero the scene is an ambient backdrop → 30 fps is plenty and halves GPU work while reading.
    const ambient = scrollY > innerHeight * 1.05;
    if (!reduceMotion) rafId = requestAnimationFrame(tick);
    if (ambient && now - lastRender < 1000 / 30 - 1) return;
    if (!ambient && lastFrame && now - startedAt > 1500 && quality < 3) {
      sampleSum += now - lastFrame; samples++;
      if (samples === 30) {
        const avg = sampleSum / samples;
        stats.fps = Math.round(1000 / avg);
        if (avg > 50) setQuality(3);                 // < 20 fps → straight to lowest
        else if (avg > 24) setQuality(quality + 1);  // < ~42 fps → step down
        sampleSum = samples = 0;
      }
    }
    lastFrame = ambient ? 0 : now;
    lastRender = now;
    stats.quality = quality; stats.mode = ambient ? 'ambient-30fps' : 'hero';

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    velocity = lerp(velocity, Math.abs(scrollY - lastScroll), 0.1);
    lastScroll = scrollY;
    burst = Math.max(0, burst - dt * 1.4);
    smooth.lerp(mouse, 0.05);

    uniforms.uTime.value = t;
    uniforms.uMorph.value = Math.min(1, velocity * 0.012) * 0.5 + burst * 0.7;

    // After the hero, the sphere recedes into an ambient backdrop.
    const p = Math.min(scrollP, 1.4);
    const fade = 1 - Math.min(p, 1) * 0.5;
    uniforms.uFade.value = fade;
    lineMat.opacity = 0.16 * fade;
    core.material.opacity = 0.45 * fade;
    coreGlow.material.opacity = 0.9 * fade;

    const tx = layout.x + p * (innerWidth >= 760 ? 0.6 : 0);
    const ty = layout.y + p * 0.6;
    root.position.x = lerp(root.position.x, tx, 0.06);
    root.position.y = lerp(root.position.y, ty, 0.06);
    root.scale.setScalar(lerp(root.scale.x, layout.s * (1 + burst * 0.08), 0.1));

    sphere.rotation.y = t * 0.08 + scrollP * 0.9;
    sphere.rotation.x = smooth.y * 0.3;
    core.rotation.set(t * 0.3, t * 0.4, 0);
    coreGlow.scale.setScalar(1 + Math.sin(t * 2.2) * 0.12 + burst * 0.6);
    shell.rotation.y = -t * 0.05 + smooth.x * 0.4;
    shell.rotation.x = smooth.y * 0.25 + scrollP * 0.3;

    for (const { def, pk } of rings) {
      const arr = pk.geometry.attributes.position.array;
      for (let i = 0; i < def.packets; i++) {
        const a = t * def.speed + (i / def.packets) * Math.PI * 2;
        arr[i * 3] = Math.cos(a) * def.r;
        arr[i * 3 + 1] = Math.sin(a) * def.r;
      }
      pk.geometry.attributes.position.needsUpdate = true;
    }
    stars.rotation.y = t * 0.01;

    camera.position.x = lerp(camera.position.x, smooth.x * 0.6, 0.05);
    camera.position.y = lerp(camera.position.y, smooth.y * 0.4, 0.05);
    camera.lookAt(0, 0, 0);

    // Bloom fades out as the hero scrolls away; once it's gone, skip the post-processing chain entirely.
    bloom.strength = BLOOM * (1 - Math.min(1, Math.max(0, (p - 0.25) / 0.7)));
    if (quality >= 2 || bloom.strength < 0.02) renderer.render(scene, camera);
    else composer.render();
  }

  tick();
  ready(true);
}

try { init(); } catch (err) { console.warn('[scene] WebGL disabled:', err); ready(false); }
