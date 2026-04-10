export const TRADES = [
  'General / GC', 'Concrete', 'Framing', 'Drywall', 'Paint', 'HVAC', 'Plumbing',
  'Electrical', 'Low Voltage', 'Fire Alarm', 'Flooring', 'Sitework', 'Roofing',
  'Glazing', 'Doors/Frames/HW', 'Specialties', 'Casework', 'Elevator', 'Landscaping',
  'Fire Sprinkler', 'Insulation',
] as const;

export const SUBS: Record<string, string> = {
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
  'Insulation': 'ThermalPro Insulation',
};

export const PROJECTS_CONFIG: Record<string, { name: string; lat: number; lon: number }> = {
  'tpsj': { name: 'TownePlace Suites – TPSJ', lat: 30.08, lon: -94.10 },
  'hampton-inn': { name: 'Hampton Inn – Beaumont, TX', lat: 30.08, lon: -94.10 },
  'fairfield-inn': { name: 'Fairfield Inn – Midland, TX', lat: 31.99, lon: -102.08 },
  'holiday-inn': { name: 'Holiday Inn Express – Tyler, TX', lat: 32.35, lon: -95.30 },
};
