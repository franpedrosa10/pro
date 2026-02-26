import { AccountForm } from "@/components/account/account-form";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { supabase, user } = await requireUser();

  const profileResult = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = (profileResult.data?.first_name as string | null | undefined) ?? "";
  const lastName = (profileResult.data?.last_name as string | null | undefined) ?? "";
  const phone = (profileResult.data?.phone as string | null | undefined) ?? "";

  return (
    <div className="fade-in space-y-4">
      <header className="panel-strong p-4 sm:p-5">
        <p className="chip w-fit">Mi cuenta</p>
        <h1 className="mt-2 text-5xl leading-none sm:text-6xl">Perfil</h1>
        <p className="section-subtitle mt-2">Mantene tu informacion al dia para ligas y posiciones.</p>
      </header>

      <AccountForm
        email={user.email ?? ""}
        initialFirstName={firstName}
        initialLastName={lastName}
        initialPhone={phone}
      />
    </div>
  );
}
