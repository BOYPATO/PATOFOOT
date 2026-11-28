import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { GameSave } from '../types/game';

export interface ManagerLeaderboardItem {
  uid: string;
  displayName: string;
  clubId: string;
  clubName: string;
  clubShortName: string;
  clubPrimaryColor: string;
  clubSecondaryColor: string;
  division: string;
  careerScore: number;
  trophiesCount: number;
  seasonsPlayed: number;
  winsCount: number;
  challengesCompleted: number;
  isPublic: boolean;
  updatedAtIso: string;
}

export interface CareerLeaderboardMetrics {
  careerScore: number;
  trophiesCount: number;
  seasonsPlayed: number;
  winsCount: number;
  challengesCompleted: number;
  division: string;
}

function sanitizeId(raw: string, fallback: string, maxLen: number): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, maxLen);
  return cleaned.length >= 2 ? cleaned : fallback;
}

function clampString(raw: string, fallback: string, minLen: number, maxLen: number): string {
  const trimmed = (raw || '').trim().slice(0, maxLen);
  if (trimmed.length >= minLen) return trimmed;
  return fallback.slice(0, maxLen);
}

function clampHexColor(raw: string | undefined, fallback: string): string {
  const trimmed = (raw || '').trim();
  if (trimmed.length >= 4 && trimmed.length <= 16) return trimmed;
  return fallback;
}

function clampNumber(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

/**
 * Computes transparent, deterministic career score for the PATOFOOT Global Hall of Fame.
 */
export function computeCareerLeaderboardMetrics(save: GameSave): CareerLeaderboardMetrics {
  const userClub = save.clubs.find((c) => c.id === save.userClubId) || save.clubs[0];
  const userTrophies = (save.trophyHistory || []).filter((t) => t.userWon);
  const trophiesCount = userTrophies.length;
  const completedSeasons = (save.seasonHistoryArchive || []).length;
  const seasonsPlayed = Math.max(1, completedSeasons + 1);

  const careerStats = save.managerCareer;
  let winsCount = (careerStats?.careerStints || []).reduce(
    (sum, s) => sum + (s.wins || 0),
    0
  );
  if (winsCount === 0) {
    // Count current-season wins across major pools as fallback for brand-new careers
    const pools = [
      save.fixturesA,
      save.fixturesB,
      save.fixturesC || [],
      save.fixturesD || [],
      save.fixturesCopaBrasil || [],
      save.fixturesLibertadores || [],
      save.fixturesSulamericana || [],
      save.fixturesEstadual || [],
      save.fixturesCopaNordeste || [],
      save.fixturesCopaVerde || [],
      save.fixturesChampionsLeague || [],
      save.fixturesEuropaLeague || [],
      save.fixturesConferenceLeague || [],
    ];
    for (const pool of pools) {
      for (const f of pool) {
        if (!f.played || f.homeScore === null || f.awayScore === null) continue;
        if (f.homeTeamId === save.userClubId && f.homeScore > f.awayScore) winsCount++;
        else if (f.awayTeamId === save.userClubId && f.awayScore > f.homeScore) winsCount++;
      }
    }
  }

  const challengesCompleted = save.activeChallenge?.completed ? 1 : 0;

  // Weighted career score: trophies weigh heavily, plus wins, reputation, seasons, and challenges
  const reputationBonus = (careerStats?.managerReputation ?? 35) * 12;
  const trophyPoints = userTrophies.reduce((acc, t) => {
    const label = (t.competition || '').toLowerCase();
    if (label.includes('mundial') || label.includes('intercontinental')) return acc + 900;
    if (label.includes('libertadores') || label.includes('champions')) return acc + 750;
    if (label.includes('sul-americana') || label.includes('europa league')) return acc + 500;
    if (label.includes('série a') || label.includes('copa do brasil')) return acc + 420;
    return acc + 240;
  }, 0);

  const careerScore = clampNumber(
    trophyPoints +
      winsCount * 15 +
      (seasonsPlayed - 1) * 120 +
      challengesCompleted * 350 +
      reputationBonus,
    0,
    1_000_000
  );

  return {
    careerScore,
    trophiesCount: clampNumber(trophiesCount, 0, 500),
    seasonsPlayed: clampNumber(seasonsPlayed, 1, 200),
    winsCount: clampNumber(winsCount, 0, 20000),
    challengesCompleted: clampNumber(challengesCompleted, 0, 50),
    division: clampString(String(userClub?.division || 'A'), 'A', 1, 16),
  };
}

export async function fetchGlobalLeaderboard(maxItems: number = 50): Promise<ManagerLeaderboardItem[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.round(maxItems)));
  const colPath = 'managerLeaderboard';
  try {
    const q = query(
      collection(db, colPath),
      where('isPublic', '==', true),
      orderBy('careerScore', 'desc'),
      limit(safeLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      const updatedTs = data.updatedAt as Timestamp | undefined;
      return {
        uid: String(data.uid || d.id),
        displayName: String(data.displayName || 'Treinador'),
        clubId: String(data.clubId || 'club'),
        clubName: String(data.clubName || 'Clube'),
        clubShortName: String(data.clubShortName || 'CLB'),
        clubPrimaryColor: String(data.clubPrimaryColor || '#0ea5e9'),
        clubSecondaryColor: String(data.clubSecondaryColor || '#ffffff'),
        division: String(data.division || 'A'),
        careerScore: Number(data.careerScore || 0),
        trophiesCount: Number(data.trophiesCount || 0),
        seasonsPlayed: Number(data.seasonsPlayed || 1),
        winsCount: Number(data.winsCount || 0),
        challengesCompleted: Number(data.challengesCompleted || 0),
        isPublic: Boolean(data.isPublic),
        updatedAtIso: updatedTs?.toDate ? updatedTs.toDate().toISOString() : new Date().toISOString(),
      };
    });
  } catch (err) {
    // Fallback without orderBy index if composite index (isPublic + careerScore) is still building
    try {
      const qFallback = query(
        collection(db, colPath),
        where('isPublic', '==', true),
        limit(safeLimit)
      );
      const snap = await getDocs(qFallback);
      return snap.docs
        .map((d) => {
          const data = d.data();
          const updatedTs = data.updatedAt as Timestamp | undefined;
          return {
            uid: String(data.uid || d.id),
            displayName: String(data.displayName || 'Treinador'),
            clubId: String(data.clubId || 'club'),
            clubName: String(data.clubName || 'Clube'),
            clubShortName: String(data.clubShortName || 'CLB'),
            clubPrimaryColor: String(data.clubPrimaryColor || '#0ea5e9'),
            clubSecondaryColor: String(data.clubSecondaryColor || '#ffffff'),
            division: String(data.division || 'A'),
            careerScore: Number(data.careerScore || 0),
            trophiesCount: Number(data.trophiesCount || 0),
            seasonsPlayed: Number(data.seasonsPlayed || 1),
            winsCount: Number(data.winsCount || 0),
            challengesCompleted: Number(data.challengesCompleted || 0),
            isPublic: Boolean(data.isPublic),
            updatedAtIso: updatedTs?.toDate
              ? updatedTs.toDate().toISOString()
              : new Date().toISOString(),
          };
        })
        .sort((a, b) => b.careerScore - a.careerScore);
    } catch {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  }
}

