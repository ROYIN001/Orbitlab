/**
 * Pack: the Russian speciality 24.05.06 «Системы управления летательными
 * аппаратами» (roadmap T03; the T03 research's §6, lessons S1–S5). The codes
 * are the general professional competences of the federal standard (ФГОС ВО
 * 3++, Order No. 874 of 4 Aug 2020, as amended 27 Feb 2023), and ОПК-6 of
 * the companion standard 24.05.04 for the ballistic cases. A military
 * academy's professional competences are set by the Ministry of Defence and
 * are not public (the standard's §3.4); the Mozhaisky Academy's own
 * programme was not found, so the pack follows the standard and the civilian
 * discipline lists (MAI department С-12, Bauman Mytishchi department К1).
 * Military content: public, cited sources only (owner ruling). Russian texts
 * use ГОСТ 20058-80 notation, as the app does in Russian (U07).
 *
 * S1–S3 fly six-DOF (S3 uncrewed, see `soyuzUncrewed`): their worked solutions are in
 * tests/heavy/lesson-packs-sixdof.test.ts, run by hand. S4 is built-in
 * lesson 2.4, S5 built-in 6.2 and 6.3, by reference. S6 (the design kind)
 * comes in a later stage.
 */
import { orbitById } from '../../data/orbits';
import { ALL_LOCKS, SIX_DOF, missionDoc, windowAfter, type PackSource } from './common';

/** S1–S3's flight: the accepted six-DOF reference, a crewed Soyuz to the station's plane, in the window. */
const soyuz = (dynamics: object) => missionDoc({
  vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', payloadMass: 7150, orbitId: 'iss',
  launchTime: windowAfter('iss', 'baikonur'), dynamics: { ...SIX_DOF, ...dynamics },
});

/**
 * S3's flight: the same Soyuz uncrewed, 7.15 t of small satellites to the
 * 200 × 420 km ellipse its third stage leaves in the station's plane. With a
 * crew aboard, the failed flight ends in the escape system's landing, which a
 * lesson without that end event never grades (src/lessons/grader.ts
 * `flightEnded`); uncrewed, the vehicle is lost and the lesson graded failed.
 */
const soyuzUncrewed = (dynamics: object) => missionDoc({
  vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'cubesats', payloadMass: 7150, orbitId: 'custom',
  orbit: { ...orbitById('custom'), perigee: 200e3, apogee: 420e3, inclination: 51.64 },
  launchTime: windowAfter('iss', 'baikonur'), dynamics: { ...SIX_DOF, ...dynamics },
});

/**
 * S2's bound, m (its brief writes it out as 1 000 m): the worked flight's
 * 773 m at SECO plus 25 %, 966 m, rounded up — set after that flight, as the
 * research asks (the heavy test says so).
 */
const NAV_BOUND_M = 1000;

