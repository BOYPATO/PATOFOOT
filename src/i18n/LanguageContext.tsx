import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { GameLanguage } from '../utils/settingsEngine';
import { translateText } from './translations';
import { applyDomLanguage, stopDomLanguageObserver } from './domTranslator';

interface LanguageContextValue {
  language: GameLanguage;
  setLanguage: (lang: GameLanguage) => void;
  t: (ptText: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'pt-BR',
  setLanguage: () => {},
  t: (ptText) => ptText,
});

interface LanguageProviderProps {
  language: GameLanguage;
  onChangeLanguage: (lang: GameLanguage) => void;
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  language,
  onChangeLanguage,
  children,
}) => {
  useEffect(() => {
    applyDomLanguage(language);
    return () => {
      stopDomLanguageObserver();
    };
  }, [language]);

  const t = useCallback(
    (ptText: string) => translateText(ptText, language),
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage: onChangeLanguage,
      t,
    }),
    [language, onChangeLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
