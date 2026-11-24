import React, { useEffect, useRef, useState } from 'react';
import { GameSave } from '../types/game';
import { soundEngine } from '../services/soundEngine';
import {
  CAREER_SLOT_NUMBERS,
  SaveSlotNumber,
  SaveSlotSummary,
  buildSaveSummary,
  deleteCareerSave,
  downloadSaveAsJsonFile,
  exportSlotAsJsonFile,
  getAllSlotSummariesSync,
  loadCareerSave,
  persistCareerSave,
  refreshSaveSlotSummaries,
  validateAndParseImportedSaveJson,
} from '../utils/saveStorageEngine';
import {
  CloudSaveSummary,
  CloudSlotId,
  canUseCloudSaves,
  deleteCloudSave,
  listCloudSaves,
  loadCareerFromCloud,
  saveCareerToCloud,
} from '../services/cloudSaveService';
import { useTrainerAuth } from '../services/trainerAuthService';
import {
  Save,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Settings,
  RotateCcw,
  Database,
  Cloud,
  RefreshCw,
  X,
} from 'lucide-react';

interface SaveLoadModalProps {
  currentSave?: GameSave | null;
  autoSaveEnabled?: boolean;
  autoSaveIntervalMinutes?: 0 | 5 | 10 | 30 | 60;
  onLoadSave: (save: GameSave) => void;
  onSaveAndExitToTitle?: () => void;
  onOpenSettings?: () => void;
  onStartAnotherCareer?: () => void;
  onClose: () => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  currentSave = null,
  autoSaveEnabled = true,
  autoSaveIntervalMinutes = 0,
  onLoadSave,
  onSaveAndExitToTitle,
  onOpenSettings,
  onStartAnotherCareer,
  onClose,
}) => {
  const trainerSession = useTrainerAuth();
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<number | null>(null);
  const [confirmDeleteCloud, setConfirmDeleteCloud] = useState<CloudSlotId | null>(null);
  const [confirmNewCareer, setConfirmNewCareer] = useState<boolean>(false);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [busyCloudSlot, setBusyCloudSlot] = useState<CloudSlotId | null>(null);
  const [cloudLoading, setCloudLoading] = useState<boolean>(false);
  const [cloudSaves, setCloudSaves] = useState<CloudSaveSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudAvailable = canUseCloudSaves() && Boolean(trainerSession.session);

  const showMessage = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  const [slots, setSlots] = useState<Record<SaveSlotNumber, SaveSlotSummary | null>>(() =>
    getAllSlotSummariesSync()
  );

  const refreshCloudList = async () => {
    if (!canUseCloudSaves()) {
      setCloudSaves([]);
      return;
    }
    setCloudLoading(true);
    try {
      const list = await listCloudSaves();
      setCloudSaves(list);
    } catch {
      setCloudSaves([]);
    } finally {
      setCloudLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void refreshSaveSlotSummaries().then(() => {
      if (!active) return;
      setSlots(getAllSlotSummariesSync());
    });
    if (canUseCloudSaves()) {
      void refreshCloudList();
    }
    return () => {
      active = false;
    };
  }, [trainerSession.session?.uid]);

  const activeClub = currentSave
    ? currentSave.clubs.find((c) => c.id === currentSave.userClubId) || currentSave.clubs[0]
    : null;

  const handleSaveToSlot = async (slotNum: SaveSlotNumber) => {
    if (!currentSave || busySlot !== null) return;
    soundEngine.playClick();
    setBusySlot(slotNum);
    const clubShort =
      currentSave.clubs.find((c) => c.id === currentSave.userClubId)?.shortName || 'Clube';
    const saveToStore: GameSave = {
      ...currentSave,
      savedAt: new Date().toLocaleString('pt-BR'),
      saveName: `Espaço ${slotNum} · ${clubShort}`,
    };
    const slotKey = `brasfoot_slot_${slotNum}` as const;

    const savedOk = await persistCareerSave(slotKey, saveToStore);
    if (autoSaveEnabled) {
      await persistCareerSave('brasfoot_autosave', saveToStore);
    }
    setBusySlot(null);

    if (savedOk) {
      const summary = buildSaveSummary(slotKey, saveToStore);
      setSlots((prev) => ({ ...prev, [slotNum]: summary }));
      showMessage('ok', `Progresso salvo no Espaço ${slotNum} com sucesso!`);
    } else {
      showMessage('err', 'Não foi possível gravar no navegador. Exporte seu backup em .json.');
    }
  };

  const handleLoadFromSlot = async (slotNum: SaveSlotNumber) => {
    if (busySlot !== null) return;
    soundEngine.playClick();
    setBusySlot(slotNum);
    const save = await loadCareerSave(`brasfoot_slot_${slotNum}`);
    setBusySlot(null);

    if (save) {
      onLoadSave(save);
      showMessage('ok', `Espaço ${slotNum} carregado com sucesso!`);
      setTimeout(() => {
        onClose();
      }, 450);
    } else {
      showMessage('err', `Não foi possível encontrar os dados salvos no Espaço ${slotNum}.`);
    }
  };

  const handleDeleteSlot = async (slotNum: SaveSlotNumber) => {
    soundEngine.playClick();
    await deleteCareerSave(`brasfoot_slot_${slotNum}`);
    setSlots((prev) => ({ ...prev, [slotNum]: null }));
    setConfirmDeleteSlot(null);
    showMessage('ok', `Espaço ${slotNum} removido.`);
  };

  const handleSaveCloud = async (cloudSlotId: CloudSlotId) => {
    if (!currentSave || busyCloudSlot !== null) return;
    soundEngine.playClick();
    setBusyCloudSlot(cloudSlotId);
    try {
      const clubShort =
        currentSave.clubs.find((c) => c.id === currentSave.userClubId)?.shortName || 'Clube';
      const savePayload: GameSave = {
        ...currentSave,
        savedAt: new Date().toLocaleString('pt-BR'),
        saveName: `Nuvem (${cloudSlotId}) · ${clubShort}`,
      };
      const summary = await saveCareerToCloud(cloudSlotId, savePayload);
      setCloudSaves((prev) => [
        ...prev.filter((s) => s.slotId !== cloudSlotId),
        summary,
      ]);
      showMessage(
        'ok',
        `Carreira sincronizada na nuvem (${summary.partCount} blocos) com segurança!`
      );
    } catch {
      showMessage('err', 'Falha ao enviar save para a nuvem. Verifique sua conexão.');
    } finally {
      setBusyCloudSlot(null);
    }
  };

  const handleLoadCloud = async (cloudSlotId: CloudSlotId) => {
    if (busyCloudSlot !== null) return;
    soundEngine.playClick();
    setBusyCloudSlot(cloudSlotId);
    try {
      const loaded = await loadCareerFromCloud(cloudSlotId);
      if (loaded) {
        onLoadSave(loaded);
        soundEngine.playFanfare();
        showMessage('ok', 'Carreira da nuvem carregada com sucesso!');
        setTimeout(() => onClose(), 550);
      } else {
        showMessage('err', 'Nenhum dado válido encontrado neste slot da nuvem.');
      }
    } catch {
      showMessage('err', 'Erro ao baixar save da nuvem.');
    } finally {
      setBusyCloudSlot(null);
    }
  };

  const handleDeleteCloudSlot = async (cloudSlotId: CloudSlotId) => {
    soundEngine.playClick();
    setBusyCloudSlot(cloudSlotId);
    try {
      await deleteCloudSave(cloudSlotId);
      setCloudSaves((prev) => prev.filter((s) => s.slotId !== cloudSlotId));
      setConfirmDeleteCloud(null);
      showMessage('ok', 'Save em nuvem excluído.');
    } catch {
      showMessage('err', 'Erro ao excluir save em nuvem.');
    } finally {
      setBusyCloudSlot(null);
    }
  };

  const handleExportJSON = () => {
    if (!currentSave) return;
    soundEngine.playClick();
    const ok = downloadSaveAsJsonFile(currentSave);
    if (ok) {
      showMessage('ok', 'Arquivo .json exportado com sucesso!');
    } else {
      showMessage('err', 'Não foi possível gerar o arquivo de backup .json.');
    }
  };

  const handleExportSlotJSON = async (slotNum: SaveSlotNumber) => {
    if (busySlot !== null) return;
    soundEngine.playClick();
    setBusySlot(slotNum);
    const ok = await exportSlotAsJsonFile(`brasfoot_slot_${slotNum}`);
    setBusySlot(null);
    if (ok) {
      showMessage('ok', `Backup do Espaço ${slotNum} exportado em .json com sucesso!`);
    } else {
      showMessage('err', `Não foi possível exportar o Espaço ${slotNum}.`);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const validation = validateAndParseImportedSaveJson(String(event.target?.result || ''));
      if (validation.ok && validation.save) {
        onLoadSave(validation.save);
        soundEngine.playFanfare();
        showMessage('ok', 'Backup .json validado e carregado com sucesso!');
        setTimeout(() => onClose(), 800);
      } else {
        showMessage('err', validation.error || 'Arquivo de save inválido ou incompatível.');
      }
    };
    reader.onerror = () => {
      showMessage('err', 'Falha ao ler o arquivo selecionado do dispositivo.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const renderSlot = (slotNum: SaveSlotNumber, slotData: SaveSlotSummary | null) => {
    const isBusy = busySlot === slotNum;

    return (
      <div
        key={slotNum}
        className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          {slotData ? (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs border border-white/15 shrink-0"
              style={{
                backgroundColor: slotData.clubColors.primary,
                color: slotData.clubColors.text,
              }}
            >
              {slotData.clubInitials}
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-mono text-xs text-slate-500 shrink-0 tabular-nums">
              0{slotNum}
            </div>
          )}

          <div className="min-w-0">
            <h4 className="font-bold text-white text-sm truncate">
              {slotData ? `${slotData.clubName || slotData.saveName}` : `Slot ${slotNum}`}
            </h4>
            {slotData ? (
              <p className="text-slate-400 mt-0.5 truncate tabular-nums">
                {slotData.managerName} · Ano {slotData.currentSeasonYear} · Rodada{' '}
                {slotData.currentRound} · {slotData.savedAt}
              </p>
            ) : (
              <p className="text-slate-500 mt-0.5">Espaço disponível para gravação</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentSave && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleSaveToSlot(slotNum)}
              className="px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 disabled:opacity-60 text-slate-950 font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isBusy ? 'Salvando...' : 'Salvar'}
            </button>
          )}

          {slotData && (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleLoadFromSlot(slotNum)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 border border-slate-700 text-white font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Carregar
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleExportSlotJSON(slotNum)}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-sky-500/20 border border-slate-700 hover:border-sky-500/40 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                title={`Exportar Slot ${slotNum} como arquivo .json`}
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {confirmDeleteSlot === slotNum ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteSlot(slotNum)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Confirmar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setConfirmDeleteSlot(slotNum);
                  }}
                  className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors cursor-pointer"
                  title="Excluir slot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderCloudSlot = (slotId: CloudSlotId, label: string) => {
    const cloudData = cloudSaves.find((s) => s.slotId === slotId);
    const isBusy = busyCloudSlot === slotId;

    return (
      <div
        key={slotId}
        className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          {cloudData ? (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs border border-white/15 shrink-0"
              style={{
                backgroundColor: cloudData.clubPrimaryColor,
                color: cloudData.clubSecondaryColor,
              }}
            >
              {cloudData.clubShortName.slice(0, 3).toUpperCase()}
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4 text-slate-600" />
            </div>
          )}

          <div className="min-w-0">
            <div className="font-bold text-white text-sm truncate">
              {cloudData ? `${cloudData.clubName} (${label})` : label}
            </div>
            {cloudData ? (
              <p className="text-slate-400 mt-0.5 truncate tabular-nums">
                {cloudData.managerName} · Ano {cloudData.seasonYear} · Rodada {cloudData.round} ·{' '}
                {new Date(cloudData.updatedAtIso).toLocaleDateString('pt-BR')}
              </p>
            ) : (
              <p className="text-slate-500 mt-0.5">Slot em nuvem vazio</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentSave && (
            <button
              type="button"
              disabled={isBusy || busyCloudSlot !== null}
              onClick={() => void handleSaveCloud(slotId)}
              className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 text-slate-950 font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isBusy ? 'Enviando...' : 'Salvar Nuvem'}
            </button>
          )}

          {cloudData && (
            <>
              <button
                type="button"
                disabled={isBusy || busyCloudSlot !== null}
                onClick={() => void handleLoadCloud(slotId)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 border border-slate-700 text-white font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isBusy ? 'Baixando...' : 'Baixar'}
              </button>

              {confirmDeleteCloud === slotId ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleDeleteCloudSlot(slotId)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Confirmar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setConfirmDeleteCloud(slotId);
                  }}
                  className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors cursor-pointer"
                  title="Excluir save na nuvem"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-5 sm:p-6 my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Save className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-white">
                {currentSave ? 'Menu da Carreira & Saves' : 'Carregar Carreira Salva'}
              </h3>
              <p className="text-xs text-slate-400">
                Gerencie slots locais, sincronização em nuvem ou backups .json
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              feedback.type === 'ok'
                ? 'bg-sky-950/50 border-sky-500/30 text-sky-300'
                : 'bg-rose-950/50 border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-5">
          {/* Active Career Quick Save & Exit to Title Screen */}
          {currentSave && activeClub && onSaveAndExitToTitle && (
            <div className="bg-slate-900/80 border border-sky-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm border border-white/20 shrink-0"
                  style={{
                    backgroundColor: activeClub.colors.primary,
                    color: activeClub.colors.text,
                  }}
                >
                  {activeClub.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {activeClub.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate tabular-nums">
                    {currentSave.managerName} · Ano {currentSave.currentSeasonYear} · Rodada{' '}
                    {currentSave.currentRound}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onSaveAndExitToTitle();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{autoSaveEnabled ? 'Salvar e Sair ao Início' : 'Sair ao Início'}</span>
              </button>
            </div>
          )}

          {/* Save Slots 1-5 (Local IndexedDB) */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-300">
                Espaços Locais no Navegador (5 Carreiras)
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Database
                  className={`w-3.5 h-3.5 shrink-0 ${
                    autoSaveEnabled ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
                <span>
                  Auto-Save IndexedDB:{' '}
                  <strong className={autoSaveEnabled ? 'text-emerald-300' : 'text-amber-300'}>
                    {autoSaveEnabled
                      ? autoSaveIntervalMinutes === 0
                        ? 'Ativo · Contínuo'
                        : `Ativo · ${autoSaveIntervalMinutes} min`
                      : 'Desativado'}
                  </strong>
                </span>
              </div>
            </div>
            {CAREER_SLOT_NUMBERS.map((slotNum) => renderSlot(slotNum, slots[slotNum]))}
          </div>

          {/* Cloud Saves (Firestore) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Carreiras na Nuvem ({trainerSession.session?.displayName || 'Desconectado'})</span>
              </div>
              {cloudAvailable && (
                <button
                  type="button"
                  disabled={cloudLoading}
                  onClick={() => void refreshCloudList()}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${cloudLoading ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              )}
            </div>

            {cloudAvailable ? (
              <div className="space-y-2">
                {renderCloudSlot('slot_1', 'Nuvem Espaço 1')}
                {renderCloudSlot('slot_2', 'Nuvem Espaço 2')}
                {renderCloudSlot('slot_3', 'Nuvem Espaço 3')}
                {renderCloudSlot('slot_4', 'Nuvem Espaço 4')}
                {renderCloudSlot('slot_5', 'Nuvem Espaço 5')}
                {renderCloudSlot('autosave', 'Auto-Save Nuvem')}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                Entre com sua conta na Tela Inicial para salvar e carregar suas carreiras na nuvem em qualquer dispositivo.
              </div>
            )}
          </div>

          {/* JSON Export & Import */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
            <h4 className="font-semibold text-slate-300">Backup Externo (.json)</h4>
            <div className="flex flex-wrap items-center gap-2">
              {currentSave && (
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Exportar Save (.json)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Importar Arquivo (.json)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                  onOpenSettings();
                }}
                className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-sky-400" />
                <span>Configurações</span>
              </button>
            )}

            {currentSave && onStartAnotherCareer && (
              <>
                {!confirmNewCareer ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setConfirmNewCareer(true);
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-slate-900 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Começar Outra Carreira</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onClose();
                        onStartAnotherCareer();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Escolher Novo Clube
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmNewCareer(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
