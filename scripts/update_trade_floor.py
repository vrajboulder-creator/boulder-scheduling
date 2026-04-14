import json, urllib.request, ssl, sys
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://kkjkakxmqukjmetsybpw.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtramtha3htcXVram1ldHN5YnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTczODIxOCwiZXhwIjoyMDkxMzE0MjE4fQ.nXpd-Rh9ZWgQCu_b6_tGrzTQX10i1KfbMXbhpf7U_Nc'
ctx = ssl.create_default_context()

def req(method, path, body=None):
    h = {'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY,
         'Content-Type': 'application/json', 'Prefer': 'return=minimal'}
    data = json.dumps(body).encode('utf-8') if body is not None else None
    r = urllib.request.Request(SUPABASE_URL + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, context=ctx) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

# phase -> (trade, floor, area)
PHASE_META = {
    # Pre-construction / admin
    'Owner Request for Proposal':                   ('General / GC',       'Site',    'Admin'),
    'Bid Preparation':                              ('General / GC',       'Site',    'Admin'),
    'Bid Submission to Owner':                      ('General / GC',       'Site',    'Admin'),
    'Notice to Proceed':                            ('General / GC',       'Site',    'Admin'),
    'Pre-Construction (2-3 months before Start)':   ('General / GC',       'Site',    'Admin'),
    'Pre-Mobilization Requirements':                ('General / GC',       'Site',    'Admin'),
    'Job Mobilization':                             ('General / GC',       'Site',    'Exterior / Site'),
    'Onsite Utility Pre-Construction Meeting':      ('General / GC',       'Site',    'Exterior / Site'),
    'Mockup Wall Started':                          ('General / GC',       'Site',    'Exterior / Site'),
    'Locations Finalized for Framing, MEP Rough':   ('General / GC',       'Site',    'Admin'),
    'Blocking Locations':                           ('Framing',            'Site',    'Tower A'),
    # Earthwork / sitework
    'Earthwork - Preconstruction':                  ('Sitework',           'Site',    'Exterior / Site'),
    'Earthwork - Site Prep':                        ('Sitework',           'Site',    'Exterior / Site'),
    'Earthwork - Rough Paving':                     ('Sitework',           'Site',    'Exterior / Site'),
    'Earthwork - Building Pad':                     ('Sitework',           'Site',    'Exterior / Site'),
    'Earthwork - Final Grading':                    ('Sitework',           'Site',    'Exterior / Site'),
    # Concrete
    'Concrete - Building Pad Form':                 ('Concrete',           'Site',    'Exterior / Site'),
    'Concrete - Footings to Pour':                  ('Concrete',           'Site',    'Exterior / Site'),
    'Concrete - Paving':                            ('Concrete',           'Site',    'Exterior / Site'),
    # Utilities
    'Utility - Sanitary Sewer':                     ('Sitework',           'Site',    'Exterior / Site'),
    'Utility - Irrigation':                         ('Sitework',           'Site',    'Exterior / Site'),
    'Utility - Fire Line':                          ('Fire Protection',     'Site',    'Exterior / Site'),
    'Utility - Gas Line':                           ('Plumbing',           'Site',    'Exterior / Site'),
    'Utility - Sleeves':                            ('Sitework',           'Site',    'Exterior / Site'),
    'Utility - Electrical':                         ('Electrical',         'Site',    'Exterior / Site'),
    # Plumbing
    'Plumbing - Underground':                       ('Plumbing',           'Site',    'Exterior / Site'),
    'Plumbing 1st Floor Top Out':                   ('Plumbing',           'Level 1', 'Tower A'),
    'Plumbing - 2nd Floor Top Out':                 ('Plumbing',           'Level 2', 'Tower A'),
    'Plumbing - 3rd Floor Top Out':                 ('Plumbing',           'Level 3', 'Tower A'),
    'Plumbing - 4th Floor Top Out':                 ('Plumbing',           'Level 4', 'Tower A'),
    'Plumbing  - Roof Top Out':                     ('Plumbing',           'Roof',    'Tower A'),
    'Plumbing - Outdoor Top Out (Roof / Canopy Drains)': ('Plumbing',      'Roof',    'Exterior / Site'),
    'Plumbing - Dumpster Pad / Work Shop':          ('Plumbing',           'Site',    'Exterior / Site'),
    'Plumbing Trim Out - 1st Floor':                ('Plumbing',           'Level 1', 'Tower A'),
    'Plumbing Trim Out - 2nd Floor':                ('Plumbing',           'Level 2', 'Tower A'),
    'Plumbing Trim Out - 3rd Floor':                ('Plumbing',           'Level 3', 'Tower A'),
    'Plumbing Trim Out - 4th Floor':                ('Plumbing',           'Level 4', 'Tower A'),
    # Gas
    'Gas Rough In - 1st Floor':                     ('Plumbing',           'Level 1', 'Tower A'),
    'Gas - Outdoor Rough In':                       ('Plumbing',           'Site',    'Exterior / Site'),
    'Gas Line':                                     ('Plumbing',           'Site',    'Exterior / Site'),
    'Gas Line Trim Out':                            ('Plumbing',           'Site',    'Tower A'),
    # Electrical
    'Electrical - Underground':                     ('Electrical',         'Site',    'Exterior / Site'),
    'Electrical 1st Floor Rough In':                ('Electrical',         'Level 1', 'Tower A'),
    'Electrical 2nd Floor Rough In':                ('Electrical',         'Level 2', 'Tower A'),
    'Electrical 3rd Floor Rough In':                ('Electrical',         'Level 3', 'Tower A'),
    'Electrical 4th Floor Rough In':                ('Electrical',         'Level 4', 'Tower A'),
    'Electrical Roof Rough In':                     ('Electrical',         'Roof',    'Tower A'),
    'Electrical Outdoor Rough In':                  ('Electrical',         'Site',    'Exterior / Site'),
    'Electrical - Signage Install':                 ('Electrical',         'Site',    'Exterior / Site'),
    # Mechanical
    'Mechanical 1st Floor Rough':                   ('Mechanical',         'Level 1', 'Tower A'),
    'Mechanical 2nd Floor Rough In':                ('Mechanical',         'Level 2', 'Tower A'),
    'Mechanical 3rd Floor Rough In':                ('Mechanical',         'Level 3', 'Tower A'),
    'Mechanical 4th Floor Rough In':                ('Mechanical',         'Level 4', 'Tower A'),
    'Mechanical Roof Rough In':                     ('Mechanical',         'Roof',    'Tower A'),
    'Mechanical Outdoor Rough In':                  ('Mechanical',         'Site',    'Exterior / Site'),
    'Mechanical Trim Out 1st Floor':                ('Mechanical',         'Level 1', 'Tower A'),
    'Mechanical Trim Out 2nd Floor':                ('Mechanical',         'Level 2', 'Tower A'),
    'Mechanical - Trim Out 3rd Floor':              ('Mechanical',         'Level 3', 'Tower A'),
    'Mechanical - Trim Out 4th Floor':              ('Mechanical',         'Level 4', 'Tower A'),
    # Fire Sprinkler
    'Fire Sprinkler -  Fire Riser':                 ('Fire Protection',    'Site',    'Tower A'),
    'Fire Sprinkler 1st Floor Rough In':            ('Fire Protection',    'Level 1', 'Tower A'),
    'Fire Sprinkler 2nd Floor Rough In':            ('Fire Protection',    'Level 2', 'Tower A'),
    'Fire Sprinkler 3rd Floor Rough In':            ('Fire Protection',    'Level 3', 'Tower A'),
    'Fire Sprinkler 4th Floor Rough In':            ('Fire Protection',    'Level 4', 'Tower A'),
    'Fire Sprinkler Roof Concealed Space':          ('Fire Protection',    'Roof',    'Tower A'),
    'Fire Sprinkler Dry System':                    ('Fire Protection',    'Roof',    'Tower A'),
    'Fire Sprinkler Stand Alone Pool Equipment / Pool Bathroom': ('Fire Protection', 'Site', 'Exterior / Site'),
    'Fire Sprinkler  - Trim Out 1st Floor':         ('Fire Protection',    'Level 1', 'Tower A'),
    'Fire Sprinkler - Trim Out 2nd Floor':          ('Fire Protection',    'Level 2', 'Tower A'),
    'Fire Sprinkler - Trim Out 3rd Floor':          ('Fire Protection',    'Level 3', 'Tower A'),
    'Fire Sprinkler - Trim Out 4th Floor':          ('Fire Protection',    'Level 4', 'Tower A'),
    # Fire Alarm
    'Fire Alarm 1st Floor Rough In':                ('Fire Alarm',         'Level 1', 'Tower A'),
    'Fire Alarm 2nd Floor Rough':                   ('Fire Alarm',         'Level 2', 'Tower A'),
    'Fire Alarm 3rd Floor Rough':                   ('Fire Alarm',         'Level 3', 'Tower A'),
    'Fire Alarm 4th Floor Rough':                   ('Fire Alarm',         'Level 4', 'Tower A'),
    'Fire Alarm Roof Rough':                        ('Fire Alarm',         'Roof',    'Tower A'),
    'Fire Alarm - Trim Out 1st Floor':              ('Fire Alarm',         'Level 1', 'Tower A'),
    'Fire Alarm - Trim Out 2nd Floor':              ('Fire Alarm',         'Level 2', 'Tower A'),
    'Fire Alarm - Trim Out 3rd Floor':              ('Fire Alarm',         'Level 3', 'Tower A'),
    'Fire Alarm - Trim Out 4th Floor':              ('Fire Alarm',         'Level 4', 'Tower A'),
    # Structured Cabling
    'Structured Cabling 1st Floor Rough':           ('Structured Cabling', 'Level 1', 'Tower A'),
    'Structured Cabling 2nd Floor Rough':           ('Structured Cabling', 'Level 2', 'Tower A'),
    'Structured Cabling 3rd Floor Rough':           ('Structured Cabling', 'Level 3', 'Tower A'),
    'Structured Cabling 4th Floor Rough':           ('Structured Cabling', 'Level 4', 'Tower A'),
    'Structured Cabling Roof Rough':                ('Structured Cabling', 'Roof',    'Tower A'),
    # Framing
    'Framing - 1st Floor':                          ('Framing',            'Level 1', 'Tower A'),
    'Framing - 2nd Floor':                          ('Framing',            'Level 2', 'Tower A'),
    'Framing - 3rd Floor':                          ('Framing',            'Level 3', 'Tower A'),
    'Framing - 4th Floor':                          ('Framing',            'Level 4', 'Tower A'),
    'Framing - Roof':                               ('Framing',            'Roof',    'Tower A'),
    # Structural / CMU
    'Structural Steel':                             ('Structural Steel',   'Site',    'Tower A'),
    'CMU':                                          ('Concrete',           'Site',    'Tower A'),
    # Roofing
    'Roof - TPO':                                   ('Roofing',            'Roof',    'Tower A'),
    # Insulation / Drywall / Prerock
    'Insulate Corridor - 1st Floor':                ('Insulation',         'Level 1', 'Tower A'),
    'Insulate Corridor - 2nd Floor':                ('Insulation',         'Level 2', 'Tower A'),
    'Insulate Corridor - 3rd Floor':                ('Insulation',         'Level 3', 'Tower A'),
    'Insulate Corridor - 4th Floor':                ('Insulation',         'Level 4', 'Tower A'),
    'Insulation 1st Floor Walls / Ceilings':        ('Insulation',         'Level 1', 'Tower A'),
    'Insulation - 2nd Floor':                       ('Insulation',         'Level 2', 'Tower A'),
    'Insulation - 3rd Floor':                       ('Insulation',         'Level 3', 'Tower A'),
    'Insulation - 4th Floor':                       ('Insulation',         'Level 4', 'Tower A'),
    'Prerock Corridor and Furdown Areas - 1st Floor':   ('Drywall',        'Level 1', 'Tower A'),
    'Prerock Corridor and Fur Down Areas - 2nd Floor':  ('Drywall',        'Level 2', 'Tower A'),
    'Prerock Corridor and Fur Down Areas - 3rd Floor':  ('Drywall',        'Level 3', 'Tower A'),
    'Prerock Corridor and Fur Down Areas - 4th Floor':  ('Drywall',        'Level 4', 'Tower A'),
    'Drywall (Tape/Bed/Sand) - 1st Floor':          ('Drywall',            'Level 1', 'Tower A'),
    'Drywall (Tape/Bed/Sand) - 2nd Floor':          ('Drywall',            'Level 2', 'Tower A'),
    'Drywall (Tape/Bed/Sand) - 3rd Floor':          ('Drywall',            'Level 3', 'Tower A'),
    'Drywall (Tape/Bed/Sand) - 4th Floor':          ('Drywall',            'Level 4', 'Tower A'),
    # Finishes
    'Tile - Flooring 1st Floor':                    ('Finishes',           'Level 1', 'Tower A'),
    'Tile - Flooring 2nd Floor':                    ('Finishes',           'Level 2', 'Tower A'),
    'Tile - Flooring 3rd Floor':                    ('Finishes',           'Level 3', 'Tower A'),
    'Tile - Flooring 4th Floor':                    ('Finishes',           'Level 4', 'Tower A'),
    'Wallpaper Corridor - 1st Floor':               ('Finishes',           'Level 1', 'Tower A'),
    'Millwork Install':                             ('Millwork',           'Site',    'Tower A'),
    'Vanity / Kitchen Cabinets Install - 1st Floor':('Millwork',           'Level 1', 'Tower A'),
    'Vanity / Kitchen Cabinets Install - 2nd Floor':('Millwork',           'Level 2', 'Tower A'),
    'Vanity / Kitchen Cabinets Install - 3rd Floor':('Millwork',           'Level 3', 'Tower A'),
    'Vanity / Kitchen Cabinets Install - 4th Floor':('Millwork',           'Level 4', 'Tower A'),
    'Vanity / Kitchen / Window Sill Granite - 1st Floor': ('Finishes',     'Level 1', 'Tower A'),
    'Vanity / Kitchen / Window Sill Granite - 2nd Floor': ('Finishes',     'Level 2', 'Tower A'),
    'Vanity / Kitchen / Window Sill Granite - 3rd Floor': ('Finishes',     'Level 3', 'Tower A'),
    'Vanity / Kitchen / Window Sill Granite - 4th Floor': ('Finishes',     'Level 4', 'Tower A'),
    'FFE Hang Install - 4th Floor':                 ('Finishes',           'Level 4', 'Tower A'),
    'FFE Install - 1st Floor':                      ('Finishes',           'Level 1', 'Tower A'),
    'FFE Install - 2nd Floor':                      ('Finishes',           'Level 2', 'Tower A'),
    'FFE Install - 3rd Floor':                      ('Finishes',           'Level 3', 'Tower A'),
    'FFE Install - 4th Floor':                      ('Finishes',           'Level 4', 'Tower A'),
    # Pool / Amenities
    'Swimming Pool Rough to Gunite':                ('Concrete',           'Site',    'Exterior / Site'),
    'Swimming Pool - Finish Out':                   ('Finishes',           'Site',    'Exterior / Site'),
    'Swimming Pool':                                ('General / GC',       'Site',    'Exterior / Site'),
    'Sports Court Install':                         ('General / GC',       'Site',    'Exterior / Site'),
}

