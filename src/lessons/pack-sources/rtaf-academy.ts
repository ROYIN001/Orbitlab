/**
 * Pack: the Royal Thai Air Force Academy's (NKRAFA's) space flight dynamics
 * and control (roadmap T03; the T03 research's §5, lessons R1, R2, R3, R5).
 * The codes are the courses and programme learning outcomes of the academy's
 * public BEng Aeronautical Engineering 2025 programme document, and EE 316
 * and วก 433 of the Electrical (2025) and Mechanical (2020) programmes; their
 * course specifications (มคอ.3) are not public, so the matching is to the
 * course descriptions only. Military content: public, cited sources only
 * (owner ruling). R1 and R2 are written here; R3 is built-in lessons 4.1 and
 * 4.2 and R5 built-in 5.2 by reference. R6 (T03b) is a design lesson on the
 * D06 attitude and link cores (T01's design kind), its course AE 541 from the
 * 2020 Aeronautical programme. R4 (a calibrated six-DOF step test) was not in
 * this stage's task. Worked solutions: tests/lesson-packs.test.ts (flights)
 * and tests/lesson-packs-design.test.ts (designs).
 */
import {
  ALL_LOCKS, PACK_DESIGN_DATE, PACK_DESIGN_LEVEL, POINT_MASS, designFrom, designLocksBut, locksBut, missionDoc, type PackSource,
} from './common';

/**
 * R6's start: the NAPA-2 template with a new mission's two changes — four
 * times its 12.5 Mbit/s downlink through the same 1 W radio, and a wheel of
 * 1 mN·m·s (an example wheel, not a catalogue's) — which leave the wheel short
 * of the disturbances' momentum and the link short of 3 dB.
 */
const NAPA2_FAST = designFrom('napa2', 'rtaf-6u-adcs', 'NAPA-2 · 6U', { 'adcs.wheelH': 0.001, 'comms.dataRate': 50e6 });

