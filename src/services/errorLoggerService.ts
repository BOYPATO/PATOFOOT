import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  registerFirestoreErrorReporter,
} from '../firebase';

export type ErrorLogSeverity = 'critical' | 'error' | 'warning';
export type ErrorLogSource =
  | 'react_boundary'
  | 'window_error'
  | 'unhandled_rejection'
  | 'firestore'
  | 'game_engine'
  | 'manual_test';
export type ErrorLogStatus = 'open' | 'resolved' | 'ignored';
export type ErrorLogDeviceType = 'mobile' | 'tablet' | 'desktop';
export type ErrorLogDisplayMode = 'browser' | 'pwa_standalone';

export interface ErrorLogRecord {
  logId: string;
  uid: string;
  fingerprint: string;
  severity: ErrorLogSeverity;
  source: ErrorLogSource;
  message: string;
  stack: string;
  route: string;
  appVersion: string;
  deviceType: ErrorLogDeviceType;
  os: string;
  browser: string;
  displayMode: ErrorLogDisplayMode;
  viewport: string;
  userAgent: string;
  online: boolean;
  status: ErrorLogStatus;
  createdAtMs: number;
  updatedAtMs: number;
}

interface QueuedErrorPayload {
  logId: string;
  fingerprint: string;
  severity: ErrorLogSeverity;
  source: ErrorLogSource;
  message: string;
  stack: string;
  route: string;
  appVersion: string;
  deviceType: ErrorLogDeviceType;
  os: string;
  browser: string;
  displayMode: ErrorLogDisplayMode;
  viewport: string;
  userAgent: string;
  online: boolean;
  queuedAtMs: number;
}

export interface CaptureErrorInput {
  error?: unknown;
  message?: string;
  stack?: string;
  severity?: ErrorLogSeverity;
  source: ErrorLogSource;
  routeOverride?: string;
}

const APP_VERSION = '1.0.0';
const ADMIN_EMAIL = 'alexdantas001@gmail.com';
const QUEUE_STORAGE_KEY = 'patofoot_error_log_queue_v1';
const MAX_QUEUED_LOGS = 25;
const MAX_LOGS_PER_MINUTE = 12;
const DEDUPE_WINDOW_MS = 60_000;

let isGlobalMonitoringInstalled = false;
let isFlushingQueue = false;
let activeGameContext = 'title';
const recentFingerprints = new Map<string, number>();
let recentWriteTimestamps: number[] = [];

function sanitizeString(input: string, maxLen: number, fallback: string): string {
  const cleaned = (input || '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeIdToken(input: string, maxLen: number, fallback: string): string {
  const cleaned = (input || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, maxLen);
  return cleaned.length >= 4 ? cleaned : fallback;
}

function stableHash32(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function detectDeviceTelemetry(): {
  deviceType: ErrorLogDeviceType;
  os: string;
  browser: string;
  displayMode: ErrorLogDisplayMode;
  viewport: string;
  userAgent: string;
  online: boolean;
} {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceType: 'desktop',
      os: 'Server',
      browser: 'Runtime',
      displayMode: 'browser',
      viewport: '1280x720',
      userAgent: 'ServerRuntime',
      online: true,
    };
  }

  const ua = navigator.userAgent || 'Unknown-UA';
  const width = Math.max(100, Math.min(99999, Math.round(window.innerWidth || 390)));
  const height = Math.max(100, Math.min(99999, Math.round(window.innerHeight || 844)));

  const isTablet =
    /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
    (width >= 768 && width <= 1024 && 'ontouchstart' in window);
  const isMobile =
    !isTablet &&
    (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || width < 768);
  const deviceType: ErrorLogDeviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  let os = 'Desconhecido';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Outro';
  if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/wv\)|WebView/i.test(ua)) browser = 'WebView';

  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return {
    deviceType,
    os: sanitizeString(os, 40, 'Desconhecido'),
    browser: sanitizeString(browser, 40, 'Outro'),
    displayMode: isStandalone ? 'pwa_standalone' : 'browser',
    viewport: `${width}x${height}`,
    userAgent: sanitizeString(ua, 240, 'Unknown-UA'),
    online: navigator.onLine !== false,
  };
}

function buildRouteString(routeOverride?: string): string {
  if (routeOverride) {
    return sanitizeString(routeOverride, 120, '/');
  }
  const pathname = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  const raw = activeGameContext ? `${pathname} · ${activeGameContext}` : pathname;
  return sanitizeString(raw, 120, '/');
}

function isBenignNoiseError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('resizeobserver loop') ||
    lower.includes('websocket') ||
    lower.includes('script error.') ||
    lower.includes('errorlogs/')
  );
}

