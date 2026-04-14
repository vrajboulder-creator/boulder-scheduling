import { requireDb } from '@/lib/supabase';
import type { ActivityLink } from '@/types';

export const ActivityLinksDB = {
  async getAll(): Promise<ActivityLink[]> {
    let allData: ActivityLink[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await requireDb()
        .from('activity_links')
        .select('*')
        .range(from, from + pageSize - 1);
      if (error) throw error;
      allData.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return allData;
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
