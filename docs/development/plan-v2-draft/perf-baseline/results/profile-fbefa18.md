# Orbitlab performance baseline — profile-fbefa18
2026-10-04T02:14:42.281Z · 1 runs · 4×Intel(R) Xeon(R) Processor @ 2.80GHz · Chromium 141.0.7390.37 · 1280x800 @ DPR 0.5 · SwiftShader WebGL · dist /tmp/claude-0/-home-user-Orbitlab/338948be-0d3b-5499-8ebe-dce16ee97d04/scratchpad/ol/dist-sm
Values: median (min–max) over runs.

## Startup (cold, fresh profile, first visit)
| metric | value |
|---|---|
| DOMContentLoaded ms | 314.1 (314.1–314.1) |
| load event ms | 315.1 (315.1–315.1) |
| first contentful paint ms | 804 (804–804) |
| #loading hidden (scene ready) ms | 15722.9 (15722.9–15722.9) |
| interactive (init done, WebMCP registered) ms | 15725.6 (15725.6–15725.6) |
| first frame after interactive ms | 18363.9 (18363.9–18363.9) |
| main-thread script ms to interactive (CDP) | 2704 (2704–2704) |
| main-thread task ms to interactive (CDP) | 18277.1 (18277.1–18277.1) |
| all-process CPU ms to interactive | 46260 (46260–46260) |
| renderer main-thread CPU ms to interactive | 2330.1 (2330.1–2330.1) |
| GPU process CPU ms to interactive | 41279.4 (41279.4–41279.4) |
| long tasks (n) to interactive | 4 (4–4) |
| long tasks total ms | 15445 (15445–15445) |
| total blocking time ms | 15245 (15245–15245) |
| longest task ms | 14733 (14733–14733) |
| requests to interactive | 18 (18–18) |
| bytes to interactive kB (raw) | 9456.1 (9456.1–9456.1) |
| bytes to interactive kB (gzip est.) | 5511.1 (5511.1–5511.1) |
|   JS kB | 4778.8 (4778.8–4778.8) |
|   JS worker kB | 578.5 (578.5–578.5) |
|   CSS kB | 166.2 (166.2–166.2) |
|   images kB | 3916.4 (3916.4–3916.4) |
|   HTML kB | 16.3 (16.3–16.3) |
| requests after interactive (SW precache etc.) | 70 (70–70) |
| bytes after interactive kB | 15743 (15743–15743) |
|   …until network quiet ms | 1061.4 (1061.4–1061.4) |
|   of which re-fetched (same path) kB | 9348 (9348–9348) |
| time inside WebGL calls to interactive ms | 15988.1 (15988.1–15988.1) |
|   shader programs created | 56 (56–56) |
|   waiting on shader compile/link ms | 13414.1 (13414.1–13414.1) |
|   texture upload calls ms (incl. image decode) | 1741.7 (1741.7–1741.7) |
| WebGL contexts to interactive | 2 (2–2) |
| texture uploads to interactive | 89 (89–89) |
| texture Mpixels uploaded | 104 (104–104) |
| localStorage gets to interactive | 125 (125–125) |
| localStorage chars read | 13466 (13466–13466) |
| profile-record reads | 47 (47–47) |
| profile-record writes | 2 (2–2) |
| JS heap used MB (pre-GC, settled) | 16.9 (16.9–16.9) |
| JS heap used MB (post-GC) | 15.8 (15.8–15.8) |
| DOM nodes | 4145 (4145–4145) |
| JS event listeners | 453 (453–453) |

