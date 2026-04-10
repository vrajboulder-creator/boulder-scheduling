import { requireDb } from '@/lib/supabase';
import type { ActivityDB } from '@/types';
import { ActivityLinksDB } from './activity-links';
import { LinkedItemsDB } from './linked-items';
import { ActivityNotesDB } from './notes';
import { AttachmentsDB } from './attachments';

export const ActivitiesDB = {
  async getAll(projectId?: string | null): Promise<ActivityDB[]> {
    let allData: ActivityDB[] = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      let query = requireDb()
        .from('activities')
        .select('*')
        .order('start_date')
        .range(from, from + pageSize - 1);
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return allData;
  },

  async getById(id: string): Promise<ActivityDB> {
    const { data, error } = await requireDb()
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getFullById(id: string) {
    const [activity, links, linkedItems, notes, attachments] = await Promise.all([
      this.getById(id),
      ActivityLinksDB.getForActivity(id),
      LinkedItemsDB.getForActivity(id),
      ActivityNotesDB.getForActivity(id),
      AttachmentsDB.getForActivity(id),
    ]);
    return { ...activity, links, linkedItems, notes, attachments };
  },

  async create(activity: Partial<ActivityDB>): Promise<ActivityDB> {
    const { data, error } = await requireDb()
      .from('activities')
      .insert(activity)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<ActivityDB>): Promise<ActivityDB> {
    const { data, error } = await requireDb()
      .from('activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await requireDb().from('activities').delete().eq('id', id);
    if (error) throw error;
  },

  async bulkUpsert(activities: Partial<ActivityDB>[]): Promise<ActivityDB[]> {
    const { data, error } = await requireDb()
      .from('activities')
      .upsert(activities, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return data;
  },
};
