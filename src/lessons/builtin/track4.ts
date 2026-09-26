/**
 * Track 4, attitude control (roadmap E03): reading the autopilot's loop at
 * max-Q, tuning it to margins, a step test in flight, and the bending mode
 * against the notch filter. All six-DOF Falcon 9; the solutions are flown in
 * tests/heavy/lessons-sixdof.test.ts, the short wrong flights in
 * tests/lessons.test.ts.
 */
import { missionDoc } from './common';

const SIX_DOF = { model: 'sixDof', wind: 'calm', seed: 20260919 } as const;
const LOCKED = ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model', 'setup.guidance'];
const falcon9 = (dynamics: Record<string, unknown> = {}) =>
  missionDoc({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 10000, orbitId: 'leo', dynamics: { ...SIX_DOF, ...dynamics } });

export const TRACK4: readonly unknown[] = [
  {
    id: 'ctl-inspector', track: 4, order: 1, mode: 'engineer', domains: [5], tags: ['G03', 'ω_c', 'Δφ'],
    title: { en: 'Reading the control loop', ru: 'Анализ контура управления', th: 'อ่านลูปควบคุม' },
    brief: {
      en: 'Six-DOF Falcon 9 with its own autopilot. Fly through max-Q, then open the attitude-loop inspector at the moment of max-Q and read the pitch loop\'s crossover frequency and phase margin off its Bode plot.',
      ru: 'Falcon 9 в шестистепенной модели со штатным автоматом стабилизации. Пройдите участок максимального скоростного напора, затем откройте инспектор контура стабилизации в момент max-Q и определите по ЛАЧХ и ЛФЧХ частоту среза и запас по фазе канала тангажа.',
      th: 'Falcon 9 แบบหกองศาอิสระพร้อมระบบรักษาท่าทางของตัวเอง บินผ่าน max-Q แล้วเปิดตัวตรวจลูปควบคุมท่าทางที่ช่วงเวลา max-Q อ่านความถี่ครอสโอเวอร์และเฟสมาร์จินของลูปพิตช์จาก Bode plot',
    },
    debrief: {
      en: 'At max-Q the air turns an unstable rocket fastest, and the loop must still answer with margin: here a crossover near 3 rad/s and a phase margin near 45°. The gain margin is large at the top; the one that matters for a flexible vehicle is at the bending frequency, which the notch filter guards.',
      ru: 'На максимальном напоре воздух сильнее всего разворачивает статически неустойчивую ракету, и контур должен отвечать с запасом: здесь частота среза около 3 рад/с и запас по фазе около 45°. Запас по амплитуде сверху велик; для упругой ракеты важен запас на частоте изгибного тона, который защищает режекторный фильтр.',
      th: 'ที่ max-Q อากาศหมุนจรวดที่ไม่เสถียรได้เร็วที่สุด ลูปยังต้องตอบสนองโดยมีค่าเผื่อ ในที่นี้ความถี่ครอสโอเวอร์ราว 3 rad/s และเฟสมาร์จินราว 45° เกนมาร์จินด้านบนมีมาก แต่สำหรับจรวดที่ยืดหยุ่น ค่าที่สำคัญคือที่ความถี่การดัดโค้ง ซึ่งฟิลเตอร์นอตช์คอยปกป้อง',
    },
    mission: falcon9(),
    locked: [...LOCKED, 'setup.boosterRecovery'],
    endEvent: 'evt.maxQ',
    criteria: [
      { id: 'flying', kind: 'outcome', is: 'survived' },
      {
        id: 'wc', kind: 'answer', measure: 'loop.wcAtMaxQ', tolPct: 10, unit: 'rad/s',
        prompt: { en: 'Pitch crossover frequency at max-Q (rad/s)', ru: 'Частота среза канала тангажа на max-Q (рад/с)', th: 'ความถี่ครอสโอเวอร์ของพิตช์ที่ max-Q (rad/s)' },
      },
      {
        id: 'pm', kind: 'answer', measure: 'loop.pmAtMaxQ', tolPct: 10, unit: '°',
        prompt: { en: 'Pitch phase margin at max-Q (°)', ru: 'Запас по фазе канала тангажа на max-Q (°)', th: 'เฟสมาร์จินของพิตช์ที่ max-Q (°)' },
      },
    ],
    hints: [
      { en: 'The attitude-loop inspector is in the Engineer mode\'s 6-DOF panel; move the replay to the max-Q event and pick the pitch plane.', ru: 'Инспектор контура стабилизации — на панели 6-DOF режима «Инженер»; переведите воспроизведение на событие max-Q и выберите канал тангажа.', th: 'ตัวตรวจลูปควบคุมท่าทางอยู่ในแผง 6-DOF ของโหมดวิศวกร เลื่อนการเล่นซ้ำไปที่เหตุการณ์ max-Q แล้วเลือกระนาบพิตช์' },
      { en: 'The crossover is where the open loop\'s magnitude crosses 0 dB.', ru: 'Частота среза — там, где ЛАЧХ разомкнутого контура пересекает 0 дБ.', th: 'ความถี่ครอสโอเวอร์คือจุดที่ขนาดของลูปเปิดตัด 0 dB' },
      { en: 'The phase margin is 180° plus the phase at the crossover.', ru: 'Запас по фазе — 180° плюс фаза на частоте среза.', th: 'เฟสมาร์จินคือ 180° บวกเฟสที่ความถี่ครอสโอเวอร์' },
    ],
  },
  {
    id: 'ctl-margins', track: 4, order: 2, mode: 'engineer', domains: [5], tags: ['G04', 'K_θ', 'K_ω'],
    title: { en: 'Gains with margins', ru: 'Коэффициенты с запасами', th: 'ปรับเกนให้มีค่าเผื่อ' },
    brief: {
      en: 'Someone has tuned this Falcon 9\'s pitch–yaw autopilot for speed: an attitude gain K_θ of 4 and a rate gain K_ω of only 1.5. At max-Q its phase margin is under 20°. Retune the pitch–yaw gains so that at max-Q the pitch loop has at least 30° of phase margin and 6 dB of gain margin, and fly through it.',
      ru: 'Кто-то настроил автомат стабилизации этого Falcon 9 по тангажу и рысканию на быстродействие: K_θ = 4 и всего K_ω = 1,5. На максимальном напоре запас по фазе меньше 20°. Перенастройте коэффициенты канала тангажа–рыскания так, чтобы на max-Q запас по фазе был не менее 30°, а по амплитуде — не менее 6 дБ, и пройдите этот участок.',
      th: 'มีคนปรับระบบรักษาท่าทางช่องพิตช์–ยอว์ของ Falcon 9 ลำนี้ให้ตอบสนองเร็ว โดยเกนท่าทาง K_θ = 4 และเกนอัตรา K_ω เพียง 1.5 ที่ max-Q เฟสมาร์จินต่ำกว่า 20° จงปรับเกนพิตช์–ยอว์ใหม่ให้ที่ max-Q ลูปพิตช์มีเฟสมาร์จินอย่างน้อย 30° และเกนมาร์จินอย่างน้อย 6 dB แล้วบินผ่าน',
    },
    debrief: {
      en: 'The attitude gain sets how fast the loop wants to turn, the rate gain how hard it damps the turn. Much attitude gain with little rate gain pushes the crossover to where the vehicle and the actuators lag most, and the phase margin collapses. The default 1.5 / 3 gives about 46°. The inspector\'s tuning tab searches for gains the same way.',
      ru: 'Коэффициент по углу задаёт, насколько быстро контур стремится развернуть ракету, коэффициент по скорости — насколько сильно он демпфирует поворот. Большой K_θ при малом K_ω смещает частоту среза туда, где запаздывание ракеты и приводов наибольшее, и запас по фазе падает. Штатные 1,5 / 3 дают около 46°. Вкладка настройки инспектора ищет коэффициенты так же.',
      th: 'เกนท่าทางกำหนดว่าลูปต้องการหมุนเร็วเพียงใด เกนอัตรากำหนดว่าหน่วงการหมุนแรงเพียงใด เกนท่าทางมากแต่เกนอัตราน้อยจะดันความถี่ครอสโอเวอร์ไปยังช่วงที่จรวดและตัวขับเร้าล่าช้ามากที่สุด เฟสมาร์จินจึงลดฮวบ ค่าเริ่มต้น 1.5 / 3 ให้ประมาณ 46° แท็บปรับจูนของตัวตรวจลูปค้นหาเกนด้วยวิธีเดียวกัน',
    },
    mission: falcon9({ control: { pitchYaw: { attitudeGain: 4, rateGain: 1.5 } } }),
    locked: [...LOCKED, 'setup.boosterRecovery'],
    endEvent: 'evt.maxQ',
    criteria: [
      { id: 'pm', kind: 'measure', measure: 'loop.pmAtMaxQ', min: 30 },
      { id: 'gm', kind: 'measure', measure: 'loop.gmAtMaxQ', min: 6 },
      { id: 'flying', kind: 'outcome', is: 'survived' },
    ],
    hints: [
      { en: 'Attitude autopilot → Pitch–yaw: attitude gain K_θ and rate gain K_ω.', ru: '«Автомат стабилизации» → «Тангаж–рыскание»: коэффициенты K_θ и K_ω.', th: 'ระบบรักษาท่าทางอัตโนมัติ → พิตช์–ยอว์: เกนท่าทาง K_θ และเกนอัตรา K_ω' },
      { en: 'More rate gain adds damping; less attitude gain moves the crossover down, where the lags are smaller.', ru: 'Больший K_ω добавляет демпфирование; меньший K_θ смещает частоту среза вниз, где запаздывания меньше.', th: 'เพิ่มเกนอัตราเพื่อเพิ่มความหน่วง ลดเกนท่าทางเพื่อเลื่อนครอสโอเวอร์ลงไปยังช่วงที่ความล่าช้าน้อยกว่า' },
      { en: 'The default 1.5 and 3 pass; 3 and 3 falls just short.', ru: 'Штатные 1,5 и 3 проходят; 3 и 3 немного не дотягивают.', th: 'ค่าเริ่มต้น 1.5 และ 3 ผ่าน ส่วน 3 และ 3 ขาดไปเล็กน้อย' },
    ],
  },
  {
    id: 'ctl-step', track: 4, order: 3, mode: 'engineer', domains: [5], tags: ['E04', 'σ'],
    title: { en: 'A step test in flight', ru: 'Ступенчатое воздействие в полёте', th: 'การทดสอบแบบขั้นในการบิน' },
    brief: {
      en: 'This Falcon 9\'s pitch–yaw autopilot is tuned for speed (K_θ 4, K_ω 1.5). Test it in flight: at about T+65 s, just past max-Q, command a 2° pitch step held for 8 s from the attitude-loop inspector\'s flight test, and read its overshoot — about 12 %. Retune the pitch–yaw gains so that the step overshoots by no more than 6 %, fly the test again, and type in the overshoot you measured.',
      ru: 'Автомат стабилизации этого Falcon 9 по тангажу и рысканию настроен на быстродействие (K_θ = 4, K_ω = 1,5). Испытайте его в полёте: около T+65 с, сразу после max-Q, подайте из раздела лётных испытаний инспектора контура ступенчатую команду 2° по тангажу длительностью 8 с и определите перерегулирование — около 12 %. Перенастройте коэффициенты тангажа–рыскания так, чтобы перерегулирование было не больше 6 %, повторите испытание и введите измеренное перерегулирование.',
      th: 'ระบบรักษาท่าทางช่องพิตช์–ยอว์ของ Falcon 9 ลำนี้ปรับไว้ให้ตอบสนองเร็ว (K_θ 4, K_ω 1.5) จงทดสอบระหว่างบิน ที่ประมาณ T+65 วินาที หลังผ่าน max-Q สั่งคำสั่งขั้นพิตช์ 2° ค้างไว้ 8 วินาที จากส่วนทดสอบการบินของตัวตรวจลูป แล้วอ่านโอเวอร์ชูต ซึ่งประมาณ 12% จงปรับเกนพิตช์–ยอว์ใหม่ให้โอเวอร์ชูตไม่เกิน 6% บินทดสอบอีกครั้ง แล้วพิมพ์ค่าโอเวอร์ชูตที่วัดได้',
    },
    debrief: {
      en: 'A step in flight shows what the margins predict: much attitude gain with little rate gain, little damping, an overshoot. Raising the rate gain K_ω or lowering the attitude gain K_θ damps the answer; the default 1.5 / 3 barely overshoots. The flown response also carries what the linear model leaves out — rate and gimbal limits, the air changing as the rocket climbs — which is why a flight test is flown at all.',
      ru: 'Ступенчатое воздействие в полёте показывает то, что предсказывают запасы: большой K_θ при малом K_ω — мало демпфирования и перерегулирование. Увеличение K_ω или уменьшение K_θ демпфирует реакцию; штатные 1,5 / 3 почти не дают перерегулирования. В реальном полёте на реакцию влияет и то, чего нет в линейной модели, — ограничения скорости и отклонения сопла, изменение атмосферы по мере подъёма; именно поэтому лётные испытания и проводят.',
      th: 'การทดสอบขั้นระหว่างบินแสดงสิ่งที่มาร์จินทำนายไว้ เกนท่าทางมากแต่เกนอัตราน้อยทำให้หน่วงน้อยและเกิดโอเวอร์ชูต การเพิ่มเกนอัตรา K_ω หรือลดเกนท่าทาง K_θ ช่วยหน่วงการตอบสนอง ค่าเริ่มต้น 1.5 / 3 แทบไม่มีโอเวอร์ชูต การตอบสนองจริงยังรวมสิ่งที่แบบจำลองเชิงเส้นไม่มี เช่น ขีดจำกัดอัตราและมุมหัวฉีด และอากาศที่เปลี่ยนไปเมื่อจรวดไต่ระดับ จึงต้องมีการทดสอบการบินจริง',
    },
    mission: falcon9({ control: { pitchYaw: { attitudeGain: 4, rateGain: 1.5 } } }),
    locked: [...LOCKED, 'setup.boosterRecovery'],
    endEvent: 'evt.meco',
    criteria: [
      { id: 'overshoot', kind: 'measure', measure: 'step.overshoot', max: 6 },
      { id: 'flying', kind: 'outcome', is: 'survived' },
      {
        id: 'overshoot-read', kind: 'answer', measure: 'step.overshoot', tol: 3, unit: '%',
        prompt: { en: 'The overshoot of your step (%)', ru: 'Перерегулирование вашего ступенчатого воздействия (%)', th: 'โอเวอร์ชูตของการทดสอบขั้นของคุณ (%)' },
      },
    ],
    hints: [
      { en: 'Attitude-loop inspector → flight test: pitch, a step of 2°, held 8 s. Press it at about T+65 s; the last step flown before MECO is graded.', ru: 'Инспектор контура стабилизации → лётные испытания: тангаж, ступенька 2°, 8 с. Нажмите около T+65 с; оценивается последнее воздействие до MECO.', th: 'ตัวตรวจลูปควบคุมท่าทาง → ทดสอบการบิน: พิตช์ ขั้น 2° ค้าง 8 วินาที กดที่ประมาณ T+65 วินาที ระบบจะให้คะแนนการทดสอบขั้นครั้งสุดท้ายก่อน MECO' },
      { en: 'The overshoot is the first peak above the commanded 2°, as a share of it.', ru: 'Перерегулирование — превышение первым максимумом заданных 2°, в процентах от них.', th: 'โอเวอร์ชูตคือยอดแรกที่เกิน 2° ที่สั่ง คิดเป็นร้อยละของ 2°' },
      { en: 'Attitude autopilot → Pitch–yaw: more K_ω or less K_θ. The default 1.5 and 3 overshoot hardly at all.', ru: '«Автомат стабилизации» → «Тангаж–рыскание»: больше K_ω или меньше K_θ. Штатные 1,5 и 3 почти не дают перерегулирования.', th: 'ระบบรักษาท่าทางอัตโนมัติ → พิตช์–ยอว์: เพิ่ม K_ω หรือลด K_θ ค่าเริ่มต้น 1.5 และ 3 แทบไม่มีโอเวอร์ชูต' },
    ],
  },
  {
    id: 'ctl-notch', track: 4, order: 4, mode: 'engineer', domains: [5, 6], tags: ['P05', 'notch'],
    title: { en: 'Bending and the notch filter', ru: 'Упругие колебания и режекторный фильтр', th: 'การโค้งงอและตัวกรองน็อตช์' },
    brief: {
      en: 'This Falcon 9 is flown as the long, flexible body it is: its first bending mode is on. Without a filter the autopilot feeds the bending back into the nozzle and the vehicle breaks up within seconds. Keep the bending on; make the autopilot flexible-aware so that the rocket flies through max-Q.',
      ru: 'Этот Falcon 9 моделируется как длинное упругое тело: первый изгибный тон включён. Без фильтра автомат стабилизации подаёт изгибные колебания обратно на сопло, и ракета разрушается за считанные секунды. Изгиб оставьте включённым; сделайте автомат стабилизации учитывающим упругость, чтобы ракета прошла max-Q.',
      th: 'Falcon 9 ลำนี้จำลองเป็นลำตัวยาวที่ยืดหยุ่น โหมดการดัดโค้งแรกเปิดอยู่ หากไม่มีตัวกรอง ระบบรักษาท่าทางจะป้อนการดัดโค้งกลับเข้าหัวฉีด และจรวดแตกภายในไม่กี่วินาที ให้เปิดการดัดโค้งไว้ แล้วทำให้ระบบรักษาท่าทางรองรับความยืดหยุ่นเพื่อให้จรวดบินผ่าน max-Q',
    },
    debrief: {
      en: 'The inertial unit sits on a bending body, so it measures the bending as well as the rigid motion. At the bending frequency the loop\'s gain is still above one and its phase wrong: the autopilot pumps the mode until the shell\'s load passes its limit. The notch removes that frequency from the feedback, and the flexible-vehicle autopilot keeps its bandwidth well below it.',
      ru: 'Инерциальный блок стоит на изгибающемся корпусе и измеряет не только движение твёрдого тела, но и изгиб. На частоте изгибного тона коэффициент усиления контура ещё больше единицы, а фаза неблагоприятна: автомат раскачивает тон, пока нагрузка на корпус не превысит предел. Режекторный фильтр убирает эту частоту из обратной связи, а автомат для упругой ракеты держит полосу пропускания намного ниже неё.',
      th: 'หน่วยวัดเฉื่อยติดอยู่บนลำตัวที่ดัดโค้ง จึงวัดการดัดโค้งไปพร้อมกับการเคลื่อนที่ของวัตถุแข็งเกร็ง ที่ความถี่การดัดโค้ง เกนของลูปยังมากกว่าหนึ่งและเฟสผิด ระบบจึงขยายโหมดนั้นจนภาระบนเปลือกเกินขีดจำกัด ตัวกรองน็อตช์ตัดความถี่นั้นออกจากการป้อนกลับ และระบบสำหรับจรวดยืดหยุ่นรักษาแบนด์วิดท์ให้ต่ำกว่าความถี่นั้นมาก',
    },
    mission: falcon9({ flex: { bending: true } }),
    locked: [...LOCKED, 'setup.boosterRecovery'],
    endEvent: 'evt.maxQ',
    criteria: [
      { id: 'bending', kind: 'hook', hook: 'bendingOn', label: { en: 'Bending modelled', ru: 'Изгиб учитывается', th: 'จำลองการดัดโค้ง' } },
      { id: 'intact', kind: 'event', key: 'evt.bendingFailure', present: false, label: { en: 'No bending breakup', ru: 'Нет разрушения от изгиба', th: 'ไม่แตกจากการดัดโค้ง' } },
      { id: 'flying', kind: 'outcome', is: 'survived' },
    ],
    hints: [
      { en: 'Flexible vehicle: slosh and bending — the second switch.', ru: '«Упругая ракета: колебания топлива и изгиб» — второй переключатель.', th: 'จรวดที่ยืดหยุ่น: การกระฉอกของเชื้อเพลิงและการดัดโค้ง — สวิตช์ที่สอง' },
      { en: 'The telemetry shows the bending deflection and the load ratio; above 100 % the shell fails.', ru: 'Телеметрия показывает прогиб и коэффициент нагрузки; выше 100 % корпус разрушается.', th: 'ข้อมูลทางไกลแสดงการโก่งและอัตราส่วนภาระ เกิน 100% เปลือกจะเสียหาย' },
      { en: 'Turn on the bending filter (notch and flexible-vehicle autopilot) and launch again.', ru: 'Включите фильтр изгибных колебаний (режекторный фильтр и автомат для упругой ракеты) и запустите снова.', th: 'เปิดฟิลเตอร์การดัดโค้ง (ฟิลเตอร์นอตช์และระบบสำหรับจรวดยืดหยุ่น) แล้วปล่อยใหม่' },
    ],
  },
];
