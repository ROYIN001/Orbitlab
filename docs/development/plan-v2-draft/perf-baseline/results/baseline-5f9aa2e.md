# Orbitlab performance baseline — baseline-5f9aa2e
2026-10-04T21:26:21.413Z · 3 runs · 4×Intel(R) Xeon(R) Processor @ 2.10GHz · Chromium 141.0.7390.37 · 1280x800 @ DPR 0.5 · SwiftShader WebGL · dist /tmp/claude-0/-home-user-Orbitlab/338948be-0d3b-5499-8ebe-dce16ee97d04/scratchpad/ol2/dist
Values: median (min–max) over runs.

## Startup (cold, fresh profile, first visit)
| metric | value |
|---|---|
| DOMContentLoaded ms | 219.9 (182.4–406) |
| load event ms | 221 (183.4–407) |
| first contentful paint ms | 776 (696–1032) |
| #loading hidden (scene ready) ms | 16307 (14423.9–18544.9) |
| interactive (init done, WebMCP registered) ms | 16309 (14425.8–18546.1) |
| first frame after interactive ms | 18711.6 (16711.2–21193.5) |
| main-thread script ms to interactive (CDP) | 2454.5 (2338.7–2704.5) |
| main-thread task ms to interactive (CDP) | 18673.9 (16703–20958.9) |
| all-process CPU ms to interactive | 47430.6 (42409.7–51129.9) |
| renderer main-thread CPU ms to interactive | 1959.2 (1829.6–2871) |
| GPU process CPU ms to interactive | 42979.8 (38279.2–45200.9) |
| long tasks (n) to interactive | 3 (3–4) |
| long tasks total ms | 16087 (14217–18101) |
| total blocking time ms | 15937 (14067–17901) |
| longest task ms | 15354 (13527–17225) |
| requests to interactive | 18 (18–18) |
| bytes to interactive kB (raw) | 9548 (9548–9548) |
| bytes to interactive kB (gzip est.) | 5536.2 (5536.2–5536.2) |
|   JS kB | 4859.8 (4859.8–4859.8) |
|   JS worker kB | 578.4 (578.4–578.4) |
|   CSS kB | 175.8 (175.8–175.8) |
|   images kB | 3916.4 (3916.4–3916.4) |
|   HTML kB | 17.6 (17.6–17.6) |
| requests after interactive (SW precache etc.) | 70 (70–70) |
| bytes after interactive kB | 15834.2 (15834.2–15834.2) |
|   …until network quiet ms | 909.8 (814.6–1069.3) |
|   of which re-fetched (same path) kB | 9438.5 (9438.5–9438.5) |
| time inside WebGL calls to interactive ms | 16342.7 (14578.2–18308) |
|   shader programs created | 56 (56–56) |
|   of which identical to one linked earlier | 0 (0–0) |
|   waiting on shader compile/link ms | 13719.4 (12114.3–14648.5) |
|   texture upload calls ms (incl. image decode) | 1780.6 (1618.8–2635.2) |
| WebGL contexts to interactive | 2 (2–2) |
| texture uploads to interactive | 89 (89–89) |
| texture Mpixels uploaded | 104 (104–104) |
| localStorage gets to interactive | 130 (130–130) |
| localStorage chars read | 14054 (14054–14054) |
| profile-record reads | 49 (49–49) |
| profile-record writes | 2 (2–2) |
| JS heap used MB (pre-GC, settled) | 16.3 (16–16.7) |
| JS heap used MB (post-GC) | 15.6 (15.6–16) |
| DOM nodes | 4317 (4317–4317) |
| JS event listeners | 474 (474–474) |

