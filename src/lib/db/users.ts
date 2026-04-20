import { requireDb } from '@/lib/supabase';
import type { AppUser } from '@/types';

export const UsersDB = {
  async getAll(): Promise<AppUser[]> {
    const { data, error } = await requireDb()
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async create(user: Omit<AppUser, 'id' | 'created_at'>): Promise<AppUser> {
    const { data, error } = await requireDb()
      .from('app_users')
      .insert(user)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Omit<AppUser, 'id' | 'created_at'>>): Promise<AppUser> {
    const { data, error } = await requireDb()
      .from('app_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await requireDb().from('app_users').delete().eq('id', id);
    if (error) throw error;
  },
};
