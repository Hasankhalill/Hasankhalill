import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { setActiveLocale } from "@/domain/format";
import { copy, type CopyKey, type Locale } from "@/i18n/copy";

const STORAGE_KEY = "jazzar-locale";

type LocaleValue = {
  locale: Locale;
  isRTL: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: CopyKey) => string;
};

const LocaleContext = createContext<LocaleValue | null>(null);

function readStoredLocale(): Locale {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return "en";
  return localStorage.getItem(STORAGE_KEY) === "ar" ? "ar" : "en";
}

function applyLocale(next: Locale) {
  setActiveLocale(next);
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.lang = next === "ar" ? "ar" : "en";
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, next);
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = readStoredLocale();
    applyLocale(stored);
    return stored;
  });

  useEffect(() => {
    applyLocale(locale);
  }, [locale]);

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      isRTL: locale === "ar",
      setLocale: (next) => {
        applyLocale(next);
        setLocaleState(next);
      },
      t: (key) => copy[locale][key],
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
