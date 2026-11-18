import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// TEMPORARY placeholder: the real dashboard (projects list) comes in Phase 4.
export default async function DashboardPage() {
  const supabase = await createClient();
  // getUser() asks the Auth server to verify the token. getSession() only reads
  // the cookie, which the user controls, so it must not decide access on the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-foreground/70">Signed in as {user.email}.</p>
    </main>
  );
}
