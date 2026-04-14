import json, urllib.request, ssl, sys
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://kkjkakxmqukjmetsybpw.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtramtha3htcXVram1ldHN5YnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTczODIxOCwiZXhwIjoyMDkxMzE0MjE4fQ.nXpd-Rh9ZWgQCu_b6_tGrzTQX10i1KfbMXbhpf7U_Nc'
ctx = ssl.create_default_context()

def req(method, path, body=None, extra={}):
    h = {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        **extra
    }
    data = json.dumps(body).encode('utf-8') if body is not None else None
    r = urllib.request.Request(SUPABASE_URL + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, context=ctx) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

PHASE_ORDER = [
    'Owner Request for Proposal',
    'Bid Preparation',
    'Bid Submission to Owner',
    'Notice to Proceed',
    'Pre-Construction (2-3 months before Start)',
    'Pre-Mobilization Requirements',
    'Earthwork - Preconstruction',
    'Job Mobilization',
    'Earthwork - Site Prep',
    'Earthwork - Rough Paving',
    'Earthwork - Building Pad',
    'Concrete - Building Pad Form',
    'Plumbing - Underground',
    'Electrical - Underground',
    'Fire Sprinkler -  Fire Riser',
    'Concrete - Footings to Pour',
    'Onsite Utility Pre-Construction Meeting',
    'Utility - Sanitary Sewer',
    'Utility - Irrigation',
    'Utility - Fire Line',
    'Utility - Gas Line',
    'Utility - Sleeves',
    'Utility - Electrical',
    'Earthwork - Final Grading',
    'Concrete - Paving',
    'CMU',
    'Mockup Wall Started',
    'Structural Steel',
    'Locations Finalized for Framing, MEP Rough',
    'Framing - 1st Floor',
    'Framing - 2nd Floor',
    'Framing - 3rd Floor',
    'Framing - 4th Floor',
    'Blocking Locations',
    'Framing - Roof',
    'Roof - TPO',
    'Insulate Corridor - 1st Floor',
    'Insulate Corridor - 2nd Floor',
    'Insulate Corridor - 3rd Floor',
    'Insulate Corridor - 4th Floor',
    'Prerock Corridor and Furdown Areas - 1st Floor',
    'Prerock Corridor and Fur Down Areas - 2nd Floor',
    'Prerock Corridor and Fur Down Areas - 3rd Floor',
    'Prerock Corridor and Fur Down Areas - 4th Floor',
    'Swimming Pool Rough to Gunite',
    'Plumbing 1st Floor Top Out',
    'Plumbing - 2nd Floor Top Out',
    'Plumbing - 3rd Floor Top Out',
    'Plumbing - 4th Floor Top Out',
    'Plumbing  - Roof Top Out',
    'Plumbing - Outdoor Top Out (Roof / Canopy Drains)',
    'Plumbing - Dumpster Pad / Work Shop',
    'Gas Rough In - 1st Floor',
    'Gas - Outdoor Rough In',
    'Gas Line',
    'Mechanical 1st Floor Rough',
    'Mechanical 2nd Floor Rough In',
    'Mechanical 3rd Floor Rough In',
    'Mechanical 4th Floor Rough In',
    'Mechanical Roof Rough In',
    'Mechanical Outdoor Rough In',
    'Fire Sprinkler 1st Floor Rough In',
    'Fire Sprinkler 2nd Floor Rough In',
    'Fire Sprinkler 3rd Floor Rough In',
    'Fire Sprinkler 4th Floor Rough In',
    'Fire Sprinkler Roof Concealed Space',
    'Fire Sprinkler Dry System',
    'Fire Sprinkler Stand Alone Pool Equipment / Pool Bathroom',
    'Electrical 1st Floor Rough In',
    'Electrical 2nd Floor Rough In',
    'Electrical 3rd Floor Rough In',
    'Electrical 4th Floor Rough In',
    'Electrical Roof Rough In',
    'Electrical Outdoor Rough In',
    'Structured Cabling 1st Floor Rough',
    'Structured Cabling 2nd Floor Rough',
    'Structured Cabling 3rd Floor Rough',
    'Structured Cabling 4th Floor Rough',
    'Structured Cabling Roof Rough',
    'Fire Alarm 1st Floor Rough In',
    'Fire Alarm 2nd Floor Rough',
    'Fire Alarm 3rd Floor Rough',
    'Fire Alarm 4th Floor Rough',
    'Fire Alarm Roof Rough',
    'Insulation 1st Floor Walls / Ceilings',
    'Insulation - 2nd Floor',
    'Insulation - 3rd Floor',
    'Insulation - 4th Floor',
    'Drywall (Tape/Bed/Sand) - 1st Floor',
    'Drywall (Tape/Bed/Sand) - 2nd Floor',
    'Drywall (Tape/Bed/Sand) - 3rd Floor',
    'Drywall (Tape/Bed/Sand) - 4th Floor',
    'Swimming Pool - Finish Out',
    'Sports Court Install',
    'Wallpaper Corridor - 1st Floor',
    'Tile - Flooring 1st Floor',
    'Tile - Flooring 2nd Floor',
    'Tile - Flooring 3rd Floor',
    'Tile - Flooring 4th Floor',
    'Millwork Install',
    'Fire Sprinkler  - Trim Out 1st Floor',
    'Fire Sprinkler - Trim Out 2nd Floor',
    'Fire Sprinkler - Trim Out 3rd Floor',
    'Fire Sprinkler - Trim Out 4th Floor',
    'Fire Alarm - Trim Out 1st Floor',
    'Fire Alarm - Trim Out 2nd Floor',
    'Fire Alarm - Trim Out 3rd Floor',
    'Fire Alarm - Trim Out 4th Floor',
    'Vanity / Kitchen Cabinets Install - 4th Floor',
    'Vanity / Kitchen Cabinets Install - 3rd Floor',
    'Vanity / Kitchen Cabinets Install - 2nd Floor',
    'Vanity / Kitchen Cabinets Install - 1st Floor',
    'Vanity / Kitchen / Window Sill Granite - 4th Floor',
    'Vanity / Kitchen / Window Sill Granite - 3rd Floor',
    'Vanity / Kitchen / Window Sill Granite - 2nd Floor',
    'Vanity / Kitchen / Window Sill Granite - 1st Floor',
    'Mechanical Trim Out 1st Floor',
    'Mechanical Trim Out 2nd Floor',
    'Mechanical - Trim Out 3rd Floor',
    'Mechanical - Trim Out 4th Floor',
    'FFE Hang Install - 4th Floor',
    'Plumbing Trim Out - 1st Floor',
    'Plumbing Trim Out - 2nd Floor',
    'Plumbing Trim Out - 3rd Floor',
    'Plumbing Trim Out - 4th Floor',
    'Gas Line Trim Out',
    'Electrical - Signage Install',
    'Swimming Pool',
    'FFE Install - 4th Floor',
    'FFE Install - 3rd Floor',
    'FFE Install - 2nd Floor',
    'FFE Install - 1st Floor',
]
phase_rank = {p: i for i, p in enumerate(PHASE_ORDER)}