Run 1 detail — contexts: 2d@canvas1 t=894; 2d@canvas2 t=1034; 2d@canvas3 t=1036; webgl2@.pg-canvas (high-performance) t=1099; 2d@offscreen t=1134; 2d@canvas4 t=1150; webgl2@#gl (high-performance) t=2026; 2d@offscreen t=2321; 2d@canvas5 t=2458; 2d@canvas6 t=2612; 2d@canvas7 t=2620; 2d@canvas8 t=3281; 2d@canvas9 t=3285; 2d@canvas10 t=3298; 2d@canvas11 t=3371; 2d@canvas12 t=3375; 2d@canvas13 t=3376; 2d@canvas14 t=3381; 2d@canvas15 t=3420; 2d@canvas16 t=3457; 2d@canvas17 t=3502; 2d@canvas18 t=3545; 2d@canvas19 t=3545; 2d@canvas20 t=3556; 2d@canvas21 t=3556; 2d@canvas22 t=3558; 2d@canvas23 t=3563; 2d@canvas24 t=3574; 2d@canvas25 t=3763; 2d@.chart t=3769; 2d@.chart t=3786; 2d@.chart t=3787; 2d@.chart t=3788; 2d@.chart t=3789; 2d@.chart t=3789; 2d@.chart t=3790; 2d@.chart t=3791
Workers created to interactive: flight.worker t=3263
Images fetched to interactive: textures/earth_atmos_2048.jpg (513 kB), textures/earth_lights_4096.jpg (402 kB), textures/earth_specular_2048.jpg (223 kB), textures/earth_atmos_4096.jpg (1026 kB), textures/earth_normal_2048.jpg (337 kB), textures/earth_clouds_4096.jpg (1323 kB), home/watch.en.webp (30 kB), home/explore.en.webp (62 kB)
JSON fetched to interactive: none
Large texture uploads: texImage2D 2048x2048 @#gl; texStorage2D 2048x2048 @#gl; texStorage2D 512x2048 @#gl; texSubImage2D 512x2048 @#gl; texStorage2D 1024x2048 @#gl; texSubImage2D 1024x2048 @#gl; texStorage2D 1024x2048 @#gl; texSubImage2D 1024x2048 @#gl; texStorage2D 4096x2048 @#gl; texSubImage2D 4096x2048 @#gl; texStorage2D 4096x2048 @#gl; texSubImage2D 4096x2048 @#gl; texStorage2D 2048x1024 @#gl; texSubImage2D 2048x1024 @#gl; texStorage2D 2048x1024 @#gl; texSubImage2D 2048x1024 @#gl; texStorage2D 1024x512 @#gl; texSubImage2D 1024x512 @#gl; texStorage2D 256x1024 @#gl; texSubImage2D 256x1024 @#gl; texStorage2D 512x1024 @#gl; texSubImage2D 512x1024 @#gl; texStorage2D 1024x1024 @#gl; texSubImage2D 1024x1024 @#gl; texStorage2D 1024x2048 @#gl; texSubImage2D 1024x2048 @#gl; texStorage2D 1024x1024 @#gl; texSubImage2D 1024x1024 @#gl; texStorage2D 4096x2048 @#gl; texSubImage2D 4096x2048 @#gl
WebGL calls by time to interactive: getShaderInfoLog ×108 11333 ms; texSubImage2D ×28 2634 ms; getProgramInfoLog ×54 2509 ms; getProgramParameter ×162 807 ms; getExtension ×15 730 ms; getParameter ×34 111 ms; bufferData ×497 74 ms; shaderSource ×112 74 ms
Duplicate fetches to interactive: none
Service worker: {"registered":true,"active":true,"controlled":true}; after-interactive by type: {"js":{"n":21,"kB":5702.2,"gzkB":1645.2},"other":{"n":2,"kB":61,"gzkB":25.1},"js-worker":{"n":12,"kB":4090.1,"gzkB":1348.4},"css":{"n":3,"kB":182.4,"gzkB":36.3},"json":{"n":10,"kB":1405.2,"gzkB":265.7},"image":{"n":21,"kB":4375.7,"gzkB":4375.7},"html":{"n":1,"kB":17.6,"gzkB":5}}

## Warm start (reload, service worker in control)
| metric | value |
|---|---|
| DOMContentLoaded ms | 982.1 (977.7–998.8) |
| #loading hidden ms | 6470.7 (4687.1–6706.4) |
| interactive ms | 6471.9 (4688.3–6708.7) |
| first frame ms | 7633 (7488.2–7806.8) |
| TBT ms | 6296 (4275–7214) |
| shader programs (to now) | 49 (49–49) |
| waiting on shader compile/link ms | 4652.4 (3692.8–5320.7) |
| requests reaching the server | 0 (0–0) |
| kB from server | 0 (0–0) |
| WebGL contexts | 2 (2–2) |

