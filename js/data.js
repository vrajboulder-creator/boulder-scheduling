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
