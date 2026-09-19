import type { Lang } from '../i18n';

interface Section { title: string; text: string }
interface HelpCopy {
  button: string;
  guideLabel: string;
  progress: string;
  previous: string;
  next: string;
  done: string;
  skip: string;
  more: string;
  title: string;
  intro: string;
  restart: string;
  steps: [Section, Section, Section];
  topics: Section[];
  glossaryTitle: string;
  glossary: Section[];
}

/** Localized help content lives together so additions must cover every language. */
export const HELP_COPY: Record<Lang, HelpCopy> = {
  en: {
    button: 'Help', guideLabel: 'First mission guide', progress: 'Step {step} of 3',
    previous: 'Back', next: 'Next', done: 'Got it', skip: 'Skip guide', more: 'Open Help',
    title: 'Your first flight',
    intro: 'Set a mission, watch the flight, then inspect what happened. The simulator stays available while you read the three-step guide.',
    restart: 'Show the three-step guide again',
    steps: [
      { title: 'Choose a mission', text: 'In Mission setup, choose a Quick start example. It fills the vehicle, payload, orbit and launch time for you. You can still edit the settings before launch.' },
      { title: 'Read the preflight check', text: 'Fix invalid fields and read the feasibility warning. An infeasible mission can still be launched as an experiment. For a constrained orbital plane, check the launch window too.' },
      { title: 'Launch, watch and replay', text: 'Press Launch, then use play/pause and the speed selector below the view. Drag the timeline or select an event to replay it. Live returns to the current flight.' },
    ],
    topics: [
      { title: 'Where everything is', text: 'Mission setup selects the rocket and destination. The centre shows the flight and four camera views. Telemetry contains the graphs, event log and CSV export. On a narrow screen these panels stack vertically.' },
      { title: 'Two clocks during replay', text: 'Rewinding does not stop the live flight. Play/pause and speed control the replay while you are looking back. Shift+Space pauses or resumes the live flight; Live returns to its current position. Previous/next event helps inspect staging and burns.' },
      { title: 'Read the outcome', text: 'Reaching an orbit and meeting every target are different outcomes. Compare the target and achieved values. A booster landing is separate from payload delivery. The ISS preset targets an approximate orbital plane, not rendezvous or docking.' },
      { title: 'Learning and advanced settings', text: 'Learning mode starts with fewer guidance controls. Switch to Advanced to edit the numerical guidance parameters. Auto-tune, failure scenarios and supported booster recovery remain available in Learning mode.' },
      { title: 'Try a controlled experiment', text: 'Start with a nominal flight. For a new mission, change one setting at a time. Guidance parameters and Failure scenario are in Mission setup; first-stage recovery is available on supported vehicles. Export CSV saves the recorded flight, including points beyond a rewound cursor.' },
      { title: 'Keyboard controls', text: 'Space: play/pause. Shift+Space: live flight. 1–4: cameras. Left/Right: seek 5 seconds; hold Shift for 30 seconds. H: instrument detail. D: dock the instrument card. Shortcuts leave form fields and dialogs to their normal keyboard controls.' },
    ],
    glossaryTitle: 'Four useful readings',
    glossary: [
      { title: 'Apogee / perigee', text: 'The highest and lowest orbital altitude above the reference Earth surface.' },
      { title: 'Inclination / RAAN', text: 'Inclination tilts the orbit relative to the equator. RAAN sets where its ascending node points; launch time matters for a chosen plane.' },
      { title: 'Dynamic pressure / max Q', text: 'Dynamic pressure measures the aerodynamic load from speed and air density. Max Q is its peak during ascent.' },
      { title: 'Δv remaining', text: 'The velocity-change budget left in the propulsion system. It is a capability estimate, not the current speed.' },
    ],
  },
  ru: {
    button: 'Помощь', guideLabel: 'Подсказки для первого полёта', progress: 'Шаг {step} из 3',
    previous: 'Назад', next: 'Далее', done: 'Понятно', skip: 'Пропустить', more: 'Открыть помощь',
    title: 'Первый полёт',
    intro: 'Задайте миссию, наблюдайте за полётом и изучите результат. Краткие подсказки из трёх шагов не блокируют работу симулятора.',
    restart: 'Снова показать три шага',
    steps: [
      { title: 'Выберите миссию', text: 'В настройках миссии выберите пример быстрого старта. Он заполнит носитель, полезную нагрузку, орбиту и время пуска. До запуска настройки можно изменить.' },
      { title: 'Проверьте готовность', text: 'Исправьте недопустимые значения и прочитайте предупреждение о выполнимости. Невыполнимую миссию можно запустить как эксперимент. Если задана плоскость орбиты, проверьте окно пуска.' },
      { title: 'Запустите и изучите полёт', text: 'Нажмите «Пуск». Под изображением находятся воспроизведение, пауза и скорость времени. Перемещайте ползунок или выбирайте событие для повтора. Кнопка «Сейчас» возвращает к текущему полёту.' },
    ],
    topics: [
      { title: 'Что где находится', text: 'В настройках миссии выбираются ракета и цель. В центре показаны полёт и четыре вида камеры. Панель телеметрии содержит графики, журнал событий и экспорт CSV. На узком экране панели расположены друг под другом.' },
      { title: 'Два времени при повторе', text: 'Перемотка назад не останавливает текущий полёт. Во время повтора кнопки воспроизведения и скорости управляют повтором. Shift+Пробел останавливает или продолжает текущий полёт, а «Сейчас» возвращает к нему. Переходы между событиями помогают изучать отделение ступеней и включения двигателей.' },
      { title: 'Как понимать результат', text: 'Выход на орбиту и выполнение всех целевых условий — разные результаты. Сравните заданные и достигнутые значения. Посадка ускорителя оценивается отдельно от доставки полезной нагрузки. Пресет МКС задаёт приближённую плоскость орбиты, а не сближение или стыковку.' },
      { title: 'Учебный и расширенный режимы', text: 'В учебном режиме показано меньше настроек наведения. Перейдите в расширенный режим, чтобы изменить их численные значения. Автонастройка, нештатные ситуации и возврат подходящих ускорителей доступны и в учебном режиме.' },
      { title: 'Проведите эксперимент', text: 'Начните со штатного полёта. В новой миссии меняйте по одному параметру. Наведение и нештатные ситуации находятся в настройках; возврат первой ступени доступен для подходящих носителей. CSV содержит весь записанный полёт, включая данные после выбранного момента повтора.' },
      { title: 'Клавиатура', text: 'Пробел: воспроизведение/пауза. Shift+Пробел: текущий полёт. 1–4: камеры. Стрелки влево/вправо: 5 секунд, с Shift — 30 секунд. H: подробность приборов. D: перемещение карточки приборов. В полях ввода и диалогах действуют их обычные клавиши.' },
    ],
    glossaryTitle: 'Четыре полезных показателя',
    glossary: [
      { title: 'Апогей / перигей', text: 'Наибольшая и наименьшая высота орбиты над принятой в модели поверхностью Земли.' },
      { title: 'Наклонение / RAAN', text: 'Наклонение задаёт угол орбиты к экватору. RAAN — прямое восхождение восходящего узла — задаёт направление узла. Для выбранной плоскости важно время пуска.' },
      { title: 'Скоростной напор / max Q', text: 'Скоростной напор характеризует аэродинамическую нагрузку, зависящую от скорости и плотности воздуха. Max Q — его максимум на участке выведения.' },
      { title: 'Остаток Δv', text: 'Запас изменения скорости за счёт оставшихся возможностей двигательной установки. Это оценка манёвренности, а не текущая скорость.' },
    ],
  },
  th: {
    button: 'วิธีใช้', guideLabel: 'คำแนะนำภารกิจแรก', progress: 'ขั้นตอน {step} จาก 3',
    previous: 'ย้อนกลับ', next: 'ถัดไป', done: 'เข้าใจแล้ว', skip: 'ข้ามคำแนะนำ', more: 'เปิดวิธีใช้',
    title: 'เริ่มภารกิจแรก',
    intro: 'ตั้งค่าภารกิจ ดูการบิน แล้วตรวจผลที่เกิดขึ้น คุณยังใช้งานโปรแกรมได้ระหว่างอ่านคำแนะนำสามขั้นตอน',
    restart: 'แสดงคำแนะนำสามขั้นตอนอีกครั้ง',
    steps: [
      { title: 'เลือกภารกิจ', text: 'เลือกตัวอย่างในส่วนเริ่มต้นอย่างรวดเร็วของแผงตั้งค่าภารกิจ ระบบจะกรอกจรวด สัมภาระ วงโคจร และเวลาปล่อยให้ คุณยังปรับค่าได้ก่อนปล่อยจรวด' },
      { title: 'อ่านผลตรวจสอบก่อนปล่อย', text: 'แก้ช่องที่กรอกไม่ถูกต้องและอ่านคำเตือนเรื่องความเป็นไปได้ คุณยังปล่อยภารกิจที่เกินขีดความสามารถเพื่อทดลองได้ หากกำหนดระนาบวงโคจร ให้ตรวจหน้าต่างปล่อยด้วย' },
      { title: 'ปล่อย ดูการบิน และย้อนดู', text: 'กด «ปล่อยจรวด» แล้วใช้ปุ่มเล่น/หยุดชั่วคราวและตัวเลือกความเร็วใต้ภาพ ลากแถบเวลาหรือเลือกเหตุการณ์เพื่อย้อนดู ปุ่ม «สด» ใช้กลับไปยังการบินปัจจุบัน' },
    ],
    topics: [
      { title: 'ส่วนต่าง ๆ อยู่ที่ไหน', text: 'แผงตั้งค่าภารกิจใช้เลือกจรวดและเป้าหมาย ตรงกลางแสดงการบินและมุมกล้องสี่แบบ แผงโทรมาตรมีกราฟ บันทึกเหตุการณ์ และปุ่มส่งออก CSV เมื่อหน้าจอแคบ แผงเหล่านี้จะเรียงในแนวตั้ง' },
      { title: 'เวลาในโหมดย้อนดู', text: 'การย้อนดูไม่ได้หยุดการบินปัจจุบัน ขณะย้อนดู ปุ่มเล่น/หยุดและความเร็วจะควบคุมภาพย้อนหลัง ใช้ Shift+Space เพื่อหยุดหรือเดินการบินปัจจุบันต่อ และกด «สด» เพื่อกลับไปดู ปุ่มเหตุการณ์ก่อนหน้า/ถัดไปช่วยดูการแยกท่อนและการจุดเครื่องยนต์' },
      { title: 'อ่านผลภารกิจ', text: 'การเข้าสู่วงโคจรได้กับการบรรลุเป้าหมายครบทุกข้อเป็นคนละผล ให้เปรียบเทียบค่าเป้าหมายกับค่าที่ทำได้ การลงจอดของบูสเตอร์แยกจากผลส่งสัมภาระ ภารกิจ ISS กำหนดระนาบวงโคจรโดยประมาณ ยังไม่ใช่การนัดพบหรือเทียบท่า' },
      { title: 'โหมดเรียนรู้และขั้นสูง', text: 'โหมดเรียนรู้เริ่มด้วยช่องตั้งค่าการนำวิถีที่น้อยลง เปลี่ยนเป็นโหมดขั้นสูงเมื่อต้องการแก้ตัวเลขพารามิเตอร์การนำวิถี คุณยังใช้การปรับค่าอัตโนมัติ สถานการณ์ขัดข้อง และการกู้บูสเตอร์ที่รองรับได้ในโหมดเรียนรู้' },
      { title: 'ทดลองเปลี่ยนทีละอย่าง', text: 'เริ่มจากการบินปกติก่อน แล้วเปิดภารกิจใหม่และเปลี่ยนครั้งละหนึ่งค่า พารามิเตอร์การนำวิถีและสถานการณ์ขัดข้องอยู่ในแผงตั้งค่า ส่วนการกู้คืนท่อนแรกใช้ได้กับจรวดที่รองรับ CSV ส่งออกข้อมูลการบินที่บันทึกทั้งหมด รวมถึงข้อมูลหลังตำแหน่งที่คุณกำลังย้อนดู' },
      { title: 'ปุ่มลัด', text: 'Space: เล่น/หยุดชั่วคราว · Shift+Space: ควบคุมการบินปัจจุบัน · 1–4: มุมกล้อง · ลูกศรซ้าย/ขวา: เลื่อน 5 วินาที หรือกด Shift ร่วมเพื่อเลื่อน 30 วินาที · H: ระดับรายละเอียดเครื่องวัด · D: ย้ายการ์ดเครื่องวัด ปุ่มลัดไม่รบกวนการพิมพ์ในช่องกรอกและการใช้งานหน้าต่างคำอธิบาย' },
    ],
    glossaryTitle: 'ค่าหลักที่ควรรู้',
    glossary: [
      { title: 'จุดไกลโลก / จุดใกล้โลก', text: 'ความสูงมากที่สุดและน้อยที่สุดของวงโคจร วัดจากพื้นผิวโลกอ้างอิงของแบบจำลอง' },
      { title: 'มุมเอียง / RAAN', text: 'มุมเอียงบอกแนววงโคจรเทียบกับเส้นศูนย์สูตร ส่วน RAAN กำหนดทิศของโหนดขาขึ้น เวลาปล่อยจึงสำคัญเมื่อต้องการระนาบที่กำหนด' },
      { title: 'ความดันพลวัต / max Q', text: 'ความดันพลวัตบอกภาระทางอากาศพลศาสตร์จากความเร็วและความหนาแน่นอากาศ max Q คือค่าสูงสุดระหว่างการไต่ขึ้น' },
      { title: 'Δv ที่เหลือ', text: 'งบการเปลี่ยนความเร็วที่ระบบขับดันยังทำได้ เป็นค่าประมาณความสามารถในการปรับวิถี ไม่ใช่ความเร็วปัจจุบัน' },
    ],
  },
};