## Transitions (4 s window from the user action; hitches the user feels)
| metric | orbitEnter | launchEnter | flightStart |
|---|---|---|---|
| action wall ms (route+wait / MCP call) | 59 (55–78) | 2146 (1980–2328) | 2393 (2180–2517) |
| window length s (until 3 frames after the action) | 5.3 (4.61–6.17) | 6.2 (5.36–7.98) | 5.07 (5.03–5.13) |
| longest frame interval ms | 4266.4 (4016.5–5283.1) | 4866.5 (2999.8–5016.5) | 2433.3 (2349.9–2499.9) |
| longest app rAF callback ms | 4065.2 (3848.6–5094.8) | 147.1 (135.7–681.3) | 12.1 (10.7–14.2) |
| frames/s in window | 1.13 (0.97–1.3) | 0.75 (0.63–0.81) | 0.99 (0.99–1.17) |
| long tasks (n) | 1 (1–1) | 2 (2–3) | 2 (2–2) |
| long tasks total ms | 4262 (4022–5285) | 4931 (2818–5037) | 4639 (4519–4672) |
| longest task ms | 4262 (4022–5285) | 2737 (1328–2979) | 2496 (2381–2513) |
| time inside WebGL calls ms/s | 823.3 (764.8–829.9) | 293.7 (280.3–348.1) | 438.4 (404.2–473.5) |
| shader programs created | 7 (7–7) | 19 (19–19) | 19 (19–19) |
|   identical to one already linked in this context | 0 (0–0) | 18 (18–18) | 19 (19–19) |
|   identical to one linked in another context | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| waiting on shader compile/link ms | 2911.9 (2835.1–3582.6) | 1812.4 (1787–2186.3) | 2216.8 (2026.2–2353.1) |
| CDP task ms/s (main) | 873.5 (829.5–894.4) | 642 (463.3–933.3) | 931.9 (894.1–935.5) |

Run-by-run long tasks [start ms into window, duration ms]: orbitEnter: [[515,5285]] / [[656,4262]] / [[215,4022]]; launchEnter: [[27,1952],[1980,2979]] / [[38,2300],[2338,2737]] / [[21,798],[823,1328],[2152,692]]; flightStart: [[6,2513],[2534,2126]] / [[5,2381],[2400,2138]] / [[5,2176],[2199,2496]]
Run 1 WebGL calls by time [name, calls/s, ms/s]: orbitEnter: [["getShaderInfoLog",2,397.28],["texSubImage2D",0,242.05],["getProgramInfoLog",1,163.8]]; launchEnter: [["getProgramInfoLog",4,200.22],["getShaderInfoLog",7,136.55],["clear",17,4.25]]; flightStart: [["getProgramInfoLog",4,287.14],["getShaderInfoLog",8,172.74],["getProgramParameter",11,7.81]]