export async function publishCareerToLeaderboard(
  save: GameSave,
  customDisplayName?: string
): Promise<ManagerLeaderboardItem> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Faça login com sua conta para publicar no Ranking Global.');
  }

  const userClub = save.clubs.find((c) => c.id === save.userClubId) || save.clubs[0];
  const metrics = computeCareerLeaderboardMetrics(save);
  const docPath = `managerLeaderboard/${user.uid}`;
  const docRef = doc(db, 'managerLeaderboard', user.uid);

  const displayName = clampString(
    customDisplayName || save.managerName || user.displayName || 'Treinador',
    'Treinador',
    2,
    60
  );
  const clubId = sanitizeId(userClub?.id || 'flamengo', 'flamengo', 40);
  const clubName = clampString(userClub?.name || 'Clube', 'Clube', 2, 80);
  const clubShortName = clampString(
    userClub?.shortName || userClub?.initials || 'CLB',
    'CLB',
    1,
    32
  );
  const clubPrimaryColor = clampHexColor(userClub?.colors?.primary, '#0ea5e9');
  const clubSecondaryColor = clampHexColor(userClub?.colors?.text || userClub?.colors?.secondary, '#ffffff');

  try {
    const existingSnap = await getDoc(docRef);
    const existingCreatedAt = existingSnap.exists() ? existingSnap.data().createdAt : null;

    const payload = {
      uid: user.uid,
      displayName,
      clubId,
      clubName,
      clubShortName,
      clubPrimaryColor,
      clubSecondaryColor,
      division: metrics.division,
      careerScore: metrics.careerScore,
      trophiesCount: metrics.trophiesCount,
      seasonsPlayed: metrics.seasonsPlayed,
      winsCount: metrics.winsCount,
      challengesCompleted: metrics.challengesCompleted,
      isPublic: true,
      createdAt: existingCreatedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, payload);

    return {
      uid: user.uid,
      displayName,
      clubId,
      clubName,
      clubShortName,
      clubPrimaryColor,
      clubSecondaryColor,
      division: metrics.division,
      careerScore: metrics.careerScore,
      trophiesCount: metrics.trophiesCount,
      seasonsPlayed: metrics.seasonsPlayed,
      winsCount: metrics.winsCount,
      challengesCompleted: metrics.challengesCompleted,
      isPublic: true,
      updatedAtIso: new Date().toISOString(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function removeMyLeaderboardEntry(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docPath = `managerLeaderboard/${user.uid}`;
  try {
    await deleteDoc(doc(db, 'managerLeaderboard', user.uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}
