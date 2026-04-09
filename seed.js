/**
 * Seed script — inserts all 50 sample activities + linked items + activity links
 * into Supabase. Run once: node seed.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Hampton Inn project ID (from Supabase)
const PROJECT_ID = '8a92ab0b-57f4-4ff4-9201-bac0ee7079a5';

// ─── DATE HELPERS ───
const DAY_MS = 86400000;
const PB = new Date(2026, 0, 5); // Project base date: Jan 5, 2026
const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY_MS);
const pd = n => addDays(PB, n);
const iso = d => new Date(d).toISOString().slice(0, 10);

// ─── ALL 50 ACTIVITIES ───
const raw = [
  {id:'ACT-001',name:'Mobilization & Temporary Fencing',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Exterior / Site',floor:'Site',phase:'Sitework',start:pd(0),finish:pd(6),duration:7,status:'Complete',pct:100,priority:'Normal',blocker:'',milestone:false,lookahead:false,predecessors:[],successors:['ACT-002'],notes:'Completed on schedule. SWPPP installed.',linked:[{type:'Permit',ref:'SWPPP-001'}]},
  {id:'ACT-002',name:'Erosion Control & Grading',trade:'Sitework',sub:'Earthworks Civil',area:'Exterior / Site',floor:'Site',phase:'Sitework',start:pd(5),finish:pd(18),duration:14,status:'Complete',pct:100,priority:'Normal',blocker:'',milestone:false,lookahead:false,predecessors:['ACT-001'],successors:['ACT-003'],notes:'Finished. Pad ready.',linked:[]},
  {id:'ACT-003',name:'Building Pad Prep & Compaction',trade:'Sitework',sub:'Earthworks Civil',area:'Exterior / Site',floor:'Site',phase:'Sitework',start:pd(16),finish:pd(24),duration:9,status:'Complete',pct:100,priority:'High',blocker:'',milestone:false,lookahead:false,predecessors:['ACT-002'],successors:['ACT-004'],notes:'Compaction testing passed.',linked:[{type:'Inspection',ref:'Geotech compaction test'}]},
  {id:'ACT-004',name:'Underground Plumbing Rough-In',trade:'Plumbing',sub:'Apex Mechanical',area:'Tower A',floor:'Level 1',phase:'Foundation',start:pd(22),finish:pd(38),duration:17,status:'Complete',pct:100,priority:'Critical',blocker:'',milestone:false,lookahead:false,predecessors:['ACT-003'],successors:['ACT-005'],notes:'Inspection complete.',linked:[{type:'Inspection',ref:'Underground plumbing inspection'}]},
  {id:'ACT-005',name:'Foundations — Tower A',trade:'Concrete',sub:'Gulf Coast Concrete',area:'Tower A',floor:'Level 1',phase:'Foundation',start:pd(35),finish:pd(52),duration:18,status:'Complete',pct:100,priority:'Critical',blocker:'',milestone:true,lookahead:false,predecessors:['ACT-004'],successors:['ACT-006'],notes:'Foundation complete. Milestone achieved.',linked:[{type:'Inspection',ref:'Foundation inspection'},{type:'RFI',ref:'RFI-012 — Footing depth revision'}]},
  {id:'ACT-006',name:'Structural Steel Erection — Level 1-3',trade:'Framing',sub:'Lone Star Framing',area:'Tower A',floor:'Level 1',phase:'Structure',start:pd(50),finish:pd(72),duration:23,status:'Complete',pct:100,priority:'Critical',blocker:'',milestone:false,lookahead:false,predecessors:['ACT-005'],successors:['ACT-007','ACT-010'],notes:'Steel topped out L3.',linked:[{type:'Submittal',ref:'SUB-05 12 00-001 Structural steel shop dwgs'}]},
  {id:'ACT-007',name:'Structural Steel Erection — Level 4-5 & Roof',trade:'Framing',sub:'Lone Star Framing',area:'Tower A',floor:'Level 4',phase:'Structure',start:pd(70),finish:pd(87),duration:18,status:'In Progress',pct:72,priority:'Critical',blocker:'',milestone:false,lookahead:true,predecessors:['ACT-006'],successors:['ACT-008','ACT-014'],notes:'Level 5 steel in progress. Roof deck ETA next week.',linked:[{type:'Procurement',ref:'Long Lead: Roof deck panels — on site'}]},
  {id:'ACT-008',name:'Roof Structure Complete',trade:'Framing',sub:'Lone Star Framing',area:'Tower A',floor:'Roof',phase:'Structure',start:pd(85),finish:pd(92),duration:8,status:'Not Started',pct:0,priority:'Critical',blocker:'Predecessor not complete',milestone:true,lookahead:true,predecessors:['ACT-007'],successors:['ACT-009'],notes:'Milestone — triggers roofing mobilization.',linked:[]},
  {id:'ACT-009',name:'Roofing — TPO Membrane Install',trade:'Roofing',sub:'Pinnacle Roofing',area:'Tower A',floor:'Roof',phase:'Close-In',start:pd(93),finish:pd(108),duration:16,status:'Not Started',pct:0,priority:'High',blocker:'Predecessor not complete',milestone:false,lookahead:true,predecessors:['ACT-008'],successors:[],notes:'Material staged in yard. Ready to mobilize once roof deck done.',linked:[{type:'Submittal',ref:'SUB-07 52 00-003 Roofing membrane'},{type:'Procurement',ref:'TPO membrane — on site'}]},
  {id:'ACT-010',name:'Exterior Sheathing — Level 1-3',trade:'Framing',sub:'Lone Star Framing',area:'Tower A',floor:'Level 1',phase:'Close-In',start:pd(68),finish:pd(82),duration:15,status:'In Progress',pct:85,priority:'High',blocker:'',milestone:false,lookahead:true,predecessors:['ACT-006'],successors:['ACT-011'],notes:'Level 3 sheathing wrapping up.',linked:[]},
  {id:'ACT-011',name:'Window Install — Tower A East',trade:'Glazing',sub:'Clear View Glass',area:'Tower A',floor:'Level 1',phase:'Close-In',start:pd(78),finish:pd(96),duration:19,status:'In Progress',pct:40,priority:'High',blocker:'',milestone:false,lookahead:true,predecessors:['ACT-010'],successors:[],notes:'Level 1 & 2 windows installed. Level 3 starting this week.',linked:[{type:'Procurement',ref:'Storefront glazing package — on site'},{type:'Submittal',ref:'SUB-08 44 13-001 Storefront system'}]},
  {id:'ACT-012',name:'MEP Rough-In — Level 2 Guestrooms',trade:'HVAC',sub:'Apex Mechanical',area:'Tower A',floor:'Level 2',phase:'Rough-In',start:pd(72),finish:pd(88),duration:17,status:'In Progress',pct:65,priority:'Critical',blocker:'',milestone:false,lookahead:true,predecessors:['ACT-006'],successors:['ACT-020'],notes:'HVAC & plumbing rough progressing. Electrical following 2 rooms behind.',linked:[{type:'RFI',ref:'RFI-087 — PTAC sleeve location clarification'}]},
  {id:'ACT-013',name:'MEP Rough-In — Level 3 Guestrooms',trade:'HVAC',sub:'Apex Mechanical',area:'Tower A',floor:'Level 3',phase:'Rough-In',start:pd(80),finish:pd(98),duration:19,status:'In Progress',pct:30,priority:'Critical',blocker:'',milestone:false,lookahead:true,predecessors:['ACT-006'],successors:['ACT-021'],notes:'Started L3 wing A. Coordinating with electrical.',linked:[]},
  {id:'ACT-014',name:'MEP Rough-In — Level 4 Guestrooms',trade:'HVAC',sub:'Apex Mechanical',area:'Tower A',floor:'Level 4',phase:'Rough-In',start:pd(90),finish:pd(108),duration:19,status:'Not Started',pct:0,priority:'Critical',blocker:'Predecessor not complete',milestone:false,lookahead:true,predecessors:['ACT-007'],successors:[],notes:'Waiting on L4-5 steel completion.',linked:[]},
  {id:'ACT-015',name:'Electrical Rough-In — Level 2 Guestrooms',trade:'Electrical',sub:'Spark Systems Electric',area:'Tower A',floor:'Level 2',phase:'Rough-In',start:pd(74),finish:pd(89),duration:16,status:'In Progress',pct:55,priority:'High',blocker:'',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'Following HVAC by 2 rooms.',linked:[]},
  {id:'ACT-016',name:'Fire Sprinkler Rough-In — Level 2',trade:'Fire Sprinkler',sub:'FireTech Systems',area:'Tower A',floor:'Level 2',phase:'Rough-In',start:pd(75),finish:pd(88),duration:14,status:'In Progress',pct:50,priority:'High',blocker:'',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'On schedule.',linked:[]},
  {id:'ACT-017',name:'Plumbing Rough-In — Level 3 Guestrooms',trade:'Plumbing',sub:'Apex Mechanical',area:'Tower A',floor:'Level 3',phase:'Rough-In',start:pd(82),finish:pd(97),duration:16,status:'In Progress',pct:20,priority:'High',blocker:'',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'Risers in place. Horizontal runs starting.',linked:[]},
  {id:'ACT-018',name:'Level 2 Framing Inspection',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Tower A',floor:'Level 2',phase:'Rough-In',start:pd(89),finish:pd(90),duration:2,status:'Not Started',pct:0,priority:'Critical',blocker:'Inspection required',milestone:true,lookahead:true,predecessors:['ACT-012','ACT-015','ACT-016'],successors:['ACT-019'],notes:'Must pass before insulation. Schedule with AHJ next week.',linked:[{type:'Inspection',ref:'Level 2 framing inspection — AHJ'}]},
  {id:'ACT-019',name:'Insulation — Level 2 Guestrooms',trade:'Insulation',sub:'ThermalPro Insulation',area:'Tower A',floor:'Level 2',phase:'Close-In',start:pd(91),finish:pd(97),duration:7,status:'Not Started',pct:0,priority:'High',blocker:'Inspection required',milestone:false,lookahead:true,predecessors:['ACT-018'],successors:['ACT-020'],notes:'Waiting on framing inspection pass.',linked:[]},
  {id:'ACT-020',name:'Drywall Hang — Level 2 Guestrooms',trade:'Drywall',sub:'ProFinish Interiors',area:'Tower A',floor:'Level 2',phase:'Finishes',start:pd(98),finish:pd(112),duration:15,status:'Not Started',pct:0,priority:'High',blocker:'Predecessor not complete',milestone:false,lookahead:true,predecessors:['ACT-019'],successors:['ACT-022'],notes:'',linked:[]},
  {id:'ACT-021',name:'Drywall Hang — Level 3 Guestrooms',trade:'Drywall',sub:'ProFinish Interiors',area:'Tower A',floor:'Level 3',phase:'Finishes',start:pd(105),finish:pd(120),duration:16,status:'Not Started',pct:0,priority:'High',blocker:'Predecessor not complete',milestone:false,lookahead:true,predecessors:['ACT-013'],successors:[],notes:'',linked:[]},
  {id:'ACT-022',name:'Prime & Paint — Level 2 Guestrooms',trade:'Paint',sub:'ProFinish Interiors',area:'Tower A',floor:'Level 2',phase:'Finishes',start:pd(113),finish:pd(123),duration:11,status:'Not Started',pct:0,priority:'Normal',blocker:'',milestone:false,lookahead:false,predecessors:['ACT-020'],successors:['ACT-024'],notes:'Hilton brand spec: Cloud White SW 7620.',linked:[{type:'Submittal',ref:'SUB-09 91 00-002 Paint color schedule'}]},
  {id:'ACT-023',name:'Flooring — Level 2 Guestrooms',trade:'Flooring',sub:'Southwest Flooring Co',area:'Tower A',floor:'Level 2',phase:'Finishes',start:pd(120),finish:pd(132),duration:13,status:'Not Started',pct:0,priority:'Normal',blocker:'',milestone:false,lookahead:false,predecessors:['ACT-022'],successors:['ACT-025'],notes:'LVP in guestrooms, carpet in corridors.',linked:[{type:'Procurement',ref:'Long Lead: Guestroom LVP — on order, ETA wk 16'}]},
  {id:'ACT-024',name:'Casework & Vanities — Level 2',trade:'Casework',sub:'Precision Millwork',area:'Tower A',floor:'Level 2',phase:'Finishes',start:pd(124),finish:pd(134),duration:11,status:'Not Started',pct:0,priority:'Normal',blocker:'Material not on site',milestone:false,lookahead:false,predecessors:['ACT-022'],successors:[],notes:'Vanities on order. Delivery confirmed wk 17.',linked:[{type:'Procurement',ref:'Long Lead: Guestroom vanities — ETA wk 17'},{type:'Submittal',ref:'SUB-06 41 00-004 Vanity shop dwgs'}]},
  {id:'ACT-025',name:'PTAC Unit Install — Level 2',trade:'HVAC',sub:'Apex Mechanical',area:'Tower A',floor:'Level 2',phase:'Finishes',start:pd(130),finish:pd(138),duration:9,status:'Not Started',pct:0,priority:'High',blocker:'Material not on site',milestone:false,lookahead:false,predecessors:['ACT-023'],successors:[],notes:'',linked:[{type:'Procurement',ref:'Long Lead: Guestroom PTAC units — ETA wk 18'},{type:'Submittal',ref:'SUB-23 82 00-001 PTAC units'}]},
  {id:'ACT-026',name:'Lobby Framing & MEP Rough-In',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Lobby / Front Desk',floor:'Level 1',phase:'Rough-In',start:pd(70),finish:pd(90),duration:21,status:'In Progress',pct:45,priority:'High',blocker:'',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'Front desk area framing complete. Breakfast area rough starting.',linked:[{type:'RFI',ref:'RFI-143 — Lobby ceiling height clarification'}]},
  {id:'ACT-027',name:'Back of House Buildout',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Back of House',floor:'Level 1',phase:'Rough-In',start:pd(72),finish:pd(95),duration:24,status:'In Progress',pct:35,priority:'Normal',blocker:'',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'Laundry, housekeeping, engineering rooms.',linked:[]},
  {id:'ACT-028',name:'Elevator Shaft & Rail Install',trade:'Elevator',sub:'ThyssenKrupp Elevator',area:'Tower A',floor:'Level 1',phase:'Structure',start:pd(60),finish:pd(95),duration:36,status:'In Progress',pct:60,priority:'Critical',blocker:'',milestone:false,lookahead:true,predecessors:[],successors:['ACT-029'],notes:'Rails installed through L3. Waiting on L4-5 steel for continued work.',linked:[{type:'Procurement',ref:'Elevator cab — 16 week lead, ordered'},{type:'Submittal',ref:'SUB-14 21 00-001 Elevator shop dwgs'}]},
  {id:'ACT-029',name:'Elevator Inspection — State',trade:'Elevator',sub:'ThyssenKrupp Elevator',area:'Tower A',floor:'Level 1',phase:'Punch / Closeout',start:pd(155),finish:pd(157),duration:3,status:'Not Started',pct:0,priority:'Critical',blocker:'',milestone:true,lookahead:false,predecessors:['ACT-028'],successors:[],notes:'State elevator inspection required before CO.',linked:[{type:'Inspection',ref:'State elevator inspection'}]},
  {id:'ACT-030',name:'Fire Alarm Trim-Out — All Floors',trade:'Fire Alarm',sub:'FireTech Systems',area:'Tower A',floor:'Level 1',phase:'Finishes',start:pd(130),finish:pd(148),duration:19,status:'Not Started',pct:0,priority:'High',blocker:'',milestone:false,lookahead:false,predecessors:[],successors:['ACT-031'],notes:'Starts after drywall complete on each floor.',linked:[]},
  {id:'ACT-031',name:'Fire Alarm Acceptance Test',trade:'Fire Alarm',sub:'FireTech Systems',area:'Tower A',floor:'Level 1',phase:'Punch / Closeout',start:pd(150),finish:pd(152),duration:3,status:'Not Started',pct:0,priority:'Critical',blocker:'',milestone:true,lookahead:false,predecessors:['ACT-030'],successors:[],notes:'Required for CO.',linked:[{type:'Inspection',ref:'Fire alarm acceptance test — AHJ'}]},
  {id:'ACT-032',name:'Punch Walkthrough — Level 2 Guestrooms',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Tower A',floor:'Level 2',phase:'Punch / Closeout',start:pd(140),finish:pd(144),duration:5,status:'Not Started',pct:0,priority:'High',blocker:'',milestone:false,lookahead:false,predecessors:[],successors:['ACT-033'],notes:'Internal QC before owner walk.',linked:[]},
  {id:'ACT-033',name:'Punch Corrections — Level 2 Wing A',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Tower A',floor:'Level 2',phase:'Punch / Closeout',start:pd(145),finish:pd(152),duration:8,status:'Not Started',pct:0,priority:'High',blocker:'',milestone:false,lookahead:false,predecessors:['ACT-032'],successors:[],notes:'',linked:[{type:'Punch',ref:'Punch list — L2 Wing A'}]},
  {id:'ACT-034',name:'Final Clean — Level 2',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Tower A',floor:'Level 2',phase:'Punch / Closeout',start:pd(153),finish:pd(155),duration:3,status:'Not Started',pct:0,priority:'Normal',blocker:'',milestone:false,lookahead:false,predecessors:['ACT-033'],successors:[],notes:'',linked:[]},
  {id:'ACT-035',name:'Final Clean — Level 5',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Tower A',floor:'Level 5',phase:'Punch / Closeout',start:pd(165),finish:pd(167),duration:3,status:'Not Started',pct:0,priority:'Normal',blocker:'',milestone:false,lookahead:false,predecessors:[],successors:[],notes:'',linked:[]},
  {id:'ACT-036',name:'AHJ Final Inspection',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Tower A',floor:'Level 1',phase:'Turnover',start:pd(168),finish:pd(170),duration:3,status:'Not Started',pct:0,priority:'Critical',blocker:'',milestone:true,lookahead:false,predecessors:['ACT-029','ACT-031'],successors:['ACT-037'],notes:'All systems must pass before CO.',linked:[{type:'Inspection',ref:'AHJ final building inspection'}]},
  {id:'ACT-037',name:'Certificate of Occupancy',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Tower A',floor:'Level 1',phase:'Turnover',start:pd(171),finish:pd(171),duration:1,status:'Not Started',pct:0,priority:'Critical',blocker:'',milestone:true,lookahead:false,predecessors:['ACT-036'],successors:['ACT-038'],notes:'Target: July 24, 2026.',linked:[{type:'Permit',ref:'Certificate of Occupancy'}]},
  {id:'ACT-038',name:'Owner Training & Turnover',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Tower A',floor:'Level 1',phase:'Turnover',start:pd(172),finish:pd(176),duration:5,status:'Not Started',pct:0,priority:'Critical',blocker:'',milestone:true,lookahead:false,predecessors:['ACT-037'],successors:[],notes:'Hilton management team on-site training. O&M manuals delivered.',linked:[]},
  {id:'ACT-039',name:'Low Voltage Rough-In — Level 2',trade:'Low Voltage',sub:'Integrated AV Solutions',area:'Tower A',floor:'Level 2',phase:'Rough-In',start:pd(76),finish:pd(90),duration:15,status:'Delayed',pct:25,priority:'High',blocker:'Manpower shortage',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'Sub short 2 techs. Promised additional crew Monday.',linked:[]},
  {id:'ACT-040',name:'Exterior Signage & Pylon',trade:'Specialties',sub:'Hotel Outfitters Inc',area:'Exterior / Site',floor:'Site',phase:'Finishes',start:pd(80),finish:pd(92),duration:13,status:'Blocked',pct:0,priority:'Normal',blocker:'Submittal pending',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'Hilton brand review taking longer than expected. Resubmitted 3/20.',linked:[{type:'Submittal',ref:'SUB-10 14 00-003 Exterior signage'},{type:'RFI',ref:'RFI-156 — Pylon sign height variance'}]},
  {id:'ACT-041',name:'Pool Deck Concrete',trade:'Concrete',sub:'Gulf Coast Concrete',area:'Pool Deck',floor:'Site',phase:'Sitework',start:pd(82),finish:pd(92),duration:11,status:'Delayed',pct:10,priority:'High',blocker:'Weather delay',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'3 rain days last week. Rescheduled pour for 4/6.',linked:[]},
  {id:'ACT-042',name:'Doors/Frames/Hardware — Level 2',trade:'Doors/Frames/HW',sub:'National Door Supply',area:'Tower A',floor:'Level 2',phase:'Finishes',start:pd(88),finish:pd(98),duration:11,status:'Blocked',pct:0,priority:'High',blocker:'Material not on site',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'Guestroom door hardware on backorder. New ETA 4/14.',linked:[{type:'Procurement',ref:'Long Lead: Guestroom door hardware — backordered'},{type:'CO',ref:'CO-019 — Hardware spec revision'}]},
  {id:'ACT-043',name:'Amenity Area Framing',trade:'Framing',sub:'Lone Star Framing',area:'Amenity Area',floor:'Level 1',phase:'Rough-In',start:pd(78),finish:pd(92),duration:15,status:'In Progress',pct:55,priority:'Normal',blocker:'',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'Fitness room & business center. On track.',linked:[{type:'RFI',ref:'RFI-129 — Business center data outlet count'}]},
  {id:'ACT-044',name:'Breakfast Area Finishes',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Breakfast Area',floor:'Level 1',phase:'Finishes',start:pd(130),finish:pd(145),duration:16,status:'Not Started',pct:0,priority:'Normal',blocker:'',milestone:false,lookahead:false,predecessors:[],successors:[],notes:'Hilton breakfast package FFE to be coordinated.',linked:[]},
  {id:'ACT-045',name:'Landscaping & Site Hardscape',trade:'Landscaping',sub:'Green Edge Landscape',area:'Exterior / Site',floor:'Site',phase:'Finishes',start:pd(155),finish:pd(168),duration:14,status:'Not Started',pct:0,priority:'Normal',blocker:'',milestone:false,lookahead:false,predecessors:[],successors:[],notes:'Irrigation design complete. Plant material on order.',linked:[{type:'Submittal',ref:'SUB-32 90 00-001 Landscape plan'}]},
  {id:'ACT-046',name:'Parking Lot Striping & Signage',trade:'Sitework',sub:'Earthworks Civil',area:'Parking',floor:'Site',phase:'Finishes',start:pd(160),finish:pd(166),duration:7,status:'Not Started',pct:0,priority:'Normal',blocker:'',milestone:false,lookahead:false,predecessors:[],successors:[],notes:'ADA signage included.',linked:[]},
  {id:'ACT-047',name:'Level 3 Framing Inspection',trade:'General / GC',sub:'Boulder Construction (Self-Perform)',area:'Tower A',floor:'Level 3',phase:'Rough-In',start:pd(99),finish:pd(100),duration:2,status:'Not Started',pct:0,priority:'Critical',blocker:'',milestone:true,lookahead:true,predecessors:['ACT-013','ACT-017'],successors:[],notes:'Schedule with AHJ.',linked:[{type:'Inspection',ref:'Level 3 framing inspection — AHJ'}]},
  {id:'ACT-048',name:'MEP Rough-In — Level 5 Guestrooms',trade:'HVAC',sub:'Apex Mechanical',area:'Tower A',floor:'Level 5',phase:'Rough-In',start:pd(100),finish:pd(118),duration:19,status:'Not Started',pct:0,priority:'Critical',blocker:'Predecessor not complete',milestone:false,lookahead:true,predecessors:['ACT-007'],successors:[],notes:'Pending L5 steel.',linked:[]},
  {id:'ACT-049',name:'Electrical Rough-In — Level 3',trade:'Electrical',sub:'Spark Systems Electric',area:'Tower A',floor:'Level 3',phase:'Rough-In',start:pd(84),finish:pd(99),duration:16,status:'In Progress',pct:15,priority:'High',blocker:'',milestone:false,lookahead:true,predecessors:[],successors:[],notes:'Following HVAC.',linked:[]},
  {id:'ACT-050',name:'Corridor Finishes — Level 2',trade:'Paint',sub:'ProFinish Interiors',area:'Tower A',floor:'Level 2',phase:'Finishes',start:pd(125),finish:pd(135),duration:11,status:'Not Started',pct:0,priority:'Normal',blocker:'',milestone:false,lookahead:false,predecessors:['ACT-020'],successors:[],notes:'Paint, base, corridor carpet.',linked:[]},
];

async function seed() {
  console.log('Seeding 50 activities into Supabase...\n');

  // 1. Insert activities (map field names to DB columns)
  const dbActivities = raw.map(a => ({
    id: a.id,
    project_id: PROJECT_ID,
    name: a.name,
    trade: a.trade,
    sub: a.sub,
    area: a.area,
    floor: a.floor,
    phase: a.phase,
    start_date: iso(a.start),
    finish_date: iso(a.finish),
    duration: a.duration,
    status: a.status,
    pct: a.pct,
    priority: a.priority,
    blocker: a.blocker || '',
    milestone: a.milestone,
    lookahead: a.lookahead,
    notes: a.notes || ''
  }));

  const { data: actData, error: actErr } = await supabase
    .from('activities')
    .upsert(dbActivities, { onConflict: 'id' })
    .select();

  if (actErr) { console.error('Activities insert error:', actErr.message); return; }
  console.log(`  ✓ ${actData.length} activities inserted`);

  // 2. Insert activity_links (predecessor → successor)
  const links = [];
  raw.forEach(a => {
    if (a.successors) {
      a.successors.forEach(sId => {
        links.push({ predecessor_id: a.id, successor_id: sId, link_type: 'FS', lag_days: 0 });
      });
    }
  });

  if (links.length) {
    const { data: linkData, error: linkErr } = await supabase
      .from('activity_links')
      .upsert(links, { onConflict: 'predecessor_id,successor_id', ignoreDuplicates: true })
      .select();

    if (linkErr) console.error('Links insert error:', linkErr.message);
    else console.log(`  ✓ ${linkData.length} dependency links inserted`);
  }

  // 3. Insert linked_items (RFIs, submittals, inspections, etc.)
  const linkedItems = [];
  raw.forEach(a => {
    if (a.linked) {
      a.linked.forEach(l => {
        linkedItems.push({
          activity_id: a.id,
          item_type: l.type,
          reference: l.ref,
          status: 'Open'
        });
      });
    }
  });

  if (linkedItems.length) {
    const { data: liData, error: liErr } = await supabase
      .from('linked_items')
      .insert(linkedItems)
      .select();

    if (liErr) console.error('Linked items insert error:', liErr.message);
    else console.log(`  ✓ ${liData.length} linked items inserted (RFIs, submittals, inspections, procurement)`);
  }

  // Done
  console.log('\n  ✅ Seed complete! All data in Supabase.');

  // Verify
  const { count } = await supabase.from('activities').select('*', { count: 'exact', head: true });
  console.log(`  📊 Total activities in DB: ${count}`);
}

seed().catch(err => console.error('Seed failed:', err.message));
