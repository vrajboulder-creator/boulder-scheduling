import { requireDb } from '@/lib/supabase';
import type { LinkedItem } from '@/types';

export const LinkedItemsDB = {
  async getAll(): Promise<LinkedItem[]> {
    const { data, error } = await requireDb()
      .from('linked_items')
      .select('*');
    if (error) throw error;
    return data;
  },

  async getForActivity(activityId: string): Promise<LinkedItem[]> {
    const { data, error } = await requireDb()
      .from('linked_items')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at');
    if (error) throw error;
    return data;
  },

  async create(item: Partial<LinkedItem>): Promise<LinkedItem> {
    const { data, error } = await requireDb()
      .from('linked_items')
      .insert(item)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await requireDb().from('linked_items').delete().eq('id', id);
    if (error) throw error;
  },
};
