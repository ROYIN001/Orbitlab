/**
 * Track 6, real cases (roadmap E03 with P2.5's cases from the record): three
 * case lessons. Each opens the Orbit section's Real satellites at the case's
 * tool, and the student answers the case sheet's questions, graded by the
 * sheet's own key (src/worksheets/cases.ts) with the data frozen when the
 * lesson opens. Easiest first. The hints give methods, never a number the
 * key holds; tests/case-lessons.test.ts holds each lesson to its sheet.
 */
import { CASE_ITEM_IDS, type CaseId } from '../../worksheets/case-ids';

/** Every question of the case's sheet, each criterion named by its question. */
const all = (id: CaseId) => CASE_ITEM_IDS[id].map((item) => ({ id: item, kind: 'case', item }));

export const TRACK6: readonly unknown[] = [
  {
    kind: 'case', case: 'theos2', id: 'case-theos2', track: 6, order: 1, mode: 'explore', domains: [2], tags: ['M02', 'J₂', 'SSO'],
    title: { en: 'THEOS-2 over Bangkok', ru: 'THEOS-2 над Бангкоком', th: 'THEOS-2 เหนือกรุงเทพฯ' },
    brief: {
      en: 'THEOS-2, Thailand\'s Earth-observation satellite, flies a sun-synchronous orbit. Real satellites opens on it, with its overflights of Bangkok. From its element set (the data below, frozen when the lesson opened) work out how fast its orbit\'s plane must turn and how fast the Earth\'s bulge (J₂) turns it, its mean height, how far from its track it can see tilted 45°, and the local time it passes over Bangkok; then say why a camera satellite flies such an orbit.',
      ru: 'THEOS-2, таиландский спутник наблюдения Земли, летает по солнечно-синхронной орбите. Раздел «Реальные спутники» открывается на нём, с его пролётами над Бангкоком. По его набору элементов (данные ниже, зафиксированные при открытии урока) рассчитайте, с какой скоростью должна поворачиваться плоскость его орбиты и с какой скоростью её поворачивает сжатие Земли (J₂), его среднюю высоту, насколько далеко от трассы он видит при наклоне 45° и местное время пролёта над Бангкоком; затем объясните, зачем спутнику со съёмочной камерой такая орбита.',
      th: 'THEOS-2 ดาวเทียมสำรวจโลกของไทย โคจรในวงโคจรสัมพันธ์กับดวงอาทิตย์ ส่วนดาวเทียมจริงจะเปิดที่ดาวเทียมดวงนี้พร้อมการผ่านเหนือกรุงเทพฯ จากชุดข้อมูลวงโคจรของมัน (ข้อมูลด้านล่าง ซึ่งถูกตรึงไว้ตอนเปิดบทเรียน) ให้คำนวณว่าระนาบวงโคจรต้องหมุนเร็วเท่าใด และความป่องของโลก (J₂) หมุนระนาบนั้นเร็วเท่าใด ความสูงเฉลี่ย ระยะที่มองเห็นได้ไกลจากแนวทางโคจรเมื่อเอียง 45° และเวลาท้องถิ่นที่ผ่านเหนือกรุงเทพฯ แล้วอธิบายว่าทำไมดาวเทียมถ่ายภาพจึงใช้วงโคจรแบบนี้',
    },
    debrief: {
      en: 'J₂ turns THEOS-2\'s plane by almost exactly the Sun\'s 0.9856° a day, so its descending equator crossing occurs at approximately the same local mean solar time each orbit, in the middle of the morning — the published 10:00–10:30. Each place is pictured under much the same sunlight, so pictures taken months apart can be compared. The Earth\'s bulge does the work, with no fuel.',
      ru: 'J₂ поворачивает плоскость THEOS-2 почти ровно на 0,9856° в сутки, как движется Солнце, поэтому нисходящее пересечение экватора происходит примерно в одно и то же местное среднее солнечное время на каждом витке, в середине утра — опубликованные 10:00–10:30. Каждое место снимается при почти одинаковом освещении, и снимки, сделанные с разницей в месяцы, можно сравнивать. Работу делает сжатие Земли, без топлива.',
      th: 'J₂ หมุนระนาบของ THEOS-2 เกือบเท่ากับ 0.9856° ต่อวันพอดีตามดวงอาทิตย์ ดาวเทียมจึงผ่านเส้นศูนย์สูตรที่โหนดลงในเวลาสุริยะเฉลี่ยท้องถิ่นใกล้เคียงเดิมทุกรอบ ช่วงสาย ตรงกับค่าที่เผยแพร่ 10:00–10:30 แต่ละที่จึงถูกถ่ายภาพภายใต้แสงแดดใกล้เคียงกัน และเปรียบเทียบภาพที่ถ่ายห่างกันหลายเดือนได้ ความป่องของโลกทำงานนี้ให้โดยไม่ใช้เชื้อเพลิง',
    },
    criteria: all('theos2'),
    hints: [
      {
        en: 'The plane must keep up with the Sun: one full turn in a year of 365.2422 days. The turn J₂ gives depends on the orbit\'s size, shape and tilt: a, e and i in the data.',
        ru: 'Плоскость должна успевать за Солнцем: один полный оборот за год из 365,2422 сут. Поворот, который даёт J₂, зависит от размера, формы и наклона орбиты: a, e и i в данных.',
        th: 'ระนาบต้องหมุนตามดวงอาทิตย์ให้ทัน คือหมุนครบหนึ่งรอบในหนึ่งปี 365.2422 วัน ส่วนการหมุนที่ได้จาก J₂ ขึ้นกับขนาด รูปร่าง และความเอียงของวงโคจร คือ a, e และ i ในข้อมูล',
      },
      {
        en: 'dΩ/dt = −(3/2) J₂ (R/p)² n cos i, with p = a(1 − e²) and n = √(μ/a³) in radians per second: turn it into degrees per day. The height is a − R, R the equatorial radius.',
        ru: 'dΩ/dt = −(3/2) J₂ (R/p)² n cos i, где p = a(1 − e²), а n = √(μ/a³) в радианах в секунду; переведите результат в градусы в сутки. Высота равна a − R, где R — экваториальный радиус.',
        th: 'dΩ/dt = −(3/2) J₂ (R/p)² n cos i โดย p = a(1 − e²) และ n = √(μ/a³) หน่วยเรเดียนต่อวินาที แล้วแปลงเป็นองศาต่อวัน ความสูงคือ a − R โดย R คือรัศมีที่เส้นศูนย์สูตร',
      },
      {
        en: 'In the triangle of the Earth\'s centre, the satellite and the point it sees, the sine rule gives the angle at that point from R_mean + h, R_mean and the 45° look; the angle at the centre is what is left of 180°, and the distance is that angle times R_mean. Local mean solar time is UTC plus the longitude ÷ 15° per hour.',
        ru: 'В треугольнике «центр Земли — спутник — видимая точка» теорема синусов даёт угол при видимой точке по R_mean + h, R_mean и наклону 45°; угол при центре Земли — то, что остаётся до 180°, а расстояние — этот угол, умноженный на R_mean. Местное среднее солнечное время равно UTC плюс долгота ÷ 15° в час.',
        th: 'ในสามเหลี่ยมที่มีจุดยอดเป็นศูนย์กลางโลก ดาวเทียม และจุดที่มองเห็น กฎของไซน์ให้มุมที่จุดที่มองเห็นจาก R_mean + h, R_mean และมุมเอียง 45° มุมที่ศูนย์กลางโลกคือส่วนที่เหลือจาก 180° และระยะทางคือมุมนั้นคูณ R_mean ส่วนเวลาสุริยะเฉลี่ยท้องถิ่นคือ UTC บวกลองจิจูด ÷ 15° ต่อชั่วโมง',
      },
    ],
  },
  {
    kind: 'case', case: 'cz5b', id: 'case-cz5b', track: 6, order: 2, mode: 'explore', domains: [2, 3], tags: ['M03', 'C_D·A/m'],
    title: { en: 'The Long March 5B stage of Tianhe', ru: 'Ступень «Чанчжэн-5B», выведшая «Тяньхэ»', th: 'ท่อนจรวด Long March 5B ของ Tianhe' },
    brief: {
      en: 'In April 2021 the 21.6-tonne core stage that launched Tianhe was left in orbit, and it came down uncontrolled on 9 May, ten days later. Real satellites opens at the re-entry tool. From the stage\'s size and mass, its first element set and this app\'s prediction (the data below, with the Sun\'s activity frozen when the lesson opened) work out its cross-section tumbling and its ballistic coefficient, the agencies\' ±20 % window, how long it actually stayed up, the prediction\'s error, and how long it would have lasted broadside; then say why a window is given.',
      ru: 'В апреле 2021 года центральная ступень массой 21,6 т, выведшая «Тяньхэ», осталась на орбите и неуправляемо сошла с неё 9 мая, через десять дней. Раздел «Реальные спутники» открывается на инструменте прогноза схода. По размерам и массе ступени, её первому набору элементов и прогнозу приложения (данные ниже; активность Солнца зафиксирована при открытии урока) рассчитайте среднюю площадь сечения кувыркающейся ступени и её баллистический коэффициент, окно ±20 %, как у служб прогноза, сколько она на самом деле пробыла на орбите, ошибку прогноза и сколько бы она продержалась, летя боком; затем объясните, почему дают окно.',
      th: 'เดือนเมษายน 2021 ท่อนจรวดหลักหนัก 21.6 ตันที่ส่งโมดูล Tianhe ถูกทิ้งไว้ในวงโคจร และตกลงมาโดยไม่มีการควบคุมเมื่อ 9 พฤษภาคม สิบวันต่อมา ส่วนดาวเทียมจริงจะเปิดที่เครื่องมือทำนายการตก จากขนาดและมวลของท่อนจรวด ชุดข้อมูลวงโคจรชุดแรก และการทำนายของแอปนี้ (ข้อมูลด้านล่าง โดยกิจกรรมของดวงอาทิตย์ถูกตรึงไว้ตอนเปิดบทเรียน) ให้คำนวณพื้นที่หน้าตัดเฉลี่ยขณะหมุนคว้างและค่าสัมประสิทธิ์ขีปนวิถี ช่วงเวลา ±20 % ที่หน่วยงานติดตามวัตถุอวกาศใช้ เวลาที่อยู่ในวงโคจรจริง ความคลาดเคลื่อนของการทำนาย และเวลาที่จะอยู่ได้ถ้าหันด้านข้างตลอด แล้วอธิบายว่าทำไมจึงบอกเป็นช่วงเวลา',
    },
    debrief: {
      en: 'The prediction from the first element set came within the ±20 % window — yet ±20 % of some nine days is nearly two days, some thirty orbits, and the stage could fall anywhere under them. The drag depends on the upper air, which the Sun heats and swells, and on how the stage tumbles; neither is known exactly in advance. Now run the case study in the re-entry tool: it predicts all four Long March 5B stages the same way.',
      ru: 'Прогноз по первому набору элементов попал в окно ±20 %, но ±20 % от девяти с лишним суток — это почти двое суток, около тридцати витков, и ступень могла упасть где угодно под ними. Сопротивление зависит от верхней атмосферы, которую нагревает и раздувает Солнце, и от того, как кувыркается ступень; ни то, ни другое заранее точно не известно. Теперь запустите разбор случая в инструменте прогноза схода: он так же прогнозирует все четыре ступени «Чанчжэн-5B».',
      th: 'การทำนายจากชุดข้อมูลชุดแรกตกอยู่ในช่วง ±20 % แต่ ±20 % ของเวลาราวเก้าวันคือเกือบสองวัน ราวสามสิบรอบวงโคจร และท่อนจรวดอาจตกที่ใดก็ได้ใต้แนวโคจรเหล่านั้น แรงต้านขึ้นกับบรรยากาศชั้นบนที่ดวงอาทิตย์ทำให้ร้อนและขยายตัว และขึ้นกับการหมุนคว้างของท่อนจรวด ซึ่งรู้ล่วงหน้าได้ไม่แน่นอนทั้งคู่ ตอนนี้ลองเปิดกรณีศึกษาในเครื่องมือทำนายการตก ซึ่งทำนายท่อนจรวด Long March 5B ทั้งสี่ท่อนด้วยวิธีเดียวกัน',
    },
    criteria: all('cz5b'),
    hints: [
      {
        en: 'Tumbling, a body shows on average a quarter of its surface (Cauchy): the cylinder\'s side πDL and its two ends, 2 · πD²/4. Then C_D·A/m, with C_D 2.2 and the mass in the data.',
        ru: 'Кувыркающееся тело в среднем показывает четверть своей поверхности (Коши): боковую поверхность цилиндра πDL и два торца 2 · πD²/4. Затем C_x·A/m, где C_x = 2,2, а масса — из данных.',
        th: 'วัตถุที่หมุนคว้างจะหันพื้นที่เฉลี่ยหนึ่งในสี่ของพื้นที่ผิวทั้งหมด (โคชี) คือด้านข้างของทรงกระบอก πDL และปลายทั้งสอง 2 · πD²/4 จากนั้นหา C_D·A/m โดยใช้ C_D 2.2 และมวลในข้อมูล',
      },
      {
        en: 'The window is 0.8 and 1.2 times the time predicted to be left. The time actually left is the re-entry\'s date and time less the set\'s epoch, in days: count the hours too.',
        ru: 'Окно — это 0,8 и 1,2 от прогнозируемого оставшегося времени. Фактически оставшееся время — момент схода минус эпоха набора, в сутках: учитывайте и часы.',
        th: 'ช่วงเวลาคือ 0.8 และ 1.2 เท่าของเวลาที่ทำนายว่าเหลือ เวลาที่เหลือจริงคือวันเวลาที่ตกลบด้วยเวลาของชุดข้อมูล หน่วยเป็นวัน อย่าลืมนับชั่วโมงด้วย',
      },
      {
        en: 'The error is (predicted − actual) ÷ actual, as a percentage: negative means early. To first order the time left goes as 1/(C_D·A/m), so a larger area broadside shortens the stay in proportion.',
        ru: 'Ошибка — (прогноз − факт) ÷ факт, в процентах: отрицательная означает раньше срока. В первом приближении оставшееся время обратно пропорционально C_x·A/m, поэтому бо́льшая площадь при полёте боком пропорционально сокращает срок.',
        th: 'ความคลาดเคลื่อนคือ (ค่าทำนาย − ค่าจริง) ÷ ค่าจริง เป็นร้อยละ ค่าติดลบหมายถึงเร็วกว่าจริง ในอันดับแรกเวลาที่เหลือแปรผกผันกับ C_D·A/m พื้นที่ที่มากขึ้นเมื่อหันด้านข้างจึงทำให้อยู่ได้สั้นลงตามสัดส่วน',
      },
    ],
  },
  {
    kind: 'case', case: 'iridium', id: 'case-iridium', track: 6, order: 3, mode: 'engineer', domains: [2, 6], tags: ['M01', 'P_c'],
    title: { en: 'Iridium 33 and Cosmos 2251', ru: 'Iridium 33 и «Космос-2251»', th: 'Iridium 33 กับ Cosmos 2251' },
    brief: {
      en: 'On 10 February 2009 Iridium 33 and the dead Cosmos 2251 collided over Siberia, the first collision of two whole satellites. The conjunction message issued the day before gave a probability of about 10⁻⁵¹. Real satellites opens at the close-approach tool. From the message\'s positions, velocities and uncertainties (the data below) work out the miss distance, the speed and angle at which they met, their combined radius, the uncertainty along the miss and how many standard deviations the miss was, and the probability with a cautious uncertainty against the usual threshold; then say why 10⁻⁵¹ was wrong.',
      ru: '10 февраля 2009 года Iridium 33 и неработающий «Космос-2251» столкнулись над Сибирью — первое столкновение двух целых спутников. Сообщение о сближении, выпущенное накануне, давало вероятность около 10⁻⁵¹. Раздел «Реальные спутники» открывается на инструменте «Тесные сближения». По положениям, скоростям и неопределённостям из сообщения (данные ниже) рассчитайте промах, скорость и угол встречи, суммарный радиус, неопределённость вдоль промаха и сколько стандартных отклонений составил промах, а также вероятность при осторожной оценке неопределённости относительно обычного порога; затем объясните, почему 10⁻⁵¹ оказалось неверным.',
      th: 'เมื่อ 10 กุมภาพันธ์ 2009 Iridium 33 ชนกับ Cosmos 2251 ที่ปลดระวางแล้วเหนือไซบีเรีย เป็นการชนกันครั้งแรกของดาวเทียมทั้งดวงสองดวง ข้อความแจ้งการเข้าใกล้ที่ออกเมื่อวันก่อนให้ความน่าจะเป็นราว 10⁻⁵¹ ส่วนดาวเทียมจริงจะเปิดที่เครื่องมือ «การเข้าใกล้กันของวัตถุในวงโคจร» จากตำแหน่ง ความเร็ว และความไม่แน่นอนในข้อความ (ข้อมูลด้านล่าง) ให้คำนวณระยะพลาด ความเร็วและมุมที่ทั้งสองพบกัน รัศมีรวม ความไม่แน่นอนตามแนวระยะพลาด และระยะพลาดคิดเป็นกี่เท่าของส่วนเบี่ยงเบนมาตรฐาน รวมถึงความน่าจะเป็นเมื่อใช้ความไม่แน่นอนแบบระมัดระวังเทียบกับเกณฑ์ที่ใช้กันทั่วไป แล้วอธิบายว่าทำไม 10⁻⁵¹ จึงผิด',
    },
    debrief: {
      en: 'The message\'s uncertainties made a miss that small look safe beyond doubt; the real errors of the orbits were far larger, and with a cautious uncertainty the probability was well above the threshold at which operators move a satellite. The collision left clouds of debris along both orbits. Since then operators receive conjunction messages with realistic covariances, and a probability is read together with the uncertainty behind it — as the close-approach tool shows.',
      ru: 'Неопределённости в сообщении делали такой малый промах заведомо безопасным; настоящие ошибки орбит были гораздо больше, и при осторожной оценке неопределённости вероятность намного превышала порог, при котором операторы уводят спутник. Столкновение оставило облака обломков вдоль обеих орбит. С тех пор операторы получают сообщения о сближениях с реалистичными ковариациями, а вероятность читают вместе с неопределённостью, на которой она основана, — как показывает инструмент «Тесные сближения».',
      th: 'ความไม่แน่นอนในข้อความทำให้ระยะพลาดที่น้อยขนาดนั้นดูปลอดภัยโดยไม่ต้องสงสัย แต่ความคลาดเคลื่อนจริงของวงโคจรมีมากกว่านั้นมาก และเมื่อใช้ความไม่แน่นอนแบบระมัดระวัง ความน่าจะเป็นสูงเกินเกณฑ์ที่ผู้ควบคุมใช้ตัดสินใจหลบไปมาก การชนครั้งนั้นทิ้งกลุ่มเศษซากไว้ตามวงโคจรของทั้งสองดวง ตั้งแต่นั้นมาผู้ควบคุมได้รับข้อความแจ้งการเข้าใกล้พร้อมเมทริกซ์ความแปรปรวนร่วมที่สมจริง และอ่านค่าความน่าจะเป็นควบคู่กับความไม่แน่นอนเบื้องหลัง ดังที่เครื่องมือ «การเข้าใกล้กันของวัตถุในวงโคจร» แสดง',
    },
    criteria: all('iridium'),
    hints: [
      {
        en: 'Subtract the two positions and the two velocities, component by component: the lengths of the differences are the miss and the speed. The angle between the paths comes from the dot product, cos θ = v₁ · v₂ / (|v₁| |v₂|), each velocity as seen from space (the Earth\'s turning, ω × r, added).',
        ru: 'Вычтите одно положение из другого и одну скорость из другой покомпонентно: длины разностей — это промах и относительная скорость. Угол между траекториями даёт скалярное произведение, cos θ = v₁ · v₂ / (|v₁| |v₂|), где каждая скорость взята относительно инерциального пространства (прибавлено ω × r от вращения Земли).',
        th: 'ลบตำแหน่งทั้งสองและความเร็วทั้งสองทีละองค์ประกอบ ความยาวของผลต่างคือระยะพลาดและความเร็วสัมพัทธ์ มุมระหว่างเส้นทางได้จากผลคูณจุด cos θ = v₁ · v₂ / (|v₁| |v₂|) โดยใช้ความเร็วเทียบกับอวกาศ คือบวก ω × r จากการหมุนของโลกเข้าไปด้วย',
      },
      {
        en: 'The combined radius is the sum of the two hard-body radii. Along the miss the combined uncertainty is σ² = σ₁² cos² θ + σ₂² sin² θ, θ the σ₁ axis\'s angle from the miss; the miss divided by that σ says how far out in the Gaussian\'s tail they were thought to be.',
        ru: 'Суммарный радиус — сумма радиусов обоих тел. Вдоль промаха суммарная неопределённость σ² = σ₁² cos² θ + σ₂² sin² θ, где θ — угол оси σ₁ от направления промаха; промах, делённый на это σ, показывает, насколько далеко в хвосте гауссова распределения их считали.',
        th: 'รัศมีรวมคือผลบวกรัศมีวัตถุของทั้งสอง ตามแนวระยะพลาด ความไม่แน่นอนรวมคือ σ² = σ₁² cos² θ + σ₂² sin² θ โดย θ คือมุมของแกน σ₁ จากแนวระยะพลาด ระยะพลาดหารด้วย σ นี้บอกว่าคิดกันว่าทั้งสองอยู่ไกลออกไปในหางของการแจกแจงแบบเกาส์เพียงใด',
      },
      {
        en: 'The table gives Iridium\'s own published probability, worked with a cautious uncertainty; operators usually move a satellite at 1 in 10 000. For the last question, ask what a miss of so many standard deviations says about the uncertainties the message was given.',
        ru: 'В таблице есть опубликованная вероятность самой Iridium, рассчитанная с осторожной оценкой неопределённости; операторы обычно уводят спутник при 1 к 10 000. Для последнего вопроса подумайте, что промах во столько стандартных отклонений говорит о неопределённостях, заложенных в сообщение.',
        th: 'ในตารางมีความน่าจะเป็นที่ Iridium เผยแพร่เอง ซึ่งคำนวณด้วยความไม่แน่นอนแบบระมัดระวัง ผู้ควบคุมมักหลบดาวเทียมเมื่อถึง 1 ใน 10,000 สำหรับข้อสุดท้าย ลองคิดว่าระยะพลาดที่เท่ากับส่วนเบี่ยงเบนมาตรฐานหลายเท่าขนาดนั้นบอกอะไรเกี่ยวกับความไม่แน่นอนที่ใส่ไว้ในข้อความ',
      },
    ],
  },
];
