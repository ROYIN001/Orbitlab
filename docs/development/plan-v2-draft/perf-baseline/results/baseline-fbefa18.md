# Orbitlab performance baseline — baseline-fbefa18
2026-10-04T02:34:22.081Z · 3 runs · 4×Intel(R) Xeon(R) Processor @ 2.80GHz · Chromium 141.0.7390.37 · 1280x800 @ DPR 0.5 · SwiftShader WebGL · dist /tmp/claude-0/-home-user-Orbitlab/338948be-0d3b-5499-8ebe-dce16ee97d04/scratchpad/ol/dist
Values: median (min–max) over runs.

## Startup (cold, fresh profile, first visit)
| metric | value |
|---|---|
| DOMContentLoaded ms | 243.9 (196.4–271.5) |
| load event ms | 244.9 (197.4–272.7) |
| first contentful paint ms | 796 (760–880) |
| #loading hidden (scene ready) ms | 16416.3 (15953.1–16747.6) |
| interactive (init done, WebMCP registered) ms | 16417.6 (15954.7–16749.2) |
| first frame after interactive ms | 18856.5 (18486.5–19287.8) |
| main-thread script ms to interactive (CDP) | 2603.3 (2508.9–2604.1) |
| main-thread task ms to interactive (CDP) | 18860.9 (18467.3–19225.2) |
| all-process CPU ms to interactive | 47649.4 (46599.9–47700.4) |
| renderer main-thread CPU ms to interactive | 1939.5 (1919.4–1949.4) |
| GPU process CPU ms to interactive | 43029.3 (42089.7–43120.7) |
| long tasks (n) to interactive | 3 (3–3) |
| long tasks total ms | 16178 (15721–16470) |
| total blocking time ms | 16028 (15571–16320) |
| longest task ms | 15449 (14954–15669) |
| requests to interactive | 18 (18–18) |
| bytes to interactive kB (raw) | 9455.8 (9455.8–9455.8) |
| bytes to interactive kB (gzip est.) | 5510.8 (5510.8–5510.8) |
|   JS kB | 4778.5 (4778.5–4778.5) |
|   JS worker kB | 578.4 (578.4–578.4) |
|   CSS kB | 166.2 (166.2–166.2) |
|   images kB | 3916.4 (3916.4–3916.4) |
|   HTML kB | 16.3 (16.3–16.3) |
| requests after interactive (SW precache etc.) | 70 (70–70) |
| bytes after interactive kB | 15741.3 (15741.3–15741.3) |
|   …until network quiet ms | 897.3 (836.5–989.5) |
|   of which re-fetched (same path) kB | 9347.6 (9347.6–9347.6) |
| time inside WebGL calls to interactive ms | 16470.8 (16081.6–16863.8) |
|   shader programs created | 56 (56–56) |
|   of which identical to one linked earlier | 0 (0–0) |
|   waiting on shader compile/link ms | 13911.7 (13533.1–14231) |
|   texture upload calls ms (incl. image decode) | 1708.5 (1663.5–1772.6) |
| WebGL contexts to interactive | 2 (2–2) |
| texture uploads to interactive | 89 (89–89) |
| texture Mpixels uploaded | 104 (104–104) |
| localStorage gets to interactive | 125 (125–125) |
| localStorage chars read | 13466 (13466–13466) |
| profile-record reads | 47 (47–47) |
| profile-record writes | 2 (2–2) |
| JS heap used MB (pre-GC, settled) | 18.6 (16.2–28.3) |
| JS heap used MB (post-GC) | 15.9 (15.4–16) |
| DOM nodes | 4145 (4145–4145) |
| JS event listeners | 453 (453–453) |

