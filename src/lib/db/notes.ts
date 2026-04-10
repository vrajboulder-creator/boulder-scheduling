import { requireDb } from '@/lib/supabase';
import type { ActivityNote } from '@/types';

export const ActivityNotesDB = {
  async getForActivity(activityId: string): Promise<ActivityNote[]> {
    const { data, error } = await requireDb()
      .from('activity_notes')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(note: Partial<ActivityNote>): Promise<ActivityNote> {
    const { data, error } = await requireDb()
      .from('activity_notes')
      .insert(note)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await requireDb().from('activity_notes').delete().eq('id', id);
    if (error) throw error;
  },
};
