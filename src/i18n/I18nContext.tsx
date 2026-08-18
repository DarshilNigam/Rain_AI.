import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, I18nContextType } from './types';
import { en } from './en';
import { hi } from './hi';

const STORAGE_KEY = 'rai_language';

const dictionaries = {
  en,
  hi,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'hi') {
        return stored;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'en' ? 'hi' : 'en'));
  }, []);

  const t = useCallback(
    (
      key: string,
      fallbackOrParams?: string | Record<string, string | number>,
      paramsArg?: Record<string, string | number>
    ): string => {
      let fallback: string | undefined;
      let params: Record<string, string | number> | undefined;

      if (typeof fallbackOrParams === 'string') {
        fallback = fallbackOrParams;
        params = paramsArg;
      } else {
        params = fallbackOrParams;
      }

      const activeDict = dictionaries[language] || en;
      let template = activeDict[key];

      // Fallback to English dictionary if key missing in active language
      if (!template && language !== 'en') {
        template = en[key];
      }

      // If still missing, use custom fallback if provided, otherwise key
      if (!template) {
        template = fallback || key;
      }

      if (!params) {
        return template;
      }

      // Parameter interpolation: replace {paramName} with value
      return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
        return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }, template);
    },
    [language]
  );

  const value: I18nContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