Run 1 detail — contexts: 2d@canvas1 t=659; 2d@canvas2 t=880; 2d@canvas3 t=880; webgl2@.pg-canvas (high-performance) t=928; 2d@offscreen t=956; 2d@canvas4 t=971; webgl2@#gl (high-performance) t=1689; 2d@offscreen t=1946; 2d@canvas5 t=2049; 2d@canvas6 t=2095; 2d@canvas7 t=2102; 2d@canvas8 t=2837; 2d@canvas9 t=2853; 2d@canvas10 t=2862; 2d@canvas11 t=2932; 2d@canvas12 t=2933; 2d@canvas13 t=2934; 2d@canvas14 t=2939; 2d@canvas15 t=2978; 2d@canvas16 t=3019; 2d@canvas17 t=3057; 2d@canvas18 t=3094; 2d@canvas19 t=3094; 2d@canvas20 t=3105; 2d@canvas21 t=3106; 2d@canvas22 t=3107; 2d@canvas23 t=3112; 2d@canvas24 t=3134; 2d@canvas25 t=3299; 2d@.chart t=3310; 2d@.chart t=3320; 2d@.chart t=3321; 2d@.chart t=3322; 2d@.chart t=3323; 2d@.chart t=3323; 2d@.chart t=3324; 2d@.chart t=3325
Workers created to interactive: flight.worker t=2823
Images fetched to interactive: textures/earth_atmos_2048.jpg (513 kB), textures/earth_specular_2048.jpg (223 kB), textures/earth_lights_4096.jpg (402 kB), textures/earth_normal_2048.jpg (337 kB), textures/earth_atmos_4096.jpg (1026 kB), textures/earth_clouds_4096.jpg (1323 kB), home/watch.en.webp (30 kB), home/explore.en.webp (62 kB)
JSON fetched to interactive: none
Large texture uploads: texImage2D 2048x2048 @#gl; texStorage2D 2048x2048 @#gl; texStorage2D 512x2048 @#gl; texSubImage2D 512x2048 @#gl; texStorage2D 1024x2048 @#gl; texSubImage2D 1024x2048 @#gl; texStorage2D 1024x2048 @#gl; texSubImage2D 1024x2048 @#gl; texStorage2D 4096x2048 @#gl; texSubImage2D 4096x2048 @#gl; texStorage2D 4096x2048 @#gl; texSubImage2D 4096x2048 @#gl; texStorage2D 2048x1024 @#gl; texSubImage2D 2048x1024 @#gl; texStorage2D 2048x1024 @#gl; texSubImage2D 2048x1024 @#gl; texStorage2D 1024x512 @#gl; texSubImage2D 1024x512 @#gl; texStorage2D 256x1024 @#gl; texSubImage2D 256x1024 @#gl; texStorage2D 512x1024 @#gl; texSubImage2D 512x1024 @#gl; texStorage2D 1024x1024 @#gl; texSubImage2D 1024x1024 @#gl; texStorage2D 1024x2048 @#gl; texSubImage2D 1024x2048 @#gl; texStorage2D 1024x1024 @#gl; texSubImage2D 1024x1024 @#gl; texStorage2D 4096x2048 @#gl; texSubImage2D 4096x2048 @#gl
WebGL calls by time to interactive: getShaderInfoLog ×108 10585 ms; getProgramInfoLog ×54 2775 ms; texSubImage2D ×28 1771 ms; getProgramParameter ×162 871 ms; getExtension ×15 609 ms; getParameter ×34 122 ms; shaderSource ×112 68 ms; bufferData ×497 20 ms
Duplicate fetches to interactive: none
Service worker: {"registered":true,"active":true,"controlled":true}; after-interactive by type: {"js":{"n":21,"kB":5620.9,"gzkB":1622.1},"other":{"n":2,"kB":61,"gzkB":25.1},"js-worker":{"n":12,"kB":4089.5,"gzkB":1348.2},"css":{"n":3,"kB":172.8,"gzkB":34.4},"json":{"n":10,"kB":1405.2,"gzkB":265.7},"image":{"n":21,"kB":4375.7,"gzkB":4375.7},"html":{"n":1,"kB":16.3,"gzkB":4.7}}

## Warm start (reload, service worker in control)
| metric | value |
|---|---|
| DOMContentLoaded ms | 1013.5 (1001.4–1015.1) |
| #loading hidden ms | 6580.3 (6181.4–6934.2) |
| interactive ms | 6581.9 (6182.7–6936.4) |
| first frame ms | 7151.4 (7052–7423.6) |
| TBT ms | 6134 (5735–6705) |
| shader programs (to now) | 49 (49–49) |
| waiting on shader compile/link ms | 4508.7 (3427.7–4751.8) |
| requests reaching the server | 0 (0–0) |
| kB from server | 0 (0–0) |
| WebGL contexts | 2 (2–2) |