function readQueue(): QueuedErrorPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUED_LOGS) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedErrorPayload[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(QUEUE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items.slice(-MAX_QUEUED_LOGS)));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function isSignedInAndEligible(): boolean {
  const user = auth.currentUser;
  if (!user || !user.uid) return false;
  const hasPasswordProvider = user.providerData.some((p) => p.providerId === 'password');
  return user.emailVerified === true || hasPasswordProvider;
}

export function isErrorLogsAdmin(): boolean {
  const user = auth.currentUser;
  return Boolean(
    user &&
      user.emailVerified === true &&
      user.email &&
      user.email.toLowerCase() === ADMIN_EMAIL
  );
}

export function getPendingErrorLogCount(): number {
  return readQueue().length;
}

export function setErrorLogGameContext(contextLabel: string): void {
  activeGameContext = sanitizeString(contextLabel, 60, 'game');
}

async function writeSingleErrorLogToFirestore(item: QueuedErrorPayload): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !isSignedInAndEligible()) return false;

  const safeUid = sanitizeIdToken(user.uid, 128, 'user');
  const safeLogId = sanitizeIdToken(item.logId, 64, `err_${Date.now().toString(36)}`);
  const docPath = `errorLogs/${safeLogId}`;

  const firestoreDoc = {
    logId: safeLogId,
    uid: safeUid,
    fingerprint: sanitizeIdToken(item.fingerprint, 80, 'fp_unknown'),
    severity: item.severity,
    source: item.source,
    message: sanitizeString(item.message, 500, 'Erro inesperado no aplicativo'),
    stack: (item.stack || '').replace(/\u0000/g, '').trim().slice(0, 2000),
    route: sanitizeString(item.route, 120, '/'),
    appVersion: APP_VERSION,
    deviceType: item.deviceType,
    os: sanitizeString(item.os, 40, 'Desconhecido'),
    browser: sanitizeString(item.browser, 40, 'Outro'),
    displayMode: item.displayMode,
    viewport: /^[0-9]{2,5}x[0-9]{2,5}$/.test(item.viewport) ? item.viewport : '390x844',
    userAgent: sanitizeString(item.userAgent, 240, 'Unknown-UA'),
    online: Boolean(item.online),
    status: 'open' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'errorLogs', safeLogId), firestoreDoc);
    return true;
  } catch (err) {
    // Log silently without re-entering captureErrorLog to avoid infinite recursion
    console.warn(`[PATOFOOT ErrorLogger] Falha ao enviar ${docPath}:`, err);
    return false;
  }
}

