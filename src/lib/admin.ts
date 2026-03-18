type ProfileAdminRow = {
  is_admin: boolean | null;
};

type SupabaseProfileAdminReader = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: ProfileAdminRow | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export async function readUserAdminFlag(
  supabase: unknown,
  userId: string,
): Promise<{ isAdmin: boolean; errorMessage: string | null }> {
  const client = supabase as SupabaseProfileAdminReader;
  const result = await client
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (result.error) {
    return { isAdmin: false, errorMessage: result.error.message };
  }

  return { isAdmin: Boolean(result.data?.is_admin), errorMessage: null };
}
