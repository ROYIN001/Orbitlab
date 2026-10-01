/**
 * Pack: IPST basic science, upper secondary (roadmap T03; the T03 research's
 * §2, lessons B1–B4). Standard ว 2.2 (forces and motion), grade 11 (ม.5)
 * indicators 1 and 3–6, and standard ว 3.1 (space), grade 12 (ม.6) indicator
 * 10, from IPST's ตัวชี้วัดและสาระการเรียนรู้แกนกลาง (2017 revision); standard
 * ว 2.3 (energy and waves), grade 11 indicator 12, for B6. B1 and B2 are
 * written here; B3 and B4 are built-in lessons 1.4 and 6.1 by reference.
 * B5 and B6 come with T03b: B5 a case lesson on the CZ-5B sheet with its new
 * space-weather question (the same re-entry through a geomagnetic storm,
 * R05; standard ว 3.1 grade 12 indicator 9), B6 a design lesson (T01's
 * kind): a Thaicom-class downlink brought to a 3 dB margin.
 * Worked solutions: tests/lesson-packs.test.ts (flights) and
 * tests/lesson-packs-design.test.ts (designs).
 */
import {
  ALL_LOCKS, PACK_DESIGN_DATE, PACK_DESIGN_LEVEL, POINT_MASS, designFrom, designLocksBut, geoRaan, missionDoc, windowAfter, type PackSource,
} from './common';

/**
 * B6's start: the communications template (src/data/satellite-templates.ts)
 * placed at 119.5° E, Thaicom 4's longitude, on the lesson's day, with a
 * national beam and a home dish in Bangkok. The 45 cm dish gives a beam of
 * about 4° at 12 GHz (the model's 21°/(f·D), about 70 λ/D), which covers Thailand from the
 * geostationary height; the 60 cm dish is a home Ku-band dish; the 20 W is
 * where the student starts, about 6 dB short. The station's noise and the
 * path's other losses are the template's (Palo et al.'s NEN station), and
 * the 30 Mbit/s its data rate: estimates for a TV link, said in the brief
 * only as the numbers on the bench.
 */
const THAICOM_CLASS = designFrom('comsat', 'ipst-b-thaicom-link', 'GEO 119.5°E', {
  'orbit.raan': geoRaan(119.5, PACK_DESIGN_DATE), 'comms.txAntennaD': 0.45, 'comms.rxAntennaD': 0.6, 'comms.txPowerW': 20,
});