export const RTAF_ACADEMY: PackSource = {
  pack: {
    id: 'rtaf-academy',
    title: {
      en: 'Royal Thai Air Force Academy: space flight dynamics and control',
      ru: 'Академия ВВС Таиланда: динамика космического полёта и управление',
      th: 'โรงเรียนนายเรืออากาศ: พลศาสตร์การบินอวกาศและระบบควบคุม',
    },
    audience: {
      en: 'Cadets, BEng Aeronautical Engineering, years 4–5',
      ru: 'Курсанты, бакалавриат по авиационной технике, 4–5 курсы',
      th: 'นักเรียนนายเรืออากาศ หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมอากาศยาน ชั้นปีที่ 4–5',
    },
    framework: {
      en: 'Navaminda Kasatriyadhiraj Royal Thai Air Force Academy, BEng Aeronautical Engineering (2025 revision): programme learning outcomes and course descriptions',
      ru: 'Академия ВВС Таиланда им. Навамина Кашатрияттирата, бакалавриат по авиационной технике (редакция 2025 г.): результаты обучения по программе и описания дисциплин',
      th: 'โรงเรียนนายเรืออากาศนวมินทกษัตริยาธิราช หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมอากาศยาน (หลักสูตรปรับปรุง พ.ศ. 2568): ผลลัพธ์การเรียนรู้ของหลักสูตรและคำอธิบายรายวิชา',
    },
    reviewed: false,
    description: {
      en: 'Matched to PLO4 (flight mechanics and automatic control) and PLO7 (space engineering; calculating the motion of objects in space) and to the course descriptions of วอ 462, 478, 526, 528 and 529, AE 541 (Aeronautical Engineering 2020), EE 316 (Electrical Engineering 2025) and วก 433 (Mechanical Engineering 2020). Sources: the academy\'s public programme documents linked from nkrafa.rtaf.mi.th/curriculum (Aeronautical Engineering 2025, PDF pp. 18 and 118–123; Aeronautical Engineering 2020, PDF p. 92; Electrical Engineering 2025, PDF p. 109) and its self-declaration for Mechanical Engineering 2020 to the Council of Engineers (coe.or.th, pp. 34–35). The week-by-week course specifications are not public, so the match is to the descriptions only. Lessons 14.1 and 14.2 are flights written for this pack, and 14.3 a satellite to design; the others are the app\'s own lessons, listed again with the codes they meet.',
      ru: 'Соответствует PLO4 (механика полёта и автоматическое управление) и PLO7 (космическая техника; расчёт движения тел в космосе), а также описаниям дисциплин วอ 462, 478, 526, 528 и 529, AE 541 (программа по авиационной технике 2020 г.), EE 316 (программа по электротехнике 2025 г.) и วก 433 (программа по машиностроению 2020 г.). Источники: открытые документы программ академии, на которые ссылается nkrafa.rtaf.mi.th/curriculum (авиационная техника 2025 г., с. 18 и 118–123 PDF; авиационная техника 2020 г., с. 92 PDF; электротехника 2025 г., с. 109 PDF), и её самодекларация по программе машиностроения 2020 г. для Инженерного совета Таиланда (coe.or.th, с. 34–35). Рабочие программы дисциплин по неделям не опубликованы, поэтому соответствие установлено только по описаниям. Уроки 14.1 и 14.2 — полёты, написанные для этого набора, 14.3 — проект спутника; остальные — уроки самого приложения, приведённые здесь ещё раз с кодами, которым они отвечают.',
      th: 'สอดคล้องกับ PLO4 (กลศาสตร์การบินและระบบควบคุมอัตโนมัติ) และ PLO7 (วิศวกรรมอวกาศ การคำนวณการเคลื่อนที่ของวัตถุในอวกาศ) และคำอธิบายรายวิชา วอ 462, 478, 526, 528 และ 529, AE 541 (หลักสูตรวิศวกรรมอากาศยาน พ.ศ. 2563), EE 316 (หลักสูตรวิศวกรรมไฟฟ้า พ.ศ. 2568) และ วก 433 (หลักสูตรวิศวกรรมเครื่องกล พ.ศ. 2563) แหล่งที่มา: เอกสารหลักสูตรที่เผยแพร่ของโรงเรียนนายเรืออากาศ ซึ่งเชื่อมโยงจาก nkrafa.rtaf.mi.th/curriculum (หลักสูตรวิศวกรรมอากาศยาน พ.ศ. 2568 หน้า PDF 18 และ 118–123 หลักสูตรวิศวกรรมอากาศยาน พ.ศ. 2563 หน้า PDF 92 หลักสูตรวิศวกรรมไฟฟ้า พ.ศ. 2568 หน้า PDF 109) และคำรับรองตนเองหลักสูตรวิศวกรรมเครื่องกล พ.ศ. 2563 ที่ยื่นต่อสภาวิศวกร (coe.or.th หน้า 34–35) รายละเอียดของรายวิชา (มคอ.3) รายสัปดาห์ไม่ได้เผยแพร่ การจับคู่จึงอิงคำอธิบายรายวิชาเท่านั้น บทที่ 14.1 และ 14.2 เป็นการบินที่เขียนขึ้นสำหรับชุดนี้ บทที่ 14.3 เป็นการออกแบบดาวเทียม บทอื่นเป็นบทเรียนเดิมของโปรแกรมที่นำมาจัดไว้ในชุดนี้พร้อมรหัสที่สอดคล้อง',
    },
    contents: [
      { id: 'rtaf-napa1-sso' },
      { id: 'rtaf-elements' },
      {
        id: 'ctl-inspector',
        curriculum: [{ code: 'NKRAFA วอ 462', kind: 'course' }, { code: 'NKRAFA EE 316', kind: 'course' }, { code: 'NKRAFA วก 433', kind: 'course' }, { code: 'NKRAFA PLO4', kind: 'outcome' }],
        note: {
          en: 'Frequency response on a real autopilot: the crossover and the phase margin read from the Bode plot at max-Q (วอ 462: root locus, frequency response, stability in the frequency domain).',
          ru: 'Частотные характеристики настоящего автомата стабилизации: частота среза и запас по фазе по ЛАЧХ и ЛФЧХ на max-Q (วอ 462: корневой годограф, частотные характеристики, устойчивость в частотной области).',
          th: 'ผลตอบสนองเชิงความถี่ของระบบรักษาท่าทางจริง: ความถี่ครอสโอเวอร์และเฟสมาร์จินจาก Bode plot ที่ max-Q (วอ 462: วิธีทางเดินราก ผลตอบสนองเชิงความถี่ เสถียรภาพในโดเมนความถี่)',
        },
      },
      {
        id: 'ctl-margins',
        curriculum: [{ code: 'NKRAFA วอ 462', kind: 'course' }, { code: 'NKRAFA EE 316', kind: 'course' }, { code: 'NKRAFA วก 433', kind: 'course' }, { code: 'NKRAFA PLO4', kind: 'outcome' }],
        note: {
          en: 'Compensator design to margins: two gains chosen so that the loop keeps 30° of phase and 6 dB of gain at max-Q.',
          ru: 'Синтез регулятора по запасам: два коэффициента, при которых на max-Q контур сохраняет 30° по фазе и 6 дБ по амплитуде.',
          th: 'การออกแบบตัวชดเชยตามค่ามาร์จิน: เลือกเกนสองค่าให้ลูปมีเฟสมาร์จิน 30° และเกนมาร์จิน 6 dB ที่ max-Q',
        },
      },
      {
        id: 'adv-docking',
        curriculum: [{ code: 'NKRAFA วอ 478', kind: 'course' }, { code: 'NKRAFA วอ 528', kind: 'course' }, { code: 'NKRAFA วอ 529', kind: 'course' }],
        note: {
          en: 'Rendezvous in orbit, one of the topics of วอ 478 and วอ 528, and station docking, one of วอ 529\'s.',
          ru: 'Сближение на орбите — одна из тем วอ 478 и วอ 528, стыковка со станцией — одна из тем วอ 529.',
          th: 'การนัดพบในวงโคจร ซึ่งเป็นหัวข้อหนึ่งของ วอ 478 และ วอ 528 และการเชื่อมต่อกับสถานี ซึ่งเป็นหัวข้อหนึ่งของ วอ 529',
        },
      },
      { id: 'rtaf-6u-adcs' },
    ],
  },
  lessons: [
    {
      id: 'rtaf-napa1-sso', track: 14, order: 1, mode: 'engineer', domains: [2], tags: ['J₂', 'SSO', 'NAPA-1'],
      curriculum: [{ code: 'NKRAFA วอ 478', kind: 'course' }, { code: 'NKRAFA วอ 526', kind: 'course' }, { code: 'NKRAFA PLO7', kind: 'outcome' }],
      title: { en: 'NAPA-1\'s ride: the inclination J₂ asks for', ru: 'Как летел NAPA-1: наклонение, которого требует J₂', th: 'เส้นทางของ NAPA-1: ความเอียงที่ J₂ กำหนด' },
      brief: {
        en: 'On 3 September 2020 a Vega from Kourou (flight VV16) carried NAPA-1, the Royal Thai Air Force\'s first satellite, among a rideshare of small satellites into a sun-synchronous orbit. Here Vega-C flies a 1.15 t rideshare dispenser to the app\'s sun-synchronous orbit: 600 km, its plane crossing the equator northbound at 10:30 local solar time. That height is the app\'s, not the one NAPA-1 was released at. Choose the launch time that puts the plane where it is asked for, fly, and type in the inclination at which J₂ turns the plane 360° a year, and the orbit\'s period. Only the launch time may be changed.',
        ru: '3 сентября 2020 г. ракета Vega из Куру (полёт VV16) вывела на солнечно-синхронную орбиту NAPA-1 — первый спутник Королевских ВВС Таиланда — в числе других малых спутников попутного запуска. Здесь Vega-C выводит диспенсер попутной нагрузки массой 1,15 т на солнечно-синхронную орбиту приложения: 600 км, восходящий узел в 10:30 по местному солнечному времени. Эта высота — орбиты приложения, а не та, на которой был отделён NAPA-1. Выберите время старта, при котором плоскость окажется там, где требуется, выполните полёт и введите наклонение, при котором J₂ поворачивает плоскость на 360° в год, и период орбиты. Изменять можно только время старта.',
        th: 'เมื่อวันที่ 3 กันยายน 2020 จรวด Vega จากคูรู (เที่ยวบิน VV16) นำ NAPA-1 ดาวเทียมดวงแรกของกองทัพอากาศไทย ขึ้นสู่วงโคจรสัมพันธ์กับดวงอาทิตย์พร้อมดาวเทียมขนาดเล็กดวงอื่นในการปล่อยร่วม ในบทนี้ Vega-C นำชุดปล่อยดาวเทียมร่วมมวล 1.15 ตันขึ้นสู่วงโคจรสัมพันธ์กับดวงอาทิตย์ของโปรแกรม คือความสูง 600 กม. ระนาบตัดเส้นศูนย์สูตรขณะขึ้นเหนือเวลา 10:30 น. ตามเวลาสุริยคติท้องถิ่น ความสูงนี้เป็นของวงโคจรในโปรแกรม ไม่ใช่ความสูงที่ปล่อย NAPA-1 จริง ให้เลือกเวลาปล่อยที่ทำให้ระนาบอยู่ตามที่กำหนด บินภารกิจ แล้วพิมพ์ความเอียงที่ทำให้ J₂ หมุนระนาบครบ 360° ต่อปี และคาบของวงโคจร เปลี่ยนได้เฉพาะเวลาปล่อยเท่านั้น',
      },
      debrief: {
        en: 'For a circular orbit, matching J₂\'s regression to the Sun\'s mean motion gives cos i = −2 (dΩ/dt) a^(7/2) / (3 J₂ R² √μ): at 600 km i ≈ 97.79°, retrograde. The higher the orbit, the weaker J₂\'s grip and the further past 90° the plane must lean (about 98.6° at 800 km). A rideshare satellite gets the plane and the local time of the dispenser that carries it, and keeps them, because J₂ does the turning without fuel.',
        ru: 'Для круговой орбиты из равенства прецессии от J₂ среднему движению Солнца следует cos i = −2 (dΩ/dt) a^(7/2) / (3 J₂ R² √μ): на 600 км i ≈ 97,79°, орбита обратная. Чем выше орбита, тем слабее действие J₂ и тем дальше за 90° должна быть наклонена плоскость (около 98,6° на 800 км). Спутник попутного запуска получает плоскость и местное время диспенсера, который его несёт, и сохраняет их: поворот плоскости выполняет J₂ без затрат топлива.',
        th: 'สำหรับวงโคจรวงกลม เมื่อให้อัตราการหมุนควงของโหนดจาก J₂ เท่ากับการเคลื่อนที่เฉลี่ยของดวงอาทิตย์ จะได้ cos i = −2 (dΩ/dt) a^(7/2) / (3 J₂ R² √μ) ที่ 600 กม. i ≈ 97.79° ซึ่งเป็นวงโคจรถอยหลัง ยิ่งวงโคจรสูง อิทธิพลของ J₂ ยิ่งอ่อน ระนาบจึงต้องเอียงเกิน 90° มากขึ้น (ประมาณ 98.6° ที่ 800 กม.) ดาวเทียมที่ไปกับการปล่อยร่วมจะได้ระนาบและเวลาท้องถิ่นตามชุดปล่อยที่พามันไป และรักษาไว้ได้เพราะ J₂ หมุนระนาบให้โดยไม่ต้องใช้เชื้อเพลิง',
      },
      mission: missionDoc({ vehicleId: 'vegac', siteId: 'kourou', satelliteId: 'cubesats', payloadMass: 1150, orbitId: 'sso', dynamics: { ...POINT_MASS } }),
      locked: locksBut('setup.launchTime'),
      criteria: [
        { id: 'orbit', kind: 'outcome', is: 'target' },
        {
          id: 'inclination', kind: 'answer', measure: 'orbit.inclination', tol: 0.05, unit: '°',
          prompt: { en: 'Sun-synchronous inclination at this height (°)', ru: 'Солнечно-синхронное наклонение на этой высоте (°)', th: 'ความเอียงของวงโคจรสัมพันธ์กับดวงอาทิตย์ที่ความสูงนี้ (°)' },
        },
        {
          id: 'period', kind: 'answer', measure: 'orbit.period', tol: 0.2, unit: 'min',
          prompt: { en: 'Period (min)', ru: 'Период обращения (мин)', th: 'คาบการโคจร (นาที)' },
        },
        {
          id: 'node', kind: 'measure', measure: 'orbit.raanError', max: 0.5,
          label: { en: 'The plane crosses the equator at 10:30 (node error)', ru: 'Плоскость пересекает экватор в 10:30 (ошибка по узлу)', th: 'ระนาบตัดเส้นศูนย์สูตรเวลา 10:30 น. (ความคลาดของโหนด)' },
        },
      ],
      hints: [
        { en: 'The plane must turn 360° in 365.2422 days: dΩ/dt = 2π / (365.2422 × 86 400 s) ≈ 1.991 × 10⁻⁷ rad/s, eastward.', ru: 'Плоскость должна поворачиваться на 360° за 365,2422 сут: dΩ/dt = 2π / (365,2422 · 86 400 с) ≈ 1,991 · 10⁻⁷ рад/с, к востоку.', th: 'ระนาบต้องหมุนครบ 360° ใน 365.2422 วัน: dΩ/dt = 2π / (365.2422 × 86 400 วินาที) ≈ 1.991 × 10⁻⁷ rad/s ไปทางตะวันออก' },
        { en: 'J₂ turns a circular orbit\'s plane at dΩ/dt = −(3/2) J₂ (R/a)² n cos i, with n = √(μ/a³), J₂ = 1.0826 × 10⁻³, R = 6 378.137 km, μ = 398 600.4 km³/s² and a = R + 600 km. Solve for cos i: it is negative.', ru: 'J₂ поворачивает плоскость круговой орбиты со скоростью dΩ/dt = −(3/2) J₂ (R/a)² n cos i, где n = √(μ/a³), J₂ = 1,0826 · 10⁻³, R = 6 378,137 км, μ = 398 600,4 км³/с², a = R + 600 км. Выразите cos i: он отрицателен.', th: 'J₂ หมุนระนาบของวงโคจรวงกลมด้วยอัตรา dΩ/dt = −(3/2) J₂ (R/a)² n cos i โดย n = √(μ/a³), J₂ = 1.0826 × 10⁻³, R = 6 378.137 กม., μ = 398 600.4 กม.³/วินาที² และ a = R + 600 กม. แก้สมการหา cos i ซึ่งจะได้ค่าลบ' },
        { en: 'For the launch time, use the setup panel\'s "Next window"; the verdict above the Launch button says how far the plane would be missed.', ru: 'Время старта даёт кнопка «Ближайшее окно» на панели настройки; заключение над кнопкой «Пуск» показывает, на сколько промахнётся плоскость.', th: 'สำหรับเวลาปล่อย ใช้ปุ่ม «หน้าต่างถัดไป» ในแผงตั้งค่า และข้อสรุปเหนือปุ่มปล่อยจรวดจะบอกว่าระนาบจะคลาดไปเท่าใด' },
      ],
    },
    {
      id: 'rtaf-elements', track: 14, order: 2, mode: 'engineer', domains: [2], tags: ['a, e', 'vis-viva'],
      curriculum: [{ code: 'NKRAFA วอ 478', kind: 'course' }, { code: 'NKRAFA วอ 528', kind: 'course' }, { code: 'NKRAFA PLO7', kind: 'outcome' }],
      title: { en: 'Elements and speed of a transfer orbit', ru: 'Элементы и скорость переходной орбиты', th: 'องค์ประกอบและอัตราเร็วของวงโคจรถ่ายโอน' },
      brief: {
        en: 'Falcon 9 puts a 4.15 t communications satellite from Cape Canaveral into a geostationary transfer orbit. Fly it. From the perigee and apogee heights the flight actually reached at insertion — the event log\'s line "Target orbit achieved" — work out the semi-major axis, the eccentricity and the period, and, with the vis-viva equation, the speed at perigee: that is where the flight is graded, the moment the second stage\'s second burn ends. The tolerances are tight: work with the reached heights, not the planned ones, and not the ones on screen later, which J₂ makes drift.',
        ru: 'Falcon 9 выводит связной спутник массой 4,15 т с мыса Канаверал на геопереходную орбиту. Выполните полёт. По высотам перигея и апогея, действительно достигнутым при выведении (строка журнала событий «Целевая орбита достигнута»), рассчитайте большую полуось, эксцентриситет и период, а по интегралу энергии (формуле vis-viva) — скорость в перигее: именно там полёт и оценивается, сразу по окончании второго включения двигателя второй ступени. Допуски жёсткие: считайте по достигнутым высотам, а не по расчётным и не по тем, что позже показывает экран, — их смещает J₂.',
        th: 'Falcon 9 นำดาวเทียมสื่อสารมวล 4.15 ตันจากแหลมคะแนเวอรัลเข้าสู่วงโคจรถ่ายโอนค้างฟ้า ให้บินภารกิจนี้ แล้วใช้ความสูงจุดใกล้โลกและจุดไกลโลกที่การบินทำได้จริงขณะเข้าวงโคจร (บรรทัด «ถึงวงโคจรเป้าหมาย» ในบันทึกเหตุการณ์) คำนวณกึ่งแกนเอก ความเยื้องศูนย์กลาง และคาบ และใช้สมการ vis-viva คำนวณอัตราเร็วที่จุดใกล้โลก ซึ่งเป็นจุดที่ใช้ประเมินผลการบิน ทันทีหลังขั้นที่ 2 ดับเครื่องยนต์ครั้งที่สอง ค่าที่ยอมให้คลาดเคลื่อนมีน้อย จึงต้องใช้ความสูงที่ทำได้จริง ไม่ใช่ความสูงตามแผน และไม่ใช่ค่าที่แสดงบนจอภายหลังซึ่ง J₂ ทำให้เลื่อนไป',
      },
      debrief: {
        en: 'Two numbers fix the ellipse\'s size and shape, a and e; the energy per unit mass, −μ/2a, and vis-viva, v² = μ(2/r − 1/a), follow from a alone. At perigee the satellite moves at about 10.2 km/s, some 2.4 km/s faster than a circle at that height would need; at apogee it will crawl at about 1.6 km/s, and the satellite\'s own engine has to add about 1.8 km/s there to circularise and remove the inclination. Under J₂ the osculating elements on screen swing by tens of kilometres around the orbit while their mean values hold: the elements are taken at one instant, here insertion. These are the constants of motion and the time-and-position problem of วอ 478 and วอ 528.',
        ru: 'Размер и форму эллипса задают два числа, a и e; удельная энергия −μ/2a и интеграл энергии v² = μ(2/r − 1/a) определяются одной a. В перигее спутник движется со скоростью около 10,2 км/с — примерно на 2,4 км/с быстрее, чем требовалось бы для круговой орбиты на этой высоте; в апогее он будет ползти со скоростью около 1,6 км/с, и собственному двигателю спутника придётся добавить там около 1,8 км/с, чтобы скруглить орбиту и убрать наклонение. Под действием J₂ оскулирующие элементы на экране колеблются по орбите на десятки километров, а их средние значения сохраняются: элементы берутся на один момент, здесь — момент выведения. Это интегралы движения и задача о времени и положении на орбите из курсов วอ 478 и วอ 528.',
        th: 'ขนาดและรูปร่างของวงรีกำหนดด้วยตัวเลขสองตัวคือ a และ e พลังงานต่อหน่วยมวล −μ/2a และสมการ vis-viva v² = μ(2/r − 1/a) ขึ้นกับ a เพียงตัวเดียว ที่จุดใกล้โลก ดาวเทียมเคลื่อนที่ด้วยอัตราเร็วประมาณ 10.2 กม./วินาที เร็วกว่าที่วงโคจรวงกลมที่ความสูงนั้นต้องการราว 2.4 กม./วินาที ส่วนที่จุดไกลโลกจะเคลื่อนที่ช้าเพียงประมาณ 1.6 กม./วินาที และเครื่องยนต์ของดาวเทียมเองต้องเพิ่มความเร็วอีกราว 1.8 กม./วินาทีที่นั่นเพื่อทำให้วงโคจรเป็นวงกลมและลดความเอียงให้หมดไป ภายใต้ J₂ องค์ประกอบวงโคจรแบบออสคิวเลตบนจอจะแกว่งหลายสิบกิโลเมตรไปตามวงโคจร ขณะที่ค่าเฉลี่ยคงเดิม องค์ประกอบจึงต้องอ้างอิงเวลาขณะใดขณะหนึ่ง ในที่นี้คือขณะเข้าวงโคจร เรื่องเหล่านี้คือค่าคงตัวของการเคลื่อนที่และปัญหาเวลากับตำแหน่งในวิชา วอ 478 และ วอ 528',
      },
      mission: missionDoc({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'comsat', payloadMass: 4150, orbitId: 'gto', dynamics: { ...POINT_MASS } }),
      locked: [...ALL_LOCKS],
      criteria: [
        { id: 'orbit', kind: 'outcome', is: 'target' },
        {
          id: 'a', kind: 'answer', measure: 'orbit.semiMajorAxis', tol: 10, unit: 'km',
          prompt: { en: 'Semi-major axis a (km)', ru: 'Большая полуось a (км)', th: 'กึ่งแกนเอก a (กม.)' },
        },
        {
          id: 'e', kind: 'answer', measure: 'orbit.eccentricity', tol: 0.002,
          prompt: { en: 'Eccentricity e', ru: 'Эксцентриситет e', th: 'ความเยื้องศูนย์กลาง e' },
        },
        {
          id: 'period', kind: 'answer', measure: 'orbit.period', tolPct: 0.5, unit: 'min',
          prompt: { en: 'Period (min)', ru: 'Период обращения (мин)', th: 'คาบการโคจร (นาที)' },
        },
        {
          id: 'speed', kind: 'answer', measure: 'orbit.speed', tol: 0.02, unit: 'km/s',
          prompt: { en: 'Speed at perigee, from vis-viva (km/s)', ru: 'Скорость в перигее по интегралу энергии (км/с)', th: 'อัตราเร็วที่จุดใกล้โลกจากสมการ vis-viva (กม./วินาที)' },
        },
      ],
      hints: [
        { en: 'r_p = R + h_p and r_a = R + h_a with R = 6 378.137 km; a = (r_p + r_a)/2 and e = (r_a − r_p)/(r_a + r_p).', ru: 'r_п = R + h_п и r_а = R + h_а, R = 6 378,137 км; a = (r_п + r_а)/2, e = (r_а − r_п)/(r_а + r_п).', th: 'r_p = R + h_p และ r_a = R + h_a โดย R = 6 378.137 กม. แล้ว a = (r_p + r_a)/2 และ e = (r_a − r_p)/(r_a + r_p)' },
        { en: 'T = 2π√(a³/μ), μ = 398 600.4 km³/s²; vis-viva at perigee: v_p = √(μ (2/r_p − 1/a)).', ru: 'T = 2π√(a³/μ), μ = 398 600,4 км³/с²; интеграл энергии в перигее: v_п = √(μ (2/r_п − 1/a)).', th: 'T = 2π√(a³/μ) โดย μ = 398 600.4 กม.³/วินาที² และสมการ vis-viva ที่จุดใกล้โลก: v_p = √(μ (2/r_p − 1/a))' },
        { en: 'A check on the speed: at the perigee of any elliptical orbit it lies between the circular speed √(μ/r_p) and the escape speed √(2μ/r_p).', ru: 'Проверка скорости: в перигее любой эллиптической орбиты она лежит между круговой √(μ/r_п) и параболической √(2μ/r_п).', th: 'ตรวจสอบอัตราเร็ว: ที่จุดใกล้โลกของวงโคจรวงรีใด ๆ อัตราเร็วต้องอยู่ระหว่างอัตราเร็ววงกลม √(μ/r_p) กับอัตราเร็วหลุดพ้น √(2μ/r_p)' },
      ],
    },
    {
      kind: 'design', id: 'rtaf-6u-adcs', track: 14, order: 3, mode: 'engineer', domains: [5], tags: ['h = 0.707·T·P/4', 'D06'],
      curriculum: [{ code: 'NKRAFA วอ 529', kind: 'course' }, { code: 'NKRAFA AE 541', kind: 'course' }, { code: 'NKRAFA PLO7', kind: 'outcome' }],
      title: { en: 'Attitude control for a 6U like NAPA-2', ru: 'Ориентация кубсата 6U вроде NAPA-2', th: 'การควบคุมท่าทางของคิวบ์แซต 6U แบบ NAPA-2' },
      brief: {
        en: 'A 6U CubeSat like NAPA-2, the Royal Thai Air Force\'s, opens on the satellite bench with two changes for a new mission. It must send its images down at 50 Mbit/s, four times NAPA-2\'s rate, through the same 1 W X-band radio, and the only reaction wheel that fits stores 1 mN·m·s (an example, not a catalogue wheel). As set, the wheel cannot store the momentum the disturbance torques build up over an orbit, and the downlink has less than 3 dB of margin. Without touching the wheel, the radio or the data rate, make the wheel enough (wheel over need at least 1) and close the link with at least 3 dB of margin. You may change the residual magnetic dipole, the centre of pressure and the satellite\'s dish. Then work out the wheel over need yourself from the torques, with h = 0.707·T·P/4, and type it in.',
        ru: 'На спутниковом стенде открыт кубсат формата 6U вроде NAPA-2 Королевских ВВС Таиланда — с двумя изменениями под новую задачу. Снимки нужно передавать со скоростью 50 Мбит/с, вчетверо быстрее NAPA-2, через тот же передатчик X-диапазона мощностью 1 Вт, а единственный помещающийся маховик накапливает кинетический момент 1 мН·м·с (это пример, а не изделие из каталога). В исходном проекте маховик не вмещает кинетический момент, который возмущающие моменты накапливают за виток, а запас радиолинии меньше 3 дБ. Не трогая маховик, передатчик и скорость передачи, добейтесь, чтобы маховика хватало (запас маховика не меньше 1), а запас радиолинии был не меньше 3 дБ. Менять можно остаточный магнитный момент, смещение центра давления и антенну спутника. Затем сами рассчитайте запас маховика по возмущающим моментам, h = 0,707·T·P/4, и введите его.',
        th: 'บนแท่นทดสอบเปิดคิวบ์แซตขนาด 6U แบบเดียวกับ NAPA-2 ของกองทัพอากาศไทยไว้ โดยมีการเปลี่ยนแปลงสองอย่างสำหรับภารกิจใหม่ ดาวเทียมต้องส่งภาพลงมาที่ 50 เมกะบิต/วินาที เร็วกว่าของ NAPA-2 สี่เท่า ผ่านวิทยุย่าน X กำลัง 1 วัตต์ตัวเดิม และวงล้อปฏิกิริยาตัวเดียวที่ใส่ได้เก็บโมเมนตัมได้ 1 mN·m·s (เป็นตัวอย่าง ไม่ใช่วงล้อจากแคตตาล็อก) ในแบบตั้งต้น วงล้อเก็บโมเมนตัมที่แรงบิดรบกวนสะสมขึ้นในหนึ่งรอบวงโคจรไม่ไหว และลิงก์ขาลงมีค่าเผื่อน้อยกว่า 3 dB โดยไม่แตะต้องวงล้อ วิทยุ และอัตราข้อมูล จงทำให้วงล้อเพียงพอ (วงล้อเทียบกับที่ต้องใช้ไม่น้อยกว่า 1) และให้ลิงก์มีค่าเผื่อไม่น้อยกว่า 3 dB สิ่งที่เปลี่ยนได้คือไดโพลแม่เหล็กตกค้าง ตำแหน่งศูนย์กลางแรงดัน และจานของดาวเทียม จากนั้นคำนวณอัตราส่วนวงล้อเทียบกับที่ต้องใช้จากแรงบิดด้วยตนเองโดยใช้ h = 0.707·T·P/4 แล้วพิมพ์คำตอบ',
      },
      debrief: {
        en: 'A cyclic torque T builds up momentum over a quarter of an orbit that the wheel must store and give back: about 0.707·T·P/4 by Starin and Eterno\'s rule (Table 19-11). A wheel too small saturates, and from then on the satellite turns with the disturbance. On a CubeSat the largest disturbance is often its own magnetism, so a magnetically clean build — twisted-pair wiring, no magnetic parts, the dipole measured and trimmed before launch — can stand in for a bigger wheel. The faster downlink is paid for in decibels, and with a 1 W radio they must come from antenna gain: a small dish focuses the same watt into a beam. That beam is then something the attitude control must keep on the station; the bench\'s pointing loss shows what an error costs, little while the beam is wide.',
        ru: 'Циклический возмущающий момент T за четверть витка накапливает кинетический момент, который маховик должен поглотить и отдать обратно: около 0,707·T·P/4 по правилу Старина и Этерно (табл. 19-11). Слишком малый маховик насыщается, и дальше спутник поворачивается вместе с возмущением. У кубсата самое большое возмущение часто — его собственный магнетизм, поэтому магнитно чистая конструкция — витые пары, отсутствие магнитных деталей, измерение и компенсация дипольного момента перед запуском — может заменить больший маховик. Более быструю передачу оплачивают децибелами, и при передатчике 1 Вт их приходится брать из усиления антенны: небольшая параболическая антенна собирает тот же ватт в луч. Этот луч система ориентации должна удерживать на станции; потери наведения на стенде показывают, во что обходится ошибка, — немного, пока луч широкий.',
        th: 'แรงบิดรบกวนแบบเป็นคาบ T สะสมโมเมนตัมขึ้นในหนึ่งในสี่รอบวงโคจร ซึ่งวงล้อต้องเก็บไว้แล้วคืนกลับ ประมาณ 0.707·T·P/4 ตามกฎของ Starin และ Eterno (ตาราง 19-11) วงล้อที่เล็กเกินไปจะอิ่มตัว และหลังจากนั้นดาวเทียมจะหมุนไปตามแรงรบกวน สำหรับคิวบ์แซต แรงบิดรบกวนที่มากที่สุดมักมาจากความเป็นแม่เหล็กของตัวเอง การสร้างดาวเทียมให้สะอาดทางแม่เหล็ก ทั้งเดินสายแบบคู่บิดเกลียว ไม่ใช้ชิ้นส่วนที่เป็นแม่เหล็ก และวัดแล้วชดเชยไดโพลก่อนปล่อย จึงใช้แทนวงล้อที่ใหญ่ขึ้นได้ อัตราข้อมูลที่สูงขึ้นต้องจ่ายด้วยเดซิเบล และเมื่อวิทยุมีกำลังเพียง 1 วัตต์ เดซิเบลเหล่านั้นต้องมาจากอัตราขยายของสายอากาศ จานขนาดเล็กรวมกำลังหนึ่งวัตต์เดิมให้เป็นลำคลื่น ลำคลื่นนั้นระบบควบคุมท่าทางต้องชี้ไปที่สถานีให้ได้ การสูญเสียจากการชี้บนแท่นทดสอบบอกว่าความคลาดเคลื่อนทำให้เสียไปเท่าใด ซึ่งยังน้อยตราบที่ลำคลื่นยังกว้าง',
      },
      start: { design: NAPA2_FAST },
      designDate: PACK_DESIGN_DATE, level: PACK_DESIGN_LEVEL,
      locked: designLocksBut('adcs.residualDipole', 'adcs.cpOffset', 'comms.txAntennaD'),
      criteria: [
        { id: 'wheel', kind: 'design', measure: 'sat.wheelMargin', min: 1 },
        { id: 'link', kind: 'design', measure: 'sat.linkMargin', min: 3 },
        {
          id: 'ratio', kind: 'answer', measure: 'sat.wheelMargin', tolPct: 5,
          prompt: { en: 'Wheel over need, 1 mN·m·s ÷ (0.707·T·P/4)', ru: 'Запас маховика: 1 мН·м·с ÷ (0,707·T·P/4)', th: 'วงล้อเทียบกับที่ต้องใช้: 1 mN·m·s ÷ (0.707·T·P/4)' },
        },
      ],
      hints: [
        { en: 'On the Attitude tab, "All together" is T, and the orbit\'s period P is about 95.4 min (5 720 s): h = 0.707·T·P/4 is the momentum the wheel must hold, and the wheel over need is 0.001 N·m·s ÷ h.', ru: 'На вкладке «Ориентация» «Суммарно» — это T, а период обращения P около 95,4 мин (5 720 с): h = 0,707·T·P/4 — кинетический момент, который должен вместить маховик, а запас маховика равен 0,001 Н·м·с ÷ h.', th: 'ในแท็บ «ท่าทาง» ค่า «รวมทั้งหมด» คือ T และคาบการโคจร P ประมาณ 95.4 นาที (5 720 วินาที) h = 0.707·T·P/4 คือโมเมนตัมที่วงล้อต้องเก็บ และวงล้อเทียบกับที่ต้องใช้คือ 0.001 N·m·s ÷ h' },
        { en: 'Compare the four torques: on this CubeSat the magnetic one, the residual dipole times the field, is far the largest, so halving the dipole nearly halves T.', ru: 'Сравните четыре момента: у этого кубсата магнитный — остаточный магнитный момент, умноженный на индукцию поля, — намного больше остальных, поэтому уменьшение диполя вдвое почти вдвое уменьшает T.', th: 'เปรียบเทียบแรงบิดทั้งสี่: สำหรับคิวบ์แซตดวงนี้ แรงบิดแม่เหล็ก คือไดโพลตกค้างคูณสนามแม่เหล็ก มากกว่าตัวอื่นมาก การลดไดโพลลงครึ่งหนึ่งจึงลด T ลงเกือบครึ่งหนึ่ง' },
        { en: 'Four times the data rate costs 10·log₁₀ 4 ≈ 6 dB. A dish of diameter D gains about 0.55·(πD/λ)²; at 8.38 GHz (λ ≈ 3.6 cm) even 10 cm gives some 16 dBi and a beam about 25° wide, which a 1° pointing error hardly dents.', ru: 'Вчетверо большая скорость стоит 10·lg 4 ≈ 6 дБ. Параболическая антенна диаметром D даёт усиление около 0,55·(πD/λ)²; на 8,38 ГГц (λ ≈ 3,6 см) даже 10 см дают около 16 дБи и луч шириной около 25°, которому ошибка наведения в 1° почти не вредит.', th: 'อัตราข้อมูลสี่เท่าต้องแลกด้วย 10·log₁₀ 4 ≈ 6 dB จานเส้นผ่านศูนย์กลาง D ให้อัตราขยายประมาณ 0.55·(πD/λ)² ที่ 8.38 GHz (λ ≈ 3.6 ซม.) แม้จานเพียง 10 ซม. ก็ให้ราว 16 dBi และลำคลื่นกว้างประมาณ 25° ซึ่งความคลาดเคลื่อนในการชี้ 1° แทบไม่มีผล' },
      ],
    },
  ],
};
