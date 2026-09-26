/**
 * Track 2, guidance and navigation (roadmap E03): the loads of the ascent,
 * explicit guidance saving an ascent an engine short, and inertial navigation
 * without satellites. 2.1 and 2.2 fly point-mass (tests/lessons.test.ts);
 * 2.3 flies six-DOF, its solution in tests/heavy/lessons-sixdof.test.ts.
 * 2.4 takes a run out of a Monte Carlo set (G05) and flies it on its own (P08).
 */
import { orbitById } from '../../data/orbits';
import { DEFAULT_FAILURE } from '../../physics/defaults';
import { missionDoc } from './common';

const km = 1000;
const POINT_MASS = { model: 'pointMass', wind: 'calm', seed: 20260919 } as const;
const SIX_DOF = { model: 'sixDof', wind: 'calm', seed: 20260919 } as const;

export const TRACK2: readonly unknown[] = [
  {
    id: 'guid-maxq', track: 2, order: 1, mode: 'explore', domains: [3, 4], tags: ['q_max', 'a_max'],
    title: { en: 'Aerodynamic loads', ru: 'Аэродинамические нагрузки', th: 'ภาระทางอากาศพลศาสตร์' },
    brief: {
      en: 'Soyuz-2.1a has no throttle bucket: flown as it is, it meets a dynamic pressure of about 34 kPa. Your payload\'s structure is rated for 25 kPa. Keep the peak dynamic pressure q at or below 25 kPa and still reach orbit. You may change the guidance — the acceleration limit is the setting to look at — nothing else.',
      ru: 'У «Союза-2.1а» нет дросселирования на участке максимального напора: в штатном полёте скоростной напор достигает около 34 кПа. Конструкция вашей полезной нагрузки рассчитана на 25 кПа. Удержите максимальный скоростной напор q не выше 25 кПа и выйдите на орбиту. Менять можно только параметры наведения — обратите внимание на ограничение ускорения.',
      th: 'Soyuz-2.1a ไม่มีการลดแรงขับช่วง max-Q หากบินตามปกติ ความดันพลวัตจะสูงถึงประมาณ 34 kPa แต่โครงสร้างสัมภาระของคุณรับได้ 25 kPa จงรักษาความดันพลวัตสูงสุด q ไม่ให้เกิน 25 kPa และยังเข้าสู่วงโคจรได้ ปรับได้เฉพาะค่าการนำวิถี โดยให้ดูที่ขีดจำกัดความเร่ง',
    },
    debrief: {
      en: 'q = ½ρv²: the peak comes where the air is still dense and the rocket already fast. Holding the acceleration down keeps the speed low through the dense air, at a price — the engines burn longer against gravity, so less Δv is left. Too low a limit and the ascent is so slow that the rocket is still low and dense-aired when it finally gets fast: the load comes back, higher. Launchers do this with a throttle bucket (Falcon 9 to about 75 % near 22 kPa) rather than a fixed limit.',
      ru: 'q = ½ρv²: максимум напора там, где воздух ещё плотный, а скорость уже велика. Ограничение ускорения удерживает скорость малой в плотных слоях, но за это приходится платить: двигатели дольше работают против тяготения, и запас Δv уменьшается. При слишком низком ограничении выведение идёт так медленно, что ракета набирает скорость, всё ещё находясь в плотной атмосфере, — и нагрузка возвращается, причём больше. На практике для этого снижают тягу на участке максимального напора (Falcon 9 — примерно до 75 % около 22 кПа), а не вводят постоянное ограничение.',
      th: 'q = ½ρv² ค่าสูงสุดเกิดในช่วงที่อากาศยังหนาแน่นแต่จรวดเร็วแล้ว การจำกัดความเร่งทำให้ความเร็วต่ำขณะผ่านอากาศหนาแน่น แต่ต้องแลกด้วยการที่เครื่องยนต์เผาไหม้นานขึ้นเพื่อต้านแรงโน้มถ่วง Δv ที่เหลือจึงน้อยลง ถ้าจำกัดต่ำเกินไป จรวดไต่ช้าจนยังอยู่ในอากาศหนาแน่นตอนที่เร่งจนเร็ว ภาระจึงกลับมาและสูงกว่าเดิม จรวดจริงใช้การลดแรงขับช่วง max-Q (Falcon 9 ลดเหลือประมาณ 75% ที่ราว 22 kPa) แทนการจำกัดความเร่งตายตัว',
    },
    mission: missionDoc({
      vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'cubesats', payloadMass: 5000, orbitId: 'custom',
      orbit: { ...orbitById('leo'), perigee: 200 * km, apogee: 450 * km }, dynamics: { ...POINT_MASS },
    }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model'],
    criteria: [
      { id: 'q', kind: 'measure', measure: 'maxQ', max: 25 },
      { id: 'orbit', kind: 'outcome', is: 'orbit' },
      {
        id: 'q-read', kind: 'answer', measure: 'maxQ', tol: 1, unit: 'kPa',
        prompt: { en: 'The peak dynamic pressure you flew through (kPa)', ru: 'Максимальный скоростной напор в вашем полёте (кПа)', th: 'ความดันพลวัตสูงสุดที่คุณบินผ่าน (kPa)' },
      },
    ],
    hints: [
      { en: 'The peak q comes from the speed reached while the air is still dense: slow the rocket down through the first minute and a half.', ru: 'Максимум q определяется скоростью, набранной, пока воздух ещё плотный: замедлите ракету в первые полторы минуты.', th: 'ค่า q สูงสุดมาจากความเร็วที่ได้ขณะอากาศยังหนาแน่น ให้จรวดช้าลงในช่วงนาทีครึ่งแรก' },
      { en: 'Guidance → Acceleration limit: above it the engines are throttled back. Flown as it is, Soyuz reaches over 25 m/s².', ru: 'Наведение → Ограничение ускорения: выше него тяга снижается. В штатном полёте «Союз» разгоняется более чем до 25 м/с².', th: 'การนำวิถี → ขีดจำกัดความเร่ง เมื่อเกินค่านี้เครื่องยนต์จะลดแรงขับ ถ้าบินตามปกติ Soyuz เร่งได้เกิน 25 ม./วินาที²' },
      { en: 'Try about 17–18 m/s². Much lower and the ascent drags on in the dense air, and the load comes back higher than before.', ru: 'Попробуйте около 17–18 м/с². Намного меньше — и выведение затянется в плотных слоях, а нагрузка вернётся ещё большей.', th: 'ลองประมาณ 17–18 ม./วินาที² ถ้าต่ำกว่านี้มาก การไต่ระดับจะยืดเยื้อในอากาศหนาแน่น และภาระจะกลับมาสูงกว่าเดิม' },
    ],
  },
  {
    id: 'guid-peg', track: 2, order: 2, mode: 'engineer', domains: [4, 6], tags: ['G01', 'PEG', 'IGM'],
    title: { en: 'PEG and IGM', ru: 'PEG и IGM', th: 'PEG และ IGM' },
    brief: {
      en: 'Falcon 9 carries 18.8 t to 500 km, and one of its first-stage engines will fail at T+80 s. With the standard guidance the second stage runs dry short of the target. Keep the failure and the payload; choose an explicit upper-stage guidance — PEG, the Space Shuttle\'s, or IGM, Saturn V\'s — and reach the target orbit.',
      ru: 'Falcon 9 выводит 18,8 т на высоту 500 км, и на T+80 с откажет один из двигателей первой ступени. Со стандартным наведением вторая ступень вырабатывает топливо, не дойдя до цели. Отказ и полезная нагрузка остаются; выберите явное наведение верхней ступени — PEG («Спейс шаттл») или IGM (Saturn V) — и выйдите на целевую орбиту.',
      th: 'Falcon 9 นำสัมภาระ 18.8 ตันไปที่ 500 กม. และเครื่องยนต์หนึ่งของขั้นที่หนึ่งจะดับที่ T+80 วินาที ด้วยการนำวิถีมาตรฐาน ขั้นที่สองจะหมดเชื้อเพลิงก่อนถึงเป้าหมาย คงความผิดปกติและสัมภาระไว้ แล้วเลือกการนำวิถีขั้นบนแบบชัดแจ้ง ได้แก่ PEG ของกระสวยอวกาศ หรือ IGM ของ Saturn V เพื่อเข้าสู่วงโคจรเป้าหมาย',
    },
    debrief: {
      en: 'An explicit law solves, every cycle, for the steering that reaches the cut-off state with the stages and propellant that are really left, and re-solves as they change. After the engine out it spends the second stage\'s propellant on exactly the orbit asked for: about 40 m/s left over, where the standard steering ran short. PEG carries the velocity still to gain from cycle to cycle; IGM solves in a frame at the predicted cut-off point.',
      ru: 'Явный закон на каждом цикле заново решает задачу: какое управление приведёт к заданному состоянию на момент выключения с теми ступенями и топливом, что реально остались. После отказа двигателя он расходует топливо второй ступени точно на заданную орбиту: остаётся около 40 м/с, тогда как стандартному управлению топлива не хватило. PEG переносит от цикла к циклу требуемое приращение скорости; IGM решает задачу в системе координат, связанной с прогнозируемой точкой выключения.',
      th: 'กฎการนำวิถีแบบชัดแจ้งคำนวณใหม่ทุกรอบว่าต้องบังคับทิศอย่างไรจึงจะไปถึงสภาวะ ณ เวลาดับเครื่องด้วยขั้นและเชื้อเพลิงที่เหลืออยู่จริง และคำนวณใหม่เมื่อสิ่งเหล่านี้เปลี่ยน หลังเครื่องยนต์ดับ จึงใช้เชื้อเพลิงของขั้นที่สองสำหรับวงโคจรที่ต้องการพอดี เหลือประมาณ 40 ม./วินาที ในขณะที่การบังคับทิศมาตรฐานเชื้อเพลิงไม่พอ PEG ส่งต่อความเร็วที่ยังต้องเพิ่มจากรอบหนึ่งไปอีกรอบ ส่วน IGM แก้ปัญหาในกรอบอ้างอิงที่จุดดับเครื่องที่คาดการณ์',
    },
    mission: missionDoc({
      vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 18800, orbitId: 'leo',
      failure: { ...DEFAULT_FAILURE, mode: 'engineOut', time: 80, stage: 0 }, dynamics: { ...POINT_MASS },
    }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model'],
    criteria: [
      { id: 'orbit', kind: 'outcome', is: 'target' },
      {
        id: 'explicit', kind: 'event', key: 'evt.guidanceEngaged', present: true,
        label: { en: 'Explicit guidance took over', ru: 'Явное наведение включилось', th: 'การนำวิถีแบบชัดแจ้งรับช่วงควบคุม' },
      },
      { id: 'dv', kind: 'measure', measure: 'dvLeft', min: 20 },
    ],
    hints: [
      { en: 'The setting is in the Engineer mode\'s setup: Ascent guidance: PEG and IGM → Upper-stage guidance.', ru: 'Настройка — в режиме «Инженер»: «Наведение на участке выведения: PEG и IGM» → «Наведение верхних ступеней».', th: 'ค่านี้อยู่ในการตั้งค่าของโหมดวิศวกร: การนำทางขาขึ้น: PEG และ IGM → การนำทางของขั้นบน' },
      { en: 'Either law works; the event log says when it took over and how long it expected to burn (t_go).', ru: 'Подходит любой закон; журнал событий покажет, когда он включился и сколько, по его расчёту, осталось работать (t_go).', th: 'ใช้กฎใดก็ได้ บันทึกเหตุการณ์จะบอกว่ารับช่วงเมื่อใดและคาดว่าจะเผาไหม้อีกนานเท่าใด (t_go)' },
      { en: 'Compare the Δv left at the end with and without it: the difference is what the standard steering wasted.', ru: 'Сравните остаток Δv в конце с явным наведением и без него: разница — то, что стандартное управление потратило впустую.', th: 'เปรียบเทียบ Δv ที่เหลือตอนท้ายเมื่อใช้และไม่ใช้ ผลต่างคือสิ่งที่การบังคับทิศมาตรฐานสิ้นเปลืองไป' },
    ],
  },
  {
    id: 'guid-nav', track: 2, order: 3, mode: 'engineer', domains: [4, 6], tags: ['G02', 'INS'],
    title: { en: 'Inertial navigation without GNSS', ru: 'Инерциальная навигация без ГНСС', th: 'การนำทางเฉื่อยโดยไม่มี GNSS' },
    brief: {
      en: 'Six-DOF Falcon 9. The satellite navigation receiver is out for the whole ascent: the navigation has only its inertial unit, and the one fitted is a cheap MEMS unit. Keep the navigation\'s position error within 500 m up to the first stage\'s cut-off (MECO). GNSS stays off; choose the inertial unit.',
      ru: 'Falcon 9 в шестистепенной модели. Приёмник спутниковой навигации не работает на всём участке выведения: у навигационной системы есть только инерциальный блок, и установлен дешёвый МЭМС-блок. Удержите ошибку навигации по положению в пределах 500 м до выключения первой ступени (MECO). ГНСС остаётся выключенной; выберите инерциальный блок.',
      th: 'Falcon 9 แบบหกองศาอิสระ เครื่องรับนำทางด้วยดาวเทียมใช้ไม่ได้ตลอดการไต่ระดับ ระบบนำทางมีเพียงหน่วยวัดเฉื่อย และที่ติดตั้งไว้เป็นหน่วย MEMS ราคาถูก จงรักษาความคลาดเคลื่อนตำแหน่งของระบบนำทางให้อยู่ภายใน 500 ม. จนถึงการดับเครื่องขั้นที่หนึ่ง (MECO) ให้ GNSS ปิดอยู่เหมือนเดิม และเลือกหน่วยวัดเฉื่อย',
    },
    debrief: {
      en: 'Without fixes, an accelerometer bias b grows into a position error of ½bt² and a gyro error tilts the whole navigation frame, so the error grows faster than linearly: at MECO about 1.7 km with the MEMS unit, 0.3 km with a tactical fibre-optic unit, a few tens of metres with navigation-grade ring-laser gyros. With GNSS the Kalman filter holds all three to metres.',
      ru: 'Без внешних коррекций смещение нуля акселерометра b даёт ошибку положения ½bt², а ошибка гироскопа наклоняет весь навигационный базис, поэтому ошибка растёт быстрее линейной: к MECO — около 1,7 км с МЭМС-блоком, 0,3 км с тактическим волоконно-оптическим и несколько десятков метров с навигационными лазерными гироскопами. С ГНСС фильтр Калмана удерживает все три в пределах метров.',
      th: 'หากไม่มีการแก้ไขจากภายนอก ไบแอสของมาตรความเร่ง b จะกลายเป็นความคลาดเคลื่อนตำแหน่ง ½bt² และความคลาดของไจโรทำให้กรอบนำทางทั้งหมดเอียง ความคลาดเคลื่อนจึงโตเร็วกว่าเชิงเส้น ที่ MECO ประมาณ 1.7 กม. สำหรับ MEMS 0.3 กม. สำหรับไจโรใยแก้วนำแสงเกรดยุทธวิธี และไม่กี่สิบเมตรสำหรับไจโรเลเซอร์เกรดนำทาง เมื่อมี GNSS ตัวกรองคาลมานรักษาทั้งสามไว้ในระดับเมตร',
    },
    mission: missionDoc({
      vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 10000, orbitId: 'leo',
      dynamics: { ...SIX_DOF, navigation: { grade: 'mems', gnss: false } },
    }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model', 'setup.guidance'],
    endEvent: 'evt.meco',
    criteria: [
      {
        id: 'gnss', kind: 'hook', hook: 'gnssOff',
        label: { en: 'No satellite navigation', ru: 'Без спутниковой навигации', th: 'ไม่มีการนำทางด้วยดาวเทียม' },
      },
      { id: 'error', kind: 'measure', measure: 'nav.positionError', max: 500 },
      { id: 'flying', kind: 'outcome', is: 'survived' },
    ],
    hints: [
      { en: 'Navigation (INS / GNSS) → IMU grade. The telemetry shows the position error as it grows.', ru: '«Навигация (БИНС / ГНСС)» → «Класс БИНС». Телеметрия показывает, как растёт ошибка положения.', th: 'การนำร่อง (INS / GNSS) → เกรดของ IMU ข้อมูลทางไกลแสดงความคลาดเคลื่อนตำแหน่งขณะที่โตขึ้น' },
      { en: 'A bias of 0.001 g held for 150 s alone gives ½·0.0098·150² ≈ 110 m; MEMS accelerometers are far worse than that.', ru: 'Одно лишь смещение 0,001 g за 150 с даёт ½·0,0098·150² ≈ 110 м; у МЭМС-акселерометров оно намного больше.', th: 'ไบแอส 0.001 g เพียงอย่างเดียวนาน 150 วินาทีให้ ½·0.0098·150² ≈ 110 ม. มาตรความเร่ง MEMS แย่กว่านั้นมาก' },
      { en: 'The tactical grade is enough; the navigation grade is better still — and dearer.', ru: 'Тактического класса достаточно; навигационный — ещё лучше, но и дороже.', th: 'เกรดยุทธวิธีเพียงพอ เกรดนำทางดียิ่งกว่า แต่แพงกว่าด้วย' },
    ],
  },
  {
    id: 'guid-monte-carlo', track: 2, order: 4, mode: 'engineer', domains: [4, 3], tags: ['G05', 'P08', '3σ'],
    title: { en: 'Monte Carlo 3σ', ru: 'Метод Монте-Карло, 3σ', th: 'มอนติคาร์โล 3σ' },
    brief: {
      en: 'How accurately does Falcon 9 put 10 t into a 500 km orbit when its engines, masses and air are not exactly the book\'s? In the setup, open the Monte Carlo window and fly 20 runs with seed 1. Look at the spread and its 3σ ellipse; then click the run whose perigee lies farthest from the target to fly it on its own, fly it to the end, and type in its perigee and how far that is from the target\'s 500 km.',
      ru: 'Насколько точно Falcon 9 выводит 10 т на орбиту 500 км, если тяга, массы и атмосфера не совпадают с расчётными? В настройках откройте окно Монте-Карло и выполните 20 прогонов с зерном 1. Посмотрите на разброс и эллипс 3σ; затем щёлкните прогон, перигей которого дальше всех от целевого, чтобы выполнить его отдельно, проведите полёт до конца и введите его перигей и отклонение от целевых 500 км.',
      th: 'Falcon 9 ส่ง 10 ตันเข้าวงโคจร 500 กม. ได้แม่นยำเพียงใด เมื่อเครื่องยนต์ มวล และอากาศไม่ตรงกับค่าตามตำรา ในการตั้งค่า เปิดหน้าต่างมอนติคาร์โลแล้วบิน 20 รอบด้วยค่าเมล็ด 1 ดูการกระจายและวงรี 3σ จากนั้นคลิกรอบที่จุดใกล้โลกห่างจากเป้าหมายมากที่สุดเพื่อบินรอบนั้นเดี่ยว ๆ บินให้จบ แล้วพิมพ์จุดใกล้โลกของรอบนั้นและระยะที่ห่างจากเป้าหมาย 500 กม.',
    },
    debrief: {
      en: 'Each run drew its own thrust, Isp, propellant and dry mass per stage, the air\'s density and wind: the spread of the orbits is the insertion\'s accuracy, and 3σ is what a launch contract quotes — about 99 % of flights inside the ellipse (98.9 % for two elements together). The run you flew alone is that run exactly: the same draws from the same stream, so any flight of the set can be watched, replayed and understood one at a time.',
      ru: 'Каждый прогон выбрал свои тягу, удельный импульс, запас топлива и сухую массу ступеней, плотность воздуха и ветер: разброс орбит и есть точность выведения, а 3σ — то, что указывают в контракте на запуск: около 99 % полётов внутри эллипса (98,9 % для двух элементов вместе). Выполненный вами отдельно прогон — это в точности тот же прогон: те же случайные величины из того же потока, поэтому любой полёт набора можно посмотреть, воспроизвести и разобрать по отдельности.',
      th: 'แต่ละรอบสุ่มแรงขับ Isp เชื้อเพลิง และมวลแห้งของแต่ละขั้น รวมทั้งความหนาแน่นอากาศและลมของตัวเอง การกระจายของวงโคจรคือความแม่นยำของการส่งเข้าวงโคจร และ 3σ คือค่าที่ระบุในสัญญาการส่งดาวเทียม ครอบคลุมราว 99% ของเที่ยวบินภายในวงรี (98.9% สำหรับสององค์ประกอบพร้อมกัน) รอบที่คุณบินเดี่ยวคือรอบเดียวกันทุกประการ ค่าสุ่มชุดเดียวกันจากลำดับเดียวกัน จึงดู เล่นซ้ำ และทำความเข้าใจเที่ยวบินใดในชุดทีละเที่ยวได้',
    },
    mission: missionDoc({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 10000, orbitId: 'leo', dynamics: { ...SIX_DOF } }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model', 'setup.guidance', 'setup.boosterRecovery'],
    criteria: [
      {
        id: 'run', kind: 'hook', hook: 'dispersedRun', params: { seed: 1 },
        label: { en: 'A run of the set seeded 1, flown on its own', ru: 'Прогон набора с зерном 1, выполненный отдельно', th: 'รอบหนึ่งของชุดค่าเมล็ด 1 ที่บินเดี่ยว' },
      },
      { id: 'orbit', kind: 'outcome', is: 'orbit' },
      {
        id: 'perigee', kind: 'answer', measure: 'orbit.perigee', tol: 1, unit: 'km',
        prompt: { en: 'The perigee of your run (km)', ru: 'Перигей вашего прогона (км)', th: 'จุดใกล้โลกของรอบที่คุณบิน (กม.)' },
      },
      {
        id: 'miss', kind: 'answer', measure: 'orbit.perigeeMiss', tol: 1, unit: 'km',
        prompt: { en: 'How far it is from the target\'s perigee, below it negative (km)', ru: 'Отклонение от целевого перигея, вниз — со знаком минус (км)', th: 'ห่างจากจุดใกล้โลกเป้าหมายเท่าใด ถ้าต่ำกว่าให้ติดลบ (กม.)' },
      },
    ],
    hints: [
      { en: 'Setup → Monte Carlo: insertion accuracy → Open the Monte Carlo window. Runs 20, seed 1, the default dispersions; Start. It takes a few minutes.', ru: 'Настройка → «Монте-Карло: точность выведения» → открыть окно. 20 прогонов, зерно 1, разбросы по умолчанию; «Старт». Это займёт несколько минут.', th: 'การตั้งค่า → มอนติคาร์โล: ความแม่นยำการเข้าวงโคจร → เปิดหน้าต่าง ตั้ง 20 รอบ ค่าเมล็ด 1 และค่าการกระจายเริ่มต้น แล้วกดเริ่ม ใช้เวลาไม่กี่นาที' },
      { en: 'On the scatter, perigee runs left to right: the point farthest from the + (the target) along it is the run. Its tooltip gives its perigee; a click puts it in the setup panel.', ru: 'На диаграмме перигей откладывается слева направо: нужный прогон — точка, дальше всех от «+» (цели) по этой оси. Подсказка показывает его перигей; щелчок переносит прогон в настройку.', th: 'บนกราฟ จุดใกล้โลกอยู่บนแกนแนวนอน รอบที่ต้องการคือจุดที่ห่างจากเครื่องหมาย + (เป้าหมาย) มากที่สุดตามแกนนั้น ป้ายข้อมูลแสดงจุดใกล้โลกของรอบนั้น และการคลิกจะนำรอบนั้นเข้าแผงตั้งค่า' },
      { en: 'Launch it and let it fly to the end of the mission; the perigee is read there, the same way the window reads it.', ru: 'Запустите и доведите полёт до конца задачи; перигей определяется там же и так же, как в окне.', th: 'ปล่อยจรวดและปล่อยให้บินจนจบภารกิจ จุดใกล้โลกอ่านค่าที่นั่น ด้วยวิธีเดียวกับในหน้าต่าง' },
    ],
  },
];