export const IPST_BASIC: PackSource = {
  pack: {
    id: 'ipst-basic',
    title: {
      en: 'IPST basic science: forces, gravity and satellites',
      ru: 'IPST, базовый курс естествознания: силы, тяготение и спутники',
      th: 'วิทยาศาสตร์พื้นฐาน (สสวท.): แรง ความโน้มถ่วง และดาวเทียม',
    },
    audience: {
      en: 'Upper secondary school, grades 11–12 (M.5–M.6)',
      ru: 'Старшая школа Таиланда, 11–12 классы (М.5–М.6)',
      th: 'มัธยมศึกษาตอนปลาย ชั้น ม.5–ม.6',
    },
    framework: {
      en: 'IPST indicators for science, 2017 revision (B.E. 2560) of the Basic Education Core Curriculum B.E. 2551',
      ru: 'Индикаторы IPST по естествознанию, редакция 2017 г. (2560 г. буддийской эры) Основной учебной программы базового образования 2008 г.',
      th: 'ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้วิทยาศาสตร์ (ฉบับปรับปรุง พ.ศ. 2560) ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551',
    },
    reviewed: false,
    description: {
      en: 'Matched to standard ว 2.2 (forces and motion), grade 11 indicators 1 and 3–6, standard ว 2.3 (energy and waves), grade 11 indicator 12, and standard ว 3.1 (the universe and space), grade 12 indicators 9 and 10. Source: IPST, ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้วิทยาศาสตร์ (ฉบับปรับปรุง พ.ศ. 2560), ipst.ac.th, book pp. 65–66, 78 and 86–87. Lessons 11.1 and 11.2 are flights written for this pack, 11.3 a case worked from the record and 11.4 a satellite to design; 1.4 and 6.1 are the app\'s own lessons, listed again with the codes they meet.',
      ru: 'Соответствует стандарту ว 2.2 (силы и движение), индикаторам 1 и 3–6 для 11 класса, стандарту ว 2.3 (энергия и волны), индикатору 12 для 11 класса, и стандарту ว 3.1 (Вселенная и космос), индикаторам 9 и 10 для 12 класса. Источник: IPST, ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้วิทยาศาสตร์ (ฉบับปรับปรุง พ.ศ. 2560), ipst.ac.th, с. 65–66, 78 и 86–87 издания. Уроки 11.1 и 11.2 — полёты, написанные для этого набора, 11.3 — разбор реального случая, 11.4 — проект спутника; 1.4 и 6.1 — уроки самого приложения, приведённые здесь ещё раз с кодами, которым они отвечают.',
      th: 'สอดคล้องกับมาตรฐาน ว 2.2 (แรงและการเคลื่อนที่) ตัวชี้วัดชั้น ม.5 ข้อ 1 และข้อ 3–6 มาตรฐาน ว 2.3 (พลังงานและคลื่น) ตัวชี้วัดชั้น ม.5 ข้อ 12 และมาตรฐาน ว 3.1 (เอกภพและอวกาศ) ตัวชี้วัดชั้น ม.6 ข้อ 9 และ 10 แหล่งที่มา: สสวท., ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้วิทยาศาสตร์ (ฉบับปรับปรุง พ.ศ. 2560), ipst.ac.th หน้า 65–66, 78 และ 86–87 ของเล่ม บทที่ 11.1 และ 11.2 เป็นการบินที่เขียนขึ้นสำหรับชุดนี้ บทที่ 11.3 เป็นกรณีศึกษาจากเหตุการณ์จริง บทที่ 11.4 เป็นการออกแบบดาวเทียม ส่วนบทที่ 1.4 และ 6.1 เป็นบทเรียนเดิมของโปรแกรมที่นำมาจัดไว้ในชุดนี้พร้อมรหัสตัวชี้วัดที่สอดคล้อง',
    },
    contents: [
      { id: 'ipst-b-forces' },
      { id: 'ipst-b-falling-around' },
      {
        id: 'orbit-payload',
        curriculum: [{ code: 'ว 2.2 ม.5/3', kind: 'indicator' }, { code: 'ว 2.2 ม.5/5', kind: 'indicator' }],
        note: {
          en: 'Mass and acceleration: every kilogram of payload rides the second stage all the way, so the same thrust gives it less speed. Too heavy, and the stage falls back like a projectile instead of going round.',
          ru: 'Масса и ускорение: каждый килограмм нагрузки вторая ступень несёт до конца, и та же тяга сообщает ей меньшую скорость. Слишком тяжёлая нагрузка — и ступень падает обратно, как брошенное тело, а не обращается вокруг Земли.',
          th: 'มวลกับความเร่ง: น้ำหนักบรรทุกทุกกิโลกรัมอยู่บนขั้นที่ 2 ตลอดทาง แรงขับเท่าเดิมจึงให้อัตราเร็วน้อยลง ถ้าหนักเกินไป ขั้นจรวดจะตกกลับลงมาแบบโพรเจกไทล์แทนที่จะโคจรรอบโลก',
        },
      },
      {
        id: 'case-theos2',
        curriculum: [{ code: 'ว 3.1 ม.6/10', kind: 'indicator' }],
        note: {
          en: 'Space technology put to use: Thailand\'s own Earth-observation satellite, and the orbit chosen for its work.',
          ru: 'Космические технологии на практике: собственный таиландский спутник наблюдения Земли и орбита, выбранная для его работы.',
          th: 'การนำเทคโนโลยีอวกาศมาใช้ประโยชน์: ดาวเทียมสำรวจทรัพยากรของไทยเอง และวงโคจรที่เลือกให้เหมาะกับงานของมัน',
        },
      },
      { id: 'ipst-b-solar-storms' },
      { id: 'ipst-b-thaicom-link' },
    ],
  },
  lessons: [
    {
      id: 'ipst-b-forces', track: 11, order: 1, mode: 'explore', domains: [3, 1], tags: ['F = ma', 'max-Q'],
      curriculum: [{ code: 'ว 2.2 ม.5/1', kind: 'indicator' }, { code: 'ว 2.2 ม.5/3', kind: 'indicator' }, { code: 'ว 2.2 ม.5/4', kind: 'indicator' }],
      title: { en: 'Forces on a rocket', ru: 'Силы, действующие на ракету', th: 'แรงที่กระทำต่อจรวด' },
      brief: {
        en: 'Falcon 9 carries 10 t from Cape Canaveral into a circular orbit 500 km up, and everything is set: press Launch and watch the telemetry panel\'s Acceleration (g) chart. The engines push the rocket up, its weight pulls it down, and while it is low the air pushes back against it. How fast it speeds up follows Newton\'s second law, a = F/m. When the flight is over, read two numbers from it and type them in: the largest acceleration the chart shows, and the time after liftoff at which the air pushed hardest on the rocket (max-Q).',
        ru: 'Falcon 9 выводит 10 т с мыса Канаверал на круговую орбиту высотой 500 км; всё уже настроено. Нажмите «Пуск» и следите за графиком «Перегрузка (g)» на панели телеметрии. Двигатели толкают ракету вверх, сила тяжести тянет её вниз, а пока ракета низко, движению противодействует воздух. Как быстро ракета разгоняется, определяет второй закон Ньютона: a = F/m. После полёта определите по графику и журналу событий два числа и введите их: наибольшую перегрузку на графике и время после отрыва, когда воздух давил на ракету сильнее всего (максимальный скоростной напор, max-Q).',
        th: 'Falcon 9 นำน้ำหนักบรรทุก 10 ตันจากแหลมคะแนเวอรัลขึ้นสู่วงโคจรวงกลมที่ความสูง 500 กม. ทุกอย่างตั้งค่าไว้แล้ว ให้กด «ปล่อยจรวด» แล้วสังเกตกราฟ «ความเร่ง (g)» ในแผงโทรมาตร เครื่องยนต์ผลักจรวดขึ้น น้ำหนักของจรวดดึงลง และขณะที่จรวดยังอยู่ต่ำ อากาศก็ต้านการเคลื่อนที่ไว้ จรวดจะมีความเร่งมากหรือน้อยเป็นไปตามกฎการเคลื่อนที่ข้อที่สองของนิวตัน a = F/m เมื่อบินเสร็จแล้ว ให้อ่านค่าสองค่าจากการบินแล้วพิมพ์คำตอบ ได้แก่ ความเร่งสูงสุดที่กราฟแสดง และเวลาหลังจรวดยกตัวที่อากาศกดจรวดแรงที่สุด (ความดันพลวัตสูงสุด หรือ max-Q)',
      },
      debrief: {
        en: 'The engines throw the exhaust down, and the exhaust pushes the rocket up with an equal and opposite force: action and reaction, Newton\'s third law. The thrust hardly changes while the first stage burns more than two tonnes of propellant a second, so the mass falls and a = F/m grows — until, near 4.6 g, the flight computer throttles the engines back to hold the acceleration at the limit set for the payload. The chart shows the acceleration the thrust and the air give the rocket, which is what an accelerometer on board reads and what the payload feels; it drops at once when the first stage cuts off. The air\'s push grows with its density and with the square of the speed (q = ½ρv²): it is largest within the first minute, here at about 50 s, and then falls, because the air thins faster than the speed grows.',
        ru: 'Двигатели отбрасывают струю газов вниз, а газы толкают ракету вверх с равной по модулю и противоположно направленной силой — действие и противодействие, третий закон Ньютона. Тяга почти не меняется, а первая ступень сжигает больше двух тонн топлива в секунду, поэтому масса уменьшается и a = F/m растёт — пока около 4,6 g бортовой компьютер не дросселирует двигатели, удерживая перегрузку на пределе, допустимом для полезной нагрузки. График показывает ускорение, которое сообщают ракете тяга и воздух: его измеряет бортовой акселерометр, его испытывает нагрузка; при выключении первой ступени оно сразу падает. Давление встречного потока растёт с плотностью воздуха и квадратом скорости (q = ½ρv²): наибольшим оно бывает в первую минуту, здесь около 50-й секунды, а затем убывает, потому что воздух разрежается быстрее, чем растёт скорость.',
        th: 'เครื่องยนต์พ่นแก๊สไอเสียลงด้านล่าง แก๊สจึงผลักจรวดขึ้นด้วยแรงขนาดเท่ากันในทิศตรงข้าม นี่คือแรงกิริยาและแรงปฏิกิริยาตามกฎการเคลื่อนที่ข้อที่สามของนิวตัน แรงขับแทบไม่เปลี่ยน ขณะที่ขั้นที่ 1 เผาเชื้อเพลิงมากกว่าสองตันทุกวินาที มวลจึงลดลงและ a = F/m เพิ่มขึ้น จนเมื่อใกล้ 4.6 g คอมพิวเตอร์การบินจะหรี่เครื่องยนต์ลงเพื่อคุมความเร่งไว้ไม่ให้เกินค่าที่น้ำหนักบรรทุกรับได้ กราฟแสดงความเร่งที่แรงขับและอากาศให้แก่จรวด ซึ่งเป็นค่าที่มาตรความเร่งบนจรวดอ่านได้และเป็นภาระที่น้ำหนักบรรทุกรู้สึก ค่านี้ลดลงทันทีเมื่อขั้นที่ 1 ดับเครื่อง ส่วนแรงที่อากาศกดจรวดเพิ่มตามความหนาแน่นของอากาศและกำลังสองของอัตราเร็ว (q = ½ρv²) จึงมีค่าสูงสุดภายในนาทีแรก ในที่นี้ราววินาทีที่ 50 แล้วจึงลดลง เพราะอากาศเบาบางลงเร็วกว่าที่อัตราเร็วเพิ่มขึ้น',
      },
      mission: missionDoc({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 10000, orbitId: 'leo', dynamics: { ...POINT_MASS } }),
      locked: [...ALL_LOCKS],
      criteria: [
        { id: 'orbit', kind: 'outcome', is: 'target' },
        {
          id: 'peak-g', kind: 'answer', measure: 'maxG', tolPct: 10, unit: 'g',
          prompt: { en: 'Largest acceleration on the Acceleration (g) chart (g)', ru: 'Наибольшая перегрузка на графике «Перегрузка (g)» (g)', th: 'ความเร่งสูงสุดบนกราฟความเร่ง (g)' },
        },
        {
          id: 'maxq-time', kind: 'answer', measure: 'maxQTime', tol: 5, unit: 's',
          prompt: { en: 'Time of max-Q, when the air pushed hardest (s after liftoff)', ru: 'Время максимального скоростного напора (с после отрыва)', th: 'เวลาที่เกิดความดันพลวัตสูงสุด (วินาทีหลังยกตัว)' },
        },
      ],
      hints: [
        { en: 'The Acceleration (g) chart is in the telemetry panel: its highest point is the first answer. The event log lists max-Q with its time.', ru: 'График «Перегрузка (g)» — на панели телеметрии: его наивысшая точка и есть первый ответ. Журнал событий указывает max-Q вместе со временем.', th: 'กราฟ «ความเร่ง (g)» อยู่ในแผงโทรมาตร จุดสูงสุดของกราฟคือคำตอบข้อแรก ส่วนบันทึกเหตุการณ์จะบอก max-Q พร้อมเวลา' },
        { en: 'The thrust of the first stage hardly changes, but its mass falls by more than two tonnes every second. By a = F/m, what happens to the acceleration? Watch the curve near the end of the first stage.', ru: 'Тяга первой ступени почти постоянна, а её масса каждую секунду уменьшается больше чем на две тонны. Что по a = F/m происходит с ускорением? Посмотрите на кривую в конце работы первой ступени.', th: 'แรงขับของขั้นที่ 1 แทบไม่เปลี่ยน แต่มวลลดลงมากกว่าสองตันทุกวินาที ตาม a = F/m ความเร่งจะเป็นอย่างไร ลองดูเส้นกราฟช่วงท้ายของขั้นที่ 1' },
        { en: 'The air pushes hardest when it is still thick and the rocket is already fast: within the first minute of flight.', ru: 'Сильнее всего воздух давит, когда он ещё плотный, а ракета уже быстрая: в первую минуту полёта.', th: 'อากาศกดจรวดแรงที่สุดตอนที่อากาศยังหนาแน่นและจรวดเร็วแล้ว คือภายในนาทีแรกของการบิน' },
      ],
    },
    {
      id: 'ipst-b-falling-around', track: 11, order: 2, mode: 'explore', domains: [2, 1], tags: ['v = √(GM/r)', 'T'],
      curriculum: [{ code: 'ว 2.2 ม.5/5', kind: 'indicator' }, { code: 'ว 2.2 ม.5/6', kind: 'indicator' }],
      title: { en: 'Falling around the Earth', ru: 'Падение вокруг Земли', th: 'ตกรอบโลก' },
      brief: {
        en: 'Soyuz-2.1a takes a crewed spacecraft from Baikonur to the space station\'s orbit, 420 km up; the launch time is already in the window. An orbit is a fall: gravity pulls the spacecraft towards the Earth\'s centre all the time, but it moves sideways so fast that the ground curves away beneath it as quickly as it falls. Fly the mission, then work out for the orbit you reach the speed at which falling keeps pace with the curve of the Earth, and the time one revolution takes. Type both in.',
        ru: '«Союз-2.1а» выводит пилотируемый корабль с Байконура на орбиту станции высотой 420 км; время старта уже в окне. Орбита — это падение: тяготение всё время тянет корабль к центру Земли, но он так быстро летит по горизонтали, что поверхность Земли, искривляясь, уходит из-под него так же быстро, как он падает. Выполните полёт, а затем для полученной орбиты рассчитайте скорость, при которой падение поспевает за кривизной Земли, и время одного оборота. Введите оба числа.',
        th: 'Soyuz-2.1a นำยานอวกาศที่มีนักบินอวกาศจากไบโคนูร์ขึ้นสู่วงโคจรของสถานีอวกาศที่ความสูง 420 กม. เวลาปล่อยตั้งไว้ในหน้าต่างการปล่อยแล้ว การโคจรก็คือการตก แรงโน้มถ่วงดึงยานเข้าหาศูนย์กลางโลกตลอดเวลา แต่ยานเคลื่อนที่ไปทางข้างเร็วมากจนผิวโลกโค้งหนีออกไปใต้ยานเร็วพอ ๆ กับที่ยานตกลงมา ให้บินภารกิจนี้ แล้วคำนวณสำหรับวงโคจรที่ได้ว่า อัตราเร็วเท่าใดที่ทำให้การตกไปทันความโค้งของโลก และใช้เวลาเท่าใดในการโคจรครบหนึ่งรอบ พิมพ์คำตอบทั้งสองค่า',
      },
      debrief: {
        en: 'At 420 km gravity is still about 88 % of its pull on the ground; the crew float because they and their spacecraft fall together. On a circle the pull of gravity is exactly the centripetal force, GMm/r² = mv²/r, so v = √(GM/r) and T = 2πr/v — about 7.66 km/s and 93 minutes here. The mass m cancels: a crewed spacecraft and a small satellite on the same circle move together, as Galileo\'s falling bodies did.',
        ru: 'На высоте 420 км тяготение составляет ещё около 88 % земного; экипаж парит потому, что падает вместе с кораблём. На круговой орбите сила тяготения и есть центростремительная сила: GMm/r² = mv²/r, откуда v = √(GM/r) и T = 2πr/v — здесь около 7,66 км/с и 93 мин. Масса m сокращается: пилотируемый корабль и маленький спутник на одной окружности движутся одинаково, как падающие тела у Галилея.',
        th: 'ที่ความสูง 420 กม. แรงโน้มถ่วงยังมีประมาณ 88 % ของที่ผิวโลก นักบินอวกาศลอยตัวได้เพราะทั้งคนและยานตกไปด้วยกัน บนวงโคจรวงกลม แรงโน้มถ่วงทำหน้าที่เป็นแรงสู่ศูนย์กลางพอดี GMm/r² = mv²/r จึงได้ v = √(GM/r) และ T = 2πr/v ในที่นี้ประมาณ 7.66 กม./วินาที และ 93 นาที มวล m ตัดกันหมดไป ยานที่มีนักบินอวกาศกับดาวเทียมดวงเล็กบนวงโคจรเดียวกันจึงเคลื่อนที่เหมือนกัน เช่นเดียวกับวัตถุที่ตกในการทดลองของกาลิเลโอ',
      },
      mission: missionDoc({
        vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', payloadMass: 7150, orbitId: 'iss',
        launchTime: windowAfter('iss', 'baikonur'), dynamics: { ...POINT_MASS },
      }),
      locked: [...ALL_LOCKS],
      criteria: [
        { id: 'orbit', kind: 'outcome', is: 'target' },
        {
          id: 'speed', kind: 'answer', measure: 'orbit.speed', tol: 0.05, unit: 'km/s',
          prompt: { en: 'Orbital speed (km/s)', ru: 'Орбитальная скорость (км/с)', th: 'อัตราเร็วในวงโคจร (กม./วินาที)' },
        },
        {
          id: 'period', kind: 'answer', measure: 'orbit.period', tol: 1, unit: 'min',
          prompt: { en: 'Time for one revolution (min)', ru: 'Время одного оборота (мин)', th: 'เวลาที่ใช้โคจรครบหนึ่งรอบ (นาที)' },
        },
      ],
      hints: [
        { en: 'Before flying, try Newton\'s cannon in the Orbit section\'s playground: fire faster and faster until the ball no longer comes down.', ru: 'Перед полётом попробуйте «пушку Ньютона» в разделе «Орбита»: стреляйте всё быстрее, пока ядро не перестанет падать на Землю.', th: 'ก่อนบิน ลองใช้ «ปืนใหญ่ของนิวตัน» ในส่วนวงโคจรดู ยิงให้เร็วขึ้นเรื่อย ๆ จนลูกปืนไม่ตกกลับลงมาอีก' },
        { en: 'On a circle gravity is the centripetal force: GMm/r² = mv²/r, so v = √(GM/r), with GM = 398 600 km³/s² and r = 6 378 km plus the altitude you reached (the event log\'s line "Target orbit achieved" gives it).', ru: 'На круговой орбите тяготение — центростремительная сила: GMm/r² = mv²/r, откуда v = √(GM/r), где GM = 398 600 км³/с², а r = 6 378 км плюс достигнутая высота (её приводит строка журнала событий «Целевая орбита достигнута»).', th: 'บนวงกลม แรงโน้มถ่วงคือแรงสู่ศูนย์กลาง: GMm/r² = mv²/r จึงได้ v = √(GM/r) โดย GM = 398 600 กม.³/วินาที² และ r = 6 378 กม. บวกความสูงที่ยานไปถึง (ดูได้จากบรรทัด «ถึงวงโคจรเป้าหมาย» ในบันทึกเหตุการณ์)' },
        { en: 'One revolution is the length of the circle over the speed: T = 2πr/v. A check: at 500 km the speed is 7.61 km/s and the revolution takes 94.6 min; lower is faster.', ru: 'Один оборот — длина окружности, делённая на скорость: T = 2πr/v. Для проверки: на высоте 500 км скорость 7,61 км/с, а оборот занимает 94,6 мин; ниже — быстрее.', th: 'เวลาหนึ่งรอบคือเส้นรอบวงหารด้วยอัตราเร็ว: T = 2πr/v ใช้ตรวจสอบได้ว่า ที่ความสูง 500 กม. อัตราเร็วเป็น 7.61 กม./วินาที และโคจรรอบหนึ่งใช้ 94.6 นาที ยิ่งต่ำยิ่งเร็ว' },
      ],
    },
    {
      kind: 'case', case: 'cz5b', id: 'ipst-b-solar-storms', track: 11, order: 3, mode: 'explore', domains: [1, 2], tags: ['R05', 'F10.7', 'Kp'],
      curriculum: [{ code: 'ว 3.1 ม.6/9', kind: 'indicator' }],
      title: { en: 'Solar storms bring satellites down sooner', ru: 'Солнечные бури ускоряют сход спутников', th: 'พายุสุริยะทำให้ดาวเทียมตกเร็วขึ้น' },
      brief: {
        en: 'The Sun sends out a steady solar wind and, now and then, storms: bursts of particles that shake the Earth\'s magnetic field and heat the top of its atmosphere. Here is a real object they act on. In April 2021 the 21.6-tonne core stage of the rocket that launched China\'s Tianhe module was left in a low orbit, and the thin air slowly brought it down on 9 May. Real satellites opens at the re-entry tool, with the stage\'s data below. Work out its cross-section as it tumbles and its ballistic coefficient, the agencies\' ±20 % window around this app\'s prediction, and, from the two extra predictions in the data — one with a quiet magnetic field, one through a strong storm — how many days sooner the storm would have brought it down. Then say why the agencies give a window rather than a time.',
        ru: 'Солнце непрерывно испускает солнечный ветер, а время от времени — бури: выбросы частиц, которые возмущают магнитное поле Земли и нагревают верхние слои её атмосферы. Вот реальный объект, на который они действуют. В апреле 2021 года центральная ступень массой 21,6 т ракеты, выведшей китайский модуль «Тяньхэ», осталась на низкой орбите, и разреженный воздух, постепенно тормозя её, 9 мая свёл её с орбиты. Раздел «Реальные спутники» открывается на инструменте прогноза схода; данные ступени — ниже. Рассчитайте среднюю площадь сечения кувыркающейся ступени и её баллистический коэффициент, окно ±20 % вокруг прогноза приложения, как у служб прогноза, и по двум дополнительным прогнозам в данных — при спокойном магнитном поле и при сильной буре — на сколько суток раньше буря свела бы ступень с орбиты. Затем объясните, почему службы дают окно, а не точное время.',
        th: 'ดวงอาทิตย์ปล่อยลมสุริยะออกมาตลอดเวลา และบางครั้งก็เกิดพายุสุริยะ คือการพ่นอนุภาคออกมาจำนวนมากจนสนามแม่เหล็กโลกแปรปรวนและบรรยากาศชั้นบนร้อนขึ้น นี่คือวัตถุจริงที่ได้รับผลนั้น เมื่อเดือนเมษายน 2021 ท่อนจรวดหลักหนัก 21.6 ตันของจรวดที่ส่งโมดูล Tianhe ของจีนถูกทิ้งไว้ในวงโคจรต่ำ และอากาศเบาบางค่อย ๆ ดึงให้ตกลงมาเมื่อ 9 พฤษภาคม ส่วนดาวเทียมจริงจะเปิดที่เครื่องมือทำนายการตก โดยมีข้อมูลของท่อนจรวดอยู่ด้านล่าง ให้คำนวณพื้นที่หน้าตัดเฉลี่ยขณะหมุนคว้างและค่าสัมประสิทธิ์ขีปนวิถี ช่วงเวลา ±20 % ที่หน่วยงานติดตามวัตถุอวกาศใช้รอบค่าทำนายของแอปนี้ และจากค่าทำนายเพิ่มเติมสองค่าในข้อมูล ค่าหนึ่งเมื่อสนามแม่เหล็กสงบ อีกค่าหนึ่งเมื่อเกิดพายุรุนแรง ให้หาว่าพายุจะทำให้ท่อนจรวดตกเร็วขึ้นกี่วัน แล้วอธิบายว่าทำไมหน่วยงานจึงบอกเป็นช่วงเวลาแทนที่จะเป็นเวลาเดียว',
      },
      debrief: {
        en: 'A storm\'s energy heats the thermosphere, the thin air above about 100 km, and it swells upward, so at the stage\'s height the air grows denser and the drag larger: everything in low orbit loses height faster. Held for the whole ten days, a strong storm would have brought this stage down more than two days sooner, outside the agencies\' window. Real storms last a day or two, but they are why re-entry predictions come with a window and why satellite operators watch the space-weather forecast: in February 2022 most of a batch of 49 new Starlink satellites re-entered after a minor storm raised the drag at their low release orbit. Storms reach Thailand too: they can disturb radio links through satellites, GNSS positioning and the electronics on board.',
        ru: 'Энергия бури нагревает термосферу — разреженный воздух выше примерно 100 км, — и та расширяется вверх, поэтому на высоте ступени воздух становится плотнее, а сопротивление больше: всё, что летает на низкой орбите, теряет высоту быстрее. Длись сильная буря все десять суток, она свела бы эту ступень с орбиты больше чем на двое суток раньше — за пределами окна служб прогноза. Настоящие бури длятся сутки-двое, но именно из-за них прогнозы схода дают с окном, а операторы спутников следят за прогнозом космической погоды: в феврале 2022 года большая часть из 49 только что запущенных спутников Starlink сошла с орбиты после слабой бури, усилившей сопротивление на их низкой начальной орбите. Бури касаются и Таиланда: они могут нарушать радиосвязь через спутники, навигацию ГНСС и работу бортовой электроники.',
        th: 'พลังงานของพายุทำให้เทอร์โมสเฟียร์ ซึ่งเป็นอากาศเบาบางที่สูงเกินราว 100 กม. ร้อนขึ้นและขยายตัวสูงขึ้น ที่ความสูงของท่อนจรวดอากาศจึงหนาแน่นขึ้นและแรงต้านมากขึ้น ทุกสิ่งในวงโคจรต่ำจึงสูญเสียความสูงเร็วขึ้น ถ้าพายุรุนแรงเกิดต่อเนื่องตลอดสิบวัน ท่อนจรวดนี้จะตกเร็วขึ้นกว่าสองวัน ซึ่งอยู่นอกช่วงเวลาของหน่วยงาน พายุจริงกินเวลาเพียงหนึ่งถึงสองวัน แต่พายุเป็นเหตุผลที่การทำนายการตกต้องบอกเป็นช่วงเวลา และผู้ควบคุมดาวเทียมต้องติดตามพยากรณ์สภาพอวกาศ เมื่อเดือนกุมภาพันธ์ 2022 ดาวเทียม Starlink ที่เพิ่งปล่อย 49 ดวงส่วนใหญ่ตกกลับสู่บรรยากาศ หลังพายุแม่เหล็กโลกระดับอ่อนทำให้แรงต้านที่วงโคจรต่ำซึ่งปล่อยดาวเทียมเพิ่มขึ้น พายุสุริยะส่งผลถึงประเทศไทยด้วย เช่น รบกวนการสื่อสารผ่านดาวเทียม การหาตำแหน่งด้วย GNSS และวงจรอิเล็กทรอนิกส์ของดาวเทียม',
      },
      criteria: ['area', 'b', 'early', 'late', 'storm', 'why'].map((item) => ({ id: item, kind: 'case', item })),
      hints: [
        { en: 'For a body tumbling at random in every direction, the mean cross-section is a quarter of its whole surface (Cauchy): the cylinder\'s side, πDL, and its two ends, 2 · πD²/4. The ballistic coefficient is C_D·A/m, with C_D = 2.2 and the mass in the data.', ru: 'Для тела, кувыркающегося случайным образом во всех направлениях, средняя площадь сечения равна четверти всей его поверхности (Коши): боковая поверхность цилиндра πDL и два торца 2 · πD²/4. Баллистический коэффициент равен C_x·A/m, где C_x = 2,2, а масса — из данных.', th: 'สำหรับวัตถุที่หมุนคว้างแบบสุ่มทุกทิศ พื้นที่หน้าตัดเฉลี่ยเท่ากับหนึ่งในสี่ของพื้นที่ผิวทั้งหมด (โคชี) คือผิวด้านข้างของทรงกระบอก πDL กับฝาปลายทั้งสอง 2 · πD²/4 ค่าสัมประสิทธิ์ขีปนวิถีคือ C_D·A/m โดย C_D = 2.2 และมวลอยู่ในข้อมูล' },
        { en: 'The agencies\' window is 0.8 and 1.2 times the time the prediction leaves, counted in days from the first set\'s epoch.', ru: 'Окно служб прогноза — это 0,8 и 1,2 от времени, которое оставляет прогноз, в сутках от эпохи первого набора.', th: 'ช่วงเวลาของหน่วยงานคือ 0.8 และ 1.2 เท่าของเวลาที่ค่าทำนายบอกว่าเหลือ นับเป็นวันจากเวลาของชุดข้อมูลชุดแรก' },
        { en: 'The storm\'s question needs no new calculation, only the two extra predictions in the data: the quiet one less the storm one. Compare the difference with the width of the window, and think about what the storm did to the air.', ru: 'Вопрос о буре не требует новых расчётов — только двух дополнительных прогнозов из данных: прогноз при спокойном поле минус прогноз при буре. Сравните разность с шириной окна и подумайте, что буря сделала с воздухом.', th: 'คำถามเรื่องพายุไม่ต้องคำนวณใหม่ ใช้เพียงค่าทำนายเพิ่มเติมสองค่าในข้อมูล คือค่าเมื่อสนามสงบลบด้วยค่าเมื่อเกิดพายุ แล้วเปรียบเทียบผลต่างกับความกว้างของช่วงเวลา และลองคิดว่าพายุทำอะไรกับอากาศ' },
      ],
    },
    {
      kind: 'design', id: 'ipst-b-thaicom-link', track: 11, order: 4, mode: 'explore', domains: [1], tags: ['D06', 'dB'],
      curriculum: [{ code: 'ว 2.3 ม.5/12', kind: 'indicator' }, { code: 'ว 3.1 ม.6/10', kind: 'indicator' }],
      title: { en: 'A TV signal from 36 000 km', ru: 'Телесигнал с высоты 36 000 км', th: 'สัญญาณโทรทัศน์จากความสูง 36 000 กม.' },
      brief: {
        en: 'Satellite TV in Thailand comes down from the geostationary orbit, 35 786 km above the equator, where a satellite goes round once a day with the Earth and so seems to stand still in the sky. This one stands at 119.5° E, Thaicom 4\'s place. Its 45 cm dish makes a beam about 4° wide, enough to cover the whole country, and a home in Bangkok receives its 30 Mbit/s with a 60 cm dish. On the long way down the signal spreads out, and only a tiny part of it reaches the dish: with the 20 W amplifier it has now, the downlink cannot be received. Choose the transmitter power so that the link margin is at least 3 dB, the reserve engineers keep for rain and for a dish not quite aimed. Then work out the margin your power gives and type it in. Everything else is locked.',
        ru: 'Спутниковое телевидение в Таиланде приходит с геостационарной орбиты, в 35 786 км над экватором: спутник там делает оборот за сутки вместе с Землёй и потому кажется неподвижным на небе. Этот спутник стоит в точке 119,5° в. д., где находится Thaicom 4. Его антенна диаметром 45 см даёт луч шириной около 4°, которого хватает на всю страну, а дом в Бангкоке принимает поток 30 Мбит/с на тарелку диаметром 60 см. На долгом пути вниз сигнал расходится, и до тарелки доходит лишь ничтожная его часть: с нынешним усилителем мощностью 20 Вт сигнал принять не удаётся. Подберите мощность передатчика так, чтобы запас радиолинии был не меньше 3 дБ — резерв, который инженеры оставляют на дождь и на неточно наведённую тарелку. Затем рассчитайте запас, который даёт ваша мощность, и введите его. Всё остальное заблокировано.',
        th: 'โทรทัศน์ดาวเทียมในประเทศไทยส่งลงมาจากวงโคจรค้างฟ้า ที่ความสูง 35 786 กม. เหนือเส้นศูนย์สูตร ดาวเทียมที่นั่นโคจรครบรอบในหนึ่งวันไปพร้อมกับการหมุนของโลก จึงดูเหมือนอยู่นิ่งบนท้องฟ้า ดวงนี้อยู่ที่ตำแหน่ง 119.5° ตะวันออก ตำแหน่งเดียวกับไทยคม 4 จานสายอากาศขนาด 45 ซม. ของดาวเทียมส่งลำคลื่นกว้างประมาณ 4° ซึ่งครอบคลุมได้ทั้งประเทศ และบ้านในกรุงเทพฯ รับข้อมูล 30 เมกะบิต/วินาทีด้วยจานขนาด 60 ซม. ระหว่างทางที่ยาวไกล สัญญาณแผ่กระจายออก จึงมาถึงจานเพียงส่วนน้อยนิด ด้วยเครื่องขยายสัญญาณ 20 วัตต์ที่มีอยู่ตอนนี้ ลิงก์ขาลงจึงรับสัญญาณไม่ได้ จงเลือกกำลังของเครื่องส่งให้ค่าเผื่อของลิงก์ไม่น้อยกว่า 3 dB ซึ่งเป็นส่วนสำรองที่วิศวกรเผื่อไว้สำหรับฝนตกและจานที่หันไม่ตรงนัก แล้วคำนวณค่าเผื่อที่ได้จากกำลังที่เลือกและพิมพ์คำตอบ ส่วนอื่นทั้งหมดถูกล็อกไว้',
      },
      debrief: {
        en: 'The power reaching the dish falls as 1/d²: spread over a sphere tens of thousands of kilometres across, a hundred watts leaves the home dish less than a millionth of a millionth of a watt. Engineers count such ratios in decibels, 10·log₁₀ of the ratio, so that a chain of gains and losses becomes a sum: each doubling of the power is +3 dB, ten times is +10 dB. The dishes win part of it back by focusing the waves into a beam, and the bigger the dish, the narrower the beam — which is why the satellite\'s own dish stays small enough to light all of Thailand. The 3 dB of margin is kept for what the sum leaves out: in a tropical downpour the rain absorbs Ku-band waves, which is why a heavy storm can still blank a TV screen in Bangkok. The picture arrives as a digital stream of bits, and a digital receiver either decodes it without error or loses it, so the margin decides whether there is a picture at all.',
        ru: 'Мощность, доходящая до тарелки, убывает как 1/d²: распределённые по сфере радиусом в десятки тысяч километров, сто ватт оставляют домашней тарелке меньше миллионной доли миллионной доли ватта. Такие отношения инженеры считают в децибелах, 10·lg отношения, — тогда цепочка усилений и потерь превращается в сумму: каждое удвоение мощности — это +3 дБ, десятикратное увеличение — +10 дБ. Антенны компенсируют часть потерь, собирая волны в луч, и чем больше антенна, тем у́же луч; поэтому антенна самого спутника остаётся достаточно малой, чтобы её луч покрывал весь Таиланд. Запас 3 дБ оставляют на то, чего сумма не учитывает: в тропический ливень дождь поглощает волны Ku-диапазона, и поэтому сильная гроза в Бангкоке всё же может погасить экран телевизора. Изображение приходит цифровым потоком битов, а цифровой приёмник либо декодирует его без ошибок, либо теряет, так что от запаса зависит, будет ли изображение вообще.',
        th: 'กำลังที่มาถึงจานลดลงตาม 1/d² เมื่อแผ่กระจายออกไปบนผิวทรงกลมที่กว้างหลายหมื่นกิโลเมตร กำลังร้อยวัตต์จึงเหลือมาถึงจานที่บ้านไม่ถึงหนึ่งในล้านล้านวัตต์ วิศวกรนับอัตราส่วนแบบนี้เป็นเดซิเบล คือ 10·log₁₀ ของอัตราส่วน การขยายและการสูญเสียที่ต่อกันเป็นทอด ๆ จึงกลายเป็นการบวกลบ กำลังเพิ่มเป็นสองเท่าคือ +3 dB และสิบเท่าคือ +10 dB จานสายอากาศช่วยเอาคืนได้ส่วนหนึ่งโดยรวมคลื่นเป็นลำ จานยิ่งใหญ่ลำคลื่นยิ่งแคบ จานของดาวเทียมเองจึงต้องเล็กพอที่ลำคลื่นจะครอบคลุมทั้งประเทศไทย ค่าเผื่อ 3 dB มีไว้สำหรับสิ่งที่การคำนวณไม่ได้นับรวม เมื่อฝนตกหนักแบบเมืองร้อน เม็ดฝนจะดูดกลืนคลื่นย่าน Ku พายุฝนหนักในกรุงเทพฯ จึงยังทำให้ภาพโทรทัศน์ดับได้ ภาพส่งมาเป็นสัญญาณดิจิทัลเป็นบิต เครื่องรับดิจิทัลจะถอดรหัสได้ถูกต้องหรือไม่ได้เลย ค่าเผื่อจึงเป็นตัวตัดสินว่าจะมีภาพหรือไม่',
      },
      start: { design: THAICOM_CLASS },
      designDate: PACK_DESIGN_DATE, level: PACK_DESIGN_LEVEL,
      locked: designLocksBut('comms.txPowerW'),
      criteria: [
        { id: 'margin', kind: 'design', measure: 'sat.linkMargin', min: 3 },
        {
          id: 'worked', kind: 'answer', measure: 'sat.linkMargin', tol: 0.2,
          prompt: { en: 'The margin your power gives, worked out in decibels (dB)', ru: 'Запас радиолинии при выбранной мощности, рассчитанный в децибелах (дБ)', th: 'ค่าเผื่อของลิงก์จากกำลังที่เลือก คำนวณเป็นเดซิเบล (dB)' },
        },
      ],
      hints: [
        { en: 'The margin is in decibels: ten times the power adds 10 dB, and twice the power 3 dB (10·log₁₀ 2 ≈ 3.01). Press "Check the design" with the 20 W to see where you start; a power P then gives that margin plus 10·log₁₀(P / 20 W).', ru: 'Запас выражен в децибелах: десятикратная мощность добавляет 10 дБ, удвоенная — 3 дБ (10·lg 2 ≈ 3,01). Нажмите «Проверить проект» при 20 Вт, чтобы увидеть исходный запас; мощность P даёт этот запас плюс 10·lg(P / 20 Вт).', th: 'ค่าเผื่อมีหน่วยเป็นเดซิเบล กำลังสิบเท่าเพิ่ม 10 dB และกำลังสองเท่าเพิ่ม 3 dB (10·log₁₀ 2 ≈ 3.01) ให้กด «ตรวจแบบ» ตอนที่ยังเป็น 20 วัตต์เพื่อดูค่าเริ่มต้น แล้วกำลัง P จะให้ค่าเผื่อเท่ากับค่าเริ่มต้นนั้นบวก 10·log₁₀(P / 20 วัตต์)' },
        { en: 'Why so little arrives: spread over a sphere tens of thousands of kilometres across, the power per square metre falls as 1/d². The Downlink figures show it as the free-space loss, about 206 dB at this range — a factor of about 4 × 10²⁰. The two dishes win part of it back by focusing the waves.', ru: 'Почему доходит так мало: распределяясь по сфере радиусом в десятки тысяч километров, мощность на квадратный метр убывает как 1/d². В показателях радиолинии это потери в свободном пространстве — около 206 дБ на такой дальности, то есть примерно в 4 · 10²⁰ раз. Обе антенны компенсируют часть потерь, собирая волны в луч.', th: 'ทำไมจึงมาถึงน้อยนัก เมื่อแผ่กระจายบนผิวทรงกลมที่กว้างหลายหมื่นกิโลเมตร กำลังต่อตารางเมตรจะลดลงตาม 1/d² ในค่าของลิงก์ขาลงจะเห็นเป็นการสูญเสียในอวกาศว่าง ราว 206 dB ที่ระยะนี้ หรือประมาณ 4 × 10²⁰ เท่า จานทั้งสองช่วยเอาคืนได้ส่วนหนึ่งโดยรวมคลื่นเป็นลำ' },
        { en: 'A bigger dish on the satellite would raise the margin too, but its beam would shrink smaller than Thailand (a beam\'s width goes as the wavelength over the diameter), so the lesson locks it.', ru: 'Антенна спутника побольше тоже подняла бы запас, но её луч стал бы у́же Таиланда (ширина луча пропорциональна длине волны, делённой на диаметр), поэтому урок её блокирует.', th: 'ถ้าจานของดาวเทียมใหญ่ขึ้นก็เพิ่มค่าเผื่อได้เช่นกัน แต่ลำคลื่นจะแคบกว่าประเทศไทย (ความกว้างของลำคลื่นแปรผันตามความยาวคลื่นหารด้วยเส้นผ่านศูนย์กลาง) บทเรียนจึงล็อกค่านี้ไว้' },
      ],
    },
  ],
};
