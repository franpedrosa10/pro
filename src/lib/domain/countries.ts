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
  { code: "PE", name: "Perú" },
  { code: "CO", name: "Colombia" },
  { code: "EC", name: "Ecuador" },
  { code: "VE", name: "Venezuela" },
  { code: "MX", name: "México" },
  { code: "US", name: "Estados Unidos" },
  { code: "CA", name: "Canadá" },
  { code: "CR", name: "Costa Rica" },
  { code: "PA", name: "Panamá" },
  { code: "ES", name: "España" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
  { code: "IT", name: "Italia" },
  { code: "PT", name: "Portugal" },
  { code: "GB", name: "Reino Unido" },
  { code: "NL", name: "Países Bajos" },
  { code: "BE", name: "Bélgica" },
  { code: "HR", name: "Croacia" },
  { code: "RS", name: "Serbia" },
  { code: "CH", name: "Suiza" },
  { code: "JP", name: "Japón" },
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