export async function flushQueuedErrorLogs(): Promise<number> {
  if (isFlushingQueue) return 0;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
  if (!isSignedInAndEligible()) return 0;

  const queue = readQueue();
  if (queue.length === 0) return 0;

  isFlushingQueue = true;
  let sentCount = 0;
  const remaining: QueuedErrorPayload[] = [];

  try {
    for (const item of queue) {
      const ok = await writeSingleErrorLogToFirestore(item);
      if (ok) {
        sentCount += 1;
      } else {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
  } finally {
    isFlushingQueue = false;
  }
  return sentCount;
}

export async function captureErrorLog(input: CaptureErrorInput): Promise<boolean> {
  const errObj = input.error instanceof Error ? input.error : null;
  const rawMessage =
    input.message ||
    errObj?.message ||
    (typeof input.error === 'string' ? input.error : 'Exceção crítica sem mensagem');
  const message = sanitizeString(rawMessage, 500, 'Exceção crítica sem mensagem');

  if (input.source !== 'manual_test' && isBenignNoiseError(message)) {
    return false;
  }

  const rawStack = input.stack || errObj?.stack || '';
  const stack = rawStack.replace(/\u0000/g, '').trim().slice(0, 2000);
  const severity: ErrorLogSeverity = input.severity || 'critical';
  const route = buildRouteString(input.routeOverride);
  const telemetry = detectDeviceTelemetry();

  const fingerprintBase = `${input.source}|${message.slice(0, 120)}|${telemetry.os}|${telemetry.deviceType}`;
  const fingerprint = `fp_${stableHash32(fingerprintBase)}`;
  const now = Date.now();

  if (input.source !== 'manual_test') {
    const lastSeen = recentFingerprints.get(fingerprint);
    if (lastSeen && now - lastSeen < DEDUPE_WINDOW_MS) {
      return false;
    }
    recentFingerprints.set(fingerprint, now);

    recentWriteTimestamps = recentWriteTimestamps.filter((ts) => now - ts < 60_000);
    if (recentWriteTimestamps.length >= MAX_LOGS_PER_MINUTE) {
      return false;
    }
    recentWriteTimestamps.push(now);
  }

  const randSuffix = Math.random().toString(36).slice(2, 8);
  const logId = `err_${now.toString(36)}_${randSuffix}`;

  const payload: QueuedErrorPayload = {
    logId,
    fingerprint,
    severity,
    source: input.source,
    message,
    stack,
    route,
    appVersion: APP_VERSION,
    deviceType: telemetry.deviceType,
    os: telemetry.os,
    browser: telemetry.browser,
    displayMode: telemetry.displayMode,
    viewport: telemetry.viewport,
    userAgent: telemetry.userAgent,
    online: telemetry.online,
    queuedAtMs: now,
  };

  if (isSignedInAndEligible() && telemetry.online) {
    const sent = await writeSingleErrorLogToFirestore(payload);
    if (sent) {
      return true;
    }
  }

  // Buffer locally until user signs in or network recovers
  const queue = readQueue();
  queue.push(payload);
  writeQueue(queue);
  return false;
}

export function installGlobalErrorMonitoring(): void {
  if (isGlobalMonitoringInstalled || typeof window === 'undefined') return;
  isGlobalMonitoringInstalled = true;

  registerFirestoreErrorReporter((info) => {
    void captureErrorLog({
      message: `Firestore ${info.operationType} (${info.path || 'desconhecido'}): ${info.error}`,
      stack: `Operation: ${info.operationType}\nPath: ${info.path || 'null'}\nUser: ${info.authInfo.userId || 'anon'}`,
      severity: 'error',
      source: 'firestore',
    });
  });

  window.addEventListener('error', (event: ErrorEvent) => {
    const message = event.message || event.error?.message || 'Erro global não tratado';
    const locationHint = event.filename
      ? `\nArquivo: ${event.filename}:${event.lineno || 0}:${event.colno || 0}`
      : '';
    const stack = `${event.error?.stack || ''}${locationHint}`.trim();

    void captureErrorLog({
      error: event.error,
      message,
      stack,
      severity: 'critical',
      source: 'window_error',
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
        ? reason
        : 'Promise rejeitada sem tratamento';
    const stack = reason instanceof Error ? reason.stack || '' : '';

    void captureErrorLog({
      error: reason,
      message,
      stack,
      severity: 'error',
      source: 'unhandled_rejection',
    });
  });

  window.addEventListener('online', () => {
    void flushQueuedErrorLogs();
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      void flushQueuedErrorLogs();
    }
  });
}

function parseTimestampMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (val && typeof (val as { toMillis?: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

export function subscribeToErrorLogs(
  onUpdate: (logs: ErrorLogRecord[], scope: 'global_admin' | 'user_own') => void,
  onPermissionOrQueryError?: (message: string) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !isSignedInAndEligible()) {
    onUpdate([], 'user_own');
    return () => {};
  }

  const adminMode = isErrorLogsAdmin();
  const path = 'errorLogs';
  const q = adminMode
    ? query(collection(db, path), orderBy('createdAt', 'desc'), limit(100))
    : query(collection(db, path), where('uid', '==', user.uid), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: ErrorLogRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          logId: String(d.logId || docSnap.id),
          uid: String(d.uid || ''),
          fingerprint: String(d.fingerprint || ''),
          severity: (d.severity as ErrorLogSeverity) || 'error',
          source: (d.source as ErrorLogSource) || 'window_error',
          message: String(d.message || ''),
          stack: String(d.stack || ''),
          route: String(d.route || '/'),
          appVersion: String(d.appVersion || APP_VERSION),
          deviceType: (d.deviceType as ErrorLogDeviceType) || 'desktop',
          os: String(d.os || 'Desconhecido'),
          browser: String(d.browser || 'Outro'),
          displayMode: (d.displayMode as ErrorLogDisplayMode) || 'browser',
          viewport: String(d.viewport || '0x0'),
          userAgent: String(d.userAgent || ''),
          online: Boolean(d.online),
          status: (d.status as ErrorLogStatus) || 'open',
          createdAtMs: parseTimestampMs(d.createdAt),
          updatedAtMs: parseTimestampMs(d.updatedAt),
        };
      });

      records.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onUpdate(records, adminMode ? 'global_admin' : 'user_own');
    },
    (error) => {
      if (onPermissionOrQueryError) {
        onPermissionOrQueryError(
          error instanceof Error ? error.message : 'Erro ao assinar logs do Firebase.'
        );
      }
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Structured Firestore error already logged by handleFirestoreError
      }
    }
  );
}

export async function updateErrorLogStatus(
  logId: string,
  status: ErrorLogStatus
): Promise<void> {
  if (!isErrorLogsAdmin()) {
    throw new Error('Apenas administradores verificados podem alterar o status dos logs.');
  }
  const safeLogId = sanitizeIdToken(logId, 64, logId);
  const path = `errorLogs/${safeLogId}`;
  try {
    await updateDoc(doc(db, 'errorLogs', safeLogId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteErrorLog(logId: string): Promise<void> {
  if (!isErrorLogsAdmin()) {
    throw new Error('Apenas administradores verificados podem excluir logs.');
  }
  const safeLogId = sanitizeIdToken(logId, 64, logId);
  const path = `errorLogs/${safeLogId}`;
  try {
    await deleteDoc(doc(db, 'errorLogs', safeLogId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