## Transitions (4 s window from the user action; hitches the user feels)
| metric | orbitEnter | launchEnter | flightStart |
|---|---|---|---|
| action wall ms (route+wait / MCP call) | 70 (59–77) | 2131 (1513–2207) | 2956 (2655–3496) |
| window length s (until 3 frames after the action) | 4.99 (4.63–5.17) | 5.57 (5.18–7.78) | 5.65 (5.43–6.25) |
| longest frame interval ms | 4033.2 (3883.2–4183.3) | 4799.8 (4716.5–5083.1) | 2699.9 (2399.9–3266.6) |
| longest app rAF callback ms | 3856.5 (3743–3931.1) | 174.2 (149.4–935.7) | 13.1 (12.2–19.3) |
| frames/s in window | 1.3 (0.97–1.4) | 0.72 (0.51–0.97) | 0.88 (0.8–0.92) |
| long tasks (n) | 1 (1–1) | 2 (2–2) | 2 (2–2) |
| long tasks total ms | 4032 (3884–4147) | 4867 (4765–5157) | 5249 (5033–5842) |
| longest task ms | 4032 (3884–4147) | 2757 (2576–3663) | 2952 (2647–3493) |
| time inside WebGL calls ms/s | 757.6 (747.9–834) | 388.4 (265.7–406.9) | 498.1 (458.1–533.5) |
| shader programs created | 7 (7–7) | 19 (19–19) | 19 (19–19) |
|   identical to one already linked in this context | 0 (0–0) | 18 (18–18) | 19 (19–19) |
|   identical to one linked in another context | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| waiting on shader compile/link ms | 2878.6 (2760.8–2908.1) | 2058.9 (2026.6–2114.6) | 2781.6 (2453.8–3306) |
| CDP task ms/s (main) | 824.5 (808.8–899.9) | 932.3 (634.4–937.7) | 944.4 (937.8–944.9) |

Run-by-run long tasks [start ms into window, duration ms]: orbitEnter: [[222,4032]] / [[738,3884]] / [[652,4147]]; launchEnter: [[26,1494],[1521,3663]] / [[22,2110],[2132,2757]] / [[20,2189],[2209,2576]]; flightStart: [[9,2952],[2985,2297]] / [[11,2647],[2676,2386]] / [[19,3493],[3533,2349]]
Run 1 WebGL calls by time [name, calls/s, ms/s]: orbitEnter: [["getShaderInfoLog",3,377.76],["texSubImage2D",1,206.52],["getProgramInfoLog",2,203.82]]; launchEnter: [["getProgramInfoLog",3,354.71],["getShaderInfoLog",7,23.78],["clear",16,2.91]]; flightStart: [["getProgramInfoLog",3,289.48],["getShaderInfoLog",7,195.64],["getProgramParameter",10,6.83]]

