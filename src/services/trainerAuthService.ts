import { useState, useEffect, useCallback } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  OperationType,
  handleFirestoreError,
} from '../firebase';

export interface TrainerAuthSession {
  uid: string;
  displayName: string;
  usernameKey: string;
  favoriteClubId: string;
  provider: 'firebase' | 'google' | 'account';
  loggedInAt: string;
}

interface LocalHashedAccountBackup {
  uid: string;
  displayName: string;
  usernameKey: string;
  passwordDigest: string;
  favoriteClubId: string;
  recoveryEmail?: string;
  recoverySecretDigest?: string;
  createdAt: string;
}

export interface TrainerRecoveryOptions {
  recoveryEmail?: string;
  recoveryKeyword?: string;
}

export interface RecoveredLoginMatch {
  displayName: string;
  usernameKey: string;
  source: 'server' | 'device';
}

export interface DeviceSavedLoginHint {
  displayName: string;
  usernameKey: string;
  hasRecoveryWord: boolean;
  maskedEmail?: string;
}

const SESSION_STORAGE_KEY = 'patofoot_trainer_session_v1';
const LOCAL_ACCOUNTS_BACKUP_KEY = 'patofoot_trainer_accounts_backup_v1';
let inMemoryServerAuthToken: string | null = null;

type SessionListener = (session: TrainerAuthSession | null) => void;
const sessionListeners = new Set<SessionListener>();

function notifySessionListeners(session: TrainerAuthSession | null): void {
  sessionListeners.forEach((listener) => listener(session));
}

export function normalizeUsernameKey(raw: string): string {
  const withoutDomain = String(raw || '')
    .trim()
    .split('@')[0];
  const ascii = withoutDomain
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._\-]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._\-]+|[._\-]+$/g, '');
  const trimmed = ascii.slice(0, 60);
  if (trimmed.length === 1) return `${trimmed}1`;
  return trimmed;
}

function sanitizeDisplayName(raw: string, fallbackKey: string): string {
  const cleaned = String(raw || '').trim().slice(0, 60);
  if (cleaned.length >= 2) return cleaned;
  return fallbackKey.length >= 2 ? fallbackKey.slice(0, 60) : 'Treinador';
}

function sanitizeFavoriteClubId(raw?: string): string {
  const candidate = String(raw || 'fla').trim();
  return /^[a-zA-Z0-9_\-]{2,32}$/.test(candidate) ? candidate : 'fla';
}

function toSyntheticEmail(usernameKey: string, rawInput: string): string {
  const trimmed = rawInput.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return trimmed;
  }
  return `${usernameKey}@acesso.patofoot.app`;
}

function normalizeRecoveryEmailInput(raw?: string): string | undefined {
  const cleaned = String(raw || '').trim().toLowerCase().slice(0, 120);
  if (!cleaned) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned) ? cleaned : undefined;
}

function normalizeRecoveryKeywordInput(raw?: string): string {
  return String(raw || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function maskEmailForDisplay(email?: string): string | undefined {
  if (!email || !email.includes('@')) return undefined;
  const [local, domain] = email.split('@');
  if (!local || !domain) return undefined;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function loadStoredTrainerSession(): TrainerAuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrainerAuthSession;
    if (!parsed || !parsed.uid || !parsed.displayName || !parsed.usernameKey) {
      return null;
    }
    return {
      ...parsed,
      favoriteClubId: sanitizeFavoriteClubId(parsed.favoriteClubId),
    };
  } catch {
    return null;
  }
}

function saveStoredTrainerSession(session: TrainerAuthSession | null): void {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
  notifySessionListeners(session);
}

async function computeClientDigest(usernameKey: string, password: string): Promise<string> {
  const payload = `patofoot_2026_salt::${usernameKey}::${password}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(payload);
    const buf = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv_${(hash >>> 0).toString(16)}`;
}

function readLocalAccountBackups(): LocalHashedAccountBackup[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_BACKUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalHashedAccountBackup[]) : [];
  } catch {
    return [];
  }
}

