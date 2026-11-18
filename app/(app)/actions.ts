"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// signOut() ends the session on the Auth server and clears the session cookies.
// Even if it fails, the user is sent to the login page; the next protected
// request is checked with getUser() again.
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
