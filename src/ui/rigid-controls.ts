import { getLang, onLangChange, type Lang } from '../i18n';
import type { RigidCommand, RigidTelemetry } from '../physics/rigid/telemetry';
import { DEG, RAD } from '../physics/constants';
import './rigid-controls.css';
import { bodyRates, labelWithSymbol, onNotationChange, simulatorRates, symbolNode, withSymbol, type Quantity } from './notation';

/** U07: the rate fields in the notation's axes (ISO p q r; ГОСТ ωx ωz ωy). */
type RateKey = 'roll' | 'pitch' | 'yaw';
const RATE_SYMBOL: Record<RateKey, Quantity> = { roll: 'rollRate', pitch: 'pitchRate', yaw: 'yawRate' };

interface Copy { title:string; mode:string; auto:string; manual:string; throttle:string; roll:string; pitch:string; yaw:string; zero:string; help:string; replay:string; rates:string; limit:string; envelope:string; fuel:string; history:string }
const COPY: Record<Lang, Copy> = {
  en: { title:'6-DOF flight controls', mode:'Flight control', auto:'Autopilot', manual:'Manual rates', throttle:'Throttle (%)', roll:'Roll rate (°/s)', pitch:'Pitch rate (°/s)', yaw:'Yaw rate (°/s)', zero:'Stop rotation command', help:'Manual commands request rotation rates; actuators have finite authority. Zero rates asks the controller to brake. Returning to Autopilot resumes mission guidance. 0% throttle shuts engines down; only restartable stages can relight after a delay.', replay:'Replay: controls are read-only. Return to Live to control the flight.', rates:'Measured roll / pitch / yaw', limit:'Actuator limit reached', envelope:'Outside estimated aerodynamic model range', fuel:'RCS propellant', history:'Detailed rotation is outside the retained replay window; the displayed attitude is approximate.' },
  th: { title:'ควบคุมการบิน 6-DOF', mode:'วิธีควบคุมการบิน', auto:'นำร่องอัตโนมัติ', manual:'สั่งอัตราหมุนเอง', throttle:'คันเร่ง (%)', roll:'อัตราโรล (°/วินาที)', pitch:'อัตราพิตช์ (°/วินาที)', yaw:'อัตรายอว์ (°/วินาที)', zero:'สั่งหยุดหมุน', help:'คำสั่งมือกำหนดอัตราหมุน ระบบขับมีขีดจำกัด ค่าศูนย์สั่งให้ระบบเบรกการหมุน เปลี่ยนกลับเป็นอัตโนมัติเพื่อให้นำร่องตามภารกิจ คันเร่ง 0% ดับเครื่องยนต์ จุดใหม่ได้หลังหน่วงเวลาเฉพาะขั้นที่รองรับ', replay:'กำลังย้อนดู: อ่านค่าได้ กลับไปโหมดสดเพื่อบังคับการบิน', rates:'อัตราโรล / พิตช์ / ยอว์ที่วัดได้', limit:'ระบบขับถึงขีดจำกัด', envelope:'อยู่นอกช่วงแบบจำลองอากาศพลศาสตร์โดยประมาณ', fuel:'เชื้อเพลิง RCS', history:'ช่วงนี้อยู่นอกข้อมูลการหมุนที่เก็บไว้ ท่าทางที่แสดงเป็นค่าประมาณ' },
  ru: { title:'Управление полётом 6DOF', mode:'Режим управления', auto:'Автопилот', manual:'Ручные угловые скорости', throttle:'Тяга (%)', roll:'Крен (°/с)', pitch:'Тангаж (°/с)', yaw:'Рыскание (°/с)', zero:'Команда остановить вращение', help:'Ручные команды задают угловые скорости; исполнительные органы имеют пределы. Нулевая скорость включает торможение. Автопилот возвращает наведение по миссии. Тяга 0% выключает двигатели; повторный запуск с задержкой доступен только подходящим ступеням.', replay:'Повтор: доступен только просмотр. Вернитесь к прямому эфиру для управления.', rates:'Измеренные скорости крена / тангажа / рыскания', limit:'Достигнут предел исполнительного органа', envelope:'Вне диапазона приближённой аэродинамической модели', fuel:'Топливо РСУ', history:'Вращение вне сохранённого диапазона повтора; ориентация показана приблизительно.' },
};

