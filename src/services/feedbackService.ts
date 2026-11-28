import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

export type FeedbackCategory = 'bug' | 'suggestion' | 'balance' | 'praise';

export interface PlayerFeedbackRecord {
  feedbackId: string;
  uid: string;
  displayName: string;
  category: FeedbackCategory;
  title: string;
  message: string;
  appVersion: string;
  context: string;
  status: 'open' | 'reviewed' | 'resolved';
  createdAtIso: string;
}

const APP_VERSION = '2026.1.0';

function generateFeedbackId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `fb_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

export async function submitPlayerFeedback(input: {
  category: FeedbackCategory;
  title: string;
  message: string;
  displayName?: string;
  context?: string;
}): Promise<{ savedToCloud: boolean; feedbackId: string }> {
  const cleanTitle = input.title.trim().slice(0, 120);
  const cleanMessage = input.message.trim().slice(0, 1500);
  if (cleanTitle.length < 3) {
    throw new Error('Escreva um título com pelo menos 3 caracteres.');
  }
  if (cleanMessage.length < 10) {
    throw new Error('Descreva o relato com pelo menos 10 caracteres.');
  }

  const feedbackId = generateFeedbackId();
  const user = auth.currentUser;
  const cleanContext = (input.context || 'Patofoot Web/PWA').trim().slice(0, 120) || 'Patofoot';
  const cleanName = (input.displayName || user?.displayName || 'Treinador').trim().slice(0, 60);
  const safeName = cleanName.length >= 2 ? cleanName : 'Treinador';

  // If user is not signed in or offline, store locally so nothing is lost
  if (!user || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    try {
      const localKey = 'patofoot_local_feedback_v1';
      const prev = JSON.parse(localStorage.getItem(localKey) || '[]') as PlayerFeedbackRecord[];
      prev.unshift({
        feedbackId,
        uid: 'guest_local',
        displayName: safeName,
        category: input.category,
        title: cleanTitle,
        message: cleanMessage,
        appVersion: APP_VERSION,
        context: cleanContext,
        status: 'open',
        createdAtIso: new Date().toISOString(),
      });
      localStorage.setItem(localKey, JSON.stringify(prev.slice(0, 20)));
    } catch {
      // ignore storage error
    }
    return { savedToCloud: false, feedbackId };
  }

  const docPath = `playerFeedback/${feedbackId}`;
  try {
    await setDoc(doc(db, 'playerFeedback', feedbackId), {
      feedbackId,
      uid: user.uid,
      displayName: safeName,
      category: input.category,
      title: cleanTitle,
      message: cleanMessage,
      appVersion: APP_VERSION,
      context: cleanContext,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { savedToCloud: true, feedbackId };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, docPath);
  }
}

export async function listMyFeedback(): Promise<PlayerFeedbackRecord[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const colPath = 'playerFeedback';
  try {
    const q = query(
      collection(db, colPath),
      where('uid', '==', user.uid),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        const ts = data.createdAt as Timestamp | undefined;
        return {
          feedbackId: String(data.feedbackId || d.id),
          uid: String(data.uid || user.uid),
          displayName: String(data.displayName || 'Treinador'),
          category: (data.category || 'suggestion') as FeedbackCategory,
          title: String(data.title || ''),
          message: String(data.message || ''),
          appVersion: String(data.appVersion || APP_VERSION),
          context: String(data.context || ''),
          status: (data.status || 'open') as 'open' | 'reviewed' | 'resolved',
          createdAtIso: ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString(),
        };
      })
      .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
  } catch {
    return [];
  }
}