## Steady-state cost per scenario (per wall-clock second unless noted)
| metric | home | orbitPlaying | orbitPaused | launchPad | flight1x | flight100x |
|---|---|---|---|---|---|---|
| frames/s (app rAF) | 1.39 (1.19–1.39) | 12.56 (12.35–13.54) | 12.95 (12.32–13.55) | 3.58 (3.58–4.38) | 3.87 (3.86–4.11) | 2.58 (2.58–2.78) |
| frame interval p50 ms | 783.3 (750.1–816.6) | 83.3 (66.7–83.3) | 83.3 (66.7–83.3) | 233.4 (216.7–250) | 250 (233.3–250) | 349.9 (333.3–350) |
| frame interval p95 ms | 833.4 (783.3–1116.7) | 116.7 (100.1–116.7) | 100 (83.4–150) | 516.7 (283.4–733.4) | 383.3 (333.3–400.1) | 550 (516.6–550) |
| frame interval p99 ms | 833.4 (783.3–1116.7) | 183.4 (133.4–200) | 166.6 (116.7–216.7) | 516.7 (350–733.4) | 400 (366.6–400.1) | 550 (516.6–550) |
| frame interval max ms | 833.4 (783.3–1116.7) | 183.4 (133.4–200) | 166.6 (116.7–216.7) | 516.7 (350–733.4) | 400 (366.6–400.1) | 550 (516.6–550) |
| rAF callback ms/frame (median) | 7.7 (7.5–8) | 1.6 (1.6–1.7) | 1.4 (1.4–1.5) | 5.5 (4.55–5.95) | 7.8 (6.2–8.1) | 8.5 (8.1–10.1) |
| rAF callback ms/frame p95 | 11.5 (9.3–14.2) | 2.7 (2.6–3.5) | 2.7 (2.4–2.8) | 8.2 (6.7–22.1) | 13.9 (11.9–16.1) | 17.2 (13.5–23.8) |
| rAF callback max ms | 11.5 (9.3–14.2) | 3.9 (3.2–5.4) | 5.1 (4.7–5.2) | 13.1 (8.2–22.1) | 19.1 (13.9–24) | 17.2 (13.5–23.8) |
| rAF callback ms/s | 11 (10.8–11.2) | 23.8 (22.4–23.9) | 20.3 (19.8–22.6) | 24.4 (19.2–25.5) | 32.8 (30.8–33.8) | 25.6 (22.7–25.9) |
| WebGL draw calls/s | 211.6 (181.5–212) | 100.5 (98.8–108.3) | 103.6 (98.5–108.4) | 390.7 (389.9–477.9) | 426.3 (426.2–452.6) | 291.3 (290.7–313.3) |
| draw calls/frame | 152 (152–152) | 8 (8–8) | 8 (8–8) | 109 (109–109) | 110.2 (110.1–110.3) | 112.8 (112.5–112.8) |
| time inside WebGL calls ms/s | 2.5 (1.8–2.7) | 3.6 (2.5–4.1) | 3.4 (2.4–3.7) | 4.8 (4.3–5.9) | 7.9 (6–8.4) | 6 (3.5–6.6) |
| CDP script ms/s (main) | 10.7 (10.3–11.1) | 23.4 (22–23.6) | 20 (19.3–22.1) | 23.3 (18.3–25.1) | 31.6 (29–32.5) | 30.4 (26.8–31.4) |
| CDP task ms/s (main) | 13.8 (13.6–14.1) | 47.4 (44.3–48.2) | 43.3 (42.5–54.5) | 34.3 (29.9–40) | 56.2 (54–57.8) | 61 (52.7–64.1) |
| CDP layout+style ms/s | 0.3 (0.3–0.8) | 3.8 (3.5–3.8) | 3.5 (3.5–4.1) | 0.8 (0.7–0.9) | 5 (4.3–5.2) | 3.7 (3.6–4.1) |
| CPU renderer main ms/s | 10 (10–14) | 39.9 (37.9–41.9) | 39.9 (35.8–47.9) | 25.9 (24–35.9) | 42.4 (42.4–42.4) | 45.8 (41.8–45.8) |
| CPU renderer workers ms/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 17.5 (17.4–18.7) | 796.3 (788.5–817.9) |
| CPU renderer other ms/s | 6 (4–6) | 26 (14–28) | 24 (19.9–30) | 16 (10–16) | 38.7 (32.4–40) | 191.2 (181.1–201.1) |
| CPU GPU process ms/s | 3617.5 (3545–3654.2) | 3658.1 (3632.7–3676.4) | 3665.6 (3640.7–3675.4) | 3198.9 (3163.4–3554.2) | 3325 (3309.2–3387.8) | 2510.5 (2491–2579.1) |
| CPU browser ms/s | 0 (0–2) | 4 (2–6) | 2 (2–2) | 0 (0–2) | 5 (2.5–5) | 2 (2–4) |
| CPU all processes ms/s | 3639.5 (3563–3668.2) | 3718 (3704.6–3748.2) | 3741.3 (3698.5–3745.5) | 3232.8 (3205.2–3608.1) | 3428.6 (3407.8–3492.5) | 3547.7 (3524.5–3627.9) |
| long tasks (n) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| longest task ms | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| shader programs created | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage gets/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage sets/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage kB read/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| localStorage kB written/s | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| sim s per wall s | n/a | n/a | n/a | n/a | 0.99 (0.99–1) | 8.32 (7.8–8.46) |

Run 1 — frames/s in which each canvas issued draw calls: home: {"#gl":1.2}; orbitPlaying: {".pg-canvas":12.4}; orbitPaused: {".pg-canvas":12.3}; launchPad: {"#gl":3.6}; flight1x: {"#gl":3.9}; flight100x: {"#gl":2.6}