Run 1 detail — contexts: 2d@canvas1 t=704; 2d@canvas2 t=803; 2d@canvas3 t=803; webgl2@.pg-canvas (high-performance) t=850; 2d@offscreen t=873; 2d@canvas4 t=886; webgl2@#gl (high-performance) t=1642; 2d@offscreen t=1846; 2d@canvas5 t=1933; 2d@canvas6 t=1993; 2d@canvas7 t=2001; 2d@canvas8 t=2737; 2d@canvas9 t=2742; 2d@canvas10 t=2747; 2d@canvas11 t=2820; 2d@canvas12 t=2822; 2d@canvas13 t=2822; 2d@canvas14 t=2828; 2d@canvas15 t=2873; 2d@canvas16 t=2916; 2d@canvas17 t=2955; 2d@canvas18 t=2994; 2d@canvas19 t=2994; 2d@canvas20 t=3006; 2d@canvas21 t=3006; 2d@canvas22 t=3011; 2d@canvas23 t=3018; 2d@canvas24 t=3030; 2d@canvas25 t=3225; 2d@.chart t=3230; 2d@.chart t=3244; 2d@.chart t=3245; 2d@.chart t=3246; 2d@.chart t=3246; 2d@.chart t=3246; 2d@.chart t=3247; 2d@.chart t=3247
Workers created to interactive: flight.worker t=2715
Images fetched to interactive: textures/earth_atmos_2048.jpg (513 kB), textures/earth_lights_4096.jpg (402 kB), textures/earth_normal_2048.jpg (337 kB), textures/earth_specular_2048.jpg (223 kB), textures/earth_atmos_4096.jpg (1026 kB), textures/earth_clouds_4096.jpg (1323 kB), home/watch.en.webp (30 kB), home/explore.en.webp (62 kB)
JSON fetched to interactive: none
Large texture uploads: texImage2D 2048x2048 @#gl; texStorage2D 2048x2048 @#gl; texStorage2D 512x2048 @#gl; texSubImage2D 512x2048 @#gl; texStorage2D 1024x2048 @#gl; texSubImage2D 1024x2048 @#gl; texStorage2D 1024x2048 @#gl; texSubImage2D 1024x2048 @#gl; texStorage2D 4096x2048 @#gl; texSubImage2D 4096x2048 @#gl; texStorage2D 4096x2048 @#gl; texSubImage2D 4096x2048 @#gl; texStorage2D 2048x1024 @#gl; texSubImage2D 2048x1024 @#gl; texStorage2D 2048x1024 @#gl; texSubImage2D 2048x1024 @#gl; texStorage2D 1024x512 @#gl; texSubImage2D 1024x512 @#gl; texStorage2D 256x1024 @#gl; texSubImage2D 256x1024 @#gl; texStorage2D 512x1024 @#gl; texSubImage2D 512x1024 @#gl; texStorage2D 1024x1024 @#gl; texSubImage2D 1024x1024 @#gl; texStorage2D 1024x2048 @#gl; texSubImage2D 1024x2048 @#gl; texStorage2D 1024x1024 @#gl; texSubImage2D 1024x1024 @#gl; texStorage2D 4096x2048 @#gl; texSubImage2D 4096x2048 @#gl
WebGL calls by time to interactive: getShaderInfoLog ×108 9951 ms; getProgramInfoLog ×54 2717 ms; texSubImage2D ×28 1741 ms; getProgramParameter ×162 746 ms; getExtension ×15 553 ms; getParameter ×34 216 ms; shaderSource ×112 14 ms; bufferData ×497 12 ms
Duplicate fetches to interactive: none
Service worker: {"registered":true,"active":true,"controlled":true}; after-interactive by type: {"js":{"n":21,"kB":5621.9,"gzkB":1623},"other":{"n":2,"kB":61,"gzkB":25.1},"js-worker":{"n":12,"kB":4090.1,"gzkB":1348.7},"css":{"n":3,"kB":172.8,"gzkB":34.4},"json":{"n":10,"kB":1405.2,"gzkB":265.7},"image":{"n":21,"kB":4375.7,"gzkB":4375.7},"html":{"n":1,"kB":16.3,"gzkB":4.7}}