function writeLocalAccountBackup(account: LocalHashedAccountBackup): void {
  try {
    const all = readLocalAccountBackups().filter(
      (item) => item.usernameKey !== account.usernameKey
    );
    all.push(account);
    localStorage.setItem(LOCAL_ACCOUNTS_BACKUP_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage errors
  }
}

function canSyncUserWithFirestore(user: User): boolean {
  const validUid = /^[a-zA-Z0-9_\-]{1,128}$/.test(user.uid);
  const allowedProvider =
    user.emailVerified === true ||
    user.providerData.some((p) => p.providerId === 'password');
  return validUid && allowedProvider;
}

async function syncTrainerProfileToSql(
  user: User,
  payload: { displayName?: string; usernameKey?: string; favoriteClubId?: string }
): Promise<void> {
  try {
    const idToken = await user.getIdToken();
    await fetch('/api/sql/users/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Keep client session interactive even if backend sync is temporarily unavailable
  }
}

export async function syncTrainerProfileToFirestore(
  user: User,
  preferredDisplayName?: string,
  preferredClubId?: string
): Promise<{ displayName: string; usernameKey: string; favoriteClubId: string }> {
  const rawBaseName =
    preferredDisplayName ||
    user.displayName ||
    (user.email ? user.email.split('@')[0] : '') ||
    'Treinador';
  const fallbackKey = normalizeUsernameKey(rawBaseName) || `coach.${user.uid.slice(0, 8).toLowerCase()}`;
  const displayName = sanitizeDisplayName(rawBaseName, fallbackKey);
  const favoriteClubId = sanitizeFavoriteClubId(preferredClubId);

  if (!canSyncUserWithFirestore(user)) {
    return {
      displayName,
      usernameKey: fallbackKey,
      favoriteClubId,
    };
  }

  const docPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  let existingData: Record<string, unknown> | null = null;
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      existingData = snap.data() as Record<string, unknown>;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, docPath);
  }

  if (!existingData) {
    try {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        usernameKey: fallbackKey,
        favoriteClubId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }

    void syncTrainerProfileToSql(user, {
      displayName,
      usernameKey: fallbackKey,
      favoriteClubId,
    });

    return {
      displayName,
      usernameKey: fallbackKey,
      favoriteClubId,
    };
  }

  const storedName =
    typeof existingData.displayName === 'string' && existingData.displayName.length >= 2
      ? existingData.displayName
      : displayName;
  const storedKey =
    typeof existingData.usernameKey === 'string' && existingData.usernameKey.length >= 2
      ? existingData.usernameKey
      : fallbackKey;
  const storedClubId =
    typeof existingData.favoriteClubId === 'string' && existingData.favoriteClubId.length >= 2
      ? sanitizeFavoriteClubId(existingData.favoriteClubId)
      : favoriteClubId;

  const nextName = preferredDisplayName ? displayName : storedName;
  const nextClub = preferredClubId ? favoriteClubId : storedClubId;

  if (nextName !== storedName || nextClub !== storedClubId) {
    try {
      await updateDoc(userRef, {
        displayName: nextName,
        favoriteClubId: nextClub,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  void syncTrainerProfileToSql(user, {
    displayName: nextName,
    usernameKey: storedKey,
    favoriteClubId: nextClub,
  });

  return {
    displayName: nextName,
    usernameKey: storedKey,
    favoriteClubId: nextClub,
  };
}

function getFirebaseErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string') {
    return (err as { code: string }).code;
  }
  return '';
}

export async function registerTrainerWithNameAndPassword(
  rawName: string,
  rawPassword: string,
  initialClubId = 'fla',
  recoveryOptions?: TrainerRecoveryOptions
): Promise<TrainerAuthSession> {
  const trimmedName = rawName.trim();
  if (trimmedName.length < 2 || trimmedName.length > 60) {
    throw new Error('Informe seu nome ou login entre 2 e 60 caracteres.');
  }

  const usernameKey = normalizeUsernameKey(trimmedName);
  if (usernameKey.length < 2) {
    throw new Error('Digite um nome ou login válido usando letras ou números.');
  }

  if (rawPassword.length < 4) {
    throw new Error('Sua senha precisa ter pelo menos 4 caracteres.');
  }

  const rawRecoveryEmail = String(recoveryOptions?.recoveryEmail || '').trim();
  if (rawRecoveryEmail && !normalizeRecoveryEmailInput(rawRecoveryEmail)) {
    throw new Error('Digite um e-mail de recuperação válido ou deixe o campo em branco.');
  }
  const cleanRecoveryEmail =
    normalizeRecoveryEmailInput(rawRecoveryEmail) ||
    normalizeRecoveryEmailInput(trimmedName);

  const rawRecoveryKeyword = String(recoveryOptions?.recoveryKeyword || '').trim();
  const normalizedRecoveryKeyword = normalizeRecoveryKeywordInput(rawRecoveryKeyword);
  if (rawRecoveryKeyword && normalizedRecoveryKeyword.length < 3) {
    throw new Error('A palavra secreta de recuperação deve ter pelo menos 3 caracteres.');
  }

  const displayName = sanitizeDisplayName(trimmedName, usernameKey);
  const favoriteClubId = sanitizeFavoriteClubId(initialClubId);
  const digest = await computeClientDigest(usernameKey, rawPassword);
  const recoverySecretDigest =
    normalizedRecoveryKeyword.length >= 3
      ? await computeClientDigest(`recovery::${usernameKey}`, normalizedRecoveryKeyword)
      : undefined;

  // 1. Try Firebase Email/Password Auth first when password >= 6 chars
  if (rawPassword.length >= 6) {
    try {
      const syntheticEmail = cleanRecoveryEmail || toSyntheticEmail(usernameKey, trimmedName);
      const cred = await createUserWithEmailAndPassword(auth, syntheticEmail, rawPassword);
      await updateProfile(cred.user, { displayName }).catch(() => {});

      const profile = await syncTrainerProfileToFirestore(
        cred.user,
        displayName,
        favoriteClubId
      );

      // Mirror to server store best-effort
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          password: rawPassword,
          favoriteClubId,
          recoveryEmail: cleanRecoveryEmail,
          recoveryKeyword: rawRecoveryKeyword || undefined,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (payload && typeof payload.sessionToken === 'string') {
            inMemoryServerAuthToken = payload.sessionToken;
          }
        })
        .catch(() => {});

      writeLocalAccountBackup({
        uid: cred.user.uid,
        displayName: profile.displayName,
        usernameKey: profile.usernameKey,
        passwordDigest: digest,
        favoriteClubId: profile.favoriteClubId,
        ...(cleanRecoveryEmail ? { recoveryEmail: cleanRecoveryEmail } : {}),
        ...(recoverySecretDigest ? { recoverySecretDigest } : {}),
        createdAt: new Date().toISOString(),
      });

      const session: TrainerAuthSession = {
        uid: cred.user.uid,
        displayName: profile.displayName,
        usernameKey: profile.usernameKey,
        favoriteClubId: profile.favoriteClubId,
        provider: 'firebase',
        loggedInAt: new Date().toISOString(),
      };
      saveStoredTrainerSession(session);
      return session;
    } catch (err) {
      const code = getFirebaseErrorCode(err);
      if (code === 'auth/email-already-in-use') {
        throw new Error(
          'Já existe um acesso criado com esse nome/login ou e-mail. Mude para "Entrar no Jogo" ou clique em "Esqueci minha senha".'
        );
      }
      // If Email/Password provider isn't toggled yet in Firebase Console (auth/operation-not-allowed)
      // or transient network issue, continue seamlessly to hashed server/account registration.
      if (
        code &&
        code !== 'auth/operation-not-allowed' &&
        code !== 'auth/network-request-failed' &&
        code !== 'auth/configuration-not-found'
      ) {
        if (err instanceof Error && err.message.startsWith('{')) {
          throw err;
        }
      }
    }
  }

  // 2. Server-side salted scrypt registration + local hashed backup
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName,
        password: rawPassword,
        favoriteClubId,
        recoveryEmail: cleanRecoveryEmail,
        recoveryKeyword: rawRecoveryKeyword || undefined,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || 'Não foi possível criar o acesso com esses dados.'
      );
    }

    writeLocalAccountBackup({
      uid: data.uid,
      displayName: data.displayName,
      usernameKey: data.usernameKey,
      passwordDigest: digest,
      favoriteClubId: sanitizeFavoriteClubId(data.favoriteClubId),
      ...(cleanRecoveryEmail ? { recoveryEmail: cleanRecoveryEmail } : {}),
      ...(recoverySecretDigest ? { recoverySecretDigest } : {}),
      createdAt: data.createdAt || new Date().toISOString(),
    });

    if (typeof data?.sessionToken === 'string') {
      inMemoryServerAuthToken = data.sessionToken;
    }

    const session: TrainerAuthSession = {
      uid: data.uid,
      displayName: data.displayName,
      usernameKey: data.usernameKey,
      favoriteClubId: sanitizeFavoriteClubId(data.favoriteClubId),
      provider: 'account',
      loggedInAt: new Date().toISOString(),
    };
    saveStoredTrainerSession(session);
    return session;
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }

    // Offline fallback using local hashed backup
    const backups = readLocalAccountBackups();
    if (backups.some((b) => b.usernameKey === usernameKey)) {
      throw new Error(
        'Já existe um acesso cadastrado com esse nome/login. Clique em "Entrar no Jogo".'
      );
    }
    const uid = `usr_local_${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    writeLocalAccountBackup({
      uid,
      displayName,
      usernameKey,
      passwordDigest: digest,
      favoriteClubId,
      ...(cleanRecoveryEmail ? { recoveryEmail: cleanRecoveryEmail } : {}),
      ...(recoverySecretDigest ? { recoverySecretDigest } : {}),
      createdAt: nowIso,
    });

    const session: TrainerAuthSession = {
      uid,
      displayName,
      usernameKey,
      favoriteClubId,
      provider: 'account',
      loggedInAt: nowIso,
    };
    saveStoredTrainerSession(session);
    return session;
  }
}

export async function loginTrainerWithNameAndPassword(
  rawLogin: string,
  rawPassword: string
): Promise<TrainerAuthSession> {
  const trimmedLogin = rawLogin.trim();
  const usernameKey = normalizeUsernameKey(trimmedLogin);

  if (!trimmedLogin || usernameKey.length < 2) {
    throw new Error('Digite seu nome ou login para entrar no jogo.');
  }

  if (!rawPassword) {
    throw new Error('Digite sua senha para entrar no jogo.');
  }

  let firebaseWrongCreds = false;

  // 1. Try Firebase Email/Password Auth when password >= 6 chars
  if (rawPassword.length >= 6) {
    try {
      const syntheticEmail = toSyntheticEmail(usernameKey, trimmedLogin);
      const cred = await signInWithEmailAndPassword(auth, syntheticEmail, rawPassword);
      const profile = await syncTrainerProfileToFirestore(cred.user);

      const session: TrainerAuthSession = {
        uid: cred.user.uid,
        displayName: profile.displayName,
        usernameKey: profile.usernameKey,
        favoriteClubId: profile.favoriteClubId,
        provider: 'firebase',
        loggedInAt: new Date().toISOString(),
      };
      saveStoredTrainerSession(session);
      return session;
    } catch (err) {
      const code = getFirebaseErrorCode(err);
      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found'
      ) {
        firebaseWrongCreds = true;
      } else if (err instanceof Error && err.message.startsWith('{')) {
        throw err;
      }
    }
  }

  // 2. Check server-side salted scrypt trainer store
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: trimmedLogin, password: rawPassword }),
    });
    const data = await response.json();

    if (response.ok && data?.uid) {
      if (typeof data.sessionToken === 'string') {
        inMemoryServerAuthToken = data.sessionToken;
      }
      const session: TrainerAuthSession = {
        uid: data.uid,
        displayName: data.displayName,
        usernameKey: data.usernameKey,
        favoriteClubId: sanitizeFavoriteClubId(data.favoriteClubId),
        provider: 'account',
        loggedInAt: new Date().toISOString(),
      };
      saveStoredTrainerSession(session);
      return session;
    }

    // Check client hashed backup in case server restarted in ephemeral preview container
    const loginEmailLower = trimmedLogin.toLowerCase();
    const localMatch = readLocalAccountBackups().find(
      (b) =>
        b.usernameKey === usernameKey ||
        b.displayName.toLowerCase() === loginEmailLower ||
        (b.recoveryEmail && b.recoveryEmail === loginEmailLower)
    );

    if (localMatch) {
      const digest = await computeClientDigest(localMatch.usernameKey, rawPassword);
      if (localMatch.passwordDigest !== digest) {
        throw new Error('Senha incorreta. Confira a senha digitada ou clique em "Esqueci senha ou login".');
      }
      const session: TrainerAuthSession = {
        uid: localMatch.uid,
        displayName: localMatch.displayName,
        usernameKey: localMatch.usernameKey,
        favoriteClubId: sanitizeFavoriteClubId(localMatch.favoriteClubId),
        provider: 'account',
        loggedInAt: new Date().toISOString(),
      };
      saveStoredTrainerSession(session);
      return session;
    }

    if (firebaseWrongCreds && response.status === 404) {
      throw new Error(
        'Nome/login não encontrado ou senha incorreta. Use "Esqueci senha ou login" ou clique em "Criar Acesso".'
      );
    }

    throw new Error(
      data?.message || 'Não foi possível entrar. Verifique seu login e senha.'
    );
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }

    const loginEmailLower = trimmedLogin.toLowerCase();
    const localMatch = readLocalAccountBackups().find(
      (b) =>
        b.usernameKey === usernameKey ||
        b.displayName.toLowerCase() === loginEmailLower ||
        (b.recoveryEmail && b.recoveryEmail === loginEmailLower)
    );
    if (!localMatch) {
      throw new Error(
        'Nenhum acesso encontrado para este nome. Clique em "Criar Acesso" para cadastrar.'
      );
    }
    const digest = await computeClientDigest(localMatch.usernameKey, rawPassword);
    if (localMatch.passwordDigest !== digest) {
      throw new Error('Senha incorreta. Confira a senha digitada ou clique em "Esqueci senha ou login".');
    }

    const session: TrainerAuthSession = {
      uid: localMatch.uid,
      displayName: localMatch.displayName,
      usernameKey: localMatch.usernameKey,
      favoriteClubId: sanitizeFavoriteClubId(localMatch.favoriteClubId),
      provider: 'account',
      loggedInAt: new Date().toISOString(),
    };
    saveStoredTrainerSession(session);
    return session;
  }
}

export async function loginTrainerWithGooglePopup(): Promise<TrainerAuthSession> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const profile = await syncTrainerProfileToFirestore(cred.user);
    const session: TrainerAuthSession = {
      uid: cred.user.uid,
      displayName: profile.displayName,
      usernameKey: profile.usernameKey,
      favoriteClubId: profile.favoriteClubId,
      provider: 'google',
      loggedInAt: new Date().toISOString(),
    };
    saveStoredTrainerSession(session);
    return session;
  } catch (err) {
    const code = getFirebaseErrorCode(err);
    if (code === 'auth/popup-closed-by-user') {
      throw new Error('A janela de login com Google foi fechada antes de concluir.');
    }
    if (err instanceof Error && err.message.startsWith('{')) {
      throw err;
    }
    throw new Error('Não foi possível autenticar com o Google agora. Use seu Nome e Senha.');
  }
}

export async function sendFirebasePasswordReset(rawEmail: string): Promise<{ email: string }> {
  const cleanEmail = normalizeRecoveryEmailInput(rawEmail);
  if (!cleanEmail) {
    throw new Error('Digite um endereço de e-mail válido para receber o link de redefinição.');
  }
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return { email: cleanEmail };
  } catch (err) {
    const code = getFirebaseErrorCode(err);
    if (code === 'auth/user-not-found') {
      throw new Error(
        'Não encontramos uma conta com esse e-mail no Firebase. Se você entrou usando nome de login + palavra secreta, use a opção "Redefinir com Palavra Secreta" abaixo.'
      );
    }
    if (code === 'auth/invalid-email') {
      throw new Error('O e-mail informado não parece válido.');
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('Muitas solicitações seguidas. Aguarde alguns minutos antes de tentar novamente.');
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error(
        'O envio por e-mail ainda não está ativado no Firebase. Use a opção "Redefinir com Palavra Secreta" ou entre com sua Conta Google.'
      );
    }
    throw new Error('Não foi possível enviar o e-mail de redefinição agora. Tente novamente em instantes.');
  }
}

export async function resetTrainerPasswordWithRecovery(params: {
  login: string;
  recoveryEmail?: string;
  recoveryKeyword?: string;
  newPassword: string;
}): Promise<{
  displayName: string;
  usernameKey: string;
  updatedServer: boolean;
  updatedLocal: boolean;
}> {
  const trimmedLogin = String(params.login || '').trim();
  const cleanEmail = normalizeRecoveryEmailInput(params.recoveryEmail);
  const normalizedKeyword = normalizeRecoveryKeywordInput(params.recoveryKeyword);
  const newPassword = String(params.newPassword || '');

  if (trimmedLogin.length < 2 && !cleanEmail) {
    throw new Error('Digite seu login (ou e-mail) para identificar sua conta.');
  }
  if (newPassword.length < 4 || newPassword.length > 128) {
    throw new Error('A nova senha deve ter pelo menos 4 caracteres.');
  }
  if (!cleanEmail && normalizedKeyword.length < 3) {
    throw new Error('Informe sua palavra secreta ou o e-mail de recuperação cadastrado.');
  }

  let serverData: { displayName?: string; usernameKey?: string } | null = null;
  let serverErrorMessage: string | null = null;
  let updatedServer = false;

  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: trimmedLogin,
        recoveryEmail: cleanEmail,
        recoveryKeyword: params.recoveryKeyword?.trim() || undefined,
        newPassword,
      }),
    });
    const data = await response.json();
    if (response.ok && data?.ok) {
      updatedServer = true;
      serverData = data;
    } else {
      serverErrorMessage =
        typeof data?.message === 'string' ? data.message : 'Não foi possível validar a recuperação.';
    }
  } catch {
    // Offline or unreachable server — check local device backup below
  }

  // Also check / sync matching local device backup so the user can sign in seamlessly
  const usernameKey = normalizeUsernameKey(serverData?.usernameKey || trimmedLogin);
  const backups = readLocalAccountBackups();
  const localMatch = backups.find(
    (b) =>
      (usernameKey.length >= 2 &&
        (b.usernameKey === usernameKey ||
          b.displayName.toLowerCase() === trimmedLogin.toLowerCase())) ||
      (cleanEmail && b.recoveryEmail === cleanEmail)
  );

  let updatedLocal = false;
  if (localMatch) {
    let localVerified = updatedServer;
    if (!localVerified && localMatch.recoverySecretDigest && normalizedKeyword.length >= 3) {
      const candidateSecretDigest = await computeClientDigest(
        `recovery::${localMatch.usernameKey}`,
        normalizedKeyword
      );
      localVerified = candidateSecretDigest === localMatch.recoverySecretDigest;
    }
    if (!localVerified && !localMatch.recoverySecretDigest && localMatch.recoveryEmail && cleanEmail) {
      localVerified = localMatch.recoveryEmail === cleanEmail;
    }

    if (localVerified) {
      const nextDigest = await computeClientDigest(localMatch.usernameKey, newPassword);
      writeLocalAccountBackup({
        ...localMatch,
        passwordDigest: nextDigest,
      });
      updatedLocal = true;
    }
  }

  if (!updatedServer && !updatedLocal) {
    throw new Error(
      serverErrorMessage ||
        'Não foi possível confirmar os dados de recuperação. Confira seu login, e-mail ou palavra secreta.'
    );
  }

  return {
    displayName: serverData?.displayName || localMatch?.displayName || trimmedLogin,
    usernameKey: serverData?.usernameKey || localMatch?.usernameKey || usernameKey,
    updatedServer,
    updatedLocal,
  };
}

export async function recoverTrainerLoginsByEmail(
  rawEmail: string
): Promise<RecoveredLoginMatch[]> {
  const cleanEmail = normalizeRecoveryEmailInput(rawEmail);
  if (!cleanEmail) {
    throw new Error('Digite um e-mail válido para localizar seu login.');
  }

  const byKey = new Map<string, RecoveredLoginMatch>();

  try {
    const response = await fetch('/api/auth/recover-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryEmail: cleanEmail }),
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.accounts)) {
        for (const item of data.accounts as Array<{ displayName?: string; usernameKey?: string }>) {
          if (item?.displayName && item?.usernameKey) {
            byKey.set(item.usernameKey, {
              displayName: item.displayName,
              usernameKey: item.usernameKey,
              source: 'server',
            });
          }
        }
      }
    }
  } catch {
    // Fallback gracefully to local device accounts below
  }

  for (const localAcc of readLocalAccountBackups()) {
    if (
      localAcc.recoveryEmail === cleanEmail ||
      localAcc.displayName.toLowerCase() === cleanEmail
    ) {
      if (!byKey.has(localAcc.usernameKey)) {
        byKey.set(localAcc.usernameKey, {
          displayName: localAcc.displayName,
          usernameKey: localAcc.usernameKey,
          source: 'device',
        });
      }
    }
  }

  return Array.from(byKey.values());
}

export function listDeviceSavedTrainerLogins(): DeviceSavedLoginHint[] {
  return readLocalAccountBackups().map((acc) => ({
    displayName: acc.displayName,
    usernameKey: acc.usernameKey,
    hasRecoveryWord: Boolean(acc.recoverySecretDigest),
    maskedEmail: maskEmailForDisplay(acc.recoveryEmail),
  }));
}

export async function syncTrainerFavoriteClub(
  session: TrainerAuthSession | null,
  clubId: string
): Promise<void> {
  if (!session) return;
  const safeClubId = sanitizeFavoriteClubId(clubId);
  if (session.favoriteClubId === safeClubId) return;

  const updatedSession: TrainerAuthSession = {
    ...session,
    favoriteClubId: safeClubId,
  };
  saveStoredTrainerSession(updatedSession);

  if (auth.currentUser && auth.currentUser.uid === session.uid) {
    await syncTrainerProfileToFirestore(
      auth.currentUser,
      session.displayName,
      safeClubId
    );
    void syncTrainerProfileToSql(auth.currentUser, {
      displayName: session.displayName,
      usernameKey: session.usernameKey,
      favoriteClubId: safeClubId,
    });
  }

  if (inMemoryServerAuthToken) {
    fetch('/api/auth/club', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inMemoryServerAuthToken}`,
      },
      body: JSON.stringify({ uid: session.uid, favoriteClubId: safeClubId }),
    }).catch(() => {});
  }
}

