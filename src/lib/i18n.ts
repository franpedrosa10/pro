export const SUPPORTED_LOCALES = ["es", "en", "pt"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "es";
export const LOCALE_COOKIE_NAME = "app_locale";

export type UiDictionary = {
  nav: {
    home: string;
    worldCup: string;
    prode: string;
    leagues: string;
    standings: string;
    account: string;
    signOut: string;
    signingOut: string;
    language: string;
  };
  footer: {
    copyright: string;
    madeBy: string;
  };
  localeLabel: {
    es: string;
    en: string;
    pt: string;
  };
  layout: {
    incompleteProfile: string;
    completeInAccount: string;
    missingField: {
      firstName: string;
      lastName: string;
      phone: string;
      country: string;
    };
  };
  loading: {
    chip: string;
    rootTitle: string;
    rootSubtitle: string;
    dashboardTitle: string;
    dashboardSubtitle: string;
    nextPlay: string;
  };
};

const UI_DICTIONARY: Record<AppLocale, UiDictionary> = {
  es: {
    nav: {
      home: "Inicio",
      worldCup: "Mundial 2026",
      prode: "Prode",
      leagues: "Ligas",
      standings: "Resultados globales",
      account: "Mi cuenta",
      signOut: "Salir",
      signingOut: "Saliendo...",
      language: "Idioma",
    },
    footer: {
      copyright: "Copyright (c) 2026 Prode Mundial.",
      madeBy: "Hecho por",
    },
    localeLabel: {
      es: "Español",
      en: "English",
      pt: "Português",
    },
    layout: {
      incompleteProfile: "Perfil incompleto",
      completeInAccount: "Completalo en Mi cuenta",
      missingField: {
        firstName: "nombre",
        lastName: "apellido",
        phone: "teléfono",
        country: "país",
      },
    },
    loading: {
      chip: "Cargando",
      rootTitle: "Cargando la plataforma",
      rootSubtitle: "Estamos armando todo para que sigas compitiendo.",
      dashboardTitle: "Actualizando tu tablero",
      dashboardSubtitle: "Revisamos prode, ligas y posiciones en tiempo real.",
      nextPlay: "Entrando a la próxima jugada...",
    },
  },
  en: {
    nav: {
      home: "Home",
      worldCup: "World Cup 2026",
      prode: "Predictions",
      leagues: "Leagues",
      standings: "Global standings",
      account: "My account",
      signOut: "Sign out",
      signingOut: "Signing out...",
      language: "Language",
    },
    footer: {
      copyright: "Copyright (c) 2026 World Cup Predictor.",
      madeBy: "Made by",
    },
    localeLabel: {
      es: "Español",
      en: "English",
      pt: "Português",
    },
    layout: {
      incompleteProfile: "Incomplete profile",
      completeInAccount: "Complete it in My account",
      missingField: {
        firstName: "first name",
        lastName: "last name",
        phone: "phone",
        country: "country",
      },
    },
    loading: {
      chip: "Loading",
      rootTitle: "Loading platform",
      rootSubtitle: "Preparing everything so you can keep competing.",
      dashboardTitle: "Updating your dashboard",
      dashboardSubtitle: "Refreshing predictions, leagues and standings in real time.",
      nextPlay: "Entering the next play...",
    },
  },
  pt: {
    nav: {
      home: "Inicio",
      worldCup: "Copa 2026",
      prode: "Bolao",
      leagues: "Ligas",
      standings: "Classificacao global",
      account: "Minha conta",
      signOut: "Sair",
      signingOut: "Saindo...",
      language: "Idioma",
    },
    footer: {
      copyright: "Copyright (c) 2026 Bolao da Copa.",
      madeBy: "Feito por",
    },
    localeLabel: {
      es: "Español",
      en: "English",
      pt: "Português",
    },
    layout: {
      incompleteProfile: "Perfil incompleto",
      completeInAccount: "Complete em Minha conta",
      missingField: {
        firstName: "nome",
        lastName: "sobrenome",
        phone: "telefone",
        country: "pais",
      },
    },
    loading: {
      chip: "Carregando",
      rootTitle: "Carregando a plataforma",
      rootSubtitle: "Preparando tudo para voce continuar competindo.",
      dashboardTitle: "Atualizando seu painel",
      dashboardSubtitle: "Revisando bolao, ligas e classificacoes em tempo real.",
      nextPlay: "Entrando na proxima jogada...",
    },
  },
};

export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (SUPPORTED_LOCALES.includes(normalized as AppLocale)) {
    return normalized as AppLocale;
  }
  return DEFAULT_LOCALE;
}

export function getUiDictionary(locale: AppLocale): UiDictionary {
  return UI_DICTIONARY[locale] ?? UI_DICTIONARY[DEFAULT_LOCALE];
}