## Transitions (4 s window from the user action; hitches the user feels)
| metric | orbitEnter | launchEnter | flightStart |
|---|---|---|---|
| action wall ms (route+wait / MCP call) | 71 (71–71) | 2186 (2186–2186) | 2631 (2631–2631) |
| window length s (until 3 frames after the action) | 4.87 (4.87–4.87) | 5.22 (5.22–5.22) | 5.31 (5.31–5.31) |
| longest frame interval ms | 3899.8 (3899.8–3899.8) | 4766.4 (4766.4–4766.4) | 2633.1 (2633.1–2633.1) |
| longest app rAF callback ms | 3760.7 (3760.7–3760.7) | 137.5 (137.5–137.5) | 8.5 (8.5–8.5) |
| frames/s in window | 1.44 (1.44–1.44) | 0.77 (0.77–0.77) | 0.94 (0.94–0.94) |
| long tasks (n) | 1 (1–1) | 2 (2–2) | 2 (2–2) |
| long tasks total ms | 3903 (3903–3903) | 4772 (4772–4772) | 4911 (4911–4911) |
| longest task ms | 3903 (3903–3903) | 2609 (2609–2609) | 2628 (2628–2628) |
| time inside WebGL calls ms/s | 768.2 (768.2–768.2) | 396.2 (396.2–396.2) | 469.9 (469.9–469.9) |
| shader programs created | 7 (7–7) | 19 (19–19) | 19 (19–19) |
| waiting on shader compile/link ms | 2775.5 (2775.5–2775.5) | 2019.1 (2019.1–2019.1) | 2471.8 (2471.8–2471.8) |
| CDP task ms/s (main) | 819.7 (819.7–819.7) | 927.9 (927.9–927.9) | 934.2 (934.2–934.2) |

Run-by-run long tasks [start ms into window, duration ms]: orbitEnter: [[599,3903]]; launchEnter: [[30,2163],[2194,2609]]; flightStart: [[7,2628],[2651,2283]]
Run 1 WebGL calls by time [name, calls/s, ms/s]: orbitEnter: [["getProgramInfoLog",1,351.99],["texSubImage2D",1,197.59],["getShaderInfoLog",3,192.38]]; launchEnter: [["getProgramInfoLog",4,226.33],["getShaderInfoLog",7,158.69],["clear",17,1.65]]; flightStart: [["getProgramInfoLog",4,273.49],["getShaderInfoLog",7,190.92],["getProgramParameter",11,1.07]]

