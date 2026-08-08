import type { CareerEntry, Post, PostMeta, Profile, Project } from './models';

export async function fetchProjects(): Promise<Project[]> {
  throw new Error('Notion layer not implemented yet (Task 6)');
}
export async function fetchPostMetas(): Promise<PostMeta[]> {
  throw new Error('Notion layer not implemented yet (Task 6)');
}
export async function fetchPostBySlug(_slug: string): Promise<Post | null> {
  throw new Error('Notion layer not implemented yet (Task 6)');
}
export async function fetchCareer(): Promise<CareerEntry[]> {
  throw new Error('Notion layer not implemented yet (Task 6)');
}
export async function fetchProfile(): Promise<Profile | null> {
  throw new Error('Notion layer not implemented yet (Task 6)');
}
