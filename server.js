require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Projects, Activities, ActivityLinks, LinkedItems, ActivityNotes, Attachments } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── SECURITY MIDDLEWARE ───
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for inline scripts
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { error: 'Too many requests' } });
const bulkLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many bulk operations' } });
app.use('/api/', apiLimiter);
app.use('/api/activities/bulk', bulkLimiter);

app.use(express.static(path.join(__dirname)));

// ─── INPUT VALIDATION HELPERS ───
function validateActivity(body, isUpdate) {
  const errors = [];
  if (!isUpdate && !body.name) errors.push('name is required');
  if (body.name && (typeof body.name !== 'string' || body.name.length > 200)) errors.push('name must be string under 200 chars');
  if (body.status && !['Not Started','In Progress','Complete','Delayed','Blocked','Ready to Start'].includes(body.status)) errors.push('invalid status');
  if (body.priority && !['Critical','High','Normal','Low'].includes(body.priority)) errors.push('invalid priority');
  if (body.pct !== undefined && (typeof body.pct !== 'number' || body.pct < 0 || body.pct > 100)) errors.push('pct must be 0-100');
  if (body.duration !== undefined && (typeof body.duration !== 'number' || body.duration < 0 || body.duration > 999)) errors.push('invalid duration');
  if (body.notes && typeof body.notes !== 'string') errors.push('notes must be string');
  if (body.notes && body.notes.length > 5000) errors.push('notes too long (max 5000)');
  return errors;
}

function validateProject(body) {
  const errors = [];
  if (!body.name || typeof body.name !== 'string') errors.push('name required');
  if (!body.code || typeof body.code !== 'string') errors.push('code required');
  if (body.name && body.name.length > 200) errors.push('name too long');
  return errors;
}

function safeError(err) {
  // Don't leak internal error details to client
  const msg = err.message || 'Unknown error';
  if (msg.includes('duplicate') || msg.includes('unique')) return 'Duplicate entry';
  if (msg.includes('not found') || msg.includes('no rows')) return 'Not found';
  if (msg.includes('violates')) return 'Validation error';
  return 'Server error';
}

// ─── HEALTH CHECK ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════
//  PROJECTS API
// ═══════════════════════════════════════

app.get('/api/projects', async (req, res) => {
  try {
    const data = await Projects.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.get('/api/projects/:code', async (req, res) => {
  try {
    const data = await Projects.getByCode(req.params.code);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Project not found' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const errs = validateProject(req.body);
    if (errs.length) return res.status(400).json({ error: errs.join(', ') });
    const data = await Projects.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const data = await Projects.update(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await Projects.delete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

// ═══════════════════════════════════════
//  ACTIVITIES API
// ═══════════════════════════════════════

// Bulk save (must be before :id route)
app.post('/api/activities/bulk/save', async (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected array' });
    if (req.body.length > 500) return res.status(400).json({ error: 'Max 500 activities per bulk save' });
    const data = await Activities.bulkUpsert(req.body);
    res.json({ saved: data.length });
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

app.get('/api/activities', async (req, res) => {
  try {
    const projectId = req.query.project_id || null;
    const data = await Activities.getAll(projectId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.get('/api/activities/:id', async (req, res) => {
  try {
    const data = await Activities.getById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Activity not found' });
  }
});

app.get('/api/activities/:id/full', async (req, res) => {
  try {
    const data = await Activities.getFullById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Activity not found' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const errs = validateActivity(req.body, false);
    if (errs.length) return res.status(400).json({ error: errs.join(', ') });
    const data = await Activities.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

app.put('/api/activities/:id', async (req, res) => {
  try {
    const errs = validateActivity(req.body, true);
    if (errs.length) return res.status(400).json({ error: errs.join(', ') });
    const data = await Activities.update(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

app.patch('/api/activities/:id', async (req, res) => {
  try {
    const errs = validateActivity(req.body, true);
    if (errs.length) return res.status(400).json({ error: errs.join(', ') });
    const data = await Activities.update(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

app.delete('/api/activities/:id', async (req, res) => {
  try {
    await Activities.delete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

// ═══════════════════════════════════════
//  ACTIVITY LINKS (dependencies)
// ═══════════════════════════════════════

// GET ALL links (bulk)
app.get('/api/activity-links', async (req, res) => {
  try {
    const { data, error } = await require('./db').supabase
      .from('activity_links')
      .select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// GET ALL linked items (bulk)
app.get('/api/linked-items', async (req, res) => {
  try {
    const { data, error } = await require('./db').supabase
      .from('linked_items')
      .select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.get('/api/activities/:id/links', async (req, res) => {
  try {
    const data = await ActivityLinks.getForActivity(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.post('/api/activity-links', async (req, res) => {
  try {
    const data = await ActivityLinks.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

app.delete('/api/activity-links/:id', async (req, res) => {
  try {
    await ActivityLinks.delete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

// ═══════════════════════════════════════
//  LINKED ITEMS (RFIs, submittals, etc.)
// ═══════════════════════════════════════

app.get('/api/activities/:id/linked-items', async (req, res) => {
  try {
    const data = await LinkedItems.getForActivity(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.post('/api/linked-items', async (req, res) => {
  try {
    const data = await LinkedItems.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

app.delete('/api/linked-items/:id', async (req, res) => {
  try {
    await LinkedItems.delete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

// ═══════════════════════════════════════
//  NOTES
// ═══════════════════════════════════════

app.get('/api/activities/:id/notes', async (req, res) => {
  try {
    const data = await ActivityNotes.getForActivity(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const data = await ActivityNotes.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    await ActivityNotes.delete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

// ═══════════════════════════════════════
//  ATTACHMENTS
// ═══════════════════════════════════════

app.get('/api/activities/:id/attachments', async (req, res) => {
  try {
    const data = await Attachments.getForActivity(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.post('/api/attachments', async (req, res) => {
  try {
    const data = await Attachments.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

app.delete('/api/attachments/:id', async (req, res) => {
  try {
    await Attachments.delete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: safeError(err) });
  }
});

// ─── CATCH-ALL: serve frontend ───
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── ERROR HANDLER ───
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── START ───
app.listen(PORT, () => {
  const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'your-supabase-url-here';
  console.log('');
  console.log('  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  console.log('  \u2551  Boulder Construction \u2014 Schedule Command Center  \u2551');
  console.log('  \u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563');
  console.log(`  \u2551  Server:   http://localhost:${PORT}                  \u2551`);
  console.log(`  \u2551  Database: ${hasSupabase ? 'Supabase (connected)' : 'NOT CONFIGURED'}          \u2551`);
  console.log('  \u2551                                                  \u2551');
  console.log('  \u2551  API Endpoints:                                  \u2551');
  console.log('  \u2551    /api/projects          \u2014 Projects CRUD        \u2551');
  console.log('  \u2551    /api/activities         \u2014 Activities CRUD      \u2551');
  console.log('  \u2551    /api/activity-links     \u2014 Dependencies         \u2551');
  console.log('  \u2551    /api/linked-items       \u2014 RFIs/Submittals      \u2551');
  console.log('  \u2551    /api/notes              \u2014 Field notes          \u2551');
  console.log('  \u2551    /api/attachments        \u2014 File attachments     \u2551');
  console.log('  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D');
  if (!hasSupabase) {
    console.log('');
    console.log('  \u26A0  Supabase not configured!');
    console.log('  \u2192 Edit .env file with your Supabase URL and keys');
    console.log('  \u2192 Run schema.sql in Supabase SQL Editor');
    console.log('  \u2192 Frontend still works with client-side sample data');
  }
  console.log('');
});
