export type CountryOption = {
  code: string;
  name: string;
};

export const COUNTRIES: readonly CountryOption[] = [
  { code: "AR", name: "Argentina" },
  { code: "UY", name: "Uruguay" },
  { code: "BR", name: "Brasil" },
  { code: "CL", name: "Chile" },
  { code: "PY", name: "Paraguay" },
  { code: "BO", name: "Bolivia" },
  { code: "PE", name: "Peru" },
  { code: "CO", name: "Colombia" },
  { code: "EC", name: "Ecuador" },
  { code: "VE", name: "Venezuela" },
  { code: "MX", name: "Mexico" },
  { code: "US", name: "Estados Unidos" },
  { code: "CA", name: "Canada" },
  { code: "CR", name: "Costa Rica" },
  { code: "PA", name: "Panama" },
  { code: "ES", name: "Espana" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
  { code: "IT", name: "Italia" },
  { code: "PT", name: "Portugal" },
  { code: "GB", name: "Reino Unido" },
  { code: "NL", name: "Paises Bajos" },
  { code: "BE", name: "Belgica" },
  { code: "HR", name: "Croacia" },
  { code: "RS", name: "Serbia" },
  { code: "CH", name: "Suiza" },
  { code: "JP", name: "Japon" },
  { code: "KR", name: "Corea del Sur" },
  { code: "AU", name: "Australia" },
  { code: "MA", name: "Marruecos" },
  { code: "SN", name: "Senegal" },
  { code: "NG", name: "Nigeria" },
] as const;

const COUNTRY_MAP = new Map(COUNTRIES.map((country) => [country.code, country.name]));

export function getCountryNameByCode(countryCode: string) {
  return COUNTRY_MAP.get(countryCode.toUpperCase()) ?? null;
}
