// ─── CONSTANTS ───
const TRADES = ['General / GC','Concrete','Framing','Drywall','Paint','HVAC','Plumbing','Electrical','Low Voltage','Fire Alarm','Flooring','Sitework','Roofing','Glazing','Doors/Frames/HW','Specialties','Casework','Elevator','Landscaping','Fire Sprinkler','Insulation'];

const SUBS = {
  'General / GC': 'Boulder Construction (Self-Perform)',
  'Concrete': 'Gulf Coast Concrete',
  'Framing': 'Lone Star Framing',
  'Drywall': 'ProFinish Interiors',
  'Paint': 'ProFinish Interiors',
  'HVAC': 'Apex Mechanical',
  'Plumbing': 'Apex Mechanical',
  'Electrical': 'Spark Systems Electric',
  'Low Voltage': 'Integrated AV Solutions',
  'Fire Alarm': 'FireTech Systems',
  'Flooring': 'Southwest Flooring Co',
  'Sitework': 'Earthworks Civil',
  'Roofing': 'Pinnacle Roofing',
  'Glazing': 'Clear View Glass',
  'Doors/Frames/HW': 'National Door Supply',
  'Specialties': 'Hotel Outfitters Inc',
  'Casework': 'Precision Millwork',
  'Elevator': 'ThyssenKrupp Elevator',
  'Landscaping': 'Green Edge Landscape',
  'Fire Sprinkler': 'FireTech Systems',
  'Insulation': 'ThermalPro Insulation'
};

// ─── ACTIVITY DATA (loaded from Supabase API) ───
let nextId = 100;
const genId = () => 'ACT-' + (nextId++);

let activities = [];

