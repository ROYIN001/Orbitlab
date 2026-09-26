/**
 * Track 1, orbital mechanics (roadmap E03): five lessons flown point-mass in
 * the Explore mode. Each one's worked solution and a wrong flight are flown by
 * tests/lessons.test.ts.
 */
import { orbitById } from '../../data/orbits';
import { missionDoc } from './common';

const km = 1000;

export const TRACK1: readonly unknown[] = [
  {
    id: 'orbit-first', track: 1, order: 1, mode: 'explore', domains: [2, 1], tags: ['hp ha', 'T'],
    title: { en: 'Your first orbit', ru: 'Первая орбита', th: 'วงโคจรแรก' },
    brief: {
      en: 'Fly Falcon 9 from Cape Canaveral into a circular orbit 500 km up. Everything is set: press Launch and follow the ascent — the first stage, separation, the second stage cutting off in a 200 × 500 km parking orbit, and its relight at apogee that makes the orbit circular. Once in orbit, work out two numbers for it and type them in: the orbital period and the orbital speed.',
      ru: 'Выведите Falcon 9 с мыса Канаверал на круговую орбиту высотой 500 км. Всё уже настроено: нажмите «Пуск» и проследите выведение — работу первой ступени, разделение, выключение второй ступени на опорной орбите 200 × 500 км и её повторное включение в апогее, которое делает орбиту круговой. Когда орбита будет достигнута, рассчитайте для неё два числа и введите их: период обращения и орбитальную скорость.',
      th: 'นำ Falcon 9 จากแหลมคะแนเวอรัลขึ้นสู่วงโคจรวงกลมที่ความสูง 500 กม. ทุกอย่างตั้งค่าไว้แล้ว กด «ปล่อยจรวด» แล้วติดตามการไต่ระดับ ตั้งแต่ขั้นที่ 1 การแยกขั้น ขั้นที่ 2 ดับเครื่องในวงโคจรพัก 200 × 500 กม. จนถึงการจุดเครื่องอีกครั้งที่จุดไกลโลกเพื่อทำให้วงโคจรเป็นวงกลม เมื่อเข้าวงโคจรแล้ว ให้คำนวณค่าสองค่าของวงโคจรนั้นแล้วพิมพ์คำตอบ ได้แก่ คาบการโคจร และอัตราเร็วในวงโคจร',
    },
    debrief: {
      en: 'Period and speed depend on the size of the orbit alone: T = 2π√(a³/μ) grows as a^3/2 (Kepler\'s third law), and on a circle v = √(μ/r). Neither depends on the mass of the satellite.',
      ru: 'Период и скорость зависят только от размера орбиты: T = 2π√(a³/μ) растёт как a^3/2 (третий закон Кеплера), а на круговой орбите v = √(μ/r). Ни то, ни другое не зависит от массы спутника.',
      th: 'คาบและอัตราเร็วขึ้นกับขนาดของวงโคจรเท่านั้น: T = 2π√(a³/μ) เพิ่มตาม a^3/2 (กฎข้อที่สามของเคปเลอร์) และบนวงโคจรวงกลม v = √(μ/r) ทั้งสองค่าไม่ขึ้นกับมวลของดาวเทียม',
    },
    mission: missionDoc({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 10000, orbitId: 'leo', dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 } }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model'],
    criteria: [
      { id: 'orbit', kind: 'outcome', is: 'target' },
      {
        id: 'period', kind: 'answer', measure: 'orbit.period', tol: 1, unit: 'min',
        prompt: { en: 'Orbital period of your orbit (min)', ru: 'Период обращения на вашей орбите (мин)', th: 'คาบการโคจรของวงโคจรนี้ (นาที)' },
      },
      {
        id: 'speed', kind: 'answer', measure: 'orbit.speed', tol: 0.05, unit: 'km/s',
        prompt: { en: 'Orbital speed (km/s)', ru: 'Орбитальная скорость (км/с)', th: 'อัตราเร็วในวงโคจร (กม./วินาที)' },
      },
    ],
    hints: [
      { en: 'The orbit is a circle: its radius is the Earth\'s radius (6 378 km) plus the altitude.', ru: 'Орбита круговая: её радиус равен радиусу Земли (6 378 км) плюс высота.', th: 'วงโคจรเป็นวงกลม: รัศมีเท่ากับรัศมีโลก (6 378 กม.) บวกความสูง' },
      { en: 'Period: T = 2π√(r³/μ) with μ = 398 600 km³/s². Speed on a circle: v = √(μ/r).', ru: 'Период: T = 2π√(r³/μ), μ = 398 600 км³/с². Скорость на круговой орбите: v = √(μ/r).', th: 'คาบ: T = 2π√(r³/μ) โดย μ = 398 600 กม.³/วินาที² อัตราเร็วบนวงกลม: v = √(μ/r)' },
      { en: 'A check: at 400 km, where the ISS flies, the period is about 92.6 min and the speed 7.67 km/s; higher is slower and longer.', ru: 'Для проверки: на высоте 400 км, где летает МКС, период около 92,6 мин, скорость 7,67 км/с; выше — медленнее и дольше.', th: 'ใช้ตรวจสอบ: ที่ความสูง 400 กม. ซึ่งเป็นวงโคจรของ ISS คาบประมาณ 92.6 นาที อัตราเร็ว 7.67 กม./วินาที ยิ่งสูงยิ่งช้าและคาบยิ่งยาว' },
    ],
  },
  {
    id: 'orbit-iss-plane', track: 1, order: 2, mode: 'explore', domains: [2], tags: ['i Ω', 'window'],
    title: { en: 'Into the station\'s plane', ru: 'В плоскость орбиты МКС', th: 'เข้าระนาบของสถานีอวกาศ' },
    brief: {
      en: 'Soyuz-2.1a stands at Baikonur with a crewed spacecraft for the space station, but the launch time on the panel is a bad one: the station\'s orbital plane is far from the pad. Choose the launch time so that the ascent puts the spacecraft straight into the station\'s plane — inclination 51.64° and the station\'s longitude of the ascending node Ω — and fly it. Only the launch time may be changed.',
      ru: 'Союз-2.1а стоит на Байконуре с пилотируемым кораблём для МКС, но время старта на панели выбрано неудачно: плоскость орбиты станции далеко от стартового комплекса. Выберите время старта так, чтобы выведение сразу доставило корабль в плоскость орбиты станции — наклонение 51,64° и долгота восходящего узла Ω станции, — и выполните полёт. Изменять можно только время старта.',
      th: 'Soyuz-2.1a ตั้งอยู่ที่ไบโคนูร์พร้อมยานอวกาศมีมนุษย์ที่จะไปสถานีอวกาศ แต่เวลาปล่อยในแผงตั้งค่าไม่เหมาะ เพราะระนาบวงโคจรของสถานีอยู่ห่างจากฐานปล่อย ให้เลือกเวลาปล่อยที่ทำให้การไต่ระดับพายานเข้าสู่ระนาบของสถานีโดยตรง คือความเอียง 51.64° และลองจิจูดของโหนดขึ้น Ω ของสถานี แล้วบิน เปลี่ยนได้เฉพาะเวลาปล่อยเท่านั้น',
    },
    debrief: {
      en: 'An orbital plane stays fixed in space while the Earth turns beneath it, so a pad passes through a given plane only twice a day — the launch window. Missing the window by hours puts the node tens of degrees off, and turning a plane costs 2v·sin(Δ/2): at 7.7 km/s even 10° costs 1.3 km/s.',
      ru: 'Плоскость орбиты неподвижна в пространстве, а Земля вращается под ней, поэтому стартовый комплекс проходит через заданную плоскость лишь дважды в сутки — это и есть окно запуска. Опоздание на часы уводит узел на десятки градусов, а поворот плоскости стоит 2v·sin(Δ/2): при 7,7 км/с даже 10° обходятся в 1,3 км/с.',
      th: 'ระนาบวงโคจรคงที่ในอวกาศขณะที่โลกหมุนอยู่ใต้มัน ฐานปล่อยจึงผ่านระนาบหนึ่ง ๆ เพียงวันละสองครั้ง นั่นคือหน้าต่างการปล่อย การพลาดหน้าต่างเป็นชั่วโมงทำให้โหนดคลาดไปหลายสิบองศา และการหมุนระนาบต้องใช้ 2v·sin(Δ/2) ที่ 7.7 กม./วินาที แค่ 10° ก็ใช้ถึง 1.3 กม./วินาที',
    },
    mission: missionDoc({ vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', payloadMass: 7150, orbitId: 'iss', dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 } }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model'],
    criteria: [
      { id: 'orbit', kind: 'outcome', is: 'target' },
      { id: 'inclination', kind: 'measure', measure: 'orbit.inclination', target: 'mission', tol: 0.1 },
      { id: 'node', kind: 'measure', measure: 'orbit.raanError', max: 0.5 },
    ],
    hints: [
      { en: 'The plane stays still while the Earth turns: the pad crosses the station\'s plane twice a day, and only one of the two crossings suits a northbound launch.', ru: 'Плоскость неподвижна, Земля вращается: стартовый комплекс пересекает плоскость станции дважды в сутки, и для старта на северо-восток подходит только одно из пересечений.', th: 'ระนาบอยู่นิ่งขณะโลกหมุน ฐานปล่อยตัดผ่านระนาบของสถานีวันละสองครั้ง และมีเพียงครั้งเดียวที่เหมาะกับการปล่อยขึ้นไปทางทิศเหนือ' },
      { en: 'The setup panel\'s "Next window" button computes that moment for you.', ru: 'Кнопка «Ближайшее окно» на панели настройки рассчитывает этот момент за вас.', th: 'ปุ่ม «หน้าต่างถัดไป» ในแผงตั้งค่าคำนวณเวลานั้นให้' },
      { en: 'Before launching, read the verdict above the Launch button: off-window it names how far the node will miss.', ru: 'Перед стартом прочитайте заключение над кнопкой «Пуск»: вне окна оно указывает, на сколько промахнётся узел.', th: 'ก่อนปล่อย อ่านข้อสรุปเหนือปุ่มปล่อยจรวด ถ้าอยู่นอกหน้าต่างจะบอกว่าโหนดจะคลาดไปเท่าใด' },
    ],
  },
  {
    id: 'orbit-hohmann', track: 1, order: 3, mode: 'explore', domains: [2, 3], tags: ['vis-viva', 'Δv'],
    title: { en: 'A Hohmann transfer', ru: 'Гомановский перелёт', th: 'การถ่ายโอนวงโคจรแบบโฮมันน์' },
    brief: {
      en: 'Falcon 9 carries 3 t to a circular orbit 2 000 km up. The ascent leaves the second stage in a 200 × 2 000 km ellipse — the first half of a Hohmann transfer — and it relights at apogee to make the orbit circular. Work out with the vis-viva equation how much Δv that apogee burn needs, fly the mission, and type in the burn\'s Δv and the period of the final orbit.',
      ru: 'Falcon 9 выводит 3 т на круговую орбиту высотой 2 000 км. Выведение оставляет вторую ступень на эллипсе 200 × 2 000 км — первой половине гомановского перелёта, — и в апогее она включается снова, чтобы сделать орбиту круговой. Рассчитайте по интегралу энергии (формуле vis-viva), какое приращение скорости Δv нужно для этого включения в апогее, выполните полёт и введите Δv включения и период конечной орбиты.',
      th: 'Falcon 9 นำน้ำหนักบรรทุก 3 ตันขึ้นสู่วงโคจรวงกลมที่ความสูง 2 000 กม. การไต่ระดับทิ้งขั้นที่ 2 ไว้ในวงรี 200 × 2 000 กม. ซึ่งเป็นครึ่งแรกของการถ่ายโอนแบบโฮมันน์ แล้วจุดเครื่องอีกครั้งที่จุดไกลโลกเพื่อทำให้วงโคจรเป็นวงกลม ใช้สมการ vis-viva คำนวณว่าการจุดเครื่องที่จุดไกลโลกนั้นต้องใช้ Δv เท่าใด บินภารกิจ แล้วพิมพ์ Δv ของการจุดเครื่องนั้นและคาบของวงโคจรสุดท้าย',
    },
    debrief: {
      en: 'The Hohmann transfer is the cheapest two-burn change between coplanar circles: one burn at perigee raises the apogee, one at apogee raises the perigee. The ascent itself made the first burn here, so the second stage only had to add the difference between the circular speed and the ellipse\'s speed at apogee.',
      ru: 'Гомановский перелёт — самый экономичный двухимпульсный переход между компланарными круговыми орбитами: импульс в перигее поднимает апогей, импульс в апогее — перигей. Здесь первый импульс выполнило само выведение, и второй ступени оставалось добавить разность круговой скорости и скорости эллипса в апогее.',
      th: 'การถ่ายโอนแบบโฮมันน์เป็นการเปลี่ยนวงโคจรด้วยการจุดเครื่องสองครั้งที่ประหยัดที่สุดระหว่างวงกลมที่อยู่ในระนาบเดียวกัน ครั้งแรกที่จุดใกล้โลกยกจุดไกลโลกขึ้น ครั้งที่สองที่จุดไกลโลกยกจุดใกล้โลกขึ้น ในบทนี้การไต่ระดับทำหน้าที่ครั้งแรกไปแล้ว ขั้นที่ 2 จึงเพิ่มเพียงผลต่างระหว่างอัตราเร็ววงกลมกับอัตราเร็วของวงรีที่จุดไกลโลก',
    },
    mission: missionDoc({
      vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 3000, orbitId: 'custom',
      orbit: { ...orbitById('custom'), perigee: 2000 * km, apogee: 2000 * km, inclination: 28.6 },
      dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 },
    }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model', 'setup.guidance'],
    criteria: [
      { id: 'orbit', kind: 'outcome', is: 'target' },
      {
        id: 'burn', kind: 'answer', measure: 'burnDv', tolPct: 5, unit: 'm/s',
        prompt: { en: 'Δv of the burn at apogee (m/s)', ru: 'Δv включения в апогее (м/с)', th: 'Δv ของการจุดเครื่องที่จุดไกลโลก (ม./วินาที)' },
      },
      {
        id: 'period', kind: 'answer', measure: 'orbit.period', tol: 1, unit: 'min',
        prompt: { en: 'Period of the final orbit (min)', ru: 'Период конечной орбиты (мин)', th: 'คาบของวงโคจรสุดท้าย (นาที)' },
      },
    ],
    hints: [
      { en: 'vis-viva: v² = μ(2/r − 1/a). At apogee r = R + 2 000 km, and the ellipse\'s a is the mean of its perigee and apogee radii.', ru: 'Интеграл энергии: v² = μ(2/r − 1/a). В апогее r = R + 2 000 км, а большая полуось эллипса a — среднее радиусов перигея и апогея.', th: 'vis-viva: v² = μ(2/r − 1/a) ที่จุดไกลโลก r = R + 2 000 กม. และ a ของวงรีคือค่าเฉลี่ยของรัศมีจุดใกล้โลกกับจุดไกลโลก' },
      { en: 'On the final circle v = √(μ/r). The burn is the difference of the two speeds at apogee.', ru: 'На конечной круговой орбите v = √(μ/r). Импульс равен разности двух скоростей в апогее.', th: 'บนวงกลมสุดท้าย v = √(μ/r) การจุดเครื่องคือผลต่างของอัตราเร็วทั้งสองที่จุดไกลโลก' },
      { en: 'R = 6 378 km, μ = 398 600 km³/s². The answer is a few hundred metres per second; the event log names the burn\'s Δv when it is scheduled.', ru: 'R = 6 378 км, μ = 398 600 км³/с². Ответ — несколько сотен метров в секунду; журнал событий называет Δv включения, когда оно запланировано.', th: 'R = 6 378 กม., μ = 398 600 กม.³/วินาที² คำตอบอยู่ในหลักหลายร้อยเมตรต่อวินาที และบันทึกเหตุการณ์จะแสดง Δv ของการจุดเครื่องเมื่อมีการวางแผน' },
    ],
  },
  {
    id: 'orbit-payload', track: 1, order: 4, mode: 'explore', domains: [3, 2], tags: ['m_pl', 'Δv'],
    title: { en: 'Payload and Δv', ru: 'Полезная нагрузка и Δv', th: 'น้ำหนักบรรทุกกับ Δv' },
    brief: {
      en: 'How much can Falcon 9 carry to a 500 km circular orbit? Set the payload mass so that the rocket reaches the target orbit carrying at least 16 t, with at least 150 m/s of Δv left in the second stage as a reserve. The panel starts at 18 t, which is too much. Only the payload mass may be changed.',
      ru: 'Сколько Falcon 9 может вывести на круговую орбиту высотой 500 км? Задайте массу полезной нагрузки так, чтобы ракета вышла на целевую орбиту с нагрузкой не менее 16 т и с запасом характеристической скорости второй ступени не менее 150 м/с. На панели стоит 18 т — это слишком много. Изменять можно только массу полезной нагрузки.',
      th: 'Falcon 9 นำน้ำหนักบรรทุกขึ้นสู่วงโคจรวงกลม 500 กม. ได้เท่าใด ให้ตั้งมวลน้ำหนักบรรทุกให้จรวดเข้าถึงวงโคจรเป้าหมายโดยบรรทุกไม่น้อยกว่า 16 ตัน และยังเหลือ Δv ในขั้นที่ 2 ไม่น้อยกว่า 150 ม./วินาทีเป็นส่วนสำรอง แผงตั้งค่าเริ่มที่ 18 ตันซึ่งมากเกินไป เปลี่ยนได้เฉพาะมวลน้ำหนักบรรทุกเท่านั้น',
    },
    debrief: {
      en: 'The payload rides on the second stage all the way, so every kilogram enters its mass ratio in Tsiolkovsky\'s Δv = Isp·g0·ln(m0/mf). Here each tonne costs about 170 m/s. Real missions keep a reserve like this one for the dispersions of thrust, mass and wind.',
      ru: 'Полезная нагрузка летит на второй ступени до конца, поэтому каждый килограмм входит в её отношение масс в формуле Циолковского Δv = Iуд·g0·ln(m0/mк). Здесь каждая тонна стоит около 170 м/с. В реальных пусках такой запас оставляют на разброс тяги, масс и ветра.',
      th: 'น้ำหนักบรรทุกอยู่บนขั้นที่ 2 ตลอดทาง ทุกกิโลกรัมจึงเข้าไปในอัตราส่วนมวลของสมการซีออลคอฟสกี Δv = Isp·g0·ln(m0/mf) ในที่นี้ทุกหนึ่งตันทำให้เสีย Δv ประมาณ 170 ม./วินาที ภารกิจจริงเก็บส่วนสำรองแบบนี้ไว้รองรับความคลาดเคลื่อนของแรงขับ มวล และลม',
    },
    mission: missionDoc({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 18000, orbitId: 'leo', dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 } }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.orbit', 'setup.failure', 'setup.dynamics.model', 'setup.guidance'],
    criteria: [
      { id: 'orbit', kind: 'outcome', is: 'target' },
      { id: 'payload', kind: 'measure', measure: 'payload', min: 16000 },
      { id: 'reserve', kind: 'measure', measure: 'dvLeft', min: 150 },
    ],
    hints: [
      { en: 'Every kilogram of payload is carried by the second stage to orbit: it costs Δv through the logarithm of the mass ratio.', ru: 'Каждый килограмм нагрузки вторая ступень несёт до орбиты: он отнимает Δv через логарифм отношения масс.', th: 'ทุกกิโลกรัมของน้ำหนักบรรทุกถูกขั้นที่ 2 พาไปถึงวงโคจร จึงทำให้เสีย Δv ผ่านลอการิทึมของอัตราส่วนมวล' },
      { en: 'The telemetry panel\'s "Δv left" chart shows what the stage keeps after the orbit is reached.', ru: 'График «Остаток Δv» на панели телеметрии показывает запас ступени после выхода на орбиту.', th: 'กราฟ «Δv คงเหลือ» ในแผงโทรมาตรแสดงค่าที่ขั้นยังเหลืออยู่หลังเข้าวงโคจร' },
      { en: 'Change the mass in steps of 500 kg and fly again; the answer lies between 16 and 17.5 t.', ru: 'Меняйте массу шагами по 500 кг и повторяйте полёт; ответ лежит между 16 и 17,5 т.', th: 'ปรับมวลทีละ 500 กก. แล้วบินใหม่ คำตอบอยู่ระหว่าง 16 ถึง 17.5 ตัน' },
    ],
  },
  {
    id: 'orbit-range-safety', track: 1, order: 5, mode: 'explore', domains: [2, 6], tags: ['i', 'range'],
    title: { en: 'Range safety and the launch site', ru: 'Коридор безопасности и выбор космодрома', th: 'ระเบียงความปลอดภัยและการเลือกฐานปล่อย' },
    brief: {
      en: 'A 5 t satellite must go into a polar orbit 800 km up (inclination 90°). From Cape Canaveral Falcon 9 would have to fly north along the populated coast, which the range does not license. Choose a launch site whose range-safety corridor allows a polar launch, and fly the mission. Only the launch site may be changed.',
      ru: 'Спутник массой 5 т нужно вывести на полярную орбиту высотой 800 км (наклонение 90°). С мыса Канаверал Falcon 9 пришлось бы лететь на север вдоль населённого побережья, чего полигон не разрешает. Выберите космодром, коридор безопасности которого допускает полярный пуск, и выполните полёт. Изменять можно только космодром.',
      th: 'ดาวเทียมมวล 5 ตันต้องเข้าสู่วงโคจรขั้วโลกที่ความสูง 800 กม. (ความเอียง 90°) ถ้าปล่อยจากแหลมคะแนเวอรัล Falcon 9 จะต้องบินขึ้นเหนือเลียบชายฝั่งที่มีคนอาศัยอยู่ ซึ่งสนามทดสอบไม่อนุญาต ให้เลือกฐานปล่อยที่ระเบียงความปลอดภัยการบินอนุญาตการปล่อยสู่วงโคจรขั้วโลก แล้วบินภารกิจ เปลี่ยนได้เฉพาะฐานปล่อยเท่านั้น',
    },
    debrief: {
      en: 'The inclination reached from latitude φ on azimuth A is given by cos i = cos φ · sin A, so a polar orbit needs a launch due north or south. Each site may launch only across the azimuths where spent stages fall safely. When a plane lies just outside the corridor, the rocket leaves along its edge and turns into the plane later — a dogleg, paid for in Δv.',
      ru: 'Наклонение, достигаемое со широты φ при азимуте A, задаётся формулой cos i = cos φ · sin A, поэтому для полярной орбиты нужен старт строго на север или на юг. Каждый космодром может пускать только в тех азимутах, где отделившиеся ступени падают безопасно. Если плоскость лежит чуть вне коридора, ракета стартует по его границе и позже доворачивает в плоскость — боковой манёвр, за который платят Δv.',
      th: 'ความเอียงที่ได้จากละติจูด φ เมื่อปล่อยในแนวอะซิมุท A คือ cos i = cos φ · sin A วงโคจรขั้วโลกจึงต้องปล่อยไปทางเหนือหรือใต้ตรง ๆ แต่ละฐานปล่อยได้เฉพาะแนวที่ขั้นที่ใช้แล้วตกลงอย่างปลอดภัย ถ้าระนาบอยู่นอกระเบียงเพียงเล็กน้อย จรวดจะขึ้นตามขอบระเบียงแล้วเลี้ยวเข้าระนาบภายหลัง (dogleg) ซึ่งต้องแลกด้วย Δv',
    },
    mission: missionDoc({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 5000, orbitId: 'polar', dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 } }),
    locked: ['setup.vehicle', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model'],
    criteria: [
      { id: 'licence', kind: 'hook', hook: 'rangeSafe', label: { en: 'The site\'s corridor allows the plane', ru: 'Коридор космодрома допускает плоскость', th: 'ระเบียงของฐานปล่อยอนุญาตระนาบนี้' } },
      { id: 'orbit', kind: 'outcome', is: 'target' },
    ],
    hints: [
      { en: 'Each site launches only within a range of azimuths, set by where the spent stages may fall.', ru: 'Каждый космодром пускает только в диапазоне азимутов, который определяется районами падения отделяющихся частей.', th: 'แต่ละฐานปล่อยได้เฉพาะในช่วงอะซิมุทที่ขั้นที่ใช้แล้วสามารถตกลงได้' },
      { en: 'cos i = cos φ · sin A: a polar orbit needs a launch due north or due south.', ru: 'cos i = cos φ · sin A: для полярной орбиты нужен старт строго на север или на юг.', th: 'cos i = cos φ · sin A: วงโคจรขั้วโลกต้องปล่อยไปทางเหนือหรือใต้ตรง ๆ' },
      { en: 'Falcon 9 also flies from Vandenberg in California, which launches south over the open Pacific.', ru: 'Falcon 9 летает и с базы Ванденберг в Калифорнии, откуда пускают на юг над открытым Тихим океаном.', th: 'Falcon 9 ปล่อยจากแวนเดนเบิร์กในแคลิฟอร์เนียได้ด้วย ซึ่งปล่อยลงใต้เหนือมหาสมุทรแปซิฟิก' },
    ],
  },
];