Run 1 — busiest threads (ms/s): home: gpu-process:Thread<02> 854.8, gpu-process:Thread<01> 846.8, gpu-process:Thread<00> 820.9, gpu-process:Thread<03> 758.9, gpu-process:chrome 251.6, renderer:main 10, gpu-process:main 6, renderer:Compositor 4 || orbitPlaying: gpu-process:Thread<00> 854.3, gpu-process:Thread<02> 846.3, gpu-process:Thread<03> 812.4, gpu-process:Thread<01> 804.4, gpu-process:chrome 255.5, gpu-process:main 41.9, renderer:main 37.9, renderer:Compositor 16 || orbitPaused: gpu-process:Thread<01> 856.4, gpu-process:Thread<00> 842.5, gpu-process:Thread<03> 826.5, gpu-process:Thread<02> 802.6, gpu-process:chrome 252.9, gpu-process:main 39.8, renderer:main 35.8, gpu-process:VizCompositorTh 11.9 || launchPad: gpu-process:Thread<01> 718.7, gpu-process:Thread<02> 688.8, gpu-process:Thread<03> 649, gpu-process:Thread<00> 641.1, gpu-process:chrome 424, gpu-process:main 25.9, renderer:main 25.9, gpu-process:VizCompositorTh 8 || flight1x: gpu-process:Thread<00> 754.9, gpu-process:Thread<03> 725, gpu-process:Thread<01> 721.2, gpu-process:Thread<02> 681.3, gpu-process:chrome 378.1, renderer:main 42.4, gpu-process:main 31.2, renderer:ThreadPoolForeg 26.2 || flight100x: renderer:DedicatedWorker 788.5, gpu-process:Thread<00> 543.6, gpu-process:Thread<03> 543.6, gpu-process:Thread<01> 529.7, gpu-process:Thread<02> 511.7, gpu-process:chrome 330.5, renderer:ThreadPoolForeg 195.1, renderer:main 41.8

Run 1 — WebGL calls by time [name, calls/s, ms/s]: home: [["uniform3f",214,0.36],["uniformMatrix4fv",239,0.26],["bindVertexArray",159,0.2],["uniform1fv",61,0.14]]; orbitPlaying: [["vertexAttribPointer",25,0.64],["bindBuffer",49,0.5],["clear",12,0.46],["blendFuncSeparate",25,0.36]]; orbitPaused: [["useProgram",86,0.81],["clear",12,0.77],["bufferData",12,0.46],["disable",25,0.36]]; launchPad: [["bindVertexArray",354,0.85],["uniformMatrix4fv",508,0.78],["drawElements",308,0.48],["bufferSubData",11,0.22]]; flight1x: [["drawElements",335,1.28],["bindVertexArray",387,1.07],["uniform3f",789,1],["uniformMatrix4fv",660,0.91]]; flight100x: [["enable",25,1.49],["uniformMatrix3fv",110,0.81],["uniformMatrix4fv",451,0.7],["bindVertexArray",269,0.6]]

Orbit pause confirmed: true, true, true

## Workspace storage (default vs ~1.5 MB profile; reload in a fresh context, service worker blocked)
| metric | defaultProfile | largeProfile |
|---|---|---|
| profile record kB | 0.2 (0.2–0.2) | 1500.3 (1500.3–1500.3) |
| reload: interactive ms | 16429.6 (16343–17181.7) | 16802 (16516.6–17046.4) |
| startup: profile-record reads | 44 (44–44) | 44 (44–44) |
| startup: MB of record read | 0.01 (0.01–0.01) | 66.01 (66.01–66.01) |
| startup: profile-record writes | 1 (1–1) | 1 (1–1) |
| startup: big JSON.parse n | 0 (0–0) | 88 (88–88) |
| startup: big JSON.parse ms | 0 (0–0) | 270.1 (252.7–282) |
| startup: big JSON.stringify n | 0 (0–0) | 45 (45–45) |
| startup: big JSON.stringify ms | 0 (0–0) | 111.8 (107.5–112.5) |
| startup: native localStorage ms | 0.1 (0.1–0.3) | 7.7 (7.1–7.9) |
| configure_mission: wall ms | 1372.6 (1262.3–1390.7) | 1412.8 (1278.4–1435.4) |
| configure_mission (+1 s): record reads | 2 (2–2) | 2 (2–2) |
| configure_mission (+1 s): record writes | 1 (1–1) | 1 (1–1) |
| configure_mission (+1 s): MB read | 0 (0–0) | 3 (3–3) |
| configure_mission (+1 s): MB written | 0 (0–0) | 1.5 (1.5–1.5) |
| configure_mission (+1 s): big JSON parse ms | 0 (0–0) | 14.9 (14.5–22.8) |
| configure_mission (+1 s): big JSON stringify ms | 0 (0–0) | 6.9 (6.5–8.9) |

Page errors during runs: none
