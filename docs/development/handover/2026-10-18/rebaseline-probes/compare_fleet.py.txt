import sys
def load(p):
    d={}
    for line in open(p):
        f=line.rstrip('\n').split('\t')
        if len(f)<9: continue
        d[f[0]]=dict(excl=f[1],ok=f[2],pe=f[3],ap=f[4],i=f[5],dv=f[6],ti=f[7],fails=f[8])
    return d
a=load(sys.argv[1]); b=load(sys.argv[2])
md = len(sys.argv)>3 and sys.argv[3]=='md'
reg=[]; fixed=[]; gated=0; dd=[]
acc_a=sum(1 for k in a if a[k]['ok']=='OK'); acc_b=sum(1 for k in b if b[k]['ok']=='OK')
if md:
    print('| row | excl | before: verdict, pe × ap km, i°, Δv left m/s, T ins s | after: verdict, pe × ap km, i°, Δv left m/s, T ins s | ΔΔv |')
    print('|---|---|---|---|---|')
for k in sorted(a):
    x=a[k]; y=b.get(k)
    if y is None: print('MISSING',k); continue
    d=int(y['dv'])-int(x['dv'])
    if x['excl']=='' : gated+=1; dd.append(d)
    if x['ok']=='OK' and y['ok']!='OK': reg.append((k,y['fails']))
    if x['ok']!='OK' and y['ok']=='OK': fixed.append(k)
    if md:
        print(f"| {k} | {x['excl']} | {x['ok']} {x['pe']} × {x['ap']}, {x['i']}, {x['dv']}, {x['ti']} | {y['ok']} {y['pe']} × {y['ap']}, {y['i']}, {y['dv']}, {y['ti']} | {d} |")
print(f"\nrows {len(a)}; gated rows {gated}; mean Δ(Δv left) over gated {sum(dd)/max(1,len(dd)):.1f} m/s; accepted before {acc_a}, after {acc_b}; regressions {len(reg)}; newly accepted {len(fixed)}")
for k,f in reg: print('REGRESSION',k,f)
for k in fixed: print('NEWLY OK',k, b[k]['excl'])