# Fetch all CSV activities
print('Fetching CSV activities...')
all_acts = []
offset = 0
while True:
    status, batch = req('GET', f'/rest/v1/activities?select=id,phase,sort_order&id=like.CSV-TPSJ-*&parent_id=is.null&limit=1000&offset={offset}')
    all_acts.extend(batch)
    if len(batch) < 1000:
        break
    offset += 1000
print(f'  Got {len(all_acts)} activities')

# Group by phase
by_phase = defaultdict(list)
for a in all_acts:
    p = (a['phase'] or '').strip()
    by_phase[p].append(a)

# Sort each phase by sort_order
for p in by_phase:
    by_phase[p].sort(key=lambda a: (a['sort_order'] or 0, a['id']))

# Sort phases by canonical order
phases_present = sorted(by_phase.keys(), key=lambda p: phase_rank.get(p, 9999))
print(f'  Phases found: {len(phases_present)}')
print('  First 5:', phases_present[:5])

# Build links
links = []
for i in range(len(phases_present) - 1):
    curr_phase = phases_present[i]
    next_phase = phases_present[i + 1]
    last_act = by_phase[curr_phase][-1]
    first_act = by_phase[next_phase][0]
    if last_act['id'] != first_act['id']:
        links.append({
            'predecessor_id': last_act['id'],
            'successor_id': first_act['id'],
            'link_type': 'FS',
            'lag_days': 0
        })

print(f'  Built {len(links)} phase-chain links')
if links:
    print(f'  First: {links[0]}')
    print(f'  Second: {links[1] if len(links) > 1 else "N/A"}')

# Delete old CSV-to-CSV links
print('Deleting old CSV activity links...')
status, _ = req('DELETE', '/rest/v1/activity_links?predecessor_id=like.CSV-TPSJ-*')
print(f'  Delete status: {status}')

# Insert new links in batches
print(f'Inserting {len(links)} links...')
BATCH = 200
inserted = 0
for i in range(0, len(links), BATCH):
    batch = links[i:i+BATCH]
    status, resp = req('POST', '/rest/v1/activity_links', batch)
    if status in (200, 201):
        inserted += len(batch)
        print(f'  {inserted}/{len(links)}')
    else:
        print(f'  ERROR: status={status} resp={str(resp)[:300]}')
        break

print(f'Done. Inserted {inserted} links.')

# Verify first 5
print('\nVerifying first 5 links...')
status, result = req('GET', '/rest/v1/activity_links?select=predecessor_id,successor_id&predecessor_id=like.CSV-TPSJ-*&limit=5')
for r in result:
    pred_s, _ = req('GET', f'/rest/v1/activities?select=name,phase&id=eq.{r["predecessor_id"]}')
    succ_s, _ = req('GET', f'/rest/v1/activities?select=name,phase&id=eq.{r["successor_id"]}')
    if isinstance(pred_s, int):
        pred_s = _
    pred = pred_s[0] if isinstance(pred_s, list) and pred_s else {}
    succ = succ_s[0] if isinstance(succ_s, list) and succ_s else {}
    print(f'  [{pred.get("phase","")}] {pred.get("name","")} -> [{succ.get("phase","")}] {succ.get("name","")}')
