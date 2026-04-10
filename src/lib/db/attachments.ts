import { requireDb } from '@/lib/supabase';
import type { Attachment } from '@/types';

export const AttachmentsDB = {
  async getForActivity(activityId: string): Promise<Attachment[]> {
    const { data, error } = await requireDb()
      .from('attachments')
      .select('*')
      .eq('activity_id', activityId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(attachment: Partial<Attachment>): Promise<Attachment> {
    const { data, error } = await requireDb()
      .from('attachments')
      .insert(attachment)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await requireDb().from('attachments').delete().eq('id', id);
    if (error) throw error;
  },
};
