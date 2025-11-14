import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'user1' | 'user2';
}

export async function getUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token');

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token.value, SECRET_KEY);
    return {
      id: payload.id as string,
      name: payload.name as string,
      role: payload.role as 'admin' | 'user1' | 'user2',
    };
  } catch (error) {
    return null;
  }
}

export function canAccessPage(role: string, page: string): boolean {
  const permissions: Record<string, string[]> = {
    admin: ['track-c', 'track-rollout', '5p', 'debug'],
    user1: ['track-c'],
    user2: ['track-rollout'],
  };

  return permissions[role]?.includes(page) || false;
}