## Steady-state cost per scenario (per wall-clock second unless noted)
| metric | home | orbitPlaying | orbitPaused | launchPad | flight1x | flight100x |
|---|---|---|---|---|---|---|
| frames/s (app rAF) | 1.2 (1.19–1.39) | 13.54 (12.75–13.93) | 13.75 (12.95–13.96) | 4.58 (3.59–4.59) | 4.23 (3.99–4.61) | 2.98 (2.58–3.18) |
| frame interval p50 ms | 750 (733.3–783.2) | 66.7 (66.7–83.2) | 66.7 (66.7–66.7) | 216.6 (200–233.3) | 233.3 (216.6–233.4) | 316.7 (316.7–366.7) |
| frame interval p95 ms | 1150 (783.3–1383.3) | 133.4 (116.6–133.4) | 133.4 (116.6–150) | 299.9 (283.3–483.4) | 366.6 (316.5–400) | 500 (433.4–550.1) |
| frame interval p99 ms | 1150 (783.3–1383.3) | 166.7 (166.6–166.7) | 216.6 (183.2–233.4) | 366.6 (350–483.4) | 366.6 (366.6–433.3) | 500 (433.4–550.1) |
| frame interval max ms | 1150 (783.3–1383.3) | 166.7 (166.6–166.7) | 216.6 (183.2–233.4) | 366.6 (350–483.4) | 366.6 (366.6–433.3) | 500 (433.4–550.1) |
| rAF callback ms/frame (median) | 6.7 (6.6–8.1) | 1.6 (1.6–1.7) | 1.5 (1.4–1.6) | 4.8 (4.7–5.8) | 6.7 (6.4–7.2) | 7.9 (7–8.35) |
| rAF callback ms/frame p95 | 9.7 (8.6–10.3) | 2.5 (2.4–2.7) | 2.8 (2.2–3.1) | 8.8 (7.8–13.4) | 13.9 (10.2–14.8) | 15.3 (13–18) |
| rAF callback max ms | 9.7 (8.6–10.3) | 3.9 (3.4–4.6) | 4.1 (4.1–7.2) | 13.3 (8.4–13.4) | 14.6 (12.6–17.1) | 15.3 (13–18) |
| rAF callback ms/s | 8.7 (8.1–10.6) | 22.8 (22.4–24) | 22.4 (21.2–22.8) | 24 (19.9–27.4) | 33.1 (29.3–33.6) | 23.2 (22.6–27.5) |
| WebGL draw calls/s | 181.9 (181.6–211.7) | 108.3 (102–111.5) | 110 (103.6–111.7) | 498.8 (391.2–500.1) | 466.3 (440.6–507.3) | 339.4 (292.8–358.3) |
| draw calls/frame | 152 (152–152) | 8 (8–8) | 8 (8–8) | 109 (109–109) | 110.1 (110.1–110.5) | 113.5 (112.6–113.9) |
| time inside WebGL calls ms/s | 2 (1.8–2.2) | 2.6 (2.3–3.9) | 3.9 (2.7–4.6) | 5.2 (4.1–5.7) | 6.4 (6–6.9) | 6.1 (3.6–7.7) |
| CDP script ms/s (main) | 8.6 (8.1–10.5) | 22.5 (21.9–23.5) | 21.7 (20.7–22.4) | 23.7 (19.6–26.7) | 30.9 (27.9–31.5) | 27.7 (26.4–31.2) |
| CDP task ms/s (main) | 10.9 (10.2–13.5) | 47.7 (45.7–48.5) | 45.1 (45–47.9) | 37.8 (31.8–41.2) | 57.3 (50.8–58.3) | 52.7 (50.1–68.1) |
| CDP layout+style ms/s | 0.2 (0.2–0.3) | 3.7 (3.5–3.8) | 3.9 (3.5–4.1) | 0.8 (0.6–1) | 5.2 (4.4–5.3) | 4 (3.1–4) |
| CPU renderer main ms/s | 10 (10–10) | 39.9 (37.9–39.9) | 38 (37.9–39.9) | 30 (26–33.9) | 43.7 (42.4–44.9) | 45.8 (39.7–51.8) |
| CPU renderer workers ms/s | 0 (0–0) | 0 (0–0) | 0 (0–2) | 0 (0–0) | 17.5 (17.5–21.2) | 792.5 (753.1–802.6) |
| CPU renderer other ms/s | 8 (0–12) | 20 (18–24) | 18 (18–24) | 12 (10–16) | 38.6 (36.2–41.1) | 180.8 (177.3–183.3) |
| CPU GPU process ms/s | 3568.6 (3462.5–3609.7) | 3630.9 (3599.2–3637.3) | 3624.4 (3603.4–3688.6) | 3447.9 (3149.6–3543.5) | 3355.8 (3303.4–3445.6) | 2585.1 (2433–2663.9) |
| CPU browser ms/s | 2 (0–6) | 2 (2–4) | 2 (2–2) | 2 (2–2) | 3.7 (2.5–3.7) | 2 (0–6) |
| CPU all processes ms/s | 3586.5 (3478.5–3633.7) | 3696.8 (3661–3699.2) | 3682.3 (3665.3–3754.5) | 3491.8 (3187.5–3595.4) | 3463 (3408.1–3546.6) | 3612.8 (3449.9–3660.1) |
| long tasks (n) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| longest task ms | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| shader programs created | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage gets/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage sets/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage kB read/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage kB written/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| sim s per wall s | n/a | n/a | n/a | n/a | 1.01 (0.97–1.01) | 7.28 (7.23–7.66) |

Run 1 — frames/s in which each canvas issued draw calls: home: {"#gl":1.2}; orbitPlaying: {".pg-canvas":13.9}; orbitPaused: {".pg-canvas":13.8}; launchPad: {"#gl":3.6}; flight1x: {"#gl":4.2}; flight100x: {"#gl":2.6}