## Steady-state cost per scenario (per wall-clock second unless noted)
| metric | orbitPlaying | orbitPaused | launchPad | flight1x | flight100x |
|---|---|---|---|---|---|
| frames/s (app rAF) | 12.76 (12.76–12.76) | 12.76 (12.76–12.76) | 3.39 (3.39–3.39) | 3.74 (3.74–3.74) | 2.97 (2.97–2.97) |
| frame interval p50 ms | 83.3 (83.3–83.3) | 83.3 (83.3–83.3) | 250 (250–250) | 250 (250–250) | 333.3 (333.3–333.3) |
| frame interval p95 ms | 133.3 (133.3–133.3) | 133.4 (133.4–133.4) | 433.3 (433.3–433.3) | 400 (400–400) | 500 (500–500) |
| frame interval p99 ms | 200.1 (200.1–200.1) | 183.3 (183.3–183.3) | 433.3 (433.3–433.3) | 450 (450–450) | 500 (500–500) |
| frame interval max ms | 200.1 (200.1–200.1) | 183.3 (183.3–183.3) | 433.3 (433.3–433.3) | 450 (450–450) | 500 (500–500) |
| rAF callback ms/frame (median) | 1.7 (1.7–1.7) | 1.4 (1.4–1.4) | 4.7 (4.7–4.7) | 8.2 (8.2–8.2) | 7 (7–7) |
| rAF callback ms/frame p95 | 2.9 (2.9–2.9) | 2.2 (2.2–2.2) | 12.7 (12.7–12.7) | 12.8 (12.8–12.8) | 15 (15–15) |
| rAF callback max ms | 8.1 (8.1–8.1) | 3.4 (3.4–3.4) | 12.7 (12.7–12.7) | 16.2 (16.2–16.2) | 15 (15–15) |
| rAF callback ms/s | 24.7 (24.7–24.7) | 19.6 (19.6–19.6) | 19.5 (19.5–19.5) | 31.2 (31.2–31.2) | 25 (25–25) |
| WebGL draw calls/s | 102 (102–102) | 102.1 (102.1–102.1) | 369.2 (369.2–369.2) | 411.5 (411.5–411.5) | 335.4 (335.4–335.4) |
| draw calls/frame | 8 (8–8) | 8 (8–8) | 109 (109–109) | 110 (110–110) | 112.9 (112.9–112.9) |
| time inside WebGL calls ms/s | 2.9 (2.9–2.9) | 2.7 (2.7–2.7) | 3.7 (3.7–3.7) | 6 (6–6) | 6.5 (6.5–6.5) |
| CDP script ms/s (main) | 24.5 (24.5–24.5) | 19.6 (19.6–19.6) | 19.2 (19.2–19.2) | 30 (30–30) | 29.4 (29.4–29.4) |
| CDP task ms/s (main) | 60 (60–60) | 43.3 (43.3–43.3) | 31.5 (31.5–31.5) | 54.4 (54.4–54.4) | 58.5 (58.5–58.5) |
| CDP layout+style ms/s | 3.5 (3.5–3.5) | 3.5 (3.5–3.5) | 0.6 (0.6–0.6) | 4.9 (4.9–4.9) | 4 (4–4) |
| CPU renderer main ms/s | 49.9 (49.9–49.9) | 35.9 (35.9–35.9) | 24 (24–24) | 74.9 (74.9–74.9) | 47.7 (47.7–47.7) |
| CPU renderer workers ms/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 17.5 (17.5–17.5) | 758.7 (758.7–758.7) |
| CPU renderer other ms/s | 38 (38–38) | 24 (24–24) | 12 (12–12) | 99.7 (99.7–99.7) | 186.7 (186.7–186.7) |
| CPU GPU process ms/s | 3573 (3573–3573) | 3642.9 (3642.9–3642.9) | 3175.6 (3175.6–3175.6) | 3209 (3209–3209) | 2653.4 (2653.4–2653.4) |
| CPU browser ms/s | 8 (8–8) | 2 (2–2) | 0 (0–0) | 3.7 (3.7–3.7) | 4 (4–4) |
| CPU all processes ms/s | 3670.9 (3670.9–3670.9) | 3704.8 (3704.8–3704.8) | 3213.5 (3213.5–3213.5) | 3404.8 (3404.8–3404.8) | 3650.4 (3650.4–3650.4) |
| long tasks (n) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| longest task ms | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| shader programs created | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage gets/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage sets/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage kB read/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage kB written/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| sim s per wall s | n/a | n/a | n/a | 0.98 (0.98–0.98) | 8.22 (8.22–8.22) |

Run 1 — frames/s in which each canvas issued draw calls: orbitPlaying: {".pg-canvas":12.8}; orbitPaused: {".pg-canvas":12.8}; launchPad: {"#gl":3.4}; flight1x: {"#gl":3.7}; flight100x: {"#gl":3}

Run 1 — busiest threads (ms/s): orbitPlaying: gpu-process:Thread<03> 846.8, gpu-process:Thread<00> 830.8, gpu-process:Thread<02> 812.9, gpu-process:Thread<01> 794.9, gpu-process:chrome 231.7, renderer:main 49.9, gpu-process:main 39.9, renderer:ThreadPoolForeg 20 || orbitPaused: gpu-process:Thread<00> 868.8, gpu-process:Thread<02> 848.8, gpu-process:Thread<01> 820.9, gpu-process:Thread<03> 792.9, gpu-process:chrome 255.6, gpu-process:main 39.9, renderer:main 35.9, renderer:Compositor 14 || launchPad: gpu-process:Thread<02> 704.6, gpu-process:Thread<03> 684.6, gpu-process:Thread<01> 666.7, gpu-process:Thread<00> 658.7, gpu-process:chrome 425.1, gpu-process:main 25.9, renderer:main 24, gpu-process:VizCompositorTh 6 || flight1x: gpu-process:Thread<03> 707.4, gpu-process:Thread<00> 706.2, gpu-process:Thread<02> 693.7, gpu-process:Thread<01> 687.5, gpu-process:chrome 368.1, renderer:main 74.9, renderer:v8:ProfEvntProc 63.6, renderer:ThreadPoolForeg 29.9 || flight100x: renderer:DedicatedWorker 758.7, gpu-process:Thread<02> 589.9, gpu-process:Thread<01> 572, gpu-process:Thread<00> 568, gpu-process:Thread<03> 566, gpu-process:chrome 321.7, renderer:ThreadPoolForeg 178.7, renderer:main 47.7