// ─── TPSJ REAL PROJECT DATA ───
// Derived from Airtable CSV export. Real dates used where available;
// estimated dates follow the established floor-by-floor construction cadence.
function loadTPSJActivities() {
  // Base anchors from real CSV data:
  //   Utility - Electrical sleeves:   actual finish 2/10/2026
  //   CMU (Elevator/Stairs):          actual finish 2/11-2/16/2026
  //   Concrete Paving (Transformer):  actual finish 2/12/2026
  //   Concrete Paving (Light Poles):  actual finish 2/25/2026
  //   Concrete Paving (Dumpster Pad): actual finish 2/28/2026
  //   Structural Steel started:       actual start  3/3-3/4/2026, planned finish 3/3/2026
  //   Framing 1st Floor start:        actual start  3/5/2026, planned finish 3/17/2026
  //   Framing 2nd Floor:              planned 3/17 - 3/24/2026
  //   Framing 3rd Floor:              planned 3/24 - 3/31/2026
  //   Framing 4th Floor:              planned 4/1 - 4/8/2026
  //   Framing Roof:                   planned 4/7 - 4/14/2026

  const TPSJ = [
    // ── PRE-CONSTRUCTION (Complete) ──
    { id:'T-001', name:'Pre-Construction Planning & Procurement',  trade:'General / GC',  sub:'Boulder Construction (Self-Perform)', area:'Admin',          floor:'Site',    phase:'Pre-Construction', start:'2025-11-01', finish:'2026-01-15', duration:75,  status:'Complete',    pct:100, priority:'Critical', milestone:false },
    { id:'T-002', name:'Permits & City Approvals',                 trade:'General / GC',  sub:'Boulder Construction (Self-Perform)', area:'Admin',          floor:'Site',    phase:'Pre-Construction', start:'2025-11-15', finish:'2026-02-01', duration:78,  status:'Complete',    pct:100, priority:'Critical', milestone:true  },
    { id:'T-003', name:'Site Fence, Security Cameras & Signage',   trade:'General / GC',  sub:'Boulder Construction (Self-Perform)', area:'Exterior / Site',floor:'Site',    phase:'Pre-Construction', start:'2026-01-10', finish:'2026-01-25', duration:15,  status:'Complete',    pct:100, priority:'Normal',   milestone:false },
    // ── EARTHWORK / UTILITIES (Complete) ──
    { id:'T-010', name:'Earthwork — Site Prep & Mass Grading',     trade:'Sitework',      sub:'Earthworks Civil',                   area:'Exterior / Site',floor:'Site',    phase:'Sitework',         start:'2026-01-12', finish:'2026-01-28', duration:16,  status:'Complete',    pct:100, priority:'High',     milestone:false },
    { id:'T-011', name:'Earthwork — Building Pad Excavation',      trade:'Sitework',      sub:'Earthworks Civil',                   area:'Exterior / Site',floor:'Site',    phase:'Sitework',         start:'2026-01-26', finish:'2026-02-06', duration:12,  status:'Complete',    pct:100, priority:'Critical', milestone:false },
    { id:'T-012', name:'Underground Utility — Fire Line Install',   trade:'Sitework',      sub:'Earthworks Civil',                   area:'Exterior / Site',floor:'Site',    phase:'Sitework',         start:'2026-01-20', finish:'2026-02-05', duration:16,  status:'Complete',    pct:100, priority:'High',     milestone:false },
    { id:'T-013', name:'Underground Utility — Sanitary Sewer',     trade:'Sitework',      sub:'Earthworks Civil',                   area:'Exterior / Site',floor:'Site',    phase:'Sitework',         start:'2026-02-01', finish:'2026-03-17', duration:44,  status:'In Progress', pct:50,  priority:'High',     milestone:false, blocker:'' },
    { id:'T-014', name:'Underground Utility — Electrical Conduit', trade:'Electrical',    sub:'Spark Systems Electric',             area:'Exterior / Site',floor:'Site',    phase:'Sitework',         start:'2026-01-15', finish:'2026-02-10', duration:26,  status:'Complete',    pct:100, priority:'High',     milestone:false },
    { id:'T-015', name:'Underground Utility — Gas Line Sleeve',    trade:'Plumbing',      sub:'Apex Mechanical',                    area:'Exterior / Site',floor:'Site',    phase:'Sitework',         start:'2026-01-20', finish:'2026-02-10', duration:21,  status:'Complete',    pct:100, priority:'High',     milestone:false },
    { id:'T-016', name:'Underground Plumbing Rough-In',            trade:'Plumbing',      sub:'Apex Mechanical',                    area:'Level 1',        floor:'Level 1', phase:'Foundation',       start:'2026-01-25', finish:'2026-02-15', duration:21,  status:'Complete',    pct:100, priority:'Critical', milestone:false },
    // ── CONCRETE / CMU (Complete) ──
    { id:'T-020', name:'Concrete — Footings & Building Pad',       trade:'Concrete',      sub:'Gulf Coast Concrete',                area:'Level 1',        floor:'Level 1', phase:'Foundation',       start:'2026-01-28', finish:'2026-02-10', duration:13,  status:'Complete',    pct:100, priority:'Critical', milestone:false },
    { id:'T-021', name:'CMU — Elevator Shaft & Stairs',            trade:'Concrete',      sub:'Gulf Coast Concrete',                area:'Level 1',        floor:'Level 1', phase:'Foundation',       start:'2026-01-30', finish:'2026-02-16', duration:17,  status:'Complete',    pct:100, priority:'Critical', milestone:true  },
    { id:'T-022', name:'Concrete — Transformer Pad & Paving Prep', trade:'Concrete',      sub:'Gulf Coast Concrete',                area:'Exterior / Site',floor:'Site',    phase:'Sitework',         start:'2026-02-05', finish:'2026-02-12', duration:7,   status:'Complete',    pct:100, priority:'Normal',   milestone:false },
    { id:'T-023', name:'Concrete — Light Poles & Dumpster Pad',    trade:'Concrete',      sub:'Gulf Coast Concrete',                area:'Exterior / Site',floor:'Site',    phase:'Sitework',         start:'2026-02-18', finish:'2026-02-28', duration:10,  status:'Complete',    pct:100, priority:'Normal',   milestone:false },
    { id:'T-024', name:'Concrete — Electrical Underground Sleeves', trade:'Electrical',   sub:'Spark Systems Electric',             area:'Exterior / Site',floor:'Site',    phase:'Foundation',       start:'2026-01-28', finish:'2026-02-10', duration:13,  status:'Complete',    pct:100, priority:'High',     milestone:false },
    // ── STRUCTURAL STEEL (In Progress) ──
    { id:'T-030', name:'Structural Steel Erection',                trade:'General / GC',  sub:'Boulder Construction (Self-Perform)', area:'Tower A',        floor:'Level 1', phase:'Structure',        start:'2026-03-03', finish:'2026-04-10', duration:38,  status:'In Progress', pct:35,  priority:'Critical', milestone:false },
    // ── FRAMING ──
    { id:'T-040', name:'Framing — 1st Floor',                     trade:'Framing',       sub:'Lone Star Framing',                  area:'Tower A',        floor:'Level 1', phase:'Structure',        start:'2026-03-05', finish:'2026-03-17', duration:12,  status:'In Progress', pct:80,  priority:'Critical', milestone:false },
    { id:'T-041', name:'Framing — 2nd Floor',                     trade:'Framing',       sub:'Lone Star Framing',                  area:'Tower A',        floor:'Level 2', phase:'Structure',        start:'2026-03-17', finish:'2026-03-24', duration:7,   status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-042', name:'Framing — 3rd Floor',                     trade:'Framing',       sub:'Lone Star Framing',                  area:'Tower A',        floor:'Level 3', phase:'Structure',        start:'2026-03-24', finish:'2026-03-31', duration:7,   status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-043', name:'Framing — 4th Floor',                     trade:'Framing',       sub:'Lone Star Framing',                  area:'Tower A',        floor:'Level 4', phase:'Structure',        start:'2026-04-01', finish:'2026-04-08', duration:7,   status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-044', name:'Framing — Roof Parapet & Valleys',        trade:'Framing',       sub:'Lone Star Framing',                  area:'Tower A',        floor:'Roof',    phase:'Structure',        start:'2026-04-07', finish:'2026-04-14', duration:7,   status:'Not Started', pct:0,   priority:'Critical', milestone:true  },
    // ── ROOF TPO ──
    { id:'T-050', name:'Roofing — TPO Membrane & Flashing',       trade:'Roofing',       sub:'Pinnacle Roofing',                   area:'Tower A',        floor:'Roof',    phase:'Close-In',         start:'2026-04-15', finish:'2026-05-05', duration:20,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    // ── INSULATION ──
    { id:'T-055', name:'Insulate Corridors — 1st Floor',          trade:'Insulation',    sub:'ThermalPro Insulation',              area:'Tower A',        floor:'Level 1', phase:'Close-In',         start:'2026-03-20', finish:'2026-03-27', duration:7,   status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-056', name:'Insulate Corridors — 2nd Floor',          trade:'Insulation',    sub:'ThermalPro Insulation',              area:'Tower A',        floor:'Level 2', phase:'Close-In',         start:'2026-03-27', finish:'2026-04-03', duration:7,   status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-057', name:'Insulate Corridors — 3rd Floor',          trade:'Insulation',    sub:'ThermalPro Insulation',              area:'Tower A',        floor:'Level 3', phase:'Close-In',         start:'2026-04-03', finish:'2026-04-10', duration:7,   status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-058', name:'Insulate Corridors — 4th Floor',          trade:'Insulation',    sub:'ThermalPro Insulation',              area:'Tower A',        floor:'Level 4', phase:'Close-In',         start:'2026-04-10', finish:'2026-04-17', duration:7,   status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    // ── DRYWALL PRE-ROCK ──
    { id:'T-060', name:'Pre-Rock Corridors — 1st Floor',          trade:'Drywall',       sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 1', phase:'Close-In',         start:'2026-03-27', finish:'2026-04-07', duration:11,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-061', name:'Pre-Rock Corridors — 2nd Floor',          trade:'Drywall',       sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 2', phase:'Close-In',         start:'2026-04-07', finish:'2026-04-17', duration:10,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-062', name:'Pre-Rock Corridors — 3rd Floor',          trade:'Drywall',       sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 3', phase:'Close-In',         start:'2026-04-17', finish:'2026-04-27', duration:10,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-063', name:'Pre-Rock Corridors — 4th Floor',          trade:'Drywall',       sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 4', phase:'Close-In',         start:'2026-04-27', finish:'2026-05-07', duration:10,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    // ── PLUMBING ROUGH ──
    { id:'T-070', name:'Plumbing Top-Out — 1st Floor',            trade:'Plumbing',      sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 1', phase:'Rough-In',         start:'2026-03-20', finish:'2026-04-03', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-071', name:'Plumbing Top-Out — 2nd Floor',            trade:'Plumbing',      sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 2', phase:'Rough-In',         start:'2026-04-03', finish:'2026-04-17', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-072', name:'Plumbing Top-Out — 3rd Floor',            trade:'Plumbing',      sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 3', phase:'Rough-In',         start:'2026-04-17', finish:'2026-05-01', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-073', name:'Plumbing Top-Out — 4th Floor',            trade:'Plumbing',      sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 4', phase:'Rough-In',         start:'2026-05-01', finish:'2026-05-15', duration:14,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-074', name:'Plumbing — Grease Trap Install',          trade:'Plumbing',      sub:'Apex Mechanical',                    area:'Exterior / Site',floor:'Level 1', phase:'Rough-In',         start:'2026-03-10', finish:'2026-03-28', duration:18,  status:'In Progress', pct:50,  priority:'High',     milestone:false, blocker:'Material delivery pending' },
    // ── MECHANICAL (HVAC) ROUGH ──
    { id:'T-080', name:'Mechanical Rough-In — 1st Floor',         trade:'HVAC',          sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 1', phase:'Rough-In',         start:'2026-03-20', finish:'2026-04-03', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-081', name:'Mechanical Rough-In — 2nd Floor',         trade:'HVAC',          sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 2', phase:'Rough-In',         start:'2026-04-03', finish:'2026-04-17', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-082', name:'Mechanical Rough-In — 3rd Floor',         trade:'HVAC',          sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 3', phase:'Rough-In',         start:'2026-04-17', finish:'2026-05-01', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-083', name:'Mechanical Rough-In — 4th Floor',         trade:'HVAC',          sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 4', phase:'Rough-In',         start:'2026-05-01', finish:'2026-05-15', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-084', name:'Mechanical Rough-In — Roof',              trade:'HVAC',          sub:'Apex Mechanical',                    area:'Tower A',        floor:'Roof',    phase:'Rough-In',         start:'2026-04-20', finish:'2026-05-05', duration:15,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    // ── ELECTRICAL ROUGH ──
    { id:'T-090', name:'Electrical Rough-In — 1st Floor',         trade:'Electrical',    sub:'Spark Systems Electric',             area:'Tower A',        floor:'Level 1', phase:'Rough-In',         start:'2026-03-20', finish:'2026-04-03', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-091', name:'Electrical Rough-In — 2nd Floor',         trade:'Electrical',    sub:'Spark Systems Electric',             area:'Tower A',        floor:'Level 2', phase:'Rough-In',         start:'2026-04-03', finish:'2026-04-17', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-092', name:'Electrical Rough-In — 3rd Floor',         trade:'Electrical',    sub:'Spark Systems Electric',             area:'Tower A',        floor:'Level 3', phase:'Rough-In',         start:'2026-04-17', finish:'2026-05-01', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-093', name:'Electrical Rough-In — 4th Floor',         trade:'Electrical',    sub:'Spark Systems Electric',             area:'Tower A',        floor:'Level 4', phase:'Rough-In',         start:'2026-05-01', finish:'2026-05-15', duration:14,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    // ── FIRE SPRINKLER ROUGH ──
    { id:'T-100', name:'Fire Sprinkler Rough-In — 1st Floor',     trade:'Fire Sprinkler', sub:'FireTech Systems',                  area:'Tower A',        floor:'Level 1', phase:'Rough-In',         start:'2026-03-27', finish:'2026-04-07', duration:11,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-101', name:'Fire Sprinkler Rough-In — 2nd Floor',     trade:'Fire Sprinkler', sub:'FireTech Systems',                  area:'Tower A',        floor:'Level 2', phase:'Rough-In',         start:'2026-04-07', finish:'2026-04-17', duration:10,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-102', name:'Fire Sprinkler Rough-In — 3rd Floor',     trade:'Fire Sprinkler', sub:'FireTech Systems',                  area:'Tower A',        floor:'Level 3', phase:'Rough-In',         start:'2026-04-17', finish:'2026-04-27', duration:10,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-103', name:'Fire Sprinkler Rough-In — 4th Floor',     trade:'Fire Sprinkler', sub:'FireTech Systems',                  area:'Tower A',        floor:'Level 4', phase:'Rough-In',         start:'2026-04-27', finish:'2026-05-07', duration:10,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    // ── FIRE ALARM ROUGH ──
    { id:'T-110', name:'Fire Alarm Rough-In — 1st Floor',         trade:'Fire Alarm',    sub:'FireTech Systems',                   area:'Tower A',        floor:'Level 1', phase:'Rough-In',         start:'2026-03-27', finish:'2026-04-07', duration:11,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-111', name:'Fire Alarm Rough-In — 2nd Floor',         trade:'Fire Alarm',    sub:'FireTech Systems',                   area:'Tower A',        floor:'Level 2', phase:'Rough-In',         start:'2026-04-07', finish:'2026-04-17', duration:10,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-112', name:'Fire Alarm Rough-In — 3rd Floor',         trade:'Fire Alarm',    sub:'FireTech Systems',                   area:'Tower A',        floor:'Level 3', phase:'Rough-In',         start:'2026-04-17', finish:'2026-04-27', duration:10,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-113', name:'Fire Alarm Rough-In — 4th Floor',         trade:'Fire Alarm',    sub:'FireTech Systems',                   area:'Tower A',        floor:'Level 4', phase:'Rough-In',         start:'2026-04-27', finish:'2026-05-07', duration:10,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    // ── STRUCTURED CABLING ──
    { id:'T-120', name:'Structured Cabling — 1st Floor',          trade:'Low Voltage',   sub:'Integrated AV Solutions',            area:'Tower A',        floor:'Level 1', phase:'Rough-In',         start:'2026-04-01', finish:'2026-04-10', duration:9,   status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-121', name:'Structured Cabling — 2nd Floor',          trade:'Low Voltage',   sub:'Integrated AV Solutions',            area:'Tower A',        floor:'Level 2', phase:'Rough-In',         start:'2026-04-10', finish:'2026-04-20', duration:10,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-122', name:'Structured Cabling — 3rd Floor',          trade:'Low Voltage',   sub:'Integrated AV Solutions',            area:'Tower A',        floor:'Level 3', phase:'Rough-In',         start:'2026-04-20', finish:'2026-04-30', duration:10,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-123', name:'Structured Cabling — 4th Floor',          trade:'Low Voltage',   sub:'Integrated AV Solutions',            area:'Tower A',        floor:'Level 4', phase:'Rough-In',         start:'2026-04-30', finish:'2026-05-10', duration:10,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    // ── INSULATION WALLS ──
    { id:'T-130', name:'Insulation Walls/Ceilings — 1st Floor',   trade:'Insulation',    sub:'ThermalPro Insulation',              area:'Tower A',        floor:'Level 1', phase:'Close-In',         start:'2026-04-07', finish:'2026-04-17', duration:10,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-131', name:'Insulation Walls/Ceilings — 2nd Floor',   trade:'Insulation',    sub:'ThermalPro Insulation',              area:'Tower A',        floor:'Level 2', phase:'Close-In',         start:'2026-04-17', finish:'2026-04-27', duration:10,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-132', name:'Insulation Walls/Ceilings — 3rd Floor',   trade:'Insulation',    sub:'ThermalPro Insulation',              area:'Tower A',        floor:'Level 3', phase:'Close-In',         start:'2026-04-27', finish:'2026-05-07', duration:10,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-133', name:'Insulation Walls/Ceilings — 4th Floor',   trade:'Insulation',    sub:'ThermalPro Insulation',              area:'Tower A',        floor:'Level 4', phase:'Close-In',         start:'2026-05-07', finish:'2026-05-17', duration:10,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    // ── DRYWALL FINISHES ──
    { id:'T-140', name:'Drywall Tape/Bed/Sand — 1st Floor',       trade:'Drywall',       sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 1', phase:'Finishes',         start:'2026-04-20', finish:'2026-05-05', duration:15,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-141', name:'Drywall Tape/Bed/Sand — 2nd Floor',       trade:'Drywall',       sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 2', phase:'Finishes',         start:'2026-05-05', finish:'2026-05-20', duration:15,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-142', name:'Drywall Tape/Bed/Sand — 3rd Floor',       trade:'Drywall',       sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 3', phase:'Finishes',         start:'2026-05-20', finish:'2026-06-04', duration:15,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-143', name:'Drywall Tape/Bed/Sand — 4th Floor',       trade:'Drywall',       sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 4', phase:'Finishes',         start:'2026-06-04', finish:'2026-06-19', duration:15,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    // ── PAINT ──
    { id:'T-150', name:'Paint — 1st Floor Corridors & Rooms',     trade:'Paint',         sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 1', phase:'Finishes',         start:'2026-05-10', finish:'2026-05-24', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-151', name:'Paint — 2nd Floor Corridors & Rooms',     trade:'Paint',         sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 2', phase:'Finishes',         start:'2026-05-24', finish:'2026-06-07', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-152', name:'Paint — 3rd Floor Corridors & Rooms',     trade:'Paint',         sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 3', phase:'Finishes',         start:'2026-06-07', finish:'2026-06-21', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-153', name:'Paint — 4th Floor Corridors & Rooms',     trade:'Paint',         sub:'ProFinish Interiors',                area:'Tower A',        floor:'Level 4', phase:'Finishes',         start:'2026-06-21', finish:'2026-07-05', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    // ── TILE / FLOORING ──
    { id:'T-160', name:'Tile Flooring — 1st Floor',               trade:'Flooring',      sub:'Southwest Flooring Co',              area:'Tower A',        floor:'Level 1', phase:'Finishes',         start:'2026-05-20', finish:'2026-06-05', duration:16,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-161', name:'Tile Flooring — 2nd Floor',               trade:'Flooring',      sub:'Southwest Flooring Co',              area:'Tower A',        floor:'Level 2', phase:'Finishes',         start:'2026-06-05', finish:'2026-06-21', duration:16,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-162', name:'Tile Flooring — 3rd Floor',               trade:'Flooring',      sub:'Southwest Flooring Co',              area:'Tower A',        floor:'Level 3', phase:'Finishes',         start:'2026-06-21', finish:'2026-07-07', duration:16,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-163', name:'Tile Flooring — 4th Floor',               trade:'Flooring',      sub:'Southwest Flooring Co',              area:'Tower A',        floor:'Level 4', phase:'Finishes',         start:'2026-07-07', finish:'2026-07-23', duration:16,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    // ── CASEWORK / MILLWORK ──
    { id:'T-170', name:'Millwork & Casework Install — 1st Floor',  trade:'Casework',     sub:'Precision Millwork',                 area:'Tower A',        floor:'Level 1', phase:'Finishes',         start:'2026-06-01', finish:'2026-06-15', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-171', name:'Vanity/Cabinet Install — 2nd Floor',       trade:'Casework',     sub:'Precision Millwork',                 area:'Tower A',        floor:'Level 2', phase:'Finishes',         start:'2026-06-10', finish:'2026-06-24', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-172', name:'Vanity/Cabinet Install — 3rd Floor',       trade:'Casework',     sub:'Precision Millwork',                 area:'Tower A',        floor:'Level 3', phase:'Finishes',         start:'2026-06-24', finish:'2026-07-08', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-173', name:'Vanity/Cabinet Install — 4th Floor',       trade:'Casework',     sub:'Precision Millwork',                 area:'Tower A',        floor:'Level 4', phase:'Finishes',         start:'2026-07-08', finish:'2026-07-22', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    // ── MEP TRIM OUT ──
    { id:'T-180', name:'Plumbing Trim-Out — 1st Floor',            trade:'Plumbing',     sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 1', phase:'Finishes',         start:'2026-06-15', finish:'2026-06-29', duration:14,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-181', name:'Plumbing Trim-Out — 2nd Floor',            trade:'Plumbing',     sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 2', phase:'Finishes',         start:'2026-06-29', finish:'2026-07-13', duration:14,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-182', name:'Plumbing Trim-Out — 3rd Floor',            trade:'Plumbing',     sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 3', phase:'Finishes',         start:'2026-07-13', finish:'2026-07-27', duration:14,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-183', name:'Plumbing Trim-Out — 4th Floor',            trade:'Plumbing',     sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 4', phase:'Finishes',         start:'2026-07-27', finish:'2026-08-10', duration:14,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-184', name:'Mechanical Trim-Out — 1st Floor',          trade:'HVAC',         sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 1', phase:'Finishes',         start:'2026-06-20', finish:'2026-07-04', duration:14,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-185', name:'Mechanical Trim-Out — 2nd-4th Floor',      trade:'HVAC',         sub:'Apex Mechanical',                    area:'Tower A',        floor:'Level 2', phase:'Finishes',         start:'2026-07-04', finish:'2026-08-01', duration:28,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-186', name:'Electrical Trim-Out & Devices — All Floors',trade:'Electrical',  sub:'Spark Systems Electric',             area:'Tower A',        floor:'Level 1', phase:'Finishes',         start:'2026-06-15', finish:'2026-08-01', duration:47,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-187', name:'Fire Sprinkler Trim-Out — All Floors',     trade:'Fire Sprinkler',sub:'FireTech Systems',                  area:'Tower A',        floor:'Level 1', phase:'Finishes',         start:'2026-07-01', finish:'2026-08-01', duration:31,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-188', name:'Fire Alarm Trim-Out & Testing',            trade:'Fire Alarm',   sub:'FireTech Systems',                   area:'Tower A',        floor:'Level 1', phase:'Finishes',         start:'2026-07-15', finish:'2026-08-15', duration:31,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    // ── SWIMMING POOL ──
    { id:'T-190', name:'Swimming Pool — Rough to Gunite',          trade:'General / GC', sub:'Boulder Construction (Self-Perform)', area:'Pool Deck',      floor:'Site',    phase:'Finishes',         start:'2026-04-15', finish:'2026-05-15', duration:30,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    { id:'T-191', name:'Swimming Pool — Finish Out',               trade:'General / GC', sub:'Boulder Construction (Self-Perform)', area:'Pool Deck',      floor:'Site',    phase:'Finishes',         start:'2026-06-15', finish:'2026-07-15', duration:30,  status:'Not Started', pct:0,   priority:'High',     milestone:false },
    // ── FF&E INSTALL ──
    { id:'T-200', name:'FF&E Install — 4th Floor',                 trade:'Specialties',  sub:'Hotel Outfitters Inc',               area:'Tower A',        floor:'Level 4', phase:'Finishes',         start:'2026-07-25', finish:'2026-08-08', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-201', name:'FF&E Install — 3rd Floor',                 trade:'Specialties',  sub:'Hotel Outfitters Inc',               area:'Tower A',        floor:'Level 3', phase:'Finishes',         start:'2026-08-01', finish:'2026-08-15', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-202', name:'FF&E Install — 2nd Floor',                 trade:'Specialties',  sub:'Hotel Outfitters Inc',               area:'Tower A',        floor:'Level 2', phase:'Finishes',         start:'2026-08-08', finish:'2026-08-22', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-203', name:'FF&E Install — 1st Floor & Lobby',         trade:'Specialties',  sub:'Hotel Outfitters Inc',               area:'Tower A',        floor:'Level 1', phase:'Finishes',         start:'2026-08-15', finish:'2026-08-29', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    // ── TURNOVER ──
    { id:'T-210', name:'Elevator Installation & Inspection',       trade:'Elevator',     sub:'ThyssenKrupp Elevator',              area:'Tower A',        floor:'Level 1', phase:'Turnover',         start:'2026-07-01', finish:'2026-08-15', duration:45,  status:'Not Started', pct:0,   priority:'Critical', milestone:false },
    { id:'T-211', name:'Final Paving — Asphalt & Parking Lot',    trade:'Sitework',     sub:'Earthworks Civil',                   area:'Exterior / Site',floor:'Site',    phase:'Turnover',         start:'2026-08-01', finish:'2026-08-15', duration:14,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-212', name:'Landscaping',                              trade:'Landscaping',  sub:'Green Edge Landscape',               area:'Exterior / Site',floor:'Site',    phase:'Turnover',         start:'2026-08-15', finish:'2026-09-01', duration:17,  status:'Not Started', pct:0,   priority:'Normal',   milestone:false },
    { id:'T-213', name:'AHJ Final Inspection',                     trade:'General / GC', sub:'Boulder Construction (Self-Perform)', area:'Tower A',       floor:'Level 1', phase:'Turnover',         start:'2026-09-01', finish:'2026-09-05', duration:4,   status:'Not Started', pct:0,   priority:'Critical', milestone:true  },
    { id:'T-214', name:'Certificate of Occupancy',                 trade:'General / GC', sub:'Boulder Construction (Self-Perform)', area:'Tower A',       floor:'Level 1', phase:'Turnover',         start:'2026-09-08', finish:'2026-09-08', duration:1,   status:'Not Started', pct:0,   priority:'Critical', milestone:true  },
    { id:'T-215', name:'Hotel Grand Opening',                      trade:'General / GC', sub:'Boulder Construction (Self-Perform)', area:'Tower A',       floor:'Level 1', phase:'Turnover',         start:'2026-09-15', finish:'2026-09-15', duration:1,   status:'Not Started', pct:0,   priority:'Critical', milestone:true  },
  ];

  activities.length = 0;
  TPSJ.forEach(a => activities.push({
    ...a,
    blocker:      a.blocker      ?? '',
    successors:   a.successors   ?? [],
    predecessors: a.predecessors ?? [],
    lookahead:    a.lookahead    ?? false,
    notes:        a.notes        ?? '',
    linked:       a.linked       ?? [],
    attachments:  [],
    project_id:   null
  }));
  nextId = 300;
}

// ─── FALLBACK DUMMY DATA ───
// Loaded when DB is empty or unreachable. Dates relative to TODAY.
function loadFallbackActivities() {
  // pb = project base: 95 days before today (matches Hampton Inn Jan 5 → Apr 10 = 95d)
  const pb = d => isoDate(addDays(TODAY, d - 95));
  const FALLBACK = [
    // ── COMPLETED (past) ──
    {id:'ACT-001',name:'Mobilization & Temp Fencing',          trade:'General / GC',   sub:'Boulder Construction',      area:'Exterior / Site', floor:'Site',    phase:'Sitework',   start:pb(0),   finish:pb(6),   duration:7,  status:'Complete',    pct:100, priority:'Normal',   milestone:false, blocker:'', successors:['ACT-002'], predecessors:[]},
    {id:'ACT-002',name:'Erosion Control & Grading',            trade:'Sitework',        sub:'Earthworks Civil',          area:'Exterior / Site', floor:'Site',    phase:'Sitework',   start:pb(5),   finish:pb(18),  duration:14, status:'Complete',    pct:100, priority:'Normal',   milestone:false, blocker:'', successors:['ACT-003'], predecessors:['ACT-001']},
    {id:'ACT-003',name:'Building Pad Prep & Compaction',       trade:'Sitework',        sub:'Earthworks Civil',          area:'Exterior / Site', floor:'Site',    phase:'Sitework',   start:pb(16),  finish:pb(24),  duration:9,  status:'Complete',    pct:100, priority:'High',     milestone:false, blocker:'', successors:['ACT-004'], predecessors:['ACT-002']},
    {id:'ACT-004',name:'Underground Plumbing Rough-In',        trade:'Plumbing',        sub:'Apex Mechanical',           area:'Tower A',         floor:'Level 1', phase:'Foundation', start:pb(22),  finish:pb(38),  duration:17, status:'Complete',    pct:100, priority:'Critical', milestone:false, blocker:'', successors:['ACT-005'], predecessors:['ACT-003']},
    {id:'ACT-005',name:'Foundations — Tower A',                trade:'Concrete',        sub:'Gulf Coast Concrete',       area:'Tower A',         floor:'Level 1', phase:'Foundation', start:pb(35),  finish:pb(52),  duration:18, status:'Complete',    pct:100, priority:'Critical', milestone:true,  blocker:'', successors:['ACT-006'], predecessors:['ACT-004']},
    {id:'ACT-006',name:'Structural Steel — Level 1-3',         trade:'Framing',         sub:'Lone Star Framing',         area:'Tower A',         floor:'Level 1', phase:'Structure',  start:pb(50),  finish:pb(72),  duration:23, status:'Complete',    pct:100, priority:'Critical', milestone:false, blocker:'', successors:['ACT-007','ACT-010'], predecessors:['ACT-005']},
    // ── IN PROGRESS (crossing today) ──
    {id:'ACT-007',name:'Structural Steel — Level 4-5 & Roof',  trade:'Framing',         sub:'Lone Star Framing',         area:'Tower A',         floor:'Level 4', phase:'Structure',  start:pb(70),  finish:pb(87),  duration:18, status:'In Progress', pct:72,  priority:'Critical', milestone:false, blocker:'', successors:['ACT-008'], predecessors:['ACT-006']},
    {id:'ACT-010',name:'Exterior Sheathing — Level 1-3',       trade:'Framing',         sub:'Lone Star Framing',         area:'Tower A',         floor:'Level 1', phase:'Close-In',   start:pb(68),  finish:pb(82),  duration:15, status:'In Progress', pct:85,  priority:'High',     milestone:false, blocker:'', successors:[], predecessors:['ACT-006']},
    {id:'ACT-012',name:'MEP Rough-In — Level 2',               trade:'HVAC',            sub:'Apex Mechanical',           area:'Tower A',         floor:'Level 2', phase:'Rough-In',   start:pb(72),  finish:pb(88),  duration:17, status:'In Progress', pct:65,  priority:'Critical', milestone:false, blocker:'', successors:[], predecessors:['ACT-006']},
    {id:'ACT-013',name:'MEP Rough-In — Level 3',               trade:'HVAC',            sub:'Apex Mechanical',           area:'Tower A',         floor:'Level 3', phase:'Rough-In',   start:pb(80),  finish:pb(98),  duration:19, status:'In Progress', pct:30,  priority:'Critical', milestone:false, blocker:'', successors:[], predecessors:['ACT-006']},
    {id:'ACT-015',name:'Electrical Rough-In — Level 2',        trade:'Electrical',      sub:'Spark Systems Electric',    area:'Tower A',         floor:'Level 2', phase:'Rough-In',   start:pb(74),  finish:pb(89),  duration:16, status:'In Progress', pct:55,  priority:'High',     milestone:false, blocker:'', successors:[], predecessors:[]},
    {id:'ACT-016',name:'Fire Sprinkler Rough-In — Level 2',    trade:'Fire Sprinkler',  sub:'FireTech Systems',          area:'Tower A',         floor:'Level 2', phase:'Rough-In',   start:pb(75),  finish:pb(88),  duration:14, status:'In Progress', pct:50,  priority:'High',     milestone:false, blocker:'', successors:[], predecessors:[]},
    {id:'ACT-026',name:'Lobby Framing & MEP Rough-In',         trade:'General / GC',    sub:'Boulder Construction',      area:'Lobby',           floor:'Level 1', phase:'Rough-In',   start:pb(70),  finish:pb(90),  duration:21, status:'In Progress', pct:45,  priority:'High',     milestone:false, blocker:'', successors:[], predecessors:[]},
    {id:'ACT-039',name:'Low Voltage Rough-In — Level 2',       trade:'Low Voltage',     sub:'Integrated AV Solutions',   area:'Tower A',         floor:'Level 2', phase:'Rough-In',   start:pb(76),  finish:pb(90),  duration:15, status:'Delayed',     pct:25,  priority:'High',     milestone:false, blocker:'Manpower shortage', successors:[], predecessors:[]},
    {id:'ACT-041',name:'Pool Deck Concrete',                   trade:'Concrete',        sub:'Gulf Coast Concrete',       area:'Pool Deck',       floor:'Site',    phase:'Sitework',   start:pb(82),  finish:pb(92),  duration:11, status:'Delayed',     pct:10,  priority:'High',     milestone:false, blocker:'Weather delay', successors:[], predecessors:[]},
    {id:'ACT-043',name:'Amenity Area Framing',                 trade:'Framing',         sub:'Lone Star Framing',         area:'Amenity Area',    floor:'Level 1', phase:'Rough-In',   start:pb(78),  finish:pb(92),  duration:15, status:'In Progress', pct:55,  priority:'Normal',   milestone:false, blocker:'', successors:[], predecessors:[]},
    {id:'ACT-049',name:'Electrical Rough-In — Level 3',        trade:'Electrical',      sub:'Spark Systems Electric',    area:'Tower A',         floor:'Level 3', phase:'Rough-In',   start:pb(84),  finish:pb(99),  duration:16, status:'In Progress', pct:15,  priority:'High',     milestone:false, blocker:'', successors:[], predecessors:[]},
    // ── UPCOMING (future) ──
    {id:'ACT-008',name:'Roof Structure Complete',               trade:'Framing',         sub:'Lone Star Framing',         area:'Tower A',         floor:'Roof',    phase:'Structure',  start:pb(85),  finish:pb(92),  duration:8,  status:'Not Started', pct:0,   priority:'Critical', milestone:true,  blocker:'Predecessor not complete', successors:['ACT-009'], predecessors:['ACT-007']},
    {id:'ACT-009',name:'Roofing — Membrane & Flashing',        trade:'Roofing',         sub:'Pinnacle Roofing',          area:'Tower A',         floor:'Roof',    phase:'Close-In',   start:pb(93),  finish:pb(110), duration:18, status:'Not Started', pct:0,   priority:'High',     milestone:false, blocker:'', successors:[], predecessors:['ACT-008']},
    {id:'ACT-014',name:'MEP Rough-In — Level 4',               trade:'HVAC',            sub:'Apex Mechanical',           area:'Tower A',         floor:'Level 4', phase:'Rough-In',   start:pb(90),  finish:pb(108), duration:19, status:'Not Started', pct:0,   priority:'Critical', milestone:false, blocker:'Predecessor not complete', successors:[], predecessors:['ACT-007']},
    {id:'ACT-017',name:'Plumbing Rough-In — Level 3',          trade:'Plumbing',        sub:'Apex Mechanical',           area:'Tower A',         floor:'Level 3', phase:'Rough-In',   start:pb(82),  finish:pb(97),  duration:16, status:'In Progress', pct:20,  priority:'High',     milestone:false, blocker:'', successors:[], predecessors:[]},
    {id:'ACT-018',name:'Framing Inspection — Level 2',         trade:'General / GC',    sub:'Boulder Construction',      area:'Tower A',         floor:'Level 2', phase:'Rough-In',   start:pb(88),  finish:pb(90),  duration:3,  status:'Not Started', pct:0,   priority:'Critical', milestone:true,  blocker:'', successors:['ACT-019'], predecessors:[]},
    {id:'ACT-019',name:'Insulation — Level 2',                 trade:'Insulation',      sub:'ThermalPro Insulation',     area:'Tower A',         floor:'Level 2', phase:'Close-In',   start:pb(91),  finish:pb(97),  duration:7,  status:'Not Started', pct:0,   priority:'High',     milestone:false, blocker:'Inspection required', successors:['ACT-020'], predecessors:['ACT-018']},
    {id:'ACT-020',name:'Drywall Hang — Level 2',               trade:'Drywall',         sub:'ProFinish Interiors',       area:'Tower A',         floor:'Level 2', phase:'Finishes',   start:pb(98),  finish:pb(112), duration:15, status:'Not Started', pct:0,   priority:'High',     milestone:false, blocker:'', successors:['ACT-022'], predecessors:['ACT-019']},
    {id:'ACT-021',name:'Drywall Hang — Level 3',               trade:'Drywall',         sub:'ProFinish Interiors',       area:'Tower A',         floor:'Level 3', phase:'Finishes',   start:pb(105), finish:pb(120), duration:16, status:'Not Started', pct:0,   priority:'High',     milestone:false, blocker:'', successors:[], predecessors:[]},
    {id:'ACT-022',name:'Prime & Paint — Level 2',              trade:'Paint',           sub:'ProFinish Interiors',       area:'Tower A',         floor:'Level 2', phase:'Finishes',   start:pb(113), finish:pb(123), duration:11, status:'Not Started', pct:0,   priority:'Normal',   milestone:false, blocker:'', successors:['ACT-024'], predecessors:['ACT-020']},
    {id:'ACT-023',name:'Flooring — Level 2 Guestrooms',        trade:'Flooring',        sub:'Southwest Flooring Co',     area:'Tower A',         floor:'Level 2', phase:'Finishes',   start:pb(120), finish:pb(132), duration:13, status:'Not Started', pct:0,   priority:'Normal',   milestone:false, blocker:'', successors:[], predecessors:['ACT-022']},
    {id:'ACT-042',name:'Doors/Frames/Hardware — Level 2',      trade:'Doors/Frames/HW', sub:'National Door Supply',      area:'Tower A',         floor:'Level 2', phase:'Finishes',   start:pb(88),  finish:pb(98),  duration:11, status:'Blocked',     pct:0,   priority:'High',     milestone:false, blocker:'Material not on site', successors:[], predecessors:[]},
    {id:'ACT-044',name:'Breakfast Area Finishes',              trade:'General / GC',    sub:'Boulder Construction',      area:'Breakfast Area',  floor:'Level 1', phase:'Finishes',   start:pb(130), finish:pb(145), duration:16, status:'Not Started', pct:0,   priority:'Normal',   milestone:false, blocker:'', successors:[], predecessors:[]},
    {id:'ACT-036',name:'AHJ Final Inspection',                 trade:'General / GC',    sub:'Boulder Construction',      area:'Tower A',         floor:'Level 1', phase:'Turnover',   start:pb(168), finish:pb(170), duration:3,  status:'Not Started', pct:0,   priority:'Critical', milestone:true,  blocker:'', successors:['ACT-037'], predecessors:[]},
    {id:'ACT-037',name:'Certificate of Occupancy',             trade:'General / GC',    sub:'Boulder Construction',      area:'Tower A',         floor:'Level 1', phase:'Turnover',   start:pb(171), finish:pb(171), duration:1,  status:'Not Started', pct:0,   priority:'Critical', milestone:true,  blocker:'', successors:[], predecessors:['ACT-036']},
  ];

  activities.length = 0;
  FALLBACK.forEach(a => activities.push({
    ...a,
    lookahead:    a.lookahead   ?? false,
    notes:        a.notes       ?? '',
    linked:       a.linked      ?? [],
    attachments:  [],
    project_id:   null
  }));
  nextId = 200;
}