export const RU_24_05_06: PackSource = {
  pack: {
    id: 'ru-24-05-06',
    title: {
      en: 'Speciality 24.05.06, Flight Vehicle Control Systems (Russia)',
      ru: 'Специальность 24.05.06 «Системы управления летательными аппаратами»',
      th: 'สาขาวิชา 24.05.06 «ระบบควบคุมอากาศยาน» (รัสเซีย)',
    },
    audience: {
      en: 'Cadets and students of the five-year specialist degree, years 3–5',
      ru: 'Курсанты и студенты специалитета, 3–5 курсы',
      th: 'นักเรียนทหารและนักศึกษาหลักสูตรวิศวกรผู้เชี่ยวชาญห้าปี ชั้นปีที่ 3–5',
    },
    framework: {
      en: 'Russian federal standard ФГОС ВО 3++, speciality 24.05.06 (Order No. 874 of the Ministry of Science and Higher Education, 4 August 2020, as amended 27 February 2023)',
      ru: 'ФГОС ВО 3++ по специальности 24.05.06, приказ Минобрнауки России от 04.08.2020 № 874 (ред. от 27.02.2023)',
      th: 'มาตรฐานการศึกษาระดับอุดมศึกษาแห่งรัฐของรัสเซีย ФГОС ВО 3++ สาขาวิชา 24.05.06 (คำสั่งกระทรวงวิทยาศาสตร์และการอุดมศึกษาของรัสเซีย ฉบับที่ 874 ลงวันที่ 4 สิงหาคม 2020 แก้ไขเมื่อ 27 กุมภาพันธ์ 2023)',
    },
    reviewed: false,
    description: {
      en: 'Matched to the general professional competences ОПК-1, ОПК-7 and ОПК-8 of the 24.05.06 standard (pp. 11–12) and, for the ballistic cases, ОПК-6 of the 24.05.04 standard (Order No. 975 of 12 August 2020). A military academy\'s professional competences are set by the Ministry of Defence (the standard\'s §3.4), and the Mozhaisky Military Space Academy\'s own curriculum and course programmes are not public, so the pack follows the standard and the published discipline lists of civilian universities (MAI department С-12; Bauman University, Mytishchi branch, department К1). Notation follows ГОСТ 20058-80. The first three lessons are written for this pack; the others are the app\'s own lessons, listed again with the competences they meet.',
      ru: 'Соответствует общепрофессиональным компетенциям ОПК-1, ОПК-7 и ОПК-8 ФГОС ВО 24.05.06 (с. 11–12), а для баллистических кейсов — ОПК-6 ФГОС ВО 24.05.04 (приказ № 975 от 12.08.2020). Профессиональные компетенции военной образовательной организации устанавливает Министерство обороны (§3.4 стандарта), а учебный план и рабочие программы дисциплин ВКА им. А. Ф. Можайского не опубликованы, поэтому набор опирается на стандарт и открытые перечни дисциплин гражданских вузов (МАИ, кафедра С-12; МГТУ им. Н. Э. Баумана, Мытищинский филиал, кафедра К1). Обозначения — по ГОСТ 20058-80. Первые три урока написаны для этого набора; остальные — уроки самого приложения, приведённые здесь ещё раз с компетенциями, которым они отвечают.',
      th: 'สอดคล้องกับสมรรถนะวิชาชีพทั่วไป ОПК-1, ОПК-7 และ ОПК-8 ของมาตรฐานสาขา 24.05.06 (หน้า 11–12) และสำหรับกรณีศึกษาด้านขีปนวิถี คือ ОПК-6 ของมาตรฐานสาขา 24.05.04 (คำสั่งฉบับที่ 975 ลงวันที่ 12 สิงหาคม 2020) สมรรถนะวิชาชีพของสถาบันการศึกษาทางทหารกำหนดโดยกระทรวงกลาโหม (ข้อ 3.4 ของมาตรฐาน) และแผนการเรียนกับแผนการสอนรายวิชาของสถาบันอวกาศทหาร A. F. Mozhaisky ไม่ได้เผยแพร่ ชุดนี้จึงอิงมาตรฐานและรายชื่อวิชาที่มหาวิทยาลัยพลเรือนเผยแพร่ (MAI ภาควิชา С-12 และมหาวิทยาลัยเทคนิค Bauman วิทยาเขต Mytishchi ภาควิชา К1) สัญลักษณ์เป็นไปตาม ГОСТ 20058-80 สามบทแรกเขียนขึ้นสำหรับชุดนี้ บทอื่นเป็นบทเรียนเดิมของโปรแกรมที่นำมาจัดไว้ในชุดนี้พร้อมสมรรถนะที่สอดคล้อง',
    },
    contents: [
      { id: 'ru-soyuz-margins' },
      { id: 'ru-bins-astro' },
      { id: 'ru-fdir-dus' },
      {
        id: 'guid-monte-carlo',
        curriculum: [{ code: 'ФГОС 24.05.06 ОПК-8', kind: 'competence' }],
        note: {
          en: 'Injection accuracy: the 3σ spread of the perigee over a Monte Carlo set, the mathematical modelling of a dynamic system that ОПК-8 names.',
          ru: 'Точность выведения: разброс перигея по набору прогонов Монте-Карло, оценка 3σ — математическое моделирование динамической системы, о котором говорит ОПК-8.',
          th: 'ความแม่นยำในการส่งเข้าวงโคจร: การกระจายของจุดใกล้โลกในชุดการจำลองมอนติคาร์โลและค่า 3σ ซึ่งเป็นการสร้างแบบจำลองทางคณิตศาสตร์ของระบบพลวัตตามที่ ОПК-8 ระบุ',
        },
      },
      {
        id: 'case-cz5b',
        curriculum: [{ code: 'ФГОС 24.05.06 ОПК-1', kind: 'competence' }, { code: 'ФГОС 24.05.04 ОПК-6', kind: 'competence' }],
        note: {
          en: 'Re-entry ballistics: a spent stage\'s fall predicted from its ballistic coefficient, and how far off the prediction was.',
          ru: 'Баллистика спуска: прогноз схода отработавшей ступени по баллистическому коэффициенту и его ошибка.',
          th: 'ขีปนวิถีการกลับเข้าสู่บรรยากาศ: การทำนายการตกของขั้นจรวดที่ใช้แล้วจากสัมประสิทธิ์ขีปนวิถี และความคลาดเคลื่อนของการทำนาย',
        },
      },
      {
        id: 'case-iridium',
        curriculum: [{ code: 'ФГОС 24.05.06 ОПК-1', kind: 'competence' }, { code: 'ФГОС 24.05.04 ОПК-6', kind: 'competence' }],
        note: {
          en: 'Space surveillance: the 2009 collision of Iridium 33 and Cosmos 2251, the miss distance and the probability of collision.',
          ru: 'Контроль космического пространства: столкновение Iridium 33 и «Космоса-2251» в 2009 г., промах и вероятность столкновения.',
          th: 'การเฝ้าระวังอวกาศ: การชนกันของ Iridium 33 กับ Cosmos 2251 ในปี 2009 ระยะผ่านใกล้ที่สุด และความน่าจะเป็นของการชน',
        },
      },
    ],
  },
  lessons: [
    {
      id: 'ru-soyuz-margins', track: 15, order: 1, mode: 'engineer', domains: [5], tags: ['ω_ср', 'ΔΦ', 'ΔL'],
      curriculum: [{ code: 'ФГОС 24.05.06 ОПК-7', kind: 'competence' }, { code: 'ФГОС 24.05.06 ОПК-8', kind: 'competence' }],
      title: { en: 'Stability margins of the Soyuz autopilot at max-Q', ru: 'Запасы устойчивости автомата стабилизации «Союза» на max q', th: 'ค่าเผื่อเสถียรภาพของระบบรักษาท่าทาง Soyuz ที่ max-Q' },
      brief: {
        en: 'Soyuz-2.1a with a crewed spacecraft, flown six-DOF under its own autopilot from Baikonur in the window to the station. Fly through max-Q, then open the attitude-loop inspector at the max-Q event and read the pitch loop\'s crossover frequency and phase margin off its open-loop Bode plot. Its gain margin must be at least 6 dB. In Russian the app writes the quantities in ГОСТ 20058-80 notation: pitch angle ϑ, pitch rate ω_z.',
        ru: '«Союз-2.1а» с пилотируемым кораблём в шестистепенной модели со штатным автоматом стабилизации, старт с Байконура в окно к станции. Пройдите участок максимального скоростного напора, затем откройте инспектор контура стабилизации на событии max q и определите по ЛАЧХ и ЛФЧХ разомкнутого контура канала тангажа частоту среза ω_ср и запас по фазе ΔΦ. Запас по амплитуде ΔL должен быть не меньше 6 дБ. Обозначения — по ГОСТ 20058-80: угол тангажа ϑ, угловая скорость тангажа ω_z.',
        th: 'Soyuz-2.1a พร้อมยานอวกาศที่มีนักบินอวกาศ บินแบบหกองศาอิสระภายใต้ระบบรักษาท่าทางของตัวเอง ปล่อยจากไบโคนูร์ในหน้าต่างการปล่อยไปยังสถานีอวกาศ บินผ่าน max-Q แล้วเปิดตัวตรวจลูปควบคุมท่าทางที่เหตุการณ์ max-Q อ่านความถี่ครอสโอเวอร์และเฟสมาร์จินของลูปพิตช์จาก Bode plot ของลูปเปิด เกนมาร์จินต้องไม่น้อยกว่า 6 dB ในภาษารัสเซีย โปรแกรมเขียนปริมาณเหล่านี้ด้วยสัญลักษณ์ตาม ГОСТ 20058-80 คือมุมพิตช์ ϑ และอัตราพิตช์ ω_z',
      },
      debrief: {
        en: 'At max-Q the air turns the statically unstable rocket fastest, and the loop must answer with margin to spare: for the Soyuz here the crossover is near 2.8 rad/s and the phase margin near 46°, and the gain margin at the top is large, near 37 dB. They come from the linearised model of the rocket and its autopilot at the moment of max-Q, as a control system\'s dynamic analysis obtains them (ОПК-8). Compare with Falcon 9 in lesson 4.1.',
        ru: 'На max q воздух сильнее всего разворачивает статически неустойчивую ракету, и контур должен парировать это с запасом: у «Союза» здесь частота среза около 2,8 рад/с, запас по фазе около 46°, а запас по амплитуде сверху велик — около 37 дБ. Эти величины получены по линеаризованной модели системы «ракета — автомат стабилизации» в момент max q — так, как их получают при динамических расчётах систем управления (ОПК-8). Сравните с Falcon 9 в уроке 4.1.',
        th: 'ที่ max-Q อากาศหมุนจรวดซึ่งไม่เสถียรเชิงสถิตได้เร็วที่สุด ลูปจึงต้องตอบสนองโดยยังมีค่าเผื่อเหลือ สำหรับ Soyuz ในที่นี้ความถี่ครอสโอเวอร์ราว 2.8 rad/s เฟสมาร์จินราว 46° และเกนมาร์จินด้านบนมีมาก ราว 37 dB ค่าเหล่านี้ได้จากแบบจำลองเชิงเส้นของจรวดกับระบบรักษาท่าทางในขณะ max-Q แบบเดียวกับที่ได้จากการคำนวณพลวัตของระบบควบคุม (ОПК-8) ลองเปรียบเทียบกับ Falcon 9 ในบทที่ 4.1',
      },
      mission: soyuz({}),
      locked: [...ALL_LOCKS],
      endEvent: 'evt.maxQ',
      criteria: [
        { id: 'flying', kind: 'outcome', is: 'survived' },
        {
          id: 'wc', kind: 'answer', measure: 'loop.wcAtMaxQ', tolPct: 10, unit: 'rad/s',
          prompt: { en: 'Pitch crossover frequency at max-Q (rad/s)', ru: 'Частота среза канала тангажа ω_ср на max q (рад/с)', th: 'ความถี่ครอสโอเวอร์ของพิตช์ที่ max-Q (rad/s)' },
        },
        {
          id: 'pm', kind: 'answer', measure: 'loop.pmAtMaxQ', tolPct: 10, unit: '°',
          prompt: { en: 'Pitch phase margin at max-Q (°)', ru: 'Запас по фазе ΔΦ канала тангажа на max q (°)', th: 'เฟสมาร์จินของพิตช์ที่ max-Q (°)' },
        },
        {
          id: 'gm', kind: 'measure', measure: 'loop.gmAtMaxQ', min: 6,
          label: { en: 'Gain margin at max-Q (at least 6 dB)', ru: 'Запас по амплитуде ΔL на max q (не меньше 6 дБ)', th: 'เกนมาร์จินที่ max-Q (ไม่น้อยกว่า 6 dB)' },
        },
      ],
      hints: [
        { en: 'The attitude-loop inspector is in the Engineer mode\'s 6-DOF panel; move the replay to the max-Q event and pick the pitch plane.', ru: 'Инспектор контура стабилизации — на панели 6-DOF режима «Инженер»; переведите воспроизведение на событие max q и выберите канал тангажа.', th: 'ตัวตรวจลูปควบคุมท่าทางอยู่ในแผง 6-DOF ของโหมดวิศวกร เลื่อนการเล่นซ้ำไปที่เหตุการณ์ max-Q แล้วเลือกระนาบพิตช์' },
        { en: 'The crossover is where the open loop\'s magnitude crosses 0 dB; the phase margin is 180° plus the phase there.', ru: 'Частота среза — там, где ЛАЧХ разомкнутого контура пересекает 0 дБ; запас по фазе — 180° плюс фаза на этой частоте.', th: 'ความถี่ครอสโอเวอร์คือจุดที่ขนาดของลูปเปิดตัด 0 dB และเฟสมาร์จินคือ 180° บวกเฟสที่ความถี่นั้น' },
        { en: 'The gain margin is how far the magnitude lies below 0 dB where the phase passes −180°; the inspector shows it beside the phase margin.', ru: 'Запас по амплитуде — на сколько ЛАЧХ лежит ниже 0 дБ на частоте, где ЛФЧХ проходит −180°; инспектор показывает его рядом с запасом по фазе.', th: 'เกนมาร์จินคือขนาดที่อยู่ต่ำกว่า 0 dB ตรงความถี่ที่เฟสผ่าน −180° ตัวตรวจแสดงค่านี้ไว้ข้างเฟสมาร์จิน' },
      ],
    },
    {
      id: 'ru-bins-astro', track: 15, order: 2, mode: 'engineer', domains: [4], tags: ['БИНС', 'G02'],
      curriculum: [{ code: 'ФГОС 24.05.06 ОПК-7', kind: 'competence' }],
      title: { en: 'Inertial navigation with star-tracker correction, without GNSS', ru: 'БИНС с астрокоррекцией без ГНСС', th: 'การนำทางเฉื่อยที่แก้ไขด้วยตัวจับดาว โดยไม่มี GNSS' },
      brief: {
        en: 'Soyuz-2.1a flown six-DOF. The GNSS receiver is out for the whole ascent: the navigation rests on a tactical-grade strapdown inertial unit (fibre-optic gyros), and its star tracker is switched off. Keep the navigation\'s position error within 1 000 m up to the third stage\'s cut-off, when the spacecraft reaches its parking orbit. GNSS stays off; switch the star-tracker correction on, or choose the inertial unit\'s grade.',
        ru: '«Союз-2.1а» в шестистепенной модели. Приёмник ГНСС не работает на всём участке выведения: навигация опирается на бесплатформенную инерциальную навигационную систему (БИНС) тактического класса с волоконно-оптическими гироскопами, а звёздный датчик выключен. Удержите ошибку навигации по положению в пределах 1 000 м до выключения двигателя третьей ступени, когда корабль выходит на опорную орбиту. ГНСС остаётся выключенной; включите астрокоррекцию по звёздному датчику или выберите класс БИНС.',
        th: 'Soyuz-2.1a บินแบบหกองศาอิสระ เครื่องรับ GNSS ใช้ไม่ได้ตลอดการไต่ระดับ ระบบนำทางจึงอาศัยหน่วยวัดเฉื่อยแบบติดตรึงเกรดยุทธวิธี (ไจโรใยแก้วนำแสง) และตัวจับดาวถูกปิดอยู่ จงรักษาความคลาดเคลื่อนตำแหน่งของระบบนำทางให้อยู่ภายใน 1 000 ม. จนถึงการดับเครื่องของขั้นที่ 3 เมื่อยานเข้าสู่วงโคจรพัก ให้ GNSS ปิดอยู่เหมือนเดิม แล้วเปิดการแก้ไขด้วยตัวจับดาว หรือเลือกเกรดของหน่วยวัดเฉื่อย',
      },
      debrief: {
        en: 'Without external fixes an inertial unit\'s error grows faster than linearly: an accelerometer bias b gives ½bt², and gyro drift tilts the navigation frame, so the thrust acceleration is projected along the wrong axes. A star tracker, which sees stars from 150 km up, measures the attitude and bounds that tilt: in this flight the error at the third stage\'s cut-off is about 3 km without it and about 0.8 km with it. A navigation-grade unit without the star tracker gives about 0.4 km; with GNSS fixes the Kalman filter holds the error to a few metres.',
        ru: 'Без внешних коррекций ошибка БИНС растёт быстрее линейной: смещение нуля акселерометра b даёт ½bt², а дрейф гироскопов наклоняет навигационный базис, и ускорение от тяги проецируется не на те оси. Звёздный датчик, который видит звёзды начиная с высоты 150 км, измеряет ориентацию и ограничивает этот наклон: в этом полёте ошибка к выключению третьей ступени без него около 3 км, а с ним — около 0,8 км. БИНС навигационного класса без звёздного датчика даёт около 0,4 км; с коррекцией по ГНСС фильтр Калмана удерживает ошибку в пределах нескольких метров.',
        th: 'หากไม่มีการแก้ไขจากภายนอก ความคลาดเคลื่อนของระบบนำทางเฉื่อยจะโตเร็วกว่าเชิงเส้น ไบแอสของมาตรความเร่ง b ทำให้เกิด ½bt² และการลอยของไจโรทำให้กรอบนำทางเอียง ความเร่งจากแรงขับจึงถูกฉายลงบนแกนที่ผิด ตัวจับดาวซึ่งเห็นดาวได้ตั้งแต่ความสูง 150 กม. ขึ้นไป วัดท่าทางของยานและจำกัดการเอียงนั้นไว้ ในเที่ยวบินนี้ความคลาดเคลื่อนเมื่อขั้นที่ 3 ดับเครื่องประมาณ 3 กม. ถ้าไม่มีตัวจับดาว และประมาณ 0.8 กม. ถ้ามี หน่วยวัดเฉื่อยเกรดนำทางที่ไม่มีตัวจับดาวให้ประมาณ 0.4 กม. ส่วนเมื่อมีการแก้ไขจาก GNSS ตัวกรองคาลมานรักษาความคลาดเคลื่อนไว้ไม่กี่เมตร',
      },
      mission: soyuz({ navigation: { grade: 'tactical', gnss: false, starTracker: false } }),
      locked: [...ALL_LOCKS],
      endEvent: 'evt.seco',
      criteria: [
        {
          id: 'gnss', kind: 'hook', hook: 'gnssOff',
          label: { en: 'No satellite navigation', ru: 'Без спутниковой навигации', th: 'ไม่มีการนำทางด้วยดาวเทียม' },
        },
        { id: 'error', kind: 'measure', measure: 'nav.positionError', max: NAV_BOUND_M },
        { id: 'flying', kind: 'outcome', is: 'survived' },
      ],
      hints: [
        { en: 'Navigation (INS / GNSS) → Star tracker. The telemetry shows the position error as it grows.', ru: '«Навигация (БИНС / ГНСС)» → «Звёздный датчик». Телеметрия показывает, как растёт ошибка положения.', th: 'การนำทาง (INS / GNSS) → ตัวจับดาว ข้อมูลทางไกลแสดงความคลาดเคลื่อนตำแหน่งขณะที่โตขึ้น' },
        { en: 'The star tracker corrects the attitude, not the position: it helps by keeping the frame the accelerometers are read in from tilting.', ru: 'Звёздный датчик корректирует ориентацию, а не положение: он помогает тем, что не даёт наклониться базису, в котором интегрируются показания акселерометров.', th: 'ตัวจับดาวแก้ไขท่าทาง ไม่ได้แก้ไขตำแหน่ง มันช่วยโดยไม่ให้กรอบที่ใช้อ่านค่ามาตรความเร่งเอียง' },
        { en: 'A navigation-grade unit (ring-laser gyros) is another answer — and a dearer one.', ru: 'БИНС навигационного класса (лазерные гироскопы) — тоже решение, но более дорогое.', th: 'หน่วยวัดเฉื่อยเกรดนำทาง (ไจโรเลเซอร์วงแหวน) ก็เป็นอีกคำตอบหนึ่ง แต่ราคาแพงกว่า' },
      ],
    },
    {
      id: 'ru-fdir-dus', track: 15, order: 3, mode: 'engineer', domains: [6, 5], tags: ['ДУС', 'FDIR', 'G08'],
      curriculum: [{ code: 'ФГОС 24.05.06 ОПК-7', kind: 'competence' }],
      title: { en: 'A failed rate gyro: voting against a common-cause failure', ru: 'Отказ ДУС: голосование и отказ по общей причине', th: 'ไจโรวัดอัตราเสีย: การลงคะแนนกับความผิดพลาดจากสาเหตุร่วม' },
      brief: {
        en: 'Soyuz-2.1a flown six-DOF, uncrewed this time: 7.15 t of small satellites for a 200 × 420 km orbit in the station\'s plane, so no escape system will step in. At T+30 s the rate gyros of inertial unit 1 will stick. Without fault detection the flight computer flies on unit 1 alone, and the autopilot "corrects" a rotation that is not there. Switch the FDIR on (Engineer mode, "Control-system failures") so that the three units vote, and reach orbit. The failure itself is set and stays.',
        ru: '«Союз-2.1а» в шестистепенной модели, на этот раз беспилотный: 7,15 т малых спутников на орбиту 200 × 420 км в плоскости станции, так что система аварийного спасения не вмешается. На T+30 с датчики угловой скорости (ДУС) инерциального блока 1 заклинит. Без системы обнаружения отказов бортовой компьютер летит по блоку 1, и автомат стабилизации «парирует» несуществующее вращение. Включите FDIR (режим «Инженер», раздел «Отказы системы управления»), чтобы три блока голосовали, и выйдите на орбиту. Сам отказ задан и не меняется.',
        th: 'Soyuz-2.1a บินแบบหกองศาอิสระ คราวนี้ไม่มีนักบินอวกาศ บรรทุกดาวเทียมขนาดเล็กรวม 7.15 ตันไปยังวงโคจร 200 × 420 กม. ในระนาบของสถานีอวกาศ ระบบหนีภัยจึงไม่เข้ามาช่วย ที่ T+30 วินาที ไจโรวัดอัตราเชิงมุมของหน่วยเฉื่อยที่ 1 จะค้าง หากไม่มีการตรวจจับความผิดพลาด คอมพิวเตอร์การบินจะบินตามหน่วยที่ 1 เพียงหน่วยเดียว และระบบรักษาท่าทางจะ «แก้» การหมุนที่ไม่มีอยู่จริง ให้เปิด FDIR (โหมดวิศวกร หัวข้อ «ความล้มเหลวของระบบควบคุม») เพื่อให้ทั้งสามหน่วยลงคะแนนกัน แล้วเข้าสู่วงโคจร ความล้มเหลวถูกกำหนดไว้และเปลี่ยนไม่ได้',
      },
      debrief: {
        en: 'Majority voting among three units cuts out the one that disagrees with the other two for long enough: here unit 1 is isolated about a minute after the failure, and the ascent goes on on the two good ones. Voting is powerless against a common-cause failure. On 2 July 2013 a Proton-M carrying three GLONASS-M satellites fell seconds after liftoff because the yaw channel\'s angular-rate sensors had been installed upside down — all of them, so the units agreed on the wrong sign (the finding of Roscosmos\'s accident commission; the app re-creates it as the "Proton-M, 2 July 2013" failure preset).',
        ru: 'Мажоритарное голосование трёх блоков отключает тот, который достаточно долго расходится с двумя другими: здесь блок 1 исключён примерно через минуту после отказа, и выведение продолжается по двум исправным. Против отказа по общей причине голосование бессильно. 2 июля 2013 г. «Протон-М» с тремя спутниками «Глонасс-М» упал через несколько секунд после старта, потому что датчики угловых скоростей канала рыскания были установлены перевёрнутыми — все, и блоки согласованно выдавали неверный знак (вывод аварийной комиссии Роскосмоса; в приложении этот случай воспроизводит набор отказов «Протон-М, 2 июля 2013»).',
        th: 'การลงคะแนนเสียงข้างมากของสามหน่วยจะตัดหน่วยที่มีค่าต่างจากอีกสองหน่วยนานพอออกไป ในที่นี้หน่วยที่ 1 ถูกแยกออกประมาณหนึ่งนาทีหลังเกิดความผิดพลาด และการไต่ระดับดำเนินต่อด้วยสองหน่วยที่ดี แต่การลงคะแนนช่วยไม่ได้เมื่อความผิดพลาดมาจากสาเหตุร่วม เมื่อวันที่ 2 กรกฎาคม 2013 จรวด Proton-M ซึ่งบรรทุกดาวเทียม GLONASS-M สามดวงตกลงหลังปล่อยได้ไม่กี่วินาที เพราะเซนเซอร์วัดอัตราเชิงมุมของช่องหันเห (yaw) ถูกติดตั้งกลับหัวทั้งหมด ทุกหน่วยจึงให้เครื่องหมายผิดตรงกัน (ข้อสรุปของคณะกรรมการสอบสวนอุบัติเหตุของ Roscosmos ในโปรแกรมนี้ เหตุการณ์ดังกล่าวจำลองได้ด้วยชุดความล้มเหลว «Proton-M, 2 กรกฎาคม 2013»)',
      },
      mission: soyuzUncrewed({ controlFaults: { faults: [{ kind: 'gyroStuck', time: 30, units: [1] }], fdir: false } }),
      locked: [...ALL_LOCKS],
      criteria: [
        {
          id: 'isolated', kind: 'event', key: 'evt.fdirImuIsolated', present: true,
          label: { en: 'The FDIR isolates the failed unit', ru: 'FDIR отключает неисправный блок', th: 'FDIR แยกหน่วยที่เสียออก' },
        },
        { id: 'orbit', kind: 'outcome', is: 'orbit' },
      ],
      hints: [
        { en: 'Three units are carried so that two good ones can outvote a bad one — but only if the voting is switched on.', ru: 'Три блока ставят, чтобы два исправных перевесили неисправный, — но только если голосование включено.', th: 'ยานมีสามหน่วยเพื่อให้สองหน่วยที่ดีชนะหน่วยที่เสีย แต่ต้องเปิดการลงคะแนนก่อน' },
        { en: 'The switch is in the setup panel, section "Control-system failures (G08)".', ru: 'Переключатель — на панели настройки, раздел «Отказы системы управления (G08)».', th: 'สวิตช์อยู่ในแผงตั้งค่า หัวข้อ «ความล้มเหลวของระบบควบคุม (G08)»' },
        { en: 'Watch the event log after T+30 s: without the FDIR the rocket breaks up about 15 seconds later; with it, unit 1 is isolated.', ru: 'Следите за журналом событий после T+30 с: без FDIR ракета разрушается примерно через 15 с, с ним блок 1 отключается.', th: 'ดูบันทึกเหตุการณ์หลัง T+30 วินาที ถ้าไม่มี FDIR จรวดจะแตกหักในราว 15 วินาทีต่อมา ถ้ามี หน่วยที่ 1 จะถูกแยกออก' },
      ],
    },
  ],
};
