/**
 * Track 5, advanced missions (roadmap E03): the first stage flown back to
 * Landing Zone 1, and a Soyuz to the station on the fast profile. Both fly
 * point-mass (tests/lessons.test.ts). 5.3, the historical missions, waits for
 * C01 and stays listed as coming.
 */
import { missionDoc } from './common';

const POINT_MASS = { model: 'pointMass', wind: 'calm', seed: 20260919 } as const;

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
];
