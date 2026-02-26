"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setIsPending(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsPending(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className={`btn-ghost px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
    >
      {isPending ? "Saliendo..." : "Salir"}
    </button>
  );
}
