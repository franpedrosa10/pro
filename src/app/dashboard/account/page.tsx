import { AccountForm } from "@/components/account/account-form";
import { requireUser } from "@/lib/auth";
import type { AppLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const COPY: Record<
  AppLocale,
  {
    chip: string;
    title: string;
    subtitle: string;
  }
> = {
  es: {
    chip: "Mi cuenta",
    title: "Perfil",
    subtitle: "Mantene tu informacion al dia para ligas y posiciones.",
  },
  en: {
    chip: "My account",
    title: "Profile",
    subtitle: "Keep your data up to date for leagues and standings.",
  },
  pt: {
    chip: "Minha conta",
    title: "Perfil",
    subtitle: "Mantenha seus dados atualizados para ligas e classificacoes.",
  },
};

export default async function AccountPage() {
  const { supabase, user } = await requireUser();
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  const profileSelect = "first_name, last_name, phone, country_code, display_name";

  const profileResult = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", user.id)
    .maybeSingle();

  let profileData = profileResult.data as
    | {
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
        country_code?: string | null;
        display_name?: string | null;
      }
    | null;

  if (!profileData) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const firstNameMeta = typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
    const lastNameMeta = typeof metadata.last_name === "string" ? metadata.last_name.trim() : "";
    const phoneMeta = typeof metadata.phone === "string" ? metadata.phone.trim().replace(/\s+/g, "") : "";
    const countryCodeMetaRaw = typeof metadata.country_code === "string" ? metadata.country_code.trim().toUpperCase() : "";
    const countryCodeMeta = /^[A-Z]{2}$/.test(countryCodeMetaRaw) ? countryCodeMetaRaw : null;
    const countryNameMeta = typeof metadata.country_name === "string" ? metadata.country_name.trim() : "";
    const displayNameMeta =
      `${firstNameMeta} ${lastNameMeta}`.trim() ||
      (typeof metadata.display_name === "string" ? metadata.display_name.trim() : "") ||
      user.email?.split("@")[0] ||
      "Jugador";

    const ensureProfileResult = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          first_name: firstNameMeta || null,
          last_name: lastNameMeta || null,
          phone: phoneMeta || null,
          country_code: countryCodeMeta,
          country_name: countryNameMeta || null,
          display_name: displayNameMeta,
        },
        { onConflict: "id" },
      )
      .select(profileSelect)
      .single();

    if (!ensureProfileResult.error) {
      profileData = ensureProfileResult.data;
    }
  }

  const firstName = (profileData?.first_name as string | null | undefined) ?? "";
  const lastName = (profileData?.last_name as string | null | undefined) ?? "";
  const phone = (profileData?.phone as string | null | undefined) ?? "";
  const countryCode = (profileData?.country_code as string | null | undefined) ?? "AR";

  return (
    <div className="fade-in space-y-4">
      <header className="panel-strong p-4 sm:p-5">
        <p className="chip w-fit">{copy.chip}</p>
        <h1 className="mt-2 text-5xl leading-none sm:text-6xl">{copy.title}</h1>
        <p className="section-subtitle mt-2">{copy.subtitle}</p>
      </header>

      <AccountForm
        locale={locale}
        email={user.email ?? ""}
        initialFirstName={firstName}
        initialLastName={lastName}
        initialPhone={phone}
        initialCountryCode={countryCode}
      />
    </div>
  );
}