Run 1 — WebGL calls by time [name, calls/s, ms/s]: orbitPlaying: [["clear",13,0.64],["bufferData",13,0.24],["bindBuffer",51,0.24],["drawElements",51,0.24]]; orbitPaused: [["clear",13,0.48],["bindBuffer",51,0.34],["bindVertexArray",102,0.26],["drawElements",51,0.26]]; launchPad: [["uniformMatrix4fv",481,0.86],["bindVertexArray",335,0.62],["drawElements",291,0.44],["uniform1fv",129,0.3]]; flight1x: [["uniformMatrix4fv",637,0.91],["drawElements",324,0.8],["bindVertexArray",373,0.67],["uniform3f",759,0.6]]; flight100x: [["uniformMatrix4fv",520,1.52],["uniform1fv",122,1.52],["uniform3f",671,0.95],["bindVertexArray",310,0.57]]

Orbit pause confirmed: true

## CPU profile, main thread, startup to interactive (run 1, 18411.5 ms sampled incl. idle)
| source file | self ms | % |
|---|---|---|
| (getShaderInfoLog) | 9963.5 | 54.1 |
| (getProgramInfoLog) | 2705 | 14.7 |
| (texSubImage2D) | 1730.4 | 9.4 |
| (getProgramParameter) | 739 | 4 |
| (getExtension) | 550.1 | 3 |
| node_modules/three/build/three.module.js | 372.1 | 2 |
| ((program)) | 225.4 | 1.2 |
| (getParameter) | 216.2 | 1.2 |
| node_modules/three/build/three.core.js | 212.8 | 1.2 |
| src/render/noise.ts | 192.4 | 1 |
| (getContext) | 183.2 | 1 |
| ((idle)) | 152.4 | 0.8 |
| src/render/orbit-view.ts | 110.2 | 0.6 |
| src/physics/simulation.ts | 107.3 | 0.6 |
| ((garbage collector)) | 97.4 | 0.5 |
| src/physics/vehicle.ts | 70.2 | 0.4 |
| src/render/pads.ts | 67.7 | 0.4 |
| src/ui/hud.ts | 50.1 | 0.3 |
| src/render/soyuz.ts | 44.9 | 0.2 |
| src/physics/vec3.ts | 39.1 | 0.2 |

| function | self ms | % |
|---|---|---|
| getShaderInfoLog | 9963.5 | 54.1 |
| getProgramInfoLog | 2705 | 14.7 |
| texSubImage2D | 1730.4 | 9.4 |
| getProgramParameter | 739 | 4 |
| getExtension | 550.1 | 3 |
| setSize (node_modules/three/build/three.module.js:16708) | 234 | 1.3 |
| (program) | 225.4 | 1.2 |
| getParameter | 216.2 | 1.2 |
| getContext | 183.2 | 1 |
| (idle) | 152.4 | 0.8 |
| jS (src/render/noise.ts:18) | 149.1 | 0.8 |
| kK (src/render/orbit-view.ts:96) | 103.7 | 0.6 |
| (garbage collector) | 97.4 | 0.5 |
| viewportSize (src/ui/hud.ts:367) | 46.7 | 0.3 |
| stepOnce (src/physics/simulation.ts:819) | 37.6 | 0.2 |
| a (src/render/moon.ts:74) | 35.8 | 0.2 |
| (anonymous) | 35.7 | 0.2 |
| stepFlight (src/physics/simulation.ts:909) | 32.5 | 0.2 |
| proto.<computed> | 30.7 | 0.2 |
| YA (src/render/soyuz.ts:182) | 30.1 | 0.2 |
| Pg (src/physics/atmosphere.ts:86) | 28.9 | 0.2 |
| Rse (src/render/pads.ts:339) | 27.3 | 0.1 |
| render (src/ui/home.ts:107) | 19.2 | 0.1 |
| PS (src/render/noise.ts:57) | 18.2 | 0.1 |
| createVertexArray | 17.8 | 0.1 |