export async function logoutTrainerAccount(): Promise<void> {
  inMemoryServerAuthToken = null;
  saveStoredTrainerSession(null);
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch {
    // Ignore sign-out errors
  }
}

export function useTrainerAuth() {
  const [session, setSession] = useState<TrainerAuthSession | null>(() =>
    loadStoredTrainerSession()
  );
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(false);

  useEffect(() => {
    const handleSessionChange: SessionListener = (next) => {
      setSession(next);
    };
    sessionListeners.add(handleSessionChange);

    const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const existingLocal = loadStoredTrainerSession();
          const profile = await syncTrainerProfileToFirestore(
            firebaseUser,
            existingLocal?.uid === firebaseUser.uid ? existingLocal.displayName : undefined,
            existingLocal?.uid === firebaseUser.uid ? existingLocal.favoriteClubId : undefined
          );
          const providerType: TrainerAuthSession['provider'] = firebaseUser.providerData.some(
            (p) => p.providerId === 'google.com'
          )
            ? 'google'
            : 'firebase';

          const synced: TrainerAuthSession = {
            uid: firebaseUser.uid,
            displayName: profile.displayName,
            usernameKey: profile.usernameKey,
            favoriteClubId: profile.favoriteClubId,
            provider: providerType,
            loggedInAt: existingLocal?.loggedInAt || new Date().toISOString(),
          };
          saveStoredTrainerSession(synced);
        } catch (err) {
          console.error('[Trainer Profile Sync Error]:', err);
        }
      }
      setIsCheckingAuth(false);
    });

    return () => {
      sessionListeners.delete(handleSessionChange);
      unsubscribeFirebase();
    };
  }, []);

  const logout = useCallback(async () => {
    await logoutTrainerAccount();
  }, []);

  return {
    session,
    isCheckingAuth,
    logout,
  };
}
