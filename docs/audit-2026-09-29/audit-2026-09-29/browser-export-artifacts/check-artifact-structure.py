import base64, csv, hashlib, io, json, math, re, struct, zipfile
from pathlib import Path
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def png_info(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    return dict(zip(('width', 'height'), struct.unpack('>II', data[16:24])))

class HtmlAudit(HTMLParser):
    def __init__(self):
        super().__init__(); self.images=[]; self.svgs=0; self.tables=0; self.scripts=0; self.tags=[]; self.text=[]; self.lang=None; self.charset=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag == 'html': self.lang=a.get('lang')
        if tag == 'meta' and 'charset' in a: self.charset=a['charset']
        if tag == 'table': self.tables+=1
        if tag == 'script': self.scripts+=1
        if tag == 'svg': self.svgs+=1
        if tag == 'img':
            src=a.get('src', '')
            item={'alt':a.get('alt'), 'embedded':src.startswith('data:image/')}
            if src.startswith('data:image/png;base64,'): item.update(png_info(base64.b64decode(src.split(',',1)[1])))
            self.images.append(item)
        if tag in ['h1','h2','h3','title']: self.tags.append(tag)
    def handle_data(self, data): self.text.append(data)

named=[p for p in ROOT.iterdir() if (p.name.startswith(('orbitlab', 'falcon9')) or p.name == 'browser-monte-carlo-20.json') and p.suffix in ('.json','.csv','.png','.html','.docx')]
manifest=[{'file':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(named)]
a=ROOT/'orbitlab_falcon9_leo (1).csv'; b=ROOT/'orbitlab_falcon9_leo (2).csv'
assert a.read_bytes() == b.read_bytes()
csv_rows=list(csv.reader(io.StringIO(a.read_text(encoding='utf-8-sig'))))
events_at=next(i for i,r in enumerate(csv_rows) if r == ['# events'])
header=csv_rows[0]; data=[r for r in csv_rows[1:events_at] if r]
assert all(len(r) == len(header) for r in data)
records=[dict(zip(header,r)) for r in data]
times=[float(r['t_s']) for r in records]
assert all(math.isfinite(t) for t in times)
assert all(x<=y for x,y in zip(times,times[1:]))
assert max(times)==4941.375
event_header=csv_rows[events_at+1]; events=[dict(zip(event_header,r)) for r in csv_rows[events_at+2:] if r]
assert all(len(r)==3 for r in csv_rows[events_at+2:] if r)
for e in events: json.loads(e['details'])
telemetry={'byteIdentical':True,'sha256':sha(a),'rows':len(data),'columns':len(header),'firstTime':min(times),'maxTime':max(times),'fullFlightBeyondReplay600':max(times)>600,'timesMonotone':True,'events':len(events),'eventTimesMonotone':all(float(x['t_s'])<=float(y['t_s']) for x,y in zip(events,events[1:])),'schemaVersions':sorted(set(r['recording_schema_version'] for r in records)), 'rigidModels':sorted(set(r['rigid_model_version'] for r in records))}

html={}
for p in sorted(ROOT.glob('*.html')):
    audit=HtmlAudit(); audit.feed(p.read_text(encoding='utf-8'))
    html[p.name]={'lang':audit.lang,'charset':audit.charset,'tables':audit.tables,'images':audit.images,'inlineSvg':audit.svgs,'scripts':audit.scripts,'headingTags':audit.tags,'containsQAStudent':'QA Student' in ''.join(audit.text),'containsFalcon9':'Falcon 9' in ''.join(audit.text)}
    assert audit.lang == 'en' and audit.charset.lower()=='utf-8'
    assert all(i['embedded'] for i in audit.images)
    assert audit.scripts==0

docx={}; W={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
for p in sorted(ROOT.glob('*.docx')):
    with zipfile.ZipFile(p) as z:
        assert z.testzip() is None
        for name in z.namelist():
            if name.endswith(('.xml','.rels')): ET.fromstring(z.read(name))
        document=ET.fromstring(z.read('word/document.xml'))
        paragraphs=[''.join(x.itertext()) for x in document.findall('.//w:t',W)]
        text=' '.join(paragraphs)
        media=[]
        for name in z.namelist():
            if name.startswith('word/media/'):
                item={'part':name,'bytes':len(z.read(name))}
                if name.endswith('.png'): item.update(png_info(z.read(name)))
                media.append(item)
        references=[]
        for name in z.namelist():
            if name.endswith('.rels'):
                for rel in ET.fromstring(z.read(name)):
                    if rel.attrib.get('TargetMode')=='External': references.append(rel.attrib.get('Target'))
        assert 'QA Student' in text and 'QA-20260929' in text and 'Falcon 9' in text
        docx[p.name]={'zipCrcValid':True,'allXmlWellFormed':True,'paragraphs':len(document.findall('.//w:p',W)),'tables':len(document.findall('.//w:tbl',W)),'drawings':len(document.findall('.//w:drawing',W)),'media':media,'externalRelationships':references,'containsQAStudent':True,'containsQACode':True,'containsFalcon9':True}

chart=png_info((ROOT/'orbitlab-altitude-h-km.png').read_bytes())
assert chart=={'width':2400,'height':1200}
chart_after=png_info((ROOT/'orbitlab-altitude-h-km-after-browser.png').read_bytes())
assert chart_after==chart
mc=json.loads((ROOT/'browser-monte-carlo-20.json').read_text(encoding='utf-8'))
(ROOT/'browser-monte-carlo-20.csv').write_text(mc['csv'],encoding='utf-8',newline='')
mc_rows=list(csv.DictReader(io.StringIO(mc['csv'])))
assert len(mc_rows)==20 and len(set(row['run'] for row in mc_rows))==20
result={'manifest':manifest,'telemetryCsv':telemetry,'html':html,'docx':docx,'chartPng':chart,'monteCarloCsvExtractedFromBrowserStatus':{'rows':len(mc_rows),'file':'browser-monte-carlo-20.csv','sha256':sha(ROOT/'browser-monte-carlo-20.csv')},'renderProvenance':{'packagedRenderer':'Failed: LibreOffice soffice.exe not available on PATH','existingPdfRenderer':'Microsoft Word for Microsoft 365, hidden read-only COM export completed before parent prohibition arrived; no source DOCX edits and no further native app calls','rasterizer':'Bundled Poppler pdftoppm -scale-to 1500 -png','worksheetPages':3,'keyPages':1,'allFourPagePngsInspected':True,'findings':['Worksheet Q8 split after choice b across pages 2 and 3','Other inspected page contents show no clipping or overlapping text','Original chart PNG has overlapping event labels at MECO/Stage separation/Fairing and SECO/Burn/Parking orbit']}}
result['chartAfterBrowser']={'file':'orbitlab-altitude-h-km-after-browser.png','downloadedName':'orbitlab-altitude-h-km (2).png',**chart_after,'sha256':sha(ROOT/'orbitlab-altitude-h-km-after-browser.png'),'visuallyInspected':True,'visibleLabels':5,'findings':['MECO and Stage sep occupy separate rows; all five event labels are readable without clipping or overlap','This fresh browser export has ascent markers only, unlike the reference/orbit overlays present in the original PNG'],'reconstructedAdditionalCoverage':'chart-reconstructed-after.png uses the original flight data and production chartImage; SECO/Parking orbit/Burn/Burn done use four distinct rows. Different font fallback and no reference overlay: this is not a browser download.'}
(ROOT/'artifact-structure-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'telemetryCsv':telemetry,'html':{k:{'tables':v['tables'],'images':len(v['images'])} for k,v in html.items()},'docx':{k:{'tables':v['tables'],'drawings':v['drawings'],'media':len(v['media'])} for k,v in docx.items()},'chartPng':chart},ensure_ascii=False,indent=2))
