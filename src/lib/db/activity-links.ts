import { requireDb } from '@/lib/supabase';
import type { ActivityLink } from '@/types';

export const ActivityLinksDB = {
  async getAll(): Promise<ActivityLink[]> {
    const { data, error } = await requireDb()
      .from('activity_links')
      .select('*');
    if (error) throw error;
    return data;
  },

  async getForActivity(activityId: string): Promise<ActivityLink[]> {
    const { data, error } = await requireDb()
      .from('activity_links')
      .select('*')
      .or(`predecessor_id.eq.${activityId},successor_id.eq.${activityId}`);
    if (error) throw error;
    return data;
  },

  async create(link: Partial<ActivityLink>): Promise<ActivityLink> {
    const { data, error } = await requireDb()
      .from('activity_links')
      .insert(link)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await requireDb().from('activity_links').delete().eq('id', id);
    if (error) throw error;
  },
};