/** Rate commands remain distinct from measured angular velocity. */
export class RigidControls {
  private command: RigidCommand = { mode:'auto', rates:{x:0,y:0,z:0}, throttle:1 };
  private live = true;
  private last?: RigidTelemetry;
  private controls: Array<HTMLInputElement | HTMLSelectElement | HTMLButtonElement> = [];
  private modeInput?: HTMLSelectElement;
  private inputs = new Map<string, HTMLInputElement>();
  private measured = document.createElement('p');
  private notice = document.createElement('p');
  constructor(private host:HTMLElement, private onCommand:(command:RigidCommand)=>void) {
    this.host.classList.add('rigid-controls');
    this.host.hidden = true;
    onLangChange(()=>this.render());
    onNotationChange(()=>this.render());
    this.render();
  }
  reset():void { this.command={mode:'auto',rates:{x:0,y:0,z:0},throttle:1}; this.last=undefined; this.host.hidden=true; this.render(); }
  private emit():void {
    if(!this.live)return;
    this.onCommand({...this.command,rates:{...this.command.rates}});
    // The accepted command can precede the next rendered frame. Keep a local
    // copy so refresh cannot restore that frame's old selector/rates.
    if(this.last) this.last={...this.last,controlMode:this.command.mode,
      commandRatesBody:{...this.command.rates},commandThrottle:this.command.throttle};
  }
  private render():void {
    const copy=COPY[getLang()];
    this.controls=[];
    this.inputs.clear();
    const heading=document.createElement('summary'); heading.textContent=copy.title;
    const details=document.createElement('details'); details.open=true; details.append(heading);
    const help=document.createElement('p'); help.textContent=copy.help;
    const fields=document.createElement('div'); fields.className='rigid-control-fields';
    const mode=document.createElement('select'); mode.setAttribute('aria-label',copy.mode);
    this.modeInput=mode;
    for(const [value,text]of [['auto',copy.auto],['manual',copy.manual]]) { const option=document.createElement('option');option.value=value;option.textContent=text;mode.append(option); }
    mode.value=this.command.mode;
    mode.addEventListener('change',()=>{this.command.mode=mode.value as RigidCommand['mode'];this.emit();this.refresh();});
    const label=document.createElement('label');label.append(document.createTextNode(copy.mode),mode); fields.append(label);this.controls.push(mode);
    for(const [key,text]of [['roll',withSymbol(copy.roll,RATE_SYMBOL.roll)],['pitch',withSymbol(copy.pitch,RATE_SYMBOL.pitch)],['yaw',withSymbol(copy.yaw,RATE_SYMBOL.yaw)],['throttle',copy.throttle]] as const) {
      const input=document.createElement('input'); input.type='number';input.step='0.1';input.min=key==='throttle'?'0':'-5';input.max=key==='throttle'?'100':'5';
      input.value=String(key==='throttle'?this.command.throttle*100:bodyRates(this.command.rates)[key]*RAD);input.setAttribute('aria-label',text);
      this.inputs.set(key,input);
      input.addEventListener('change',()=>{ const value=input.valueAsNumber;if(!input.validity.valid||!Number.isFinite(value))return;
        if(key==='throttle')this.command.throttle=value/100;
        else { const rates=bodyRates(this.command.rates); rates[key]=value*DEG; this.command.rates=simulatorRates(rates); }
        this.emit(); });
      const row=document.createElement('label');row.append(key==='throttle'?document.createTextNode(text):labelWithSymbol(copy[key],RATE_SYMBOL[key]),input);fields.append(row);this.controls.push(input);
    }
    const zero=document.createElement('button');zero.type='button';zero.className='btn';zero.textContent=copy.zero;
    zero.addEventListener('click',()=>{this.command.rates={x:0,y:0,z:0};this.emit();this.render();});this.controls.push(zero);
    details.append(fields,zero,help,this.measured,this.notice);this.host.replaceChildren(details);this.refresh();
  }
  update(value:RigidTelemetry|undefined,live:boolean):void {this.last=value;this.live=live;this.host.hidden=!value;this.refresh();}
  private refresh():void {
    const copy=COPY[getLang()];
    for(const control of this.controls) control.disabled=!this.live || !this.last || (control.tagName!=='SELECT' && this.command.mode!=='manual');
    if(!this.last)return;
    const recorded=this.last;
    if(recorded.commandRatesBody && recorded.commandThrottle!==undefined) {
      if(this.live) this.command={mode:recorded.controlMode,rates:{...recorded.commandRatesBody},throttle:recorded.commandThrottle};
      if(this.modeInput) this.modeInput.value=recorded.controlMode;
      for(const[key,input]of this.inputs) if(!this.live || document.activeElement!==input) {
        input.value=String(key==='throttle'?recorded.commandThrottle*100:bodyRates(recorded.commandRatesBody)[key as RateKey]*RAD);
      }
      for(const control of this.controls) control.disabled=!this.live || (control.tagName!=='SELECT' && recorded.controlMode!=='manual');
    }
    const r=bodyRates(this.last.omegaBody), symbols=(['roll','pitch','yaw'] as const).flatMap((k,i)=>i?[' / ',symbolNode(RATE_SYMBOL[k])]:[symbolNode(RATE_SYMBOL[k])]);
    this.measured.replaceChildren(`${copy.rates} (`,...symbols,`): ${[r.roll,r.pitch,r.yaw].map(v=>(v*RAD).toFixed(2)).join(' / ')} °/s · ${copy.fuel}: ${this.last.rcsPropellantKg.toFixed(2)} kg`);
    this.notice.textContent=[!this.live?copy.replay:'',this.last.replayAttitudeAvailable===false?copy.history:'',this.last.saturated?copy.limit:'',!this.last.aeroWithinEnvelope?copy.envelope:''].filter(Boolean).join(' · ');
  }
}
