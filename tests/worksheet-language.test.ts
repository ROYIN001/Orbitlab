import { afterEach, expect, it } from 'vitest';
import { getLang, setLang, t, type Lang } from '../src/i18n';
import { worksheetsHtml, answerKeyHtml } from '../src/worksheets/html';
import { worksheetsDocx, answerKeyDocx } from '../src/worksheets/docx';
import type { Worksheet } from '../src/worksheets/types';

function language(lang: Lang): void {
  if (!(globalThis as { document?: unknown }).document) (globalThis as { document?: unknown }).document = { documentElement: {} };
  setLang(lang);
}
afterEach(() => language('en'));
const docText = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const htmlEscape = (value: string): string => value.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
const xmlEscape = (value: string): string => value.replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]!));

for (const sheetLang of ['en','th','ru'] as const) for (const uiLang of ['en','th','ru'] as const) {
  it(`renders ${sheetLang} sheet labels consistently after the UI changes to ${uiLang}`, async () => {
    language(sheetLang);
    const keys = ['ws.name','ws.code','ws.date','ws.answer','ws.working','ws.multiHint','ws.orderHint'] as const;
    const labels = Object.fromEntries(keys.map((key) => [key,t(key)]));
    const footer = t('ws.footer',{date:'2026-09-29'});
    const keyTitle = t('ws.keyTitle',{title:'Frozen worksheet'});
    const sheet: Worksheet = {lang:sheetLang,title:'Frozen worksheet',subtitle:'',student:'QA',code:'Q1',seed:1,generatedAt:new Date('2026-09-29T12:00:00Z'),
      sections:[{title:'Questions',items:[
        {kind:'number',prompt:'Number prompt',answer:{text:'42'}},
        {kind:'multi',prompt:'Multi prompt',options:['A','B'],answer:{text:'A'}},
        {kind:'order',prompt:'Order prompt',options:['A','B'],answer:{text:'A,B'}},
      ]}]};
    // Image decoding in the real UI yields here while the sheet data stays frozen.
    await Promise.resolve();
    language(uiLang);
    const html=worksheetsHtml([sheet]);
    const xml=docText(worksheetsDocx([sheet],()=>null));
    for(const value of Object.values(labels)) {expect(html).toContain(htmlEscape(value));expect(xml).toContain(xmlEscape(value));}
    expect(html).toContain(htmlEscape(footer));expect(xml).toContain(xmlEscape(footer));
    const keyHtml=answerKeyHtml([sheet]),keyXml=docText(answerKeyDocx([sheet]));
    for(const value of [keyTitle,labels['ws.name'],labels['ws.code']]) {expect(keyHtml).toContain(htmlEscape(value));expect(keyXml).toContain(xmlEscape(value));}
    expect(getLang()).toBe(uiLang);
  });
}
