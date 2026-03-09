import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams: Promise<{
    code?: string | string[];
    next?: string | string[];
  }>;
};

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  const nextPath = sanitizeNextPath(typeof params.next === "string" ? params.next : "/dashboard");

  // Fallback defensivo: si OAuth vuelve por error a "/", reenviamos al callback correcto.
  if (code) {
    const callbackPath = `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(nextPath)}`;
    redirect(callbackPath);
  }

  redirect("/login");
}
