"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = { error: string } | null;

// Nothing here is logged and no input is echoed back: email and password stay
// out of logs and URLs. Wrong password, unknown email and invalid input all give
// the same message, so the form does not reveal which emails have an account.
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Email or password is incorrect." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Email or password is incorrect." };
  }

  // TEMPORARY: the dashboard comes in step 3.4, so go to the start page.
  redirect("/");
}
