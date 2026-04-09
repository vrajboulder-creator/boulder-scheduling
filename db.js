const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Gracefully handle missing Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const isConfigured = SUPABASE_URL.startsWith('http');

let supabase = null;
if (isConfigured) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Throw helpful error if Supabase called without config
function requireDb() {
  if (!supabase) throw new Error('Supabase not configured. Edit .env with your project URL and keys.');
  return supabase;
}

// ─── PROJECTS ───
const Projects = {
  async getAll() {
    const { data, error } = await requireDb()
      .from('projects')
      .select('*')
      .order('created_at');
    if (error) throw error;
    return data;
  },

  async getByCode(code) {
    const { data, error } = await requireDb()
      .from('projects')
      .select('*')
      .eq('code', code)
      .single();
    if (error) throw error;
    return data;
  },

  async create(project) {
    const { data, error } = await requireDb()
      .from('projects')
      .insert(project)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await requireDb()
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await requireDb().from('projects').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── ACTIVITIES ───
const Activities = {
  async getAll(projectId) {
    let query = requireDb().from('activities').select('*').order('start_date');
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await requireDb()
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(activity) {
    const { data, error } = await requireDb()
      .from('activities')
      .insert(activity)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await requireDb()
      .from('activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await requireDb().from('activities').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async bulkUpsert(activities) {
    const { data, error } = await requireDb()
      .from('activities')
      .upsert(activities, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return data;
  },

  // Get with all related data
  async getFullById(id) {
    const [activity, links, linkedItems, notes, attachments] = await Promise.all([
      this.getById(id),
      ActivityLinks.getForActivity(id),
      LinkedItems.getForActivity(id),
      ActivityNotes.getForActivity(id),
      Attachments.getForActivity(id)
    ]);
    return { ...activity, links, linkedItems, notes: notes, attachments };
  }
};

// ─── ACTIVITY LINKS ───
const ActivityLinks = {
  async getForActivity(activityId) {
    const { data, error } = await requireDb()
      .from('activity_links')
      .select('*')
      .or(`predecessor_id.eq.${activityId},successor_id.eq.${activityId}`);
    if (error) throw error;
    return data;
  },

  async create(link) {
    const { data, error } = await requireDb()
      .from('activity_links')
      .insert(link)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await requireDb().from('activity_links').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── LINKED ITEMS ───
const LinkedItems = {
  async getForActivity(activityId) {
    const { data, error } = await requireDb()
      .from('linked_items')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at');
    if (error) throw error;
    return data;
  },

  async create(item) {
    const { data, error } = await requireDb()
      .from('linked_items')
      .insert(item)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await requireDb().from('linked_items').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── ACTIVITY NOTES ───
const ActivityNotes = {
  async getForActivity(activityId) {
    const { data, error } = await requireDb()
      .from('activity_notes')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(note) {
    const { data, error } = await requireDb()
      .from('activity_notes')
      .insert(note)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await requireDb().from('activity_notes').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── ATTACHMENTS ───
const Attachments = {
  async getForActivity(activityId) {
    const { data, error } = await requireDb()
      .from('attachments')
      .select('*')
      .eq('activity_id', activityId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(attachment) {
    const { data, error } = await requireDb()
      .from('attachments')
      .insert(attachment)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await requireDb().from('attachments').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Upload file to Supabase Storage
  async uploadFile(bucket, filePath, file) {
    const { data, error } = await requireDb().storage
      .from(bucket)
      .upload(filePath, file);
    if (error) throw error;
    const { data: urlData } = requireDb().storage.from(bucket).getPublicUrl(filePath);
    return urlData.publicUrl;
  }
};

module.exports = {
  supabase,
  isConfigured,
  Projects,
  Activities,
  ActivityLinks,
  LinkedItems,
  ActivityNotes,
  Attachments
};
