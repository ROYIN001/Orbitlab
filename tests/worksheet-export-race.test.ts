import { afterEach, expect, it, vi } from 'vitest';
import { getLang, setLang, t } from '../src/i18n';
import { renderWorksheets, type WorksheetHost } from '../src/ui/lessons/worksheet-view';
import { downloadBlob } from '../src/ui/download';
import type { Worksheet } from '../src/worksheets/types';

vi.mock('../src/ui/download', () => ({ downloadBlob: vi.fn() }));
class ElementStub {
  className='';textContent='';value='';type='';children:ElementStub[]=[];
  append(...items:ElementStub[]):void {this.children.push(...items);}
  replaceChildren(...items:ElementStub[]):void {this.children=items;}
  addEventListener():void { /* form is changed directly while export awaits */ }
}
afterEach(()=>{setLang('en');vi.unstubAllGlobals();vi.clearAllMocks();});

it.each(['html','docx'] as const)('freezes %s filename and labels while photos load and the UI changes language, class and mission', async(format)=>{
  vi.stubGlobal('document',{documentElement:{},createElement:()=>new ElementStub(),createTextNode:()=>new ElementStub()});
  setLang('th');
  const thaiName=t('ws.name'),thaiAnswer=t('ws.answer'),thaiFooter=t('ws.footer',{date:'2026-09-29'});
  let resolveFetch!:(response:{blob():Promise<Blob>})=>void;
  vi.stubGlobal('fetch',vi.fn(()=>new Promise((resolve)=>{resolveFetch=resolve;})));
  vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:10,height:10})));
  const cfg={vehicleId:'falcon9',siteId:'cape',launchTime:new Date('2026-09-29T12:00:00Z')};
  const host={flight:()=>({flight:{cfg},ended:true}),lesson:()=>null,progress:()=>({customQuestions:[]})} as unknown as WorksheetHost;
  const view=renderWorksheets(host,new ElementStub() as unknown as HTMLElement) as unknown as {
    form:{format:'html'|'docx';classCode:string};sheets():Worksheet[];make(kind:'worksheets'):Promise<void>;
  };
  view.form.format=format;view.form.classCode='Q1';
  view.sheets=()=>[{lang:'th',title:'ใบงานคงภาษาไทย',subtitle:'',student:'QA',code:'Q1',seed:1,generatedAt:new Date('2026-09-29T12:00:00Z'),
    sections:[{title:'คำถาม',items:[{kind:'number',prompt:'คำถามเดิม',figure:{image:'qa-photo.jpg'},answer:{text:'42'}}]}]}];
  const pending=view.make('worksheets');
  expect(fetch).toHaveBeenCalledOnce();expect(downloadBlob).not.toHaveBeenCalled();
  setLang('ru');view.form.classCode='CHANGED';cfg.vehicleId='soyuz21a';cfg.siteId='baikonur';
  resolveFetch({blob:async()=>new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'})});
  await pending;
  expect(downloadBlob).toHaveBeenCalledOnce();
  const [blob,name]=vi.mocked(downloadBlob).mock.calls[0];
  expect(name).toBe(`orbitlab-worksheets-mission-falcon9-cape-2026-09-29T12-00-00-000Z-Q1-th.${format}`);
  const content=await blob.text();
  for(const label of [thaiName,thaiAnswer,thaiFooter]) expect(content).toContain(label);
  expect(content).not.toContain('Фамилия, имя:');
  expect(getLang()).toBe('ru');
});
