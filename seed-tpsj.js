/**
 * Seed TPSJ project data from CSV into Supabase.
 * Replaces old Hampton Inn data.
 * Run: node seed-tpsj.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CSV_PATH = path.join('c:/Users/Offic/Downloads', 'Sub-Task (Join Table)-Grid view.csv');

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Map CSV phase (parent schedule) to trade
function mapTrade(schedule) {
  if (!schedule) return 'General / GC';
  const s = schedule.toLowerCase();
  if (s.includes('plumbing')) return 'Plumbing';
  if (s.includes('electrical')) return 'Electrical';
  if (s.includes('mechanical')) return 'HVAC';
  if (s.includes('framing')) return 'Framing';
  if (s.includes('concrete')) return 'Concrete';
  if (s.includes('earthwork')) return 'Sitework';
  if (s.includes('fire sprinkler')) return 'Fire Sprinkler';
  if (s.includes('fire alarm')) return 'Fire Alarm';
  if (s.includes('structural steel')) return 'Framing';
  if (s.includes('roofing') || s.includes('roof - tpo')) return 'Roofing';
  if (s.includes('insul')) return 'Insulation';
  if (s.includes('drywall')) return 'Drywall';
  if (s.includes('tile') || s.includes('flooring')) return 'Flooring';
  if (s.includes('paint')) return 'Paint';
  if (s.includes('cmu')) return 'Concrete';
  if (s.includes('millwork') || s.includes('vanity') || s.includes('cabinet')) return 'Casework';
  if (s.includes('wallpaper')) return 'Paint';
  if (s.includes('door')) return 'Doors/Frames/HW';
  if (s.includes('elevator')) return 'Elevator';
  if (s.includes('landscap')) return 'Landscaping';
  if (s.includes('swimming') || s.includes('pool')) return 'Specialties';
  if (s.includes('structured cabling') || s.includes('low voltage')) return 'Low Voltage';
  if (s.includes('gas')) return 'Plumbing';
  if (s.includes('window') || s.includes('storefront') || s.includes('glazing')) return 'Glazing';
  if (s.includes('exterior finish')) return 'Specialties';
  if (s.includes('ffe') || s.includes('signage')) return 'Specialties';
  if (s.includes('utility')) return 'Sitework';
  return 'General / GC';
}

function mapPhase(schedule) {
  if (!schedule) return '';
  const s = schedule.toLowerCase();
  if (s.includes('pre-construction') || s.includes('pre-mobilization') || s.includes('precon')) return 'Sitework';
  if (s.includes('bid') || s.includes('owner request')) return 'Sitework';
  if (s.includes('notice to proceed')) return 'Sitework';
  if (s.includes('mobilization')) return 'Sitework';
  if (s.includes('earthwork') || s.includes('site prep')) return 'Sitework';
  if (s.includes('foundation') || s.includes('footing') || s.includes('building pad')) return 'Foundation';
  if (s.includes('structural') || s.includes('cmu') || s.includes('steel')) return 'Structure';
  if (s.includes('rough') || s.includes('underground')) return 'Rough-In';
  if (s.includes('roof') || s.includes('close-in') || s.includes('sheathing')) return 'Close-In';
  if (s.includes('insul') || s.includes('prerock')) return 'Close-In';
  if (s.includes('drywall') || s.includes('paint') || s.includes('tile') || s.includes('flooring') || s.includes('wallpaper')) return 'Finishes';
  if (s.includes('trim') || s.includes('finish') || s.includes('install') || s.includes('ffe')) return 'Finishes';
  if (s.includes('punch') || s.includes('closeout') || s.includes('final')) return 'Punch / Closeout';
  if (s.includes('turnover') || s.includes('certificate')) return 'Turnover';
  return 'Rough-In';
}

function mapStatus(status, pct) {
  if (!status && !pct) return 'Not Started';
  if (status === 'Completed' || pct === '100%') return 'Complete';
  if (status === 'In Progress' || status === 'Finalize') return 'In Progress';
  if (pct && pct !== '0%' && pct !== '') return 'In Progress';
  return 'Not Started';
}

function parsePct(pct) {
  if (!pct) return 0;
  return parseInt(pct.replace('%', '')) || 0;
}

function parseDate(d) {
  if (!d) return null;
  // Format: M/D/YYYY
  const parts = d.split('/');
  if (parts.length === 3) {
    const m = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    const y = parseInt(parts[2]);
    if (y && m && day) return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  return null;
}

async function seed() {
  console.log('Reading CSV...');
  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(text);
  console.log(`Parsed ${rows.length} rows`);

  // 1. Create TPSJ project (or get existing)
  console.log('\nCreating TPSJ project...');
  const { data: existingProj } = await supabase.from('projects').select('*').eq('code', 'tpsj').single();
  let projectId;
  if (existingProj) {
    projectId = existingProj.id;
    console.log(`  Project exists: ${projectId}`);
  } else {
    const { data: newProj, error } = await supabase.from('projects').insert({
      name: 'TownePlace Suites — TPSJ',
      code: 'tpsj',
      location: 'Texas',
      weather_info: '',
      status: 'Active'
    }).select().single();
    if (error) { console.error('Project create error:', error.message); return; }
    projectId = newProj.id;
    console.log(`  Created project: ${projectId}`);
  }

  // 2. Delete old activities for this project
  console.log('\nDeleting old TPSJ activities...');
  await supabase.from('activities').delete().eq('project_id', projectId);

  // 3. Also delete old Hampton Inn activities
  console.log('Deleting old Hampton Inn activities...');
  const { data: hamptonProj } = await supabase.from('projects').select('id').eq('code', 'hampton-inn').single();
  if (hamptonProj) {
    await supabase.from('activities').delete().eq('project_id', hamptonProj.id);
    console.log('  Hampton Inn activities cleared');
  }

  // 4. Build activities from CSV
  console.log('\nBuilding activities...');
  let idCounter = 1;
  const activities = [];
  const seen = new Set();

  rows.forEach(row => {
    const name = row['Name'];
    const schedule = row['Project Schedule (Join Table)'] || '';
    const status = row['Status'] || '';
    const pctStr = row['% complete'] || '';
    const plannedStart = row['Planned Start'] || '';
    const plannedFinish = row['Planned Finish'] || '';
    const actualStart = row['Actual Start'] || '';
    const actualFinish = row['Actual Finish'] || '';
    const comments = row['Comments'] || '';
    const blockers = row['Blockers'] || '';
    const priority = row['Priority'] || '';
    const urgent = row['Urgent'] || '';

    if (!name) return;

    // Remove [TPSJ] suffix from schedule name
    const cleanSchedule = schedule.replace(/\s*\[TPSJ\]\s*$/, '');

    const actId = `TPSJ-${String(idCounter++).padStart(4, '0')}`;

    // Determine start/finish dates
    const startDate = parseDate(actualStart) || parseDate(plannedStart) || null;
    const finishDate = parseDate(actualFinish) || parseDate(plannedFinish) || null;

    // Calculate duration
    let duration = 1;
    if (startDate && finishDate) {
      const d = Math.round((new Date(finishDate) - new Date(startDate)) / 86400000);
      duration = Math.max(1, d);
    }

    const mappedStatus = mapStatus(status, pctStr);
    const pct = parsePct(pctStr);
    const mappedPriority = urgent === 'checked' ? 'Critical' : (priority || 'Normal');

    activities.push({
      id: actId,
      project_id: projectId,
      name: name.substring(0, 200),
      trade: mapTrade(cleanSchedule),
      sub: '',
      area: cleanSchedule ? cleanSchedule.substring(0, 50) : 'General',
      floor: '',
      phase: mapPhase(cleanSchedule),
      start_date: startDate,
      finish_date: finishDate,
      duration,
      status: mappedStatus,
      pct,
      priority: mappedPriority,
      blocker: blockers || '',
      milestone: false,
      lookahead: startDate ? true : false,
      notes: [comments, cleanSchedule ? `Phase: ${cleanSchedule}` : ''].filter(Boolean).join(' | ')
    });
  });

  console.log(`  Built ${activities.length} activities`);

  // 5. Batch insert (Supabase limit ~1000 per request)
  console.log('\nInserting into Supabase...');
  const batchSize = 200;
  let inserted = 0;
  for (let i = 0; i < activities.length; i += batchSize) {
    const batch = activities.slice(i, i + batchSize);
    const { data, error } = await supabase.from('activities').insert(batch).select('id');
    if (error) {
      console.error(`  Batch ${i}-${i+batchSize} error:`, error.message);
      // Try one by one for debugging
      for (const act of batch) {
        const { error: singleErr } = await supabase.from('activities').insert(act);
        if (singleErr) console.error(`    Failed: ${act.id} ${act.name.substring(0,40)} — ${singleErr.message}`);
      }
    } else {
      inserted += data.length;
      console.log(`  Batch ${Math.floor(i/batchSize)+1}: ${data.length} inserted`);
    }
  }

  console.log(`\n  Total inserted: ${inserted} activities`);

  // 6. Verify
  const { count } = await supabase.from('activities').select('*', { count: 'exact', head: true }).eq('project_id', projectId);
  console.log(`  Verified in DB: ${count} activities for TPSJ`);

  console.log('\nDone! TPSJ project seeded.');
}

seed().catch(err => console.error('Seed failed:', err.message));
