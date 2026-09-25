/**
 * Tracks 2, 4 and 5 (roadmap E03): listed in the catalogue, so the placement
 * test can already point at them, and written in the next round.
 */
import { missionDoc } from './common';

const soon = (id: string, track: number, order: number, mode: 'explore' | 'engineer', domains: number[], tags: string[],
  title: { en: string; ru: string; th: string }, brief: { en: string; ru: string; th: string }) => ({
  id, track, order, mode, domains, tags, title, brief, comingSoon: true, criteria: [], hints: [], locked: [],
  mission: missionDoc({ vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats', payloadMass: 10000, orbitId: 'leo' }),
});

export const COMING: readonly unknown[] = [
  soon('guid-maxq', 2, 1, 'explore', [2, 3], ['q_max'],
    { en: 'Aerodynamic loads', ru: 'Аэродинамические нагрузки', th: 'ภาระทางอากาศพลศาสตร์' },
    { en: 'Shape the pitch programme so that the peak dynamic pressure stays below a limit.', ru: 'Подберите программу тангажа так, чтобы максимальный скоростной напор не превышал предела.', th: 'ปรับโปรแกรมพิตช์ให้ความดันพลวัตสูงสุดไม่เกินขีดจำกัด' }),
  soon('guid-peg', 2, 2, 'engineer', [3], ['G01'],
    { en: 'PEG and IGM', ru: 'PEG и IGM', th: 'PEG และ IGM' },
    { en: 'Fly the closed-loop explicit guidance and hold the insertion to a kilometre.', ru: 'Выполните полёт с явным замкнутым наведением и выдержите точность выведения до километра.', th: 'บินด้วยการนำวิถีแบบชัดแจ้งวงปิดและรักษาความแม่นยำการเข้าวงโคจรภายในหนึ่งกิโลเมตร' }),
  soon('guid-nav', 2, 3, 'engineer', [3], ['G02'],
    { en: 'Inertial navigation and the Kalman filter', ru: 'Инерциальная навигация и фильтр Калмана', th: 'การนำทางเฉื่อยและตัวกรองคาลมาน' },
    { en: 'Keep the navigation error at insertion within a bound, with and without GNSS.', ru: 'Удержите навигационную ошибку при выведении в заданных пределах — с ГНСС и без неё.', th: 'รักษาความคลาดของการนำทางขณะเข้าวงโคจรให้อยู่ในขอบเขต ทั้งมีและไม่มี GNSS' }),
  soon('guid-monte-carlo', 2, 4, 'engineer', [3, 2], ['G05'],
    { en: 'Monte Carlo 3σ', ru: 'Метод Монте-Карло, 3σ', th: 'มอนติคาร์โล 3σ' },
    { en: 'Read the 3σ spread of the insertion from many dispersed flights.', ru: 'Определите разброс выведения 3σ по множеству полётов с разбросом параметров.', th: 'อ่านการกระจาย 3σ ของการเข้าวงโคจรจากเที่ยวบินจำนวนมากที่สุ่มค่าพารามิเตอร์' }),
  soon('ctl-inspector', 4, 1, 'engineer', [4], ['G03'],
    { en: 'Reading the control loop', ru: 'Анализ контура управления', th: 'อ่านลูปควบคุม' },
    { en: 'Find the crossover frequency and the margins at max-Q in the loop inspector.', ru: 'Найдите частоту среза и запасы устойчивости на максимальном напоре в инспекторе контура.', th: 'หาความถี่ครอสโอเวอร์และค่าเผื่อเสถียรภาพที่ max-Q จากตัวตรวจลูป' }),
  soon('ctl-margins', 4, 2, 'engineer', [4], ['G04', 'E04'],
    { en: 'Gains with margins', ru: 'Коэффициенты с запасами', th: 'ปรับเกนให้มีค่าเผื่อ' },
    { en: 'Tune the autopilot for a phase margin of 30° and a gain margin of 6 dB, then fly it.', ru: 'Настройте автомат на запас по фазе 30° и по амплитуде 6 дБ и выполните полёт.', th: 'ปรับระบบนำร่องให้มีค่าเผื่อเฟส 30° และค่าเผื่อเกน 6 dB แล้วบิน' }),
  soon('ctl-step', 4, 3, 'engineer', [4], ['E04'],
    { en: 'A step test in flight', ru: 'Ступенчатое воздействие в полёте', th: 'การทดสอบแบบขั้นในการบิน' },
    { en: 'Hold the overshoot and the settling time of an attitude step within limits.', ru: 'Удержите перерегулирование и время переходного процесса в заданных пределах.', th: 'รักษาค่าพุ่งเกินและเวลาเข้าที่ของการตอบสนองแบบขั้นให้อยู่ในขีดจำกัด' }),
  soon('ctl-notch', 4, 4, 'engineer', [4], ['P05'],
    { en: 'Bending and the notch filter', ru: 'Упругие колебания и режекторный фильтр', th: 'การโค้งงอและตัวกรองน็อตช์' },
    { en: 'Keep the bending mode from growing with the notch filter.', ru: 'Не дайте упругому тону раскачаться с помощью режекторного фильтра.', th: 'ใช้ตัวกรองน็อตช์ไม่ให้โหมดการโค้งงอขยายตัว' }),
  soon('adv-landing', 5, 1, 'explore', [3, 2], ['recovery'],
    { en: 'Bringing the booster home', ru: 'Возвращение первой ступени', th: 'นำบูสเตอร์กลับ' },
    { en: 'Land Falcon 9\'s first stage on Landing Zone 1.', ru: 'Посадите первую ступень Falcon 9 на площадку LZ-1.', th: 'นำขั้นที่ 1 ของ Falcon 9 ลงจอดที่ Landing Zone 1' }),
  soon('adv-docking', 5, 2, 'explore', [1, 3], ['G07'],
    { en: 'Rendezvous and docking', ru: 'Сближение и стыковка', th: 'การนัดพบและเชื่อมต่อ' },
    { en: 'Fly Soyuz MS to the station on the two-orbit profile and dock.', ru: 'Выполните полёт «Союза МС» к станции по двухвитковой схеме и состыкуйтесь.', th: 'บินโซยุซ MS ไปสถานีด้วยโปรไฟล์สองรอบโคจรแล้วเชื่อมต่อ' }),
  soon('adv-history', 5, 3, 'explore', [1, 6], ['C01'],
    { en: 'Historical missions', ru: 'Исторические миссии', th: 'ภารกิจประวัติศาสตร์' },
    { en: 'Sputnik-1, Vostok-1 and Apollo 11, flown as they were.', ru: 'Спутник-1, «Восток-1» и «Аполлон-11» — так, как они летали.', th: 'สปุตนิก-1 วอสตอค-1 และอะพอลโล 11 บินตามที่เกิดขึ้นจริง' }),
];
