import csv, hashlib, io, json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
def load(n):
    path = ROOT / f'orbitlab_falcon9_leo ({n}).csv'
    rows = list(csv.reader(io.StringIO(path.read_text(encoding='utf-8-sig'))))
    split = rows.index(['# events'])
    header = rows[0]
    data = [row for row in rows[1:split] if row]
    assert all(len(row) == len(header) for row in data)
    events = rows[split+2:]
    assert all(len(row) == 3 for row in events)
    for row in events: json.loads(row[2])
    return path, header, [dict(zip(header,row)) for row in data], events

iso_path, iso_cols, iso_rows, iso_events = load(1)
gost_path, gost_cols, gost_rows, gost_events = load(3)
assert len(iso_rows) == len(gost_rows) == 1194
assert iso_events == gost_events
common = [c for c in iso_cols if not c.startswith('iso_')]
mapped = []
for name in iso_cols:
    if not name.startswith('iso_'): continue
    rest = name[4:]
    other = {'p_rad_s':'omega_x_rad_s','q_rad_s':'omega_z_rad_s','r_rad_s':'omega_y_rad_s',
             'command_p_rad_s':'command_omega_x_rad_s','command_q_rad_s':'command_omega_z_rad_s','command_r_rad_s':'command_omega_y_rad_s'}.get(rest, rest)
    negative = rest in ('r_rad_s','command_r_rad_s') or '_yaw_' in rest
    mapped.append({'iso':name, 'gost':'gost_'+other, 'factor':-1 if negative else 1})
assert set(gost_cols) == set(common + [m['gost'] for m in mapped])
assert len(mapped) == 32
nonzero_negations=0; angle_comparisons=0; maximum_angle_error=0
for i, (iso,gost) in enumerate(zip(iso_rows,gost_rows)):
    for c in common: assert iso[c] == gost[c], (i,c)
    for m in mapped:
        a,b=iso[m['iso']],gost[m['gost']]
        if not a or not b: assert a==b, (i,m)
        else:
            assert math.isfinite(float(a)) and math.isfinite(float(b))
            assert float(b) == m['factor']*float(a), (i,m,a,b)
            if m['factor']==-1 and float(a)!=0: nonzero_negations+=1
    for dst,source,sign in [('gost_omega_x_rad_s','omega_body_x_rad_s',1),('gost_omega_z_rad_s','omega_body_z_rad_s',-1),('gost_omega_y_rad_s','omega_body_y_rad_s',-1),
                           ('gost_command_omega_x_rad_s','command_roll_rad_s',1),('gost_command_omega_z_rad_s','command_yaw_rad_s',-1),('gost_command_omega_y_rad_s','command_pitch_rad_s',-1)]:
        if gost[dst]: assert float(gost[dst])==sign*float(gost[source]), (i,dst,source)
    if gost['angle_of_attack_rad']:
        a,b=float(gost['angle_of_attack_rad']),float(gost['sideslip_rad'])
        vx,vy,vz=math.cos(b)*math.cos(a),math.sin(b),math.cos(b)*math.sin(a)
        for key,expected in [('gost_alpha_rad',math.atan2(vy,vx)),('gost_beta_rad',math.asin(max(-1,min(1,-vz))))]:
            error=abs(float(gost[key])-expected)
            assert error < 2e-10, (i,key,error)
            maximum_angle_error=max(maximum_angle_error,error); angle_comparisons+=1

live, point_cols, point_rows, point_events=load(4)
replay, replay_cols, replay_rows, replay_events=load(5)
assert live.read_bytes()==replay.read_bytes()
assert len(point_cols)==20 and not any(c.startswith(('rigid_','omega_','iso_','gost_')) for c in point_cols)
point_times=[float(r['t_s']) for r in point_rows]
assert all(math.isfinite(t) for t in point_times) and all(a<=b for a,b in zip(point_times,point_times[1:]))
assert max(point_times)>600
def info(path): return {'file':path.name,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
result={
    'gost':{'source':'Actual browser export after selecting GOST 20058-80','file':info(gost_path),'comparedWith':iso_path.name,
            'telemetryRows':len(gost_rows),'columns':len(gost_cols),'firstTime':float(gost_rows[0]['t_s']),'maxTime':max(float(r['t_s']) for r in gost_rows),
            'events':len(gost_events),'eventsExactlyMatchIso':True,'notationIndependentColumnsExactlyMatch':len(common),
            'notationColumnMappings':mapped,'mappedCellComparisons':len(mapped)*len(gost_rows),'nonzeroNegationComparisons':nonzero_negations,
            'aeroAngleChecksAgainstRawBodyAngles':angle_comparisons,'maxAbsoluteAngleRoundingErrorRad':maximum_angle_error,
            'mappingSummary':'ISO p = GOST omega_x, ISO q = GOST omega_z, ISO r = -GOST omega_y; command rates follow the same mapping. All eight loop yaw vectors change sign; roll/pitch and alpha/beta are unchanged.'},
    'pointMass':{'source':'Actual browser live and replay-at-600 exports','live':info(live),'replay':info(replay),'byteIdentical':True,
                 'telemetryRows':len(point_rows),'columns':len(point_cols),'firstTime':min(point_times),'maxTime':max(point_times),'events':len(point_events),
                 'timesMonotone':True,'noRigidOrNotationColumns':True,'fullFlightBeyondReplayCursor':True},
    'limits':['Verifies app export notation contract against unchanged raw body telemetry; not an independent certification of the ISO/GOST standards.',
              'The point-mass and six-DOF exports are separate flights and are not expected to match each other.']}
(ROOT/'csv-notation-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'gost':{k:v for k,v in result['gost'].items() if k!='notationColumnMappings'},'pointMass':result['pointMass']},indent=2))
