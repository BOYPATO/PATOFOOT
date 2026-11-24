import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export interface UpsertSqlUserInput {
  uid: string;
  email: string;
  displayName?: string;
  usernameKey?: string;
  favoriteClubId?: string;
}

function sanitizeKey(raw: string, uid: string): string {
  const base = raw
    .trim()
    .split('@')[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._\-]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._\-]+|[._\-]+$/g, '')
    .slice(0, 60);
  if (base.length >= 2) return base;
  return `coach.${uid.slice(0, 8).toLowerCase()}`;
}

export async function getOrCreateUser(input: UpsertSqlUserInput) {
  const safeEmail = (input.email || `${input.uid}@acesso.patofoot.app`).trim().slice(0, 160);
  const safeKey = sanitizeKey(input.usernameKey || input.displayName || safeEmail, input.uid);
  const safeDisplayName =
    (input.displayName || safeEmail.split('@')[0] || 'Treinador').trim().slice(0, 60) || 'Treinador';
  const safeClubId =
    input.favoriteClubId && /^[a-zA-Z0-9_\-]{2,32}$/.test(input.favoriteClubId)
      ? input.favoriteClubId
      : 'fla';

  try {
    const result = await db
      .insert(users)
      .values({
        uid: input.uid,
        email: safeEmail,
        displayName: safeDisplayName,
        usernameKey: safeKey,
        favoriteClubId: safeClubId,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: safeEmail,
          ...(input.displayName ? { displayName: safeDisplayName } : {}),
          ...(input.favoriteClubId ? { favoriteClubId: safeClubId } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize trainer account. Please try again later.', {
      cause: error,
    });
  }
}

export async function getSqlUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getSqlUserByUid:', error);
    throw new Error('Failed to load trainer profile. Please try again later.', {
      cause: error,
    });
  }
}

export async function updateSqlUserProfile(
  uid: string,
  updates: { displayName?: string; favoriteClubId?: string }
) {
  const patch: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (updates.displayName && updates.displayName.trim().length >= 2) {
    patch.displayName = updates.displayName.trim().slice(0, 60);
  }
  if (updates.favoriteClubId && /^[a-zA-Z0-9_\-]{2,32}$/.test(updates.favoriteClubId)) {
    patch.favoriteClubId = updates.favoriteClubId;
  }

  try {
    const result = await db
      .update(users)
      .set(patch)
      .where(eq(users.uid, uid))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error('Database query failed in updateSqlUserProfile:', error);
    throw new Error('Failed to update trainer profile. Please try again later.', {
      cause: error,
    });
  }
}
