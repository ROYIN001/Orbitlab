/**
 * Track 3, failures (roadmap E03): an engine lost on the first stage, a rate
 * gyro that sticks, and the crew's escape. The engine-out and the abort are
 * flown point-mass; the gyro needs the six-DOF autopilot, so its worked
 * solution is flown in tests/heavy/lessons-sixdof.test.ts.
 */
import { DEFAULT_FAILURE } from '../../physics/defaults';
import { missionDoc } from './common';

export const TRACK3: readonly unknown[] = [
  {
    id: 'fail-engine-out', track: 3, order: 1, mode: 'explore', domains: [6, 3], tags: ['failure', 'm_pl'],
    title: { en: 'One engine out', ru: 'Отказ одного двигателя', th: 'เครื่องยนต์ดับหนึ่งเครื่อง' },
    brief: {
      en: 'One of Falcon 9\'s nine first-stage engines will fail at T+80 s. The rocket can still reach orbit — the other eight burn longer and the guidance flies on — but not with 19 t on top. Take off as little payload as you must: reach the 500 km target orbit carrying at least 17.5 t. The failure is fixed; only the payload mass may be changed.',
      ru: 'Один из девяти двигателей первой ступени Falcon 9 откажет на T+80 с. Ракета всё ещё может выйти на орбиту — остальные восемь работают дольше, и система наведения продолжает полёт, — но не с 19 т нагрузки. Снимите столько нагрузки, сколько необходимо, и не больше: выйдите на целевую орбиту 500 км с нагрузкой не менее 17,5 т. Отказ задан; изменять можно только массу полезной нагрузки.',
      th: 'เครื่องยนต์หนึ่งในเก้าเครื่องของขั้นที่ 1 ของ Falcon 9 จะดับที่ T+80 วินาที จรวดยังเข้าวงโคจรได้ เพราะอีกแปดเครื่องจะเผาไหม้นานขึ้นและระบบนำวิถียังบินต่อ แต่ไม่ใช่เมื่อบรรทุก 19 ตัน ให้ลดน้ำหนักบรรทุกเท่าที่จำเป็นเท่านั้น: เข้าวงโคจรเป้าหมาย 500 กม. โดยบรรทุกไม่น้อยกว่า 17.5 ตัน ความล้มเหลวถูกกำหนดไว้แล้ว เปลี่ยนได้เฉพาะมวลน้ำหนักบรรทุก',
    },
    debrief: {
      en: 'Engine-out capability: with eight engines of nine the first stage keeps all its propellant but has less thrust, so it burns longer and loses more to gravity. The loss shows as Δv the second stage no longer has — about 100 m/s here, which is why a little payload had to come off.',
      ru: 'Живучесть при отказе двигателя: с восемью двигателями из девяти первая ступень сохраняет всё топливо, но тяга меньше, поэтому ступень работает дольше и больше теряет на гравитацию. Потеря проявляется как Δv, которого не хватает второй ступени, — здесь около 100 м/с, поэтому пришлось немного уменьшить нагрузку.',
      th: 'ความสามารถรับมือเครื่องยนต์ดับ: เมื่อเหลือแปดในเก้าเครื่อง ขั้นที่ 1 ยังมีเชื้อเพลิงครบแต่แรงขับน้อยลง จึงเผาไหม้นานขึ้นและสูญเสียจากแรงโน้มถ่วงมากขึ้น การสูญเสียนี้ปรากฏเป็น Δv ที่ขั้นที่ 2 ไม่มีอีกต่อไป ในที่นี้ประมาณ 100 ม./วินาที จึงต้องลดน้ำหนักบรรทุกลงเล็กน้อย',
    },
    mission: missionDoc({
      vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 19000, orbitId: 'leo',
      failure: { ...DEFAULT_FAILURE, mode: 'engineOut', time: 80, stage: 0 },
      dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 },
    }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.orbit', 'setup.failure', 'setup.dynamics.model', 'setup.guidance'],
    criteria: [
      { id: 'orbit', kind: 'outcome', is: 'target' },
      { id: 'payload', kind: 'measure', measure: 'payload', min: 17500 },
    ],
    hints: [
      { en: 'With eight engines the first stage has the same propellant but less thrust: it burns longer and loses more to gravity.', ru: 'С восемью двигателями у первой ступени то же топливо, но меньше тяга: она работает дольше и больше теряет на гравитацию.', th: 'เมื่อเหลือแปดเครื่อง ขั้นที่ 1 มีเชื้อเพลิงเท่าเดิมแต่แรงขับน้อยลง จึงเผาไหม้นานขึ้นและเสียให้แรงโน้มถ่วงมากขึ้น' },
      { en: 'Compare "Δv left" with a flight of the same mass without the failure: the difference is what the lost engine costs.', ru: 'Сравните «Остаток Δv» с полётом той же массы без отказа: разница — цена потерянного двигателя.', th: 'เปรียบเทียบ «Δv คงเหลือ» กับเที่ยวบินมวลเดียวกันที่ไม่มีความล้มเหลว ผลต่างคือราคาของเครื่องยนต์ที่เสียไป' },
      { en: 'The engine costs about 100 m/s, and at the second stage 500 kg of payload is worth about 80 m/s.', ru: 'Двигатель стоит около 100 м/с, а на второй ступени 500 кг нагрузки эквивалентны примерно 80 м/с.', th: 'เครื่องยนต์ที่เสียไปมีค่าประมาณ 100 ม./วินาที และที่ขั้นที่ 2 น้ำหนักบรรทุก 500 กก. เทียบได้กับประมาณ 80 ม./วินาที' },
    ],
  },
  {
    id: 'fail-gyro-fdir', track: 3, order: 2, mode: 'engineer', domains: [6, 5], tags: ['G08', 'FDIR'],
    title: { en: 'A stuck gyro and the FDIR', ru: 'Заклинивший ДУС и FDIR', th: 'ไจโรค้างกับ FDIR' },
    brief: {
      en: 'Falcon 9 flown as a rigid body under its autopilot. At T+30 s the rate gyros of inertial unit 1 will stick. Without fault detection the flight computer flies on unit 1 alone. Turn on the FDIR (Engineer mode, "Control-system failures") so that the three units vote, and reach the target orbit. The failure itself is fixed.',
      ru: 'Falcon 9 летит как твёрдое тело под управлением автомата стабилизации. На T+30 с датчики угловой скорости инерциального блока 1 заклинит. Без обнаружения отказов бортовой компьютер летит только по блоку 1. Включите FDIR (режим «Инженер», «Отказы системы управления»), чтобы три блока голосовали, и выйдите на целевую орбиту. Сам отказ задан.',
      th: 'Falcon 9 บินแบบวัตถุแข็งเกร็งภายใต้ระบบนำร่องอัตโนมัติ ที่ T+30 วินาที ไจโรวัดอัตราเชิงมุมของหน่วยเฉื่อยที่ 1 จะค้าง หากไม่มีการตรวจจับความผิดพลาด คอมพิวเตอร์การบินจะบินตามหน่วยที่ 1 เพียงหน่วยเดียว ให้เปิด FDIR (โหมดวิศวกร หัวข้อ «ความล้มเหลวของระบบควบคุม») เพื่อให้ทั้งสามหน่วยลงคะแนนกัน แล้วเข้าสู่วงโคจรเป้าหมาย ความล้มเหลวถูกกำหนดไว้แล้ว',
    },
    debrief: {
      en: 'Three inertial units are carried so that two good ones can outvote a bad one. A stuck gyro reads a constant rate: the autopilot "corrects" a motion that is not there and flies the vehicle into an angle of attack the air breaks it at. Voting isolates the unit once it disagrees with the other two for long enough.',
      ru: 'Три инерциальных блока ставят для того, чтобы два исправных могли перевесить неисправный. Заклинивший ДУС показывает постоянную скорость: автомат «исправляет» несуществующее движение и уводит ракету на угол атаки, при котором её разрушает скоростной напор. Голосование отключает блок, когда он достаточно долго расходится с двумя другими.',
      th: 'ยานบรรทุกหน่วยเฉื่อยสามหน่วยเพื่อให้สองหน่วยที่ดีลงคะแนนชนะหน่วยที่เสีย ไจโรที่ค้างจะอ่านอัตราคงที่ ระบบนำร่องจึง «แก้» การเคลื่อนที่ที่ไม่มีอยู่จริงและพาจรวดเข้ามุมปะทะที่อากาศทำให้โครงสร้างพัง การลงคะแนนจะแยกหน่วยนั้นออกเมื่อค่าของมันต่างจากอีกสองหน่วยนานพอ',
    },
    mission: missionDoc({
      vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 10000, orbitId: 'leo',
      dynamics: { model: 'sixDof', wind: 'calm', seed: 20260919, controlFaults: { faults: [{ kind: 'gyroStuck', time: 30, units: [1] }], fdir: false } },
    }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model', 'setup.faults'],
    criteria: [
      { id: 'orbit', kind: 'outcome', is: 'target' },
      { id: 'isolated', kind: 'event', key: 'evt.fdirImuIsolated', present: true, label: { en: 'The FDIR isolates the failed unit', ru: 'FDIR отключает неисправный блок', th: 'FDIR แยกหน่วยที่เสียออก' } },
    ],
    hints: [
      { en: 'Three units are carried so that two good ones can outvote a bad one — but only if the voting is switched on.', ru: 'Три блока ставят, чтобы два исправных перевесили неисправный, — но только если голосование включено.', th: 'ยานมีสามหน่วยเพื่อให้สองหน่วยที่ดีชนะหน่วยที่เสีย แต่ต้องเปิดการลงคะแนนก่อน' },
      { en: 'The switch is in the setup panel, section "Control-system failures (G08)".', ru: 'Переключатель — на панели настройки, раздел «Отказы системы управления (G08)».', th: 'สวิตช์อยู่ในแผงตั้งค่า หัวข้อ «ความล้มเหลวของระบบควบคุม (G08)»' },
      { en: 'Watch the event log after T+30 s: without the FDIR the vehicle breaks up about ten seconds later; with it, unit 1 is isolated.', ru: 'Следите за журналом событий после T+30 с: без FDIR ракета разрушается примерно через десять секунд, с ним блок 1 отключается.', th: 'ดูบันทึกเหตุการณ์หลัง T+30 วินาที ถ้าไม่มี FDIR จรวดจะแตกหักภายในราวสิบวินาที ถ้ามีจะแยกหน่วยที่ 1 ออก' },
    ],
  },
  {
    id: 'fail-abort', track: 3, order: 3, mode: 'explore', domains: [6], tags: ['G06', 'crew'],
    title: { en: 'The crew\'s escape', ru: 'Спасение экипажа', th: 'การหนีภัยของลูกเรือ' },
    brief: {
      en: 'A crewed Soyuz. At T+60 s, near the maximum dynamic pressure, the flight director commands an abort: the escape tower pulls the head section off the rocket, the descent module falls free and comes down on its parachutes. Fly it until the crew is on the ground, then read the peak load factor on the crew during the escape and type it in.',
      ru: 'Пилотируемый «Союз». На T+60 с, вблизи максимального скоростного напора, руководитель полёта даёт команду на аварийное спасение: двигательная установка САС уводит головной блок от ракеты, спускаемый аппарат отделяется и опускается на парашютах. Выполните полёт до приземления экипажа, затем определите максимальную перегрузку экипажа при спасении и введите её.',
      th: 'ยานโซยุซมีมนุษย์ ที่ T+60 วินาที ใกล้ช่วงความดันพลวัตสูงสุด ผู้อำนวยการการบินสั่งยกเลิกการปล่อย หอหนีภัยดึงส่วนหัวออกจากจรวด แคปซูลกลับสู่โลกหลุดออกและลงด้วยร่มชูชีพ บินจนลูกเรือถึงพื้น แล้วอ่านค่าตัวประกอบภาระ (g) สูงสุดที่ลูกเรือได้รับระหว่างการหนีภัยแล้วพิมพ์คำตอบ',
    },
    debrief: {
      en: 'The escape trades a moment of high load for distance from an exploding rocket: the tower\'s motor accelerates the head section at well over 10 g for about a second. Near max-Q the air helps and hurts at once — it brakes the head section quickly, and it makes the separation violent.',
      ru: 'Спасение платит кратковременной большой перегрузкой за расстояние от взрывающейся ракеты: двигатель САС разгоняет головной блок с перегрузкой свыше 10 единиц около секунды. Вблизи максимального напора воздух и помогает, и мешает — быстро тормозит головной блок и делает отделение жёстким.',
      th: 'การหนีภัยแลกภาระสูงชั่วครู่กับระยะห่างจากจรวดที่อาจระเบิด มอเตอร์ของหอหนีภัยเร่งส่วนหัวด้วยภาระมากกว่า 10 g ราวหนึ่งวินาที ใกล้ max-Q อากาศทั้งช่วยและเป็นอุปสรรค คือหน่วงส่วนหัวลงอย่างรวดเร็ว และทำให้การแยกตัวรุนแรง',
    },
    mission: missionDoc({
      vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', payloadMass: 7150, orbitId: 'iss',
      failure: { ...DEFAULT_FAILURE, mode: 'launchAbort', time: 60, stage: 0 },
      dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 },
    }),
    locked: ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.failure', 'setup.dynamics.model'],
    endEvent: 'evt.abortCrewSafe',
    criteria: [
      { id: 'crew', kind: 'hook', hook: 'crewSafe', label: { en: 'The crew lands safely', ru: 'Экипаж благополучно приземлился', th: 'ลูกเรือลงถึงพื้นอย่างปลอดภัย' } },
      {
        id: 'peak', kind: 'answer', measure: 'abort.maxG', tolPct: 10, unit: 'g',
        prompt: { en: 'Peak load factor on the crew (g)', ru: 'Максимальная перегрузка экипажа (ед.)', th: 'ตัวประกอบภาระสูงสุดที่ลูกเรือได้รับ (g)' },
      },
    ],
    hints: [
      { en: 'The load factor n is the specific force the crew feels, in units of g.', ru: 'Перегрузка n — удельная сила, которую ощущает экипаж, в единицах g.', th: 'ตัวประกอบภาระ n คือแรงจำเพาะที่ลูกเรือรู้สึก มีหน่วยเป็น g' },
      { en: 'The telemetry panel\'s load-factor chart shows it: look at the first seconds after the abort. Once the crew is down, the narration under the picture names the peak too.', ru: 'Его показывает график перегрузки на панели телеметрии: смотрите первые секунды после команды. После приземления пик называет и подпись под изображением.', th: 'กราฟตัวประกอบภาระในแผงโทรมาตรแสดงค่านี้ ดูช่วงวินาทีแรกหลังคำสั่งยกเลิก และเมื่อลูกเรือถึงพื้นแล้ว คำบรรยายใต้ภาพจะบอกค่าสูงสุดด้วย' },
      { en: 'The tower\'s main motor burns for under a second; expect a peak between 10 and 17 g.', ru: 'Основной двигатель САС работает меньше секунды; ожидайте пик от 10 до 17 единиц.', th: 'มอเตอร์หลักของหอหนีภัยทำงานไม่ถึงหนึ่งวินาที คาดว่าค่าสูงสุดอยู่ระหว่าง 10 ถึง 17 g' },
    ],
  },
];
