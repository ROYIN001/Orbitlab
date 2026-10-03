import { getLang, type Lang } from '../../i18n';

/** Small owner/status vocabulary available before the profile menu is downloaded. */
export const PROFILE_CONTEXT_TEXT = {
  "en": {
    "title": "Learner profiles",
    "active": "Current learner: {name}",
    "entry": "Learner: {name}",
    "chooser": "Choose a learner or create a new profile to open a workspace.",
    "locked": "This learner’s workspace is already open in another tab. Close that tab, then reload, or choose another learner.",
    "ephemeral": "Storage is unavailable. This workspace is temporary: changes will be lost when the page closes. Profile changes and resets are unavailable.",
    "reset": "Reset learning or tests",
    "storageWriteFailed": "The last change was not saved. Keep this page open, free some storage space, and export a backup of your saved work.",
    "mediaMigrationPending": "Your original uploaded audio has been kept, but its transfer to this profile is unfinished. Reload to retry the transfer.",
    "recoveryNotice": "Saved data or the learner selection needs attention. Existing records have been kept; review a backup or reload before changing them.",
    "moduleFailed": "The learner menu could not load. Reload the page to try again."
  },
  "th": {
    "title": "โปรไฟล์ผู้เรียน",
    "active": "ผู้เรียนปัจจุบัน: {name}",
    "entry": "ผู้เรียน: {name}",
    "chooser": "เลือกผู้เรียนหรือสร้างโปรไฟล์ใหม่เพื่อเปิดพื้นที่ทำงาน",
    "locked": "พื้นที่ทำงานของผู้เรียนนี้เปิดอยู่ในแท็บอื่น กรุณาปิดแท็บนั้นแล้วโหลดใหม่ หรือเลือกผู้เรียนคนอื่น",
    "ephemeral": "ไม่สามารถใช้พื้นที่จัดเก็บได้ งานนี้เป็นงานชั่วคราวและจะหายเมื่อปิดหน้าเว็บ จึงยังเปลี่ยนโปรไฟล์หรือรีเซ็ตข้อมูลไม่ได้",
    "reset": "รีเซ็ตประวัติการเรียนหรือผลสอบ",
    "storageWriteFailed": "การเปลี่ยนแปลงล่าสุดยังบันทึกไม่ได้ โปรดเปิดหน้านี้ค้างไว้ เพิ่มพื้นที่จัดเก็บ และส่งออกข้อมูลสำรองของงานที่บันทึกแล้ว",
    "mediaMigrationPending": "ยังเก็บเสียงที่อัปโหลดเดิมไว้ แต่ย้ายเข้าโปรไฟล์นี้ไม่เสร็จ โปรดโหลดหน้าเว็บใหม่เพื่อลองย้ายอีกครั้ง",
    "recoveryNotice": "ข้อมูลที่บันทึกหรือการเลือกผู้เรียนต้องตรวจสอบ โดยยังเก็บข้อมูลเดิมไว้ โปรดตรวจข้อมูลสำรองหรือโหลดใหม่ก่อนเปลี่ยนแปลงข้อมูล",
    "moduleFailed": "โหลดเมนูผู้เรียนไม่สำเร็จ กรุณาโหลดหน้าเว็บใหม่เพื่อลองอีกครั้ง"
  },
  "ru": {
    "title": "Профили учащихся",
    "active": "Текущий учащийся: {name}",
    "entry": "Учащийся: {name}",
    "chooser": "Выберите учащегося или создайте профиль, чтобы открыть рабочую область.",
    "locked": "Рабочая область этого учащегося открыта в другой вкладке. Закройте её и перезагрузите страницу или выберите другого учащегося.",
    "ephemeral": "Хранилище недоступно. Рабочая область временная: изменения будут потеряны при закрытии страницы. Переключение профилей и сброс недоступны.",
    "reset": "Сбросить историю уроков или тестов",
    "storageWriteFailed": "Последнее изменение не сохранено. Не закрывайте страницу, освободите место и экспортируйте копию сохранённых работ.",
    "mediaMigrationPending": "Исходное загруженное аудио сохранено, но его перенос в профиль не завершён. Перезагрузите страницу для повторной попытки.",
    "recoveryNotice": "Сохранённые данные или выбор учащегося требуют внимания. Записи сохранены; проверьте резервную копию или перезагрузите страницу перед изменениями.",
    "moduleFailed": "Не удалось загрузить меню учащихся. Перезагрузите страницу и повторите попытку."
  }
} as const;

export type ProfileContextKey = keyof typeof PROFILE_CONTEXT_TEXT.en;
export function profileContextText(key: ProfileContextKey, params?: Record<string, string | number>, lang: Lang = getLang()): string {
  return PROFILE_CONTEXT_TEXT[lang][key].replace(/\{([a-zA-Z]+)\}/g, (placeholder, name: string) =>
    params && Object.hasOwn(params, name) ? String(params[name]) : placeholder);
}
