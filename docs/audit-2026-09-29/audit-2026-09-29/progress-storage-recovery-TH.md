# กู้ข้อมูลบทเรียนที่ผิดชนิดโดยเก็บต้นฉบับไว้

การตรวจอิสระพบว่า `loadProgress` เดิมตรวจเพียงobjectชั้นนอก จึงรับlesson entryเป็นตัวเลข/ข้อความได้; เมื่อ `recordGrade` เขียนlastจะเกิดTypeError. ค่าrevealedที่ไม่ใช่objectของarrayก็ทำให้ `recordRevealed` หยุดที่includes/push. ยืนยันซ้ำด้วยregressionก่อนแก้ใน `progress-storage-recovery-before.json` ไม่ใช่เพียงคาดจากโค้ด

แก้เฉพาะ `src/lessons/progress.ts`: normalize lesson entry, attempts/hints/pass flagและrevealedให้เป็นชนิดที่ผู้ใช้ข้อมูลต้องการ เก็บค่าตัวเลขfiniteเดิมไว้ และคงvalidlegacy recordsรวมcaseDataที่ยังไม่มีsnapshot. ไม่เปลี่ยนanswer keyหรือเกณฑ์คะแนน และไม่ปรับข้อมูลassessment/customcontentที่อยู่นอกบั๊กนี้

การอ่านยังไม่เขียนstorage. เมื่อบันทึกข้อมูลที่กู้แล้วครั้งแรก จะเก็บrawต้นฉบับแบบbyte-for-byteไว้ที่ `orbitlab.lessons.recovery` หรือชื่อเดียวกันต่อด้วยหมายเลขหากมีหลักฐานเก่าแล้ว ก่อนเขียนactivekey. ถ้าการเก็บต้นฉบับล้มเหลว เช่นquotaเต็ม จะคืนfalseให้UIแจ้งการบันทึกล้มเหลวและไม่เขียนทับactivekey. หากอ่านstorageไม่ได้ตั้งแต่แรกก็ไม่เขียนทับ. การแก้นี้ไม่เพิ่มหน้าจอกู้คืนหรือเปลี่ยนรูปแบบexportผลลัพธ์

หลักฐาน:

- ชุดก่อนแก้14กรณี: 13failed/1passed รวมTypeErrorจริงจากnumeric/string lessonและscalar revealed; `progress-storage-recovery-before.json`
- ชุดใหม่16กรณีรวมarray/null/ตัวเลข/ข้อความ, revealedผิดชนิด, คงvalidlegacy, malformedJSON/version999, backupเต็ม, มีbackupเก่า, activewriteล้มแล้วretry, validstorageไม่สร้างbackup และอ่านstorageไม่ได้
- รวมcase-lessons/lessons-ui-core/lessons-history **56/56ผ่านใน4ไฟล์** Node22.23.3; `progress-storage-recovery-after.json`
- TypeScriptและ`git diff --check`ผ่านหลังแก้; ไม่มีheavyflightหรือbrowserstorageจริงถูกแก้เพื่อทำreproducer

ขอบเขต: ยืนยันstorageAPIที่ฉีดในtestด้วยMapและfailure injection ไม่ใช่การรับรองquota/browserpolicyทุกยี่ห้อ หรือschemavalidatorครบทุกnestedassessment/customquestion. ไฟล์rawที่กู้ยังอยู่ในbrowserstorageเพื่อไม่ทำหลักฐานเดิมสูญหาย
