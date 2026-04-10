import { requireDb } from '@/lib/supabase';
import type { Project } from '@/types';

export const ProjectsDB = {
  async getAll(): Promise<Project[]> {
    const { data, error } = await requireDb()
      .from('projects')
      .select('*')
      .order('created_at');
    if (error) throw error;
    return data;
  },

  async getByCode(code: string): Promise<Project> {
    const { data, error } = await requireDb()
      .from('projects')
      .select('*')
      .eq('code', code)
      .single();
    if (error) throw error;
    return data;
  },

  async create(project: Partial<Project>): Promise<Project> {
    const { data, error } = await requireDb()
      .from('projects')
      .insert(project)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const { data, error } = await requireDb()
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await requireDb().from('projects').delete().eq('id', id);
    if (error) throw error;
  },
};