Run 1 — busiest threads (ms/s): home: gpu-process:Thread<01> 806.7, gpu-process:Thread<00> 792.7, gpu-process:Thread<02> 790.7, gpu-process:Thread<03> 786.7, gpu-process:chrome 275.6, renderer:main 10, gpu-process:main 6, browser:main 4 || orbitPlaying: gpu-process:Thread<02> 862.8, gpu-process:Thread<03> 834.8, gpu-process:Thread<01> 822.8, gpu-process:Thread<00> 816.9, gpu-process:chrome 235.7, gpu-process:main 41.9, renderer:main 39.9, renderer:Compositor 14 || orbitPaused: gpu-process:Thread<01> 878.2, gpu-process:Thread<02> 864.3, gpu-process:Thread<00> 862.3, gpu-process:Thread<03> 804.4, gpu-process:chrome 225.5, gpu-process:main 39.9, renderer:main 37.9, renderer:Compositor 12 || launchPad: gpu-process:Thread<02> 705, gpu-process:Thread<03> 679, gpu-process:Thread<01> 655.1, gpu-process:Thread<00> 653.1, gpu-process:chrome 423.4, renderer:main 26, gpu-process:main 22, renderer:ThreadPoolForeg 6 || flight1x: gpu-process:Thread<00> 762.9, gpu-process:Thread<02> 744.2, gpu-process:Thread<03> 725.5, gpu-process:Thread<01> 721.8, gpu-process:chrome 352.8, renderer:main 42.4, gpu-process:main 32.4, renderer:ThreadPoolForeg 32.4 || flight100x: renderer:DedicatedWorker 792.5, gpu-process:Thread<01> 522.3, gpu-process:Thread<02> 508.4, gpu-process:Thread<00> 506.5, gpu-process:Thread<03> 504.5, gpu-process:chrome 363.5, renderer:ThreadPoolForeg 174.8, renderer:main 39.7

Run 1 — WebGL calls by time [name, calls/s, ms/s]: home: [["uniform3f",214,0.2],["uniformMatrix4fv",239,0.18],["bindVertexArray",159,0.18],["drawElements",128,0.16]]; orbitPlaying: [["clear",14,0.56],["drawElements",56,0.46],["useProgram",98,0.44],["bindBuffer",56,0.38]]; orbitPaused: [["drawArrays",41,0.68],["clear",14,0.48],["bindBuffer",55,0.28],["bindVertexArray",110,0.26]]; launchPad: [["bindVertexArray",355,1.12],["drawElements",309,0.54],["uniformMatrix4fv",510,0.44],["uniform1fv",136,0.38]]; flight1x: [["bindVertexArray",423,1.3],["uniformMatrix4fv",722,1.05],["uniform3f",860,0.66],["drawElements",367,0.37]]; flight100x: [["bindVertexArray",270,1.65],["uniform3f",590,1.35],["uniformMatrix4fv",450,0.79],["drawElements",216,0.44]]

Orbit pause confirmed: true, true, true

## Workspace storage (default vs ~1.5 MB profile; reload in a fresh context, service worker blocked)
| metric | defaultProfile | largeProfile |
|---|---|---|
| profile record kB | 0.2 (0.2–0.2) | 1500.3 (1500.3–1500.3) |
| reload: interactive ms | 15748.7 (15345.8–15999) | 16145.1 (16046.2–16195.4) |
| startup: profile-record reads | 46 (46–46) | 46 (46–46) |
| startup: MB of record read | 0.01 (0.01–0.01) | 69.01 (69.01–69.01) |
| startup: profile-record writes | 1 (1–1) | 1 (1–1) |
| startup: big JSON.parse n | 0 (0–0) | 92 (92–92) |
| startup: big JSON.parse ms | 0 (0–0) | 260.7 (237–267.1) |
| startup: big JSON.stringify n | 0 (0–0) | 47 (47–47) |
| startup: big JSON.stringify ms | 0 (0–0) | 106.4 (98.7–108.7) |
| startup: native localStorage ms | 0.1 (0–0.4) | 7.3 (6.9–7.5) |
| configure_mission: wall ms | 1238.5 (1217.1–1336.4) | 1273.2 (1229.3–1276.5) |
| configure_mission (+1 s): record reads | 2 (2–2) | 2 (2–2) |
| configure_mission (+1 s): record writes | 1 (1–1) | 1 (1–1) |
| configure_mission (+1 s): MB read | 0 (0–0) | 3 (3–3) |
| configure_mission (+1 s): MB written | 0 (0–0) | 1.5 (1.5–1.5) |
| configure_mission (+1 s): big JSON parse ms | 0 (0–0) | 12.1 (10–18.3) |
| configure_mission (+1 s): big JSON stringify ms | 0 (0–0) | 8.2 (7–9.6) |

Page errors during runs: none
