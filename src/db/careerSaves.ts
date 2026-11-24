import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { careerSaves, hallOfFameEntries, users } from './schema.ts';

export const ALLOWED_SQL_SLOT_IDS = [
  'autosave',
  'slot_1',
  'slot_2',
  'slot_3',
  'slot_4',
  'slot_5',
] as const;

export type SqlCareerSlotId = (typeof ALLOWED_SQL_SLOT_IDS)[number];

export function isValidSqlSlotId(value: string): value is SqlCareerSlotId {
  return (ALLOWED_SQL_SLOT_IDS as readonly string[]).includes(value);
}

export interface UpsertSqlCareerSaveInput {
  userId: number;
  slotId: SqlCareerSlotId;
  clubId: string;
  clubName: string;
  clubShortName: string;
  clubPrimaryColor: string;
  clubSecondaryColor: string;
  division: string;
  managerName: string;
  seasonYear: number;
  round: number;
  currentDate: string;
  clubBalance: number;
  payloadCompressed: string;
  trophiesCount?: number;
  hallOfFamePoints?: number;
  winRatePct?: number;
}

export async function listUserSqlCareerSaveSummaries(uid: string) {
  try {
    const rows = await db
      .select({
        slotId: careerSaves.slotId,
        clubId: careerSaves.clubId,
        clubName: careerSaves.clubName,
        clubShortName: careerSaves.clubShortName,
        clubPrimaryColor: careerSaves.clubPrimaryColor,
        clubSecondaryColor: careerSaves.clubSecondaryColor,
        division: careerSaves.division,
        managerName: careerSaves.managerName,
        seasonYear: careerSaves.seasonYear,
        round: careerSaves.round,
        currentDate: careerSaves.currentDate,
        clubBalance: careerSaves.clubBalance,
        updatedAt: careerSaves.updatedAt,
      })
      .from(careerSaves)
      .innerJoin(users, eq(careerSaves.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(careerSaves.updatedAt));

    return rows;
  } catch (error) {
    console.error('Database query failed in listUserSqlCareerSaveSummaries:', error);
    throw new Error('Failed to load career save summaries. Please try again later.', {
      cause: error,
    });
  }
}

export async function getUserSqlCareerSave(uid: string, slotId: SqlCareerSlotId) {
  try {
    const rows = await db
      .select({
        slotId: careerSaves.slotId,
        payloadCompressed: careerSaves.payloadCompressed,
        updatedAt: careerSaves.updatedAt,
      })
      .from(careerSaves)
      .innerJoin(users, eq(careerSaves.userId, users.id))
      .where(and(eq(users.uid, uid), eq(careerSaves.slotId, slotId)))
      .limit(1);

    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserSqlCareerSave:', error);
    throw new Error('Failed to download career save. Please try again later.', {
      cause: error,
    });
  }
}

export async function upsertUserSqlCareerSave(input: UpsertSqlCareerSaveInput) {
  try {
    const now = new Date();
    const saved = await db
      .insert(careerSaves)
      .values({
        userId: input.userId,
        slotId: input.slotId,
        clubId: input.clubId,
        clubName: input.clubName,
        clubShortName: input.clubShortName,
        clubPrimaryColor: input.clubPrimaryColor,
        clubSecondaryColor: input.clubSecondaryColor,
        division: input.division,
        managerName: input.managerName,
        seasonYear: input.seasonYear,
        round: input.round,
        currentDate: input.currentDate,
        clubBalance: input.clubBalance,
        payloadCompressed: input.payloadCompressed,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [careerSaves.userId, careerSaves.slotId],
        set: {
          clubId: input.clubId,
          clubName: input.clubName,
          clubShortName: input.clubShortName,
          clubPrimaryColor: input.clubPrimaryColor,
          clubSecondaryColor: input.clubSecondaryColor,
          division: input.division,
          managerName: input.managerName,
          seasonYear: input.seasonYear,
          round: input.round,
          currentDate: input.currentDate,
          clubBalance: input.clubBalance,
          payloadCompressed: input.payloadCompressed,
          updatedAt: now,
        },
      })
      .returning({
        slotId: careerSaves.slotId,
        clubId: careerSaves.clubId,
        clubName: careerSaves.clubName,
        clubShortName: careerSaves.clubShortName,
        clubPrimaryColor: careerSaves.clubPrimaryColor,
        clubSecondaryColor: careerSaves.clubSecondaryColor,
        division: careerSaves.division,
        managerName: careerSaves.managerName,
        seasonYear: careerSaves.seasonYear,
        round: careerSaves.round,
        currentDate: careerSaves.currentDate,
        clubBalance: careerSaves.clubBalance,
        updatedAt: careerSaves.updatedAt,
      });

    // Keep relational Hall of Fame snapshot synchronized atomically
    await db
      .insert(hallOfFameEntries)
      .values({
        userId: input.userId,
        slotId: input.slotId,
        managerName: input.managerName,
        clubId: input.clubId,
        clubName: input.clubName,
        seasonYear: input.seasonYear,
        trophiesCount: Math.max(0, Math.round(input.trophiesCount ?? 0)),
        hallOfFamePoints: Math.max(0, Math.round(input.hallOfFamePoints ?? 0)),
        winRatePct: Math.max(0, Math.min(100, Math.round(input.winRatePct ?? 0))),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [hallOfFameEntries.userId, hallOfFameEntries.slotId],
        set: {
          managerName: input.managerName,
          clubId: input.clubId,
          clubName: input.clubName,
          seasonYear: input.seasonYear,
          trophiesCount: Math.max(0, Math.round(input.trophiesCount ?? 0)),
          hallOfFamePoints: Math.max(0, Math.round(input.hallOfFamePoints ?? 0)),
          winRatePct: Math.max(0, Math.min(100, Math.round(input.winRatePct ?? 0))),
          updatedAt: now,
        },
      });

    return saved[0];
  } catch (error) {
    console.error('Database query failed in upsertUserSqlCareerSave:', error);
    throw new Error('Failed to save career data. Please try again later.', {
      cause: error,
    });
  }
}

export async function deleteUserSqlCareerSave(uid: string, slotId: SqlCareerSlotId) {
  try {
    const ownerRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);
    const owner = ownerRows[0];
    if (!owner) return false;

    await db
      .delete(careerSaves)
      .where(and(eq(careerSaves.userId, owner.id), eq(careerSaves.slotId, slotId)));

    await db
      .delete(hallOfFameEntries)
      .where(and(eq(hallOfFameEntries.userId, owner.id), eq(hallOfFameEntries.slotId, slotId)));

    return true;
  } catch (error) {
    console.error('Database query failed in deleteUserSqlCareerSave:', error);
    throw new Error('Failed to delete career save. Please try again later.', {
      cause: error,
    });
  }
}

export async function listHallOfFameLeaderboard(limitCount: number = 20) {
  const safeLimit = Math.max(1, Math.min(50, Math.round(limitCount)));
  try {
    return await db
      .select({
        id: hallOfFameEntries.id,
        managerName: hallOfFameEntries.managerName,
        clubId: hallOfFameEntries.clubId,
        clubName: hallOfFameEntries.clubName,
        seasonYear: hallOfFameEntries.seasonYear,
        trophiesCount: hallOfFameEntries.trophiesCount,
        hallOfFamePoints: hallOfFameEntries.hallOfFamePoints,
        winRatePct: hallOfFameEntries.winRatePct,
        updatedAt: hallOfFameEntries.updatedAt,
      })
      .from(hallOfFameEntries)
      .orderBy(desc(hallOfFameEntries.hallOfFamePoints), desc(hallOfFameEntries.trophiesCount))
      .limit(safeLimit);
  } catch (error) {
    console.error('Database query failed in listHallOfFameLeaderboard:', error);
    throw new Error('Failed to load Hall of Fame rankings. Please try again later.', {
      cause: error,
    });
  }
}
