import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

function json(data, status = 200) {
  return { statusCode: status, headers, body: JSON.stringify(data) };
}

function err(msg, status = 400) {
  return { statusCode: status, headers, body: JSON.stringify({ error: msg }) };
}

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/api', '').replace('/api', '') || '/';
  const segments = path.split('/').filter(Boolean);
  const body = event.body ? JSON.parse(event.body) : null;

  try {
    // ─── HEALTH ───
    if (path === '/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // ─── PROJECTS ───
    if (segments[0] === 'projects') {
      if (method === 'GET' && segments.length === 1) {
        const { data, error } = await supabase.from('projects').select('*').order('created_at');
        if (error) return err(error.message, 500);
        return json(data);
      }
      if (method === 'GET' && segments.length === 2) {
        const { data, error } = await supabase.from('projects').select('*').eq('code', segments[1]).single();
        if (error) return err('Project not found', 404);
        return json(data);
      }
      if (method === 'POST') {
        if (!body?.name || !body?.code) return err('name and code required');
        const { data, error } = await supabase.from('projects').insert(body).select().single();
        if (error) return err(error.message);
        return json(data, 201);
      }
      if (method === 'PUT' && segments.length === 2) {
        const { data, error } = await supabase.from('projects').update(body).eq('id', segments[1]).select().single();
        if (error) return err(error.message);
        return json(data);
      }
      if (method === 'DELETE' && segments.length === 2) {
        const { error } = await supabase.from('projects').delete().eq('id', segments[1]);
        if (error) return err(error.message);
        return json({ deleted: true });
      }
    }

    // ─── ACTIVITIES ───
    if (segments[0] === 'activities') {
      // Bulk save
      if (segments[1] === 'bulk' && segments[2] === 'save' && method === 'POST') {
        if (!Array.isArray(body)) return err('Expected array');
        if (body.length > 500) return err('Max 500');
        const { data, error } = await supabase.from('activities').upsert(body, { onConflict: 'id' }).select();
        if (error) return err(error.message);
        return json({ saved: data.length });
      }

      // Activity sub-resources
      if (segments.length === 3 && method === 'GET') {
        const actId = segments[1];
        if (segments[2] === 'links') {
          const { data, error } = await supabase.from('activity_links').select('*').or(`predecessor_id.eq.${actId},successor_id.eq.${actId}`);
          if (error) return err(error.message, 500);
          return json(data);
        }
        if (segments[2] === 'linked-items') {
          const { data, error } = await supabase.from('linked_items').select('*').eq('activity_id', actId).order('created_at');
          if (error) return err(error.message, 500);
          return json(data);
        }
        if (segments[2] === 'notes') {
          const { data, error } = await supabase.from('activity_notes').select('*').eq('activity_id', actId).order('created_at', { ascending: false });
          if (error) return err(error.message, 500);
          return json(data);
        }
        if (segments[2] === 'attachments') {
          const { data, error } = await supabase.from('attachments').select('*').eq('activity_id', actId).order('uploaded_at', { ascending: false });
          if (error) return err(error.message, 500);
          return json(data);
        }
        if (segments[2] === 'full') {
          const [act, links, items, notes] = await Promise.all([
            supabase.from('activities').select('*').eq('id', actId).single(),
            supabase.from('activity_links').select('*').or(`predecessor_id.eq.${actId},successor_id.eq.${actId}`),
            supabase.from('linked_items').select('*').eq('activity_id', actId),
            supabase.from('activity_notes').select('*').eq('activity_id', actId)
          ]);
          if (act.error) return err('Not found', 404);
          return json({ ...act.data, links: links.data, linkedItems: items.data, notes: notes.data });
        }
      }

      // Single activity by ID
      if (segments.length === 2) {
        const actId = segments[1];
        if (method === 'GET') {
          const { data, error } = await supabase.from('activities').select('*').eq('id', actId).single();
          if (error) return err('Not found', 404);
          return json(data);
        }
        if (method === 'PUT' || method === 'PATCH') {
          const { data, error } = await supabase.from('activities').update(body).eq('id', actId).select().single();
          if (error) return err(error.message);
          return json(data);
        }
        if (method === 'DELETE') {
          const { error } = await supabase.from('activities').delete().eq('id', actId);
          if (error) return err(error.message);
          return json({ deleted: true });
        }
      }

      // List all activities
      if (segments.length === 1 && method === 'GET') {
        const params = new URLSearchParams(event.rawQuery || '');
        const projectId = params.get('project_id');
        let query = supabase.from('activities').select('*').order('start_date');
        if (projectId) query = query.eq('project_id', projectId);
        const { data, error } = await query;
        if (error) return err(error.message, 500);
        return json(data);
      }

      // Create activity
      if (segments.length === 1 && method === 'POST') {
        if (!body?.name) return err('name required');
        const { data, error } = await supabase.from('activities').insert(body).select().single();
        if (error) return err(error.message);
        return json(data, 201);
      }
    }

    // ─── ACTIVITY LINKS ───
    if (segments[0] === 'activity-links') {
      if (method === 'GET') {
        const { data, error } = await supabase.from('activity_links').select('*');
        if (error) return err(error.message, 500);
        return json(data);
      }
      if (method === 'POST') {
        const { data, error } = await supabase.from('activity_links').insert(body).select().single();
        if (error) return err(error.message);
        return json(data, 201);
      }
      if (method === 'DELETE' && segments.length === 2) {
        const { error } = await supabase.from('activity_links').delete().eq('id', segments[1]);
        if (error) return err(error.message);
        return json({ deleted: true });
      }
    }

    // ─── LINKED ITEMS ───
    if (segments[0] === 'linked-items') {
      if (method === 'GET') {
        const { data, error } = await supabase.from('linked_items').select('*');
        if (error) return err(error.message, 500);
        return json(data);
      }
      if (method === 'POST') {
        const { data, error } = await supabase.from('linked_items').insert(body).select().single();
        if (error) return err(error.message);
        return json(data, 201);
      }
      if (method === 'DELETE' && segments.length === 2) {
        const { error } = await supabase.from('linked_items').delete().eq('id', segments[1]);
        if (error) return err(error.message);
        return json({ deleted: true });
      }
    }

    // ─── NOTES ───
    if (segments[0] === 'notes') {
      if (method === 'POST') {
        const { data, error } = await supabase.from('activity_notes').insert(body).select().single();
        if (error) return err(error.message);
        return json(data, 201);
      }
      if (method === 'DELETE' && segments.length === 2) {
        const { error } = await supabase.from('activity_notes').delete().eq('id', segments[1]);
        if (error) return err(error.message);
        return json({ deleted: true });
      }
    }

    // ─── ATTACHMENTS ───
    if (segments[0] === 'attachments') {
      if (method === 'POST') {
        const { data, error } = await supabase.from('attachments').insert(body).select().single();
        if (error) return err(error.message);
        return json(data, 201);
      }
      if (method === 'DELETE' && segments.length === 2) {
        const { error } = await supabase.from('attachments').delete().eq('id', segments[1]);
        if (error) return err(error.message);
        return json({ deleted: true });
      }
    }

    return err('Not found', 404);
  } catch (e) {
    console.error('Function error:', e.message);
    return err('Server error', 500);
  }
}
