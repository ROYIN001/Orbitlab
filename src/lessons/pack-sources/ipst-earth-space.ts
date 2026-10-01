/**
 * Pack: IPST additional course Earth, Astronomy and Space, grade 12 (roadmap
 * T03; the T03 research's §3, lessons A1–A4). Learning outcomes 11 (Kepler
 * and Newton; periods), 15–16 (apparent and mean solar time; time zones) and
 * 18 (space exploration), from IPST's ตัวชี้วัดและสาระการเรียนรู้แกนกลาง
 * (2017 revision) and the course's teacher's guide (scimath.org e-book
 * 8418). A1 and A2 are written here; A3 and A4 are built-in lessons 6.1 and
 * 5.3 by reference. A5 (a new case sheet: the station seen from Bangkok)
 * comes in a later stage. Worked solutions: tests/lesson-packs.test.ts.
 */
import { POINT_MASS, locksBut, missionDoc, ALL_LOCKS, type PackSource } from './common';

export const IPST_EARTH_SPACE: PackSource = {
  pack: {
    id: 'ipst-earth-space',
    title: {
      en: 'IPST Earth, astronomy and space: orbits, time and space exploration',
      ru: 'IPST, курс «Земля, астрономия и космос»: орбиты, время и освоение космоса',
      th: 'โลก ดาราศาสตร์ และอวกาศ (สสวท.): วงโคจร เวลา และการสำรวจอวกาศ',
    },
    audience: {
      en: 'Grade 12 (M.6), additional science course',
      ru: '12 класс (М.6), углублённый курс естествознания',
      th: 'ชั้น ม.6 รายวิชาเพิ่มเติมวิทยาศาสตร์',
    },
    framework: {
      en: 'IPST learning outcomes for the additional course Earth, Astronomy and Space, 2017 revision (B.E. 2560)',
      ru: 'Результаты обучения IPST по углублённому курсу «Земля, астрономия и космос», редакция 2017 г. (2560 г. буддийской эры)',
      th: 'ผลการเรียนรู้ รายวิชาเพิ่มเติมวิทยาศาสตร์ โลก ดาราศาสตร์ และอวกาศ (ฉบับปรับปรุง พ.ศ. 2560)',
    },
    reviewed: false,
    description: {
      en: 'Matched to learning outcomes 11, 15, 16 and 18 of the Earth, Astronomy and Space course. Sources: IPST, ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้วิทยาศาสตร์ (ฉบับปรับปรุง พ.ศ. 2560), ipst.ac.th, book pp. 234–237; IPST, คู่มือการใช้หลักสูตรรายวิชาเพิ่มเติมวิทยาศาสตร์ วิชาโลก ดาราศาสตร์และอวกาศ, scimath.org e-book 8418, book pp. 27–29. The first two lessons are written for this pack; the other two are the app\'s own lessons, listed again with the outcomes they meet.',
      ru: 'Соответствует результатам обучения 11, 15, 16 и 18 курса «Земля, астрономия и космос». Источники: IPST, ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้วิทยาศาสตร์ (ฉบับปรับปรุง พ.ศ. 2560), ipst.ac.th, с. 234–237 издания; IPST, คู่มือการใช้หลักสูตรรายวิชาเพิ่มเติมวิทยาศาสตร์ วิชาโลก ดาราศาสตร์และอวกาศ, scimath.org, электронная книга 8418, с. 27–29. Первые два урока написаны для этого набора; два других — уроки самого приложения, приведённые здесь ещё раз с результатами, которым они отвечают.',
      th: 'สอดคล้องกับผลการเรียนรู้ข้อ 11, 15, 16 และ 18 ของรายวิชาโลก ดาราศาสตร์ และอวกาศ แหล่งที่มา: สสวท., ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้วิทยาศาสตร์ (ฉบับปรับปรุง พ.ศ. 2560), ipst.ac.th หน้า 234–237 ของเล่ม และ สสวท., คู่มือการใช้หลักสูตรรายวิชาเพิ่มเติมวิทยาศาสตร์ วิชาโลก ดาราศาสตร์และอวกาศ, scimath.org หนังสืออิเล็กทรอนิกส์ 8418 หน้า 27–29 สองบทแรกเขียนขึ้นสำหรับชุดนี้ อีกสองบทเป็นบทเรียนเดิมของโปรแกรมที่นำมาจัดไว้ในชุดนี้พร้อมผลการเรียนรู้ที่สอดคล้อง',
    },
    contents: [
      { id: 'ipst-a-kepler3' },
      { id: 'ipst-a-sun-clock' },
      {
        id: 'case-theos2',
        curriculum: [{ code: 'ดศ ม.6 ผล 15', kind: 'outcome' }, { code: 'ดศ ม.6 ผล 16', kind: 'outcome' }, { code: 'ดศ ม.6 ผล 18', kind: 'outcome' }],
        note: {
          en: 'Mean solar time from a real satellite: the case\'s local-time question is outcome 16\'s clock, and the 0.9856° a day its plane must turn is the Sun\'s mean motion.',
          ru: 'Среднее солнечное время на настоящем спутнике: вопрос кейса о местном времени — это часы результата 16, а 0,9856° в сутки, на которые должна поворачиваться плоскость, — среднее движение Солнца.',
          th: 'เวลาสุริยคติปานกลางจากดาวเทียมจริง: คำถามเรื่องเวลาท้องถิ่นในกรณีศึกษานี้คือนาฬิกาของผลการเรียนรู้ข้อ 16 และ 0.9856° ต่อวันที่ระนาบต้องหมุนก็คือการเคลื่อนที่เฉลี่ยของดวงอาทิตย์',
        },
      },
      {
        id: 'adv-history',
        curriculum: [{ code: 'ดศ ม.6 ผล 11', kind: 'outcome' }, { code: 'ดศ ม.6 ผล 18', kind: 'outcome' }],
        note: {
          en: 'The first satellite: the period from Kepler\'s third law, and the start of space exploration.',
          ru: 'Первый спутник: период по третьему закону Кеплера и начало освоения космоса.',
          th: 'ดาวเทียมดวงแรก: คาบจากกฎข้อที่สามของเคปเลอร์ และจุดเริ่มต้นของการสำรวจอวกาศ',
        },
      },
    ],
  },
  lessons: [
    {
      id: 'ipst-a-kepler3', track: 12, order: 1, mode: 'explore', domains: [2], tags: ['T² ∝ a³', 'GTO'],
      curriculum: [{ code: 'ดศ ม.6 ผล 11', kind: 'outcome' }],
      title: { en: 'Kepler\'s third law on a transfer orbit', ru: 'Третий закон Кеплера на переходной орбите', th: 'กฎข้อที่สามของเคปเลอร์บนวงโคจรถ่ายโอน' },
      brief: {
        en: 'Falcon 9 puts a 4.15 t communications satellite from Cape Canaveral into a geostationary transfer orbit: a long ellipse from about 250 km up to the height of the geostationary ring, 35 786 km. Fly it. Then, from the perigee and apogee heights the flight actually reached — the event log\'s line "Target orbit achieved" gives them at the moment the orbit was reached — work out the ellipse\'s semi-major axis a, its period from Kepler\'s third law, and its eccentricity, and type them in.',
        ru: 'Falcon 9 выводит связной спутник массой 4,15 т с мыса Канаверал на геопереходную орбиту — вытянутый эллипс от высоты около 250 км до высоты геостационарного кольца, 35 786 км. Выполните полёт. Затем по высотам перигея и апогея, действительно достигнутым в полёте (их в момент выхода на орбиту приводит строка журнала событий «Целевая орбита достигнута»), рассчитайте большую полуось эллипса a, его период по третьему закону Кеплера и эксцентриситет и введите их.',
        th: 'Falcon 9 นำดาวเทียมสื่อสารมวล 4.15 ตันจากแหลมคะแนเวอรัลเข้าสู่วงโคจรถ่ายโอนค้างฟ้า ซึ่งเป็นวงรียาวตั้งแต่ความสูงประมาณ 250 กม. ไปจนถึงความสูงของวงโคจรค้างฟ้า 35 786 กม. ให้บินภารกิจนี้ แล้วใช้ความสูงจุดใกล้โลกและจุดไกลโลกที่การบินทำได้จริง (บรรทัด «ถึงวงโคจรเป้าหมาย» ในบันทึกเหตุการณ์บอกค่าทั้งสองไว้ ณ ขณะที่เข้าวงโคจร) คำนวณกึ่งแกนเอก a ของวงรี คาบการโคจรตามกฎข้อที่สามของเคปเลอร์ และความเยื้องศูนย์กลาง แล้วพิมพ์คำตอบ',
      },
      debrief: {
        en: 'Kepler found from the planets that T² is proportional to a³; Newton\'s gravitation explains it: T = 2π√(a³/GM). Only the size of the orbit counts, not its shape: this ellipse of about 10½ hours and a circle with the same a have the same period. Put in the Sun\'s GM, 1.327 × 10¹¹ km³/s², and a = 1 AU = 1.496 × 10⁸ km, and the same formula gives the Earth\'s year, 365 days.',
        ru: 'Кеплер установил по наблюдениям планет, что T² пропорционален a³; закон всемирного тяготения Ньютона объясняет это: T = 2π√(a³/GM). Важен только размер орбиты, а не её форма: у этого эллипса с периодом около 10,5 ч и у окружности с той же a периоды одинаковы. Подставьте GM Солнца, 1,327 · 10¹¹ км³/с², и a = 1 а. е. = 1,496 · 10⁸ км — та же формула даст земной год, 365 сут.',
        th: 'เคปเลอร์พบจากการสังเกตดาวเคราะห์ว่า T² แปรผันตรงกับ a³ และกฎความโน้มถ่วงสากลของนิวตันอธิบายได้ว่า T = 2π√(a³/GM) คาบขึ้นกับขนาดของวงโคจรเท่านั้น ไม่ขึ้นกับรูปร่าง วงรีนี้ซึ่งมีคาบประมาณ 10 ชั่วโมงครึ่ง กับวงกลมที่มี a เท่ากันจึงมีคาบเท่ากัน ถ้าแทนค่า GM ของดวงอาทิตย์ 1.327 × 10¹¹ กม.³/วินาที² และ a = 1 AU = 1.496 × 10⁸ กม. สูตรเดียวกันนี้จะให้คาบของโลกคือ 365 วัน',
      },
      mission: missionDoc({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'comsat', payloadMass: 4150, orbitId: 'gto', dynamics: { ...POINT_MASS } }),
      locked: [...ALL_LOCKS],
      criteria: [
        { id: 'orbit', kind: 'outcome', is: 'target' },
        {
          id: 'a', kind: 'answer', measure: 'orbit.semiMajorAxis', tol: 25, unit: 'km',
          prompt: { en: 'Semi-major axis a (km)', ru: 'Большая полуось a (км)', th: 'กึ่งแกนเอก a (กม.)' },
        },
        {
          id: 'period', kind: 'answer', measure: 'orbit.period', tolPct: 1, unit: 'min',
          prompt: { en: 'Period (min)', ru: 'Период обращения (мин)', th: 'คาบการโคจร (นาที)' },
        },
        {
          id: 'e', kind: 'answer', measure: 'orbit.eccentricity', tol: 0.005,
          prompt: { en: 'Eccentricity e', ru: 'Эксцентриситет e', th: 'ความเยื้องศูนย์กลาง e' },
        },
      ],
      hints: [
        { en: 'The semi-major axis is half the ellipse\'s longest diameter: a = R + (h_p + h_a)/2, with the Earth\'s radius R = 6 378 km and the two heights from the line "Target orbit achieved". Later the heights on screen drift by tens of kilometres as the satellite goes round, because the Earth\'s bulge tugs at the orbit: use the line\'s.', ru: 'Большая полуось — половина наибольшего диаметра эллипса: a = R + (h_п + h_а)/2, где R = 6 378 км — радиус Земли, а высоты взяты из строки «Целевая орбита достигнута». Позже высоты на экране меняются на десятки километров по мере движения спутника: орбиту возмущает сжатие Земли. Берите значения из этой строки.', th: 'กึ่งแกนเอกคือครึ่งหนึ่งของเส้นผ่านศูนย์กลางที่ยาวที่สุดของวงรี: a = R + (h_p + h_a)/2 โดย R = 6 378 กม. คือรัศมีโลก และความสูงทั้งสองค่าดูจากบรรทัด «ถึงวงโคจรเป้าหมาย» ภายหลังค่าความสูงบนจอจะเปลี่ยนไปหลายสิบกิโลเมตรขณะดาวเทียมโคจร เพราะความป่องของโลกรบกวนวงโคจร จึงควรใช้ค่าจากบรรทัดนั้น' },
        { en: 'Kepler\'s third law with Newton\'s gravitation: T = 2π√(a³/GM), GM = 398 600 km³/s². The answer comes in seconds: divide by 60.', ru: 'Третий закон Кеплера с законом тяготения Ньютона: T = 2π√(a³/GM), GM = 398 600 км³/с². Ответ получится в секундах — разделите на 60.', th: 'กฎข้อที่สามของเคปเลอร์ร่วมกับกฎความโน้มถ่วงของนิวตัน: T = 2π√(a³/GM) โดย GM = 398 600 กม.³/วินาที² คำตอบที่ได้มีหน่วยเป็นวินาที ให้หารด้วย 60' },
        { en: 'The eccentricity says how stretched the ellipse is: e = (r_a − r_p)/(r_a + r_p), with r_p = R + h_p and r_a = R + h_a. A circle has e = 0.', ru: 'Эксцентриситет показывает, насколько вытянут эллипс: e = (r_а − r_п)/(r_а + r_п), где r_п = R + h_п и r_а = R + h_а. У окружности e = 0.', th: 'ความเยื้องศูนย์กลางบอกว่าวงรียืดออกมากเพียงใด: e = (r_a − r_p)/(r_a + r_p) โดย r_p = R + h_p และ r_a = R + h_a วงกลมมี e = 0' },
      ],
    },
    {
      id: 'ipst-a-sun-clock', track: 12, order: 2, mode: 'explore', domains: [2, 1], tags: ['SSO', 'LTAN'],
      curriculum: [{ code: 'ดศ ม.6 ผล 15', kind: 'outcome' }, { code: 'ดศ ม.6 ผล 16', kind: 'outcome' }],
      title: { en: 'An orbit that keeps the Sun\'s time', ru: 'Орбита, которая держит солнечное время', th: 'วงโคจรที่เดินตามเวลาของดวงอาทิตย์' },
      brief: {
        en: 'Vega-C stands at Kourou with a 1.15 t science satellite for a sun-synchronous orbit 600 km up, the kind of orbit THEOS-2 flies (a Vega launched it from Kourou too). The orbit\'s plane must cross the equator going north at 10:30 local solar time. The Earth turns under that plane, so only a launch at the right moment of the day puts the satellite into it — and the time on the panel is not that moment. Choose the launch time, fly, and type in the period of the orbit you reach. Only the launch time may be changed.',
        ru: 'Vega-C стоит в Куру с научным спутником массой 1,15 т для солнечно-синхронной орбиты высотой 600 км — такой, по какой летает THEOS-2 (его тоже запустила Vega из Куру). Плоскость орбиты должна пересекать экватор с юга на север в 10:30 по местному солнечному времени. Земля вращается под этой плоскостью, поэтому вывести в неё спутник можно лишь при старте в определённый момент суток, а время на панели — не этот момент. Выберите время старта, выполните полёт и введите период полученной орбиты. Изменять можно только время старта.',
        th: 'Vega-C ตั้งอยู่ที่คูรูพร้อมดาวเทียมวิทยาศาสตร์มวล 1.15 ตัน สำหรับวงโคจรสัมพันธ์กับดวงอาทิตย์ที่ความสูง 600 กม. ซึ่งเป็นวงโคจรแบบเดียวกับที่ THEOS-2 ใช้ (THEOS-2 ก็ขึ้นไปกับจรวด Vega จากคูรู) ระนาบของวงโคจรต้องตัดเส้นศูนย์สูตรขณะเคลื่อนขึ้นเหนือเวลา 10:30 น. ตามเวลาสุริยคติท้องถิ่น โลกหมุนอยู่ใต้ระนาบนั้น การปล่อยจรวดจึงต้องเกิดในช่วงเวลาที่พอดีของวันเท่านั้นดาวเทียมจึงจะเข้าระนาบนี้ได้ และเวลาในแผงตั้งค่ายังไม่ใช่ช่วงเวลานั้น ให้เลือกเวลาปล่อย บินภารกิจ แล้วพิมพ์คาบของวงโคจรที่ได้ เปลี่ยนได้เฉพาะเวลาปล่อยเท่านั้น',
      },
      debrief: {
        en: 'The app sets this crossing by the true Sun, that is, by apparent solar time: noon is when the Sun itself is over the meridian. Clocks keep mean solar time instead, by a mean Sun that moves evenly; the true Sun runs up to about a quarter of an hour ahead of it or behind it during the year (the equation of time) — in mid-September about 5 minutes ahead. Local mean time is UTC plus the longitude ÷ 15° per hour: at Kourou (52.8° W) about UTC − 3 h 31 min, in Bangkok (100.5° E) UTC + 6 h 42 min, while the clocks there keep the zone times UTC − 3 and UTC + 7. The Earth\'s bulge (J₂) turns this orbit\'s plane by 0.9856° a day, as fast as the Sun moves around the sky on average, so the crossing stays near 10:30 all year and a camera satellite sees each place in much the same light.',
        ru: 'Приложение задаёт это пересечение по истинному Солнцу, то есть по истинному солнечному времени: полдень — когда над меридианом само Солнце. Часы же идут по среднему солнечному времени — по среднему Солнцу, которое движется равномерно; истинное Солнце в течение года опережает его или отстаёт примерно на четверть часа (уравнение времени), в середине сентября — опережает примерно на 5 мин. Местное среднее время равно UTC плюс долгота ÷ 15° в час: в Куру (52,8° з. д.) — около UTC − 3 ч 31 мин, в Бангкоке (100,5° в. д.) — UTC + 6 ч 42 мин, тогда как часы там идут по поясному времени UTC − 3 и UTC + 7. Сжатие Земли (J₂) поворачивает плоскость этой орбиты на 0,9856° в сутки — так же быстро, как Солнце в среднем перемещается по небу, поэтому пересечение весь год остаётся около 10:30, и спутник со съёмочной камерой видит каждое место почти при одном и том же освещении.',
        th: 'โปรแกรมกำหนดเวลาที่ระนาบตัดเส้นศูนย์สูตรตามดวงอาทิตย์จริง คือตามเวลาสุริยคติปรากฏ เวลาเที่ยงคือตอนที่ดวงอาทิตย์จริงอยู่เหนือเส้นเมริเดียน ส่วนนาฬิกาใช้เวลาสุริยคติปานกลาง ซึ่งอิงดวงอาทิตย์เฉลี่ยที่เคลื่อนที่สม่ำเสมอ ในรอบปีดวงอาทิตย์จริงเดินเร็วกว่าหรือช้ากว่าดวงอาทิตย์เฉลี่ยได้ราวหนึ่งในสี่ชั่วโมง เรียกว่าสมการเวลา ช่วงกลางเดือนกันยายนเร็วกว่าประมาณ 5 นาที เวลาปานกลางท้องถิ่นเท่ากับ UTC บวกลองจิจูดหารด้วย 15° ต่อชั่วโมง ที่คูรู (52.8° ตะวันตก) ประมาณ UTC − 3 ชม. 31 นาที ที่กรุงเทพฯ (100.5° ตะวันออก) UTC + 6 ชม. 42 นาที ขณะที่นาฬิกาของทั้งสองแห่งใช้เวลามาตรฐานตามเขตเวลา UTC − 3 และ UTC + 7 ความป่องของโลก (J₂) หมุนระนาบของวงโคจรนี้วันละ 0.9856° เร็วเท่ากับที่ดวงอาทิตย์เคลื่อนไปบนท้องฟ้าโดยเฉลี่ย เวลาที่ระนาบตัดเส้นศูนย์สูตรจึงอยู่ใกล้ 10:30 น. ตลอดปี และดาวเทียมถ่ายภาพเห็นแต่ละพื้นที่ภายใต้แสงที่ใกล้เคียงกันทุกครั้ง',
      },
      mission: missionDoc({ vehicleId: 'vegac', siteId: 'kourou', satelliteId: 'science', payloadMass: 1150, orbitId: 'sso', dynamics: { ...POINT_MASS } }),
      locked: locksBut('setup.launchTime'),
      criteria: [
        { id: 'orbit', kind: 'outcome', is: 'target' },
        { id: 'inclination', kind: 'measure', measure: 'orbit.inclination', target: 'mission', tol: 0.1 },
        {
          id: 'node', kind: 'measure', measure: 'orbit.raanError', max: 0.5,
          label: { en: 'The plane crosses the equator at 10:30 (node error)', ru: 'Плоскость пересекает экватор в 10:30 (ошибка по узлу)', th: 'ระนาบตัดเส้นศูนย์สูตรเวลา 10:30 น. (ความคลาดของโหนด)' },
        },
        {
          id: 'period', kind: 'answer', measure: 'orbit.period', tol: 0.5, unit: 'min',
          prompt: { en: 'Period of the orbit (min)', ru: 'Период обращения (мин)', th: 'คาบการโคจร (นาที)' },
        },
      ],
      hints: [
        { en: 'Solar time follows the Sun: it is noon where the Sun is over the meridian, and the Sun moves 15° of longitude west every hour. The plane\'s crossing has to sit at 10:30 by that clock, wherever on the equator it falls.', ru: 'Солнечное время идёт по Солнцу: полдень там, где Солнце над меридианом, а каждый час Солнце смещается на 15° долготы к западу. Пересечение экватора плоскостью должно приходиться на 10:30 по этим часам, где бы на экваторе оно ни было.', th: 'เวลาสุริยคติเดินตามดวงอาทิตย์ เวลาเที่ยงคือที่ซึ่งดวงอาทิตย์อยู่เหนือเส้นเมริเดียน และดวงอาทิตย์เลื่อนไปทางตะวันตก 15° ของลองจิจูดทุกชั่วโมง จุดที่ระนาบตัดเส้นศูนย์สูตรต้องตรงกับเวลา 10:30 น. ตามนาฬิกานี้ ไม่ว่าจุดนั้นจะอยู่ที่ใดบนเส้นศูนย์สูตร' },
        { en: 'The setup panel\'s "Next window" button finds the moment Kourou passes under the plane; the verdict above the Launch button says how far the plane would be missed.', ru: 'Кнопка «Ближайшее окно» на панели настройки находит момент, когда Куру проходит под плоскостью; заключение над кнопкой «Пуск» показывает, на сколько промахнётся плоскость.', th: 'ปุ่ม «หน้าต่างถัดไป» ในแผงตั้งค่าจะหาเวลาที่คูรูเคลื่อนเข้าใต้ระนาบนั้น และข้อสรุปเหนือปุ่มปล่อยจรวดจะบอกว่าระนาบจะคลาดไปเท่าใด' },
        { en: 'The period follows from Kepler\'s third law: T = 2π√(a³/GM), with a = 6 378 km + the height reached and GM = 398 600 km³/s².', ru: 'Период следует из третьего закона Кеплера: T = 2π√(a³/GM), где a = 6 378 км + достигнутая высота, GM = 398 600 км³/с².', th: 'คาบหาได้จากกฎข้อที่สามของเคปเลอร์: T = 2π√(a³/GM) โดย a = 6 378 กม. + ความสูงที่ได้ และ GM = 398 600 กม.³/วินาที²' },
      ],
    },
  ],
};
