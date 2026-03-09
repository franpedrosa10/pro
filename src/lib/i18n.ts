export const SUPPORTED_LOCALES = ["es"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "es";

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
  };
  footer: {
    copyright: string;
    madeBy: string;
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
    },
    footer: {
      copyright: "Copyright (c) 2026 Prode Mundial.",
      madeBy: "Hecho por",
    },
    layout: {
      incompleteProfile: "Perfil incompleto",
      completeInAccount: "Completa tu perfil en Mi cuenta",
      missingField: {
        firstName: "nombre",
        lastName: "apellido",
        phone: "telefono",
        country: "pais",
      },
    },
    loading: {
      chip: "Cargando",
      rootTitle: "Cargando la plataforma",
      rootSubtitle: "Estamos preparando todo para que sigas compitiendo.",
      dashboardTitle: "Actualizando tu tablero",
      dashboardSubtitle: "Revisamos prode, ligas y posiciones en tiempo real.",
      nextPlay: "Entrando a la proxima jugada...",
    },
  },
};

export function getUiDictionary(locale: AppLocale): UiDictionary {
  return UI_DICTIONARY[locale] ?? UI_DICTIONARY[DEFAULT_LOCALE];
}
