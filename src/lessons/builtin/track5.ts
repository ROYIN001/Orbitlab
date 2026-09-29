/**
 * Track 5, advanced missions (roadmap E03): the first stage flown back to
 * Landing Zone 1, a Soyuz to the station on the fast profile, and the three
 * historical missions of roadmap C01 — Sputnik-1, Vostok-1 and Apollo 11, on
 * the vehicles, pads, dates and orbits they flew. All fly point-mass
 * (tests/lessons-round2.test.ts, tests/lessons-history.test.ts).
 */
import { missionDoc } from './common';
import { orbitById } from '../../data/orbits';

const POINT_MASS = { model: 'pointMass', wind: 'calm', seed: 20260919 } as const;
/** A custom orbit, perigee and apogee in km. */
const custom = (perigeeKm: number, apogeeKm: number, inclination: number) =>
  ({ ...orbitById('custom'), perigee: perigeeKm * 1e3, apogee: apogeeKm * 1e3, inclination });
const HISTORY_LOCKS = ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.failure', 'setup.dynamics.model', 'setup.guidance', 'setup.boosterRecovery'] as const;

export const TRACK5: readonly unknown[] = [
  {
    id: 'adv-landing', track: 5, order: 1, mode: 'explore', domains: [3, 4], tags: ['RTLS', 'LZ-1'],
    title: { en: 'Bringing the booster home', ru: 'Возвращение первой ступени', th: 'นำบูสเตอร์กลับ' },
    brief: {
      en: 'Falcon 9 from Cape Canaveral to 500 km, its first stage flying back to Landing Zone 1. With 12 t on top the stage still lands, but the second stage cannot reach the target orbit: the propellant kept back for the boostback and the landing is missing from the ascent. Carry at least 9 t to the target orbit with the stage back on LZ-1. Only the payload mass may change.',
      ru: 'Falcon 9 с мыса Канаверал на высоту 500 км, первая ступень возвращается на площадку LZ-1. С 12 т ступень садится, но вторая ступень не выходит на целевую орбиту: топлива, оставленного на разворот и посадку, не хватает на выведении. Выведите на целевую орбиту не менее 9 т так, чтобы ступень села на LZ-1. Менять можно только массу полезной нагрузки.',
      th: 'Falcon 9 จากแหลมคะแนเวอรัลไปที่ 500 กม. โดยขั้นที่หนึ่งบินกลับลงที่ Landing Zone 1 เมื่อบรรทุก 12 ตัน ขั้นแรกยังลงจอดได้ แต่ขั้นที่สองไปไม่ถึงวงโคจรเป้าหมาย เพราะเชื้อเพลิงที่สำรองไว้สำหรับบินกลับและลงจอดหายไปจากการไต่ระดับ จงนำสัมภาระอย่างน้อย 9 ตันเข้าสู่วงโคจรเป้าหมาย โดยให้ขั้นแรกลงที่ LZ-1 ปรับได้เฉพาะมวลสัมภาระ',
    },
    debrief: {
      en: 'A return to the launch site costs the most: the stage must cancel its downrange speed and fly back, so it separates earlier and slower and keeps a large reserve. Here Falcon 9 lifts about 19 t to this orbit expended and about 9–11 t with the stage coming back; a drone ship downrange costs much less, which is why heavy payloads land at sea.',
      ru: 'Возвращение к месту старта обходится дороже всего: ступени нужно погасить скорость вдоль трассы и лететь обратно, поэтому она отделяется раньше и медленнее и оставляет большой резерв топлива. Здесь Falcon 9 без возвращения выводит на эту орбиту около 19 т, а с возвращением ступени — около 9–11 т; посадка на морскую платформу вдоль трассы обходится гораздо дешевле, поэтому тяжёлые нагрузки садятся в море.',
      th: 'การบินกลับฐานปล่อยมีต้นทุนสูงที่สุด ขั้นแรกต้องหักล้างความเร็วตามแนวบินแล้วบินย้อนกลับ จึงแยกตัวเร็วกว่าและช้ากว่า และต้องสำรองเชื้อเพลิงไว้มาก ในที่นี้ Falcon 9 แบบไม่กู้คืนส่งได้ประมาณ 19 ตัน แต่เมื่อบินกลับได้ประมาณ 9–11 ตัน การลงบนเรือโดรนกลางทะเลเสียน้อยกว่ามาก สัมภาระหนักจึงลงจอดในทะเล',
    },
    mission: missionDoc({
      vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 12000, orbitId: 'leo',
      boosterRecovery: true, recoveryPlan: { core: { kind: 'landingZone', zoneId: 'lz1' } }, dynamics: { ...POINT_MASS },
    }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.orbit', 'setup.failure', 'setup.dynamics.model', 'setup.guidance', 'setup.boosterRecovery'],
    criteria: [
      {
        id: 'landed', kind: 'event', key: 'evt.boosterLandedZone', present: true,
        label: { en: 'First stage on Landing Zone 1', ru: 'Первая ступень на LZ-1', th: 'ขั้นที่หนึ่งลงที่ Landing Zone 1' },
      },
      { id: 'orbit', kind: 'outcome', is: 'target' },
      { id: 'payload', kind: 'measure', measure: 'payload', min: 9000 },
    ],
    hints: [
      { en: 'Watch the Δv left at insertion: with 12 t it runs out before the circularising burn.', ru: 'Следите за остатком Δv при выведении: с 12 т его не хватает на скругление орбиты.', th: 'ดู Δv ที่เหลือตอนเข้าวงโคจร เมื่อบรรทุก 12 ตัน Δv หมดก่อนการจุดปรับวงโคจรเป็นวงกลม' },
      { en: 'The stage lands whatever the payload: what the payload takes is the second stage\'s margin.', ru: 'Ступень садится при любой нагрузке: нагрузка «съедает» запас второй ступени.', th: 'ขั้นแรกลงจอดได้ไม่ว่าสัมภาระเท่าใด สิ่งที่สัมภาระกินไปคือค่าเผื่อของขั้นที่สอง' },
      { en: 'Around 9–9.5 t both work: the orbit with Δv to spare, and the stage on the pad. Watch the event log for where the stage came down.', ru: 'Около 9–9,5 т получается и то и другое: орбита с запасом Δv и ступень на площадке. Где упала ступень, смотрите в журнале событий.', th: 'ประมาณ 9–9.5 ตันได้ทั้งสองอย่าง คือเข้าวงโคจรโดยมี Δv เหลือ และขั้นแรกลงบนแท่น ดูบันทึกเหตุการณ์ว่าขั้นแรกตกลงที่ใด' },
    ],
  },
  {
    id: 'adv-docking', track: 5, order: 2, mode: 'explore', domains: [2, 4], tags: ['G07', 'Kurs'],
    title: { en: 'Rendezvous and docking', ru: 'Сближение и стыковка', th: 'การนัดพบและเชื่อมต่อ' },
    brief: {
      en: 'Soyuz MS to the International Space Station, launched into the station\'s plane from Baikonur. It is set to fly the old two-day profile, 34 orbits. The crew should be aboard the station within 4 hours of launch: choose the profile that docks that fast, fly it to docking, and type in how long it took.',
      ru: '«Союз МС» к Международной космической станции, запуск с Байконура в плоскость станции. Задана старая двухсуточная схема — 34 витка. Экипаж должен оказаться на станции не позднее чем через 4 ч после старта: выберите схему, при которой стыковка происходит так быстро, выполните полёт до стыковки и введите, сколько он занял.',
      th: 'โซยุซ MS ไปสถานีอวกาศนานาชาติ ปล่อยจากไบโคนูร์เข้าสู่ระนาบของสถานี ตั้งไว้ให้บินโปรไฟล์เก่าแบบ 2 วัน 34 รอบวงโคจร ลูกเรือควรถึงสถานีภายใน 4 ชั่วโมงหลังปล่อย จงเลือกโปรไฟล์ที่เชื่อมต่อได้เร็วขนาดนั้น บินจนเชื่อมต่อ แล้วพิมพ์ว่าใช้เวลานานเท่าใด',
    },
    debrief: {
      en: 'The fast profiles start phasing at once: launched when the station is about 11° ahead, Soyuz raises its orbit in burns planned on the ground from the insertion, catches up in two orbits and hands over to Kurs for the approach, fly-around and docking — about 3.4 hours. The two-day profile leaves more room for error at the cost of two days in the capsule.',
      ru: 'Быстрые схемы начинают фазирование сразу: запуск, когда станция впереди примерно на 11°, «Союз» поднимает орбиту импульсами, рассчитанными на Земле по параметрам выведения, догоняет станцию за два витка и передаёт управление «Курсу» для сближения, облёта и стыковки — около 3,4 ч. Двухсуточная схема оставляет больший запас на ошибки ценой двух суток в корабле.',
      th: 'โปรไฟล์แบบเร็วเริ่มปรับเฟสทันที ปล่อยเมื่อสถานีนำหน้าอยู่ประมาณ 11° โซยุซยกวงโคจรด้วยการจุดเครื่องที่วางแผนจากภาคพื้นตามค่าการเข้าวงโคจร ไล่ทันสถานีในสองรอบ แล้วส่งให้ระบบ Kurs ควบคุมการเข้าใกล้ บินอ้อม และเชื่อมต่อ ใช้เวลาราว 3.4 ชั่วโมง โปรไฟล์ 2 วันเผื่อความผิดพลาดได้มากกว่า แต่ต้องอยู่ในยานสองวัน',
    },
    mission: missionDoc({
      vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', payloadMass: 7150, orbitId: 'iss',
      rendezvous: { profile: 'twoDay', port: 'rassvet' }, dynamics: { ...POINT_MASS },
    }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.failure', 'setup.dynamics.model', 'setup.guidance'],
    endEvent: 'evt.docked',
    criteria: [
      {
        id: 'docked', kind: 'event', key: 'evt.docked', present: true,
        label: { en: 'Docked to the station', ru: 'Стыковка со станцией', th: 'เชื่อมต่อกับสถานีแล้ว' },
      },
      { id: 'fast', kind: 'measure', measure: 'dock.hours', max: 4 },
      {
        id: 'hours', kind: 'answer', measure: 'dock.hours', tol: 0.1, unit: 'h',
        prompt: { en: 'Time from launch to docking (h)', ru: 'Время от старта до стыковки (ч)', th: 'เวลาตั้งแต่ปล่อยถึงเชื่อมต่อ (ชม.)' },
      },
    ],
    hints: [
      { en: 'Mission setup → Flight to the station: the profile.', ru: 'Настройка полёта → «Полёт к станции»: схема.', th: 'การตั้งค่าภารกิจ → บินไปเทียบสถานีอวกาศ: โปรไฟล์' },
      { en: 'The two-orbit profile of Soyuz MS-28 takes about 3 hours; the four-orbit one about 6.', ru: 'Двухвитковая схема «Союза МС-28» занимает около 3 ч, четырёхвитковая — около 6.', th: 'โปรไฟล์ 2 รอบวงโคจรของ Soyuz MS-28 ใช้เวลาราว 3 ชั่วโมง ส่วนแบบ 4 รอบราว 6 ชั่วโมง' },
      { en: 'The event log has the docking with its time; speed up the replay once in orbit.', ru: 'В журнале событий есть стыковка и её время; после выхода на орбиту ускорьте воспроизведение.', th: 'บันทึกเหตุการณ์มีการเชื่อมต่อพร้อมเวลา เมื่อเข้าวงโคจรแล้วเร่งความเร็วการเล่น' },
    ],
  },
  {
    id: 'adv-history', track: 5, order: 3, mode: 'explore', domains: [2, 1], tags: ['C01', 'R-7'],
    title: { en: 'Sputnik-1', ru: 'Спутник-1', th: 'สปุตนิก-1' },
    brief: {
      en: '4 October 1957, Site 1 at Baikonur: the R-7 lightened for the job (8K71PS), four strap-ons and a core, nothing above them. Korolev meant to fly Object D, a 1.3 t laboratory, and it is set up here; but its instruments were late, and the rocket cannot put 1.3 t on the planned 215 × 939 km orbit. Fly what was flown instead, and type in the period of the orbit you reach. Only the payload mass may change.',
      ru: '4 октября 1957 г., площадка № 1 Байконура: Р-7, облегчённая для этой задачи (8К71ПС), — четыре боковых блока и центральный, над ними ничего. Королёв собирался запустить объект Д — научную лабораторию массой 1,3 т, она и задана; но её приборы не были готовы, а ракета не выводит 1,3 т на расчётную орбиту 215 × 939 км. Запустите то, что полетело вместо неё, и введите период полученной орбиты. Менять можно только массу полезной нагрузки.',
      th: '4 ตุลาคม 1957 ฐานปล่อยที่ 1 ไบโคนูร์: R-7 ที่ทำให้เบาลงสำหรับภารกิจนี้ (8K71PS) มีบูสเตอร์สี่ท่อนกับท่อนแกนกลาง ไม่มีอะไรอยู่ข้างบน โคโรเลฟตั้งใจส่งวัตถุ D ห้องปฏิบัติการหนัก 1.3 ตัน ซึ่งตั้งไว้ที่นี่ แต่เครื่องมือยังไม่พร้อม และจรวดส่ง 1.3 ตันเข้าวงโคจรตามแผน 215 × 939 กม. ไม่ได้ จงส่งสิ่งที่ถูกส่งขึ้นไปแทน แล้วพิมพ์คาบของวงโคจรที่ได้ ปรับได้เฉพาะมวลสัมภาระ',
    },
    debrief: {
      en: 'PS-1, the "simplest satellite", was built in a month: an 83.6 kg sphere with two radio transmitters. With no upper stage the R-7\'s core itself went into orbit, 7.5 t of it, and was seen from the ground more easily than the satellite. The period was 96.2 minutes; air drag at the 215 km perigee brought PS-1 down after 92 days. Object D flew in May 1958 as Sputnik-3, on an uprated rocket.',
      ru: 'ПС-1, «простейший спутник», сделали за месяц: шар массой 83,6 кг с двумя радиопередатчиками. Верхней ступени не было, и на орбиту вышел сам центральный блок Р-7 массой 7,5 т — с Земли его было видно лучше, чем спутник. Период обращения составил 96,2 мин; сопротивление воздуха в перигее 215 км свело ПС-1 с орбиты через 92 сут. Объект Д полетел в мае 1958 г. как третий спутник, на доработанной ракете.',
      th: 'PS-1 "ดาวเทียมที่ง่ายที่สุด" สร้างเสร็จในหนึ่งเดือน เป็นทรงกลมหนัก 83.6 กก. มีเครื่องส่งวิทยุสองเครื่อง เมื่อไม่มีขั้นบน ท่อนแกนกลางของ R-7 หนัก 7.5 ตันจึงเข้าวงโคจรไปด้วย และมองเห็นจากพื้นโลกได้ง่ายกว่าดาวเทียมเสียอีก คาบวงโคจรคือ 96.2 นาที แรงต้านอากาศที่จุดใกล้โลก 215 กม. ทำให้ PS-1 ตกกลับใน 92 วัน วัตถุ D ขึ้นบินในเดือนพฤษภาคม 1958 ในชื่อสปุตนิก-3 บนจรวดรุ่นปรับปรุง',
    },
    mission: missionDoc({
      vehicleId: 'sputnik8k71ps', siteId: 'baikonur', padId: 'site1', satelliteId: 'sputnik1', payloadMass: 1327,
      orbitId: 'custom', orbit: custom(215, 939, 65.1), launchTime: '1957-10-04T19:28:34.000Z', dynamics: { ...POINT_MASS },
    }),
    locked: [...HISTORY_LOCKS, 'setup.orbit', 'setup.launchTime'],
    criteria: [
      { id: 'orbit', kind: 'outcome', is: 'target' },
      {
        id: 'period', kind: 'answer', measure: 'orbit.period', tol: 0.2, unit: 'min',
        prompt: { en: 'Orbital period (min)', ru: 'Период обращения (мин)', th: 'คาบวงโคจร (นาที)' },
      },
    ],
    hints: [
      { en: 'Object D became Sputnik-3. The satellite that flew first was far smaller: look at the payload list for its mass.', ru: 'Объект Д стал третьим спутником. Первый был гораздо меньше: его массу найдите в списке полезных нагрузок.', th: 'วัตถุ D กลายเป็นสปุตนิก-3 ดวงแรกที่ขึ้นไปเล็กกว่ามาก ดูมวลของมันในรายการสัมภาระ' },
      { en: 'With 1.3 t the core runs dry short of orbital speed: the whole rocket is one stage, so every kilogram on top comes off the orbit.', ru: 'С 1,3 т центральный блок вырабатывает топливо, не набрав орбитальной скорости: ракета одноступенчатая, и каждый килограмм нагрузки отнимается у орбиты.', th: 'เมื่อบรรทุก 1.3 ตัน ท่อนแกนกลางหมดเชื้อเพลิงก่อนถึงความเร็ววงโคจร จรวดทั้งลำมีขั้นเดียว สัมภาระทุกกิโลกรัมจึงหักออกจากวงโคจรโดยตรง' },
      { en: 'The period is on the orbit panel once in orbit, or T = 2π√(a³/μ) with a = R⊕ + (perigee + apogee)/2.', ru: 'Период показан на панели орбиты после выхода на неё, или T = 2π√(a³/μ), где a = R⊕ + (перигей + апогей)/2.', th: 'คาบแสดงอยู่ในแผงวงโคจรเมื่อเข้าวงโคจรแล้ว หรือคำนวณจาก T = 2π√(a³/μ) โดย a = R⊕ + (จุดใกล้โลก + จุดไกลโลก)/2' },
    ],
  },
  {
    id: 'adv-vostok', track: 5, order: 4, mode: 'explore', domains: [2, 1], tags: ['C01', 'Vostok'],
    title: { en: 'Vostok-1', ru: '«Восток-1»', th: 'วอสตอค-1' },
    brief: {
      en: '12 April 1961, Site 1: Vostok-K with Blok E puts Yuri Gagarin\'s Vostok on orbit directly. The orbit was planned at 181 × 230 km, low enough that air drag would bring the ship down within the week its life support lasted if the retro-rocket failed. The radio command to shut down Blok E did not come, and the stage burned on to its backup cut-off. Fly the orbit Gagarin really reached, 181 × 327 km, and type in its period. Only the orbit may change.',
      ru: '12 апреля 1961 г., площадка № 1: «Восток» с блоком Е выводит корабль Юрия Гагарина прямо на орбиту. Расчётная орбита — 181 × 230 км: достаточно низкая, чтобы при отказе тормозной установки атмосфера свела корабль с орбиты за неделю, на которую хватало систем жизнеобеспечения. Радиокоманда на выключение блока Е не прошла, и он работал до резервной отсечки. Выведите корабль на орбиту, на которую вышел Гагарин, — 181 × 327 км, и введите её период. Менять можно только орбиту.',
      th: '12 เมษายน 1961 ฐานปล่อยที่ 1: จรวดวอสตอค-K กับบล็อก E ส่งยานวอสตอคของยูรี กาการินเข้าวงโคจรโดยตรง วงโคจรตามแผนคือ 181 × 230 กม. ต่ำพอที่หากจรวดชะลอความเร็วขัดข้อง แรงต้านอากาศจะดึงยานกลับภายในหนึ่งสัปดาห์ที่ระบบช่วยชีวิตรองรับได้ แต่คำสั่งวิทยุให้ดับเครื่องบล็อก E ไม่มาถึง บล็อก E จึงจุดต่อไปจนถึงการตัดสำรอง จงบินเข้าวงโคจรที่กาการินขึ้นไปจริง 181 × 327 กม. แล้วพิมพ์คาบของวงโคจรนั้น ปรับได้เฉพาะวงโคจร',
    },
    debrief: {
      en: 'The higher apogee made the orbit longer-lived: had the retro-rocket failed, drag would have taken weeks rather than days, longer than Vostok could keep Gagarin alive. The TDU-1 fired on time, 78 minutes after launch, and the flight lasted 108 minutes. Blok E\'s 54.5 kN is less than a tenth of Blok A\'s: it adds the last 1.6 km/s over four minutes, which is why its cut-off time decides the apogee.',
      ru: 'Более высокий апогей продлил жизнь орбиты: при отказе ТДУ торможение в атмосфере заняло бы не дни, а недели — дольше, чем «Восток» мог поддерживать жизнь Гагарина. ТДУ-1 сработала вовремя, через 78 мин после старта, полёт длился 108 мин. Тяга блока Е, 54,5 кН, меньше десятой доли тяги блока А: он добавляет последние 1,6 км/с за четыре минуты, поэтому момент его отсечки и определяет апогей.',
      th: 'จุดไกลโลกที่สูงขึ้นทำให้วงโคจรคงอยู่นานขึ้น หากจรวดชะลอความเร็วขัดข้อง แรงต้านจะใช้เวลาหลายสัปดาห์แทนที่จะเป็นไม่กี่วัน นานกว่าที่วอสตอคจะเลี้ยงชีวิตกาการินได้ TDU-1 จุดตรงเวลาที่ 78 นาทีหลังปล่อย และการบินใช้เวลา 108 นาที แรงขับ 54.5 kN ของบล็อก E น้อยกว่าหนึ่งในสิบของบล็อก A มันเพิ่มความเร็ว 1.6 กม./วินาทีสุดท้ายในเวลาสี่นาที เวลาที่มันดับเครื่องจึงเป็นตัวกำหนดจุดไกลโลก',
    },
    mission: missionDoc({
      vehicleId: 'vostok8k72k', siteId: 'baikonur', padId: 'site1', satelliteId: 'vostok3ka', payloadMass: 4730,
      orbitId: 'custom', orbit: custom(181, 230, 64.95), launchTime: '1961-04-12T06:07:00.000Z', dynamics: { ...POINT_MASS },
    }),
    locked: [...HISTORY_LOCKS, 'setup.payloadMass', 'setup.launchTime'],
    criteria: [
      { id: 'orbit', kind: 'outcome', is: 'target' },
      {
        id: 'apogee', kind: 'measure', measure: 'orbit.apogee', min: 315, max: 340,
        label: { en: 'Apogee near 327 km', ru: 'Апогей около 327 км', th: 'จุดไกลโลกราว 327 กม.' },
      },
      {
        id: 'perigee', kind: 'measure', measure: 'orbit.perigee', min: 170, max: 195,
        label: { en: 'Perigee near 181 km', ru: 'Перигей около 181 км', th: 'จุดใกล้โลกราว 181 กม.' },
      },
      {
        id: 'period', kind: 'answer', measure: 'orbit.period', tol: 0.2, unit: 'min',
        prompt: { en: 'Orbital period (min)', ru: 'Период обращения (мин)', th: 'คาบวงโคจร (นาที)' },
      },
    ],
    hints: [
      { en: 'Mission setup → Target orbit: the custom orbit\'s apogee.', ru: 'Настройка полёта → «Целевая орбита»: апогей пользовательской орбиты.', th: 'การตั้งค่าภารกิจ → วงโคจรเป้าหมาย: จุดไกลโลกของวงโคจรกำหนดเอง' },
      { en: 'Keep the perigee and the inclination: only the cut-off came late, not the steering.', ru: 'Перигей и наклонение не меняйте: запоздала только отсечка, а не управление.', th: 'คงจุดใกล้โลกและความเอียงไว้ มีเพียงการดับเครื่องที่ช้าไป ไม่ใช่การบังคับทิศทาง' },
      { en: 'T = 2π√(a³/μ), a = R⊕ + (perigee + apogee)/2: about 89 minutes.', ru: 'T = 2π√(a³/μ), a = R⊕ + (перигей + апогей)/2 — около 89 мин.', th: 'T = 2π√(a³/μ) โดย a = R⊕ + (จุดใกล้โลก + จุดไกลโลก)/2 ได้ราว 89 นาที' },
    ],
  },
  {
    id: 'adv-apollo', track: 5, order: 5, mode: 'explore', domains: [2, 3], tags: ['C01', 'Saturn V', 'TLI'],
    title: { en: 'Apollo 11: the way to the Moon', ru: '«Аполлон-11»: путь к Луне', th: 'อะพอลโล 11: เส้นทางสู่ดวงจันทร์' },
    brief: {
      en: '16 July 1969, LC-39A: Saturn V with Apollo 11 on top, 2 938 t. As set up, the S-IVB stops in the 186 km parking orbit with most of its 109 t of propellant still aboard. On the real flight it relit over the Pacific, 2 h 44 min after launch, for the translunar injection. Raise the apogee to the Moon\'s distance, 370 000 km, so that the S-IVB relights, and type in the Δv of that burn. The Moon itself is not modelled here: the burn is the one the flight made, the Moon\'s pull after it is not. Only the orbit may change.',
      ru: '16 июля 1969 г., стартовый комплекс 39A: «Сатурн V» с «Аполлоном-11», 2938 т. В заданном виде S-IVB останавливается на опорной орбите 186 км, сохранив бо́льшую часть своих 109 т топлива. В настоящем полёте она включилась повторно над Тихим океаном, через 2 ч 44 мин после старта, для перехода к Луне. Поднимите апогей до расстояния до Луны, 370 000 км, чтобы S-IVB включилась снова, и введите Δv этого импульса. Сама Луна здесь не моделируется: импульс — тот, что был в полёте, а её притяжение после него — нет. Менять можно только орбиту.',
      th: '16 กรกฎาคม 1969 ฐานปล่อย LC-39A: แซตเทิร์น V กับอะพอลโล 11 หนัก 2,938 ตัน ตามที่ตั้งไว้ S-IVB หยุดในวงโคจรจอด 186 กม. โดยยังมีเชื้อเพลิงส่วนใหญ่จาก 109 ตันเหลืออยู่ ในการบินจริง มันจุดเครื่องอีกครั้งเหนือมหาสมุทรแปซิฟิกที่ 2 ชม. 44 นาทีหลังปล่อย เพื่อเข้าสู่เส้นทางไปดวงจันทร์ (TLI) จงยกจุดไกลโลกขึ้นถึงระยะของดวงจันทร์ 370,000 กม. เพื่อให้ S-IVB จุดเครื่องอีกครั้ง แล้วพิมพ์ Δv ของการจุดนั้น ในที่นี้ไม่มีดวงจันทร์ในแบบจำลอง การจุดเครื่องเป็นแบบเดียวกับในเที่ยวบินจริง แต่แรงดึงดูดของดวงจันทร์หลังจากนั้นไม่มี ปรับได้เฉพาะวงโคจร',
    },
    debrief: {
      en: 'A burn of about 3.1 km/s at perigee turns a 186 km circle into an ellipse reaching the Moon: the speed goes from 7.8 to nearly 10.9 km/s, just short of escape (11.0 km/s there). Three days later the Moon\'s gravity, not modelled here, took over. Because the S-IVB could restart, the same stage made both the orbit and the injection; a single-shot stack such as the R-7 of the first two lessons cannot.',
      ru: 'Импульс около 3,1 км/с в перигее превращает круговую орбиту 186 км в эллипс, достигающий Луны: скорость растёт с 7,8 почти до 10,9 км/с, чуть меньше второй космической (там 11,0 км/с). Через трое суток в дело вступало притяжение Луны, которое здесь не моделируется. Поскольку S-IVB могла включаться повторно, одна и та же ступень выполнила и выведение, и разгон к Луне; одноразовая связка, как Р-7 из двух предыдущих уроков, так не может.',
      th: 'การจุดเครื่องราว 3.1 กม./วินาทีที่จุดใกล้โลกเปลี่ยนวงกลม 186 กม. เป็นวงรีที่ไปถึงดวงจันทร์ ความเร็วเพิ่มจาก 7.8 เป็นเกือบ 10.9 กม./วินาที น้อยกว่าความเร็วหลุดพ้นเพียงเล็กน้อย (11.0 กม./วินาทีที่ระดับนั้น) สามวันต่อมาแรงโน้มถ่วงของดวงจันทร์ซึ่งไม่มีในแบบจำลองนี้จึงเข้ามามีบทบาท เพราะ S-IVB จุดเครื่องซ้ำได้ ขั้นเดียวกันจึงทำได้ทั้งการเข้าวงโคจรและการส่งไปดวงจันทร์ จรวดที่จุดได้ครั้งเดียวอย่าง R-7 ในสองบทก่อนทำเช่นนี้ไม่ได้',
    },
    mission: missionDoc({
      vehicleId: 'saturnv', siteId: 'ksc39a', satelliteId: 'apollo', payloadMass: 45700,
      orbitId: 'custom', orbit: custom(186, 186, 32.5), launchTime: '1969-07-16T13:32:00.000Z', dynamics: { ...POINT_MASS },
    }),
    locked: [...HISTORY_LOCKS, 'setup.payloadMass', 'setup.launchTime'],
    criteria: [
      {
        id: 'tli', kind: 'measure', measure: 'orbit.apogee', min: 300000,
        label: { en: 'Apogee at the Moon\'s distance', ru: 'Апогей на расстоянии Луны', th: 'จุดไกลโลกที่ระยะของดวงจันทร์' },
      },
      {
        id: 'perigee', kind: 'measure', measure: 'orbit.perigee', min: 150, max: 260,
        label: { en: 'Perigee still low, near the parking orbit', ru: 'Перигей остаётся низким, у опорной орбиты', th: 'จุดใกล้โลกยังต่ำ ใกล้วงโคจรจอด' },
      },
      {
        id: 'dv', kind: 'answer', measure: 'burnDv.raise', tolPct: 3, unit: 'm/s',
        prompt: { en: 'Δv of the translunar injection (m/s)', ru: 'Δv разгона к Луне (м/с)', th: 'Δv ของการส่งไปดวงจันทร์ (ม./วินาที)' },
      },
    ],
    hints: [
      { en: 'Mission setup → Target orbit: set the custom orbit\'s apogee to 370 000 km and keep the perigee at 186 km.', ru: 'Настройка полёта → «Целевая орбита»: апогей пользовательской орбиты 370 000 км, перигей оставьте 186 км.', th: 'การตั้งค่าภารกิจ → วงโคจรเป้าหมาย: ตั้งจุดไกลโลกของวงโคจรกำหนดเองเป็น 370,000 กม. และคงจุดใกล้โลกไว้ที่ 186 กม.' },
      { en: 'The event log announces each planned burn with its Δv: the injection is the one that raises the apoapsis. A small trim may be planned after it; it is not part of the answer.', ru: 'Журнал событий сообщает о каждом запланированном импульсе и его Δv: разгон к Луне — импульс подъёма апоцентра. После него может быть запланирована небольшая коррекция; в ответ она не входит.', th: 'บันทึกเหตุการณ์แจ้งการจุดเครื่องที่วางแผนไว้แต่ละครั้งพร้อม Δv การส่งไปดวงจันทร์คือการจุดที่ยกจุดไกลโลก หลังจากนั้นอาจมีการปรับแก้เล็กน้อย ซึ่งไม่นับรวมในคำตอบ' },
      { en: 'vis-viva: v² = μ(2/r − 1/a). At r = R⊕ + 186 km, compare a = r with a = (r + R⊕ + 370 000 km)/2.', ru: 'Формула vis-viva: v² = μ(2/r − 1/a). При r = R⊕ + 186 км сравните a = r и a = (r + R⊕ + 370 000 км)/2.', th: 'สมการ vis-viva: v² = μ(2/r − 1/a) ที่ r = R⊕ + 186 กม. เปรียบเทียบ a = r กับ a = (r + R⊕ + 370,000 กม.)/2' },
    ],
  },
];