# Fetch all CSV activities
print('Fetching activities...')
all_acts = []
offset = 0
while True:
    r = urllib.request.Request(
        SUPABASE_URL + f'/rest/v1/activities?select=id,phase&id=like.CSV-TPSJ-*&limit=1000&offset={offset}',
        headers={'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY}
    )
    with urllib.request.urlopen(r, context=ctx) as resp:
        batch = json.loads(resp.read())
    all_acts.extend(batch)
    if len(batch) < 1000: break
    offset += 1000
print(f'  Got {len(all_acts)} activities')

# Build updates grouped by (trade, floor, area) to do bulk PATCH per unique combo
from collections import defaultdict
groups = defaultdict(list)  # (trade, floor, area) -> [id, ...]
unmatched = []
for a in all_acts:
    phase = (a['phase'] or '').strip()
    if phase in PHASE_META:
        trade, floor, area = PHASE_META[phase]
        groups[(trade, floor, area)].append(a['id'])
    else:
        unmatched.append(phase)

if unmatched:
    print(f'  Unmatched phases ({len(set(unmatched))}): {sorted(set(unmatched))[:5]}')

print(f'  Updating {len(groups)} distinct trade/floor/area combos...')
updated = 0
for (trade, floor, area), ids in groups.items():
    # PATCH in batches of 200 using id=in.(...)
    for i in range(0, len(ids), 200):
        batch_ids = ids[i:i+200]
        id_filter = 'in.(' + ','.join(batch_ids) + ')'
        s, r = req('PATCH', f'/rest/v1/activities?id={id_filter}',
                   {'trade': trade, 'floor': floor, 'area': area})
        if s not in (200, 204):
            print(f'  ERROR {s}: {str(r)[:200]}')
        else:
            updated += len(batch_ids)

print(f'Done. Updated {updated} activities.')

# Verify
r = urllib.request.Request(
    SUPABASE_URL + '/rest/v1/activities?select=trade,floor,area&id=like.CSV-TPSJ-*&limit=2000',
    headers={'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY}
)
with urllib.request.urlopen(r, context=ctx) as resp:
    acts = json.loads(resp.read())
trades = sorted(set(a['trade'] for a in acts if a['trade']))
floors = sorted(set(a['floor'] for a in acts if a['floor']))
areas  = sorted(set(a['area']  for a in acts if a['area']))
print(f'Distinct trades ({len(trades)}): {trades}')
print(f'Distinct floors ({len(floors)}): {floors}')
print(f'Distinct areas  ({len(areas)}):  {areas}')
