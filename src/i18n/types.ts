export type Language = 'en' | 'hi';

export interface I18nContextType {
  readonly language: Language;
  readonly setLanguage: (lang: Language) => void;
  readonly toggleLanguage: () => void;
  readonly t: (
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => string;
}

export type TranslationDict = Record<string, string>;