## CPU profile, main thread, 1× flight window (run 1, 8040.4 ms sampled incl. idle)
| source file | self ms | % |
|---|---|---|
| ((idle)) | 7619.1 | 94.8 |
| ((program)) | 124.6 | 1.5 |
| node_modules/three/build/three.module.js | 87.5 | 1.1 |
| ((garbage collector)) | 35.1 | 0.4 |
| src/ui/timeline.ts | 29.4 | 0.4 |
| (proto.<computed>) | 18.1 | 0.2 |
| node_modules/three/build/three.core.js | 12.8 | 0.2 |
| src/session/session.ts | 12.4 | 0.2 |
| src/ui/charts.ts | 10.5 | 0.1 |
| src/main.ts | 9.5 | 0.1 |
| (bindVertexArray) | 8.8 | 0.1 |
| (native) | 8.3 | 0.1 |
| (postMessage) | 5.7 | 0.1 |
| src/i18n/index.ts | 5 | 0.1 |
| (now) | 4.2 | 0.1 |
| src/physics/rigid/telemetry.ts | 3.7 | 0 |
| (uniform3f) | 3.7 | 0 |
| src/render/rocket.ts | 3.6 | 0 |
| (uniformMatrix4fv) | 2.8 | 0 |
| src/render/smoke.ts | 2.6 | 0 |

| function | self ms | % |
|---|---|---|
| (idle) | 7619.1 | 94.8 |
| (program) | 124.6 | 1.5 |
| (garbage collector) | 35.1 | 0.4 |
| proto.<computed> | 18.1 | 0.2 |
| layout (src/ui/timeline.ts:433) | 17.6 | 0.2 |
| gt (node_modules/three/build/three.module.js:18407) | 11.3 | 0.1 |
| t.onmessage (src/session/session.ts:157) | 11.2 | 0.1 |
| renderBufferDirect (node_modules/three/build/three.module.js:17233) | 9.2 | 0.1 |
| bindVertexArray | 8.8 | 0.1 |
| (anonymous) | 8.3 | 0.1 |
| Qx (src/ui/charts.ts:120) | 7.9 | 0.1 |
| st (node_modules/three/build/three.module.js:17897) | 7 | 0.1 |
| postMessage | 5.7 | 0.1 |
| clear (node_modules/three/build/three.module.js:17002) | 5 | 0.1 |
| s (src/ui/timeline.ts:554) | 4.9 | 0.1 |
| updateVisuals (src/main.ts:1934) | 4.7 | 0.1 |
| setEvents (src/ui/timeline.ts:287) | 4.6 | 0.1 |
| r (node_modules/three/build/three.module.js:15026) | 4.5 | 0.1 |
| we (node_modules/three/build/three.module.js:10573) | 4.5 | 0.1 |
| D (src/i18n/index.ts:38) | 4.4 | 0.1 |
| now | 4.2 | 0.1 |
| updateMatrixWorld (node_modules/three/build/three.core.js:13067) | 4.2 | 0.1 |
| frame (src/main.ts:1647) | 4.2 | 0.1 |
| h (node_modules/three/build/three.module.js:7357) | 4.1 | 0.1 |
| Ene (node_modules/three/build/three.module.js:5257) | 3.9 | 0 |

Page errors during runs: none
