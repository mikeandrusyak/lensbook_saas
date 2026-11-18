"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validation/auth";

export type SignUpState = { error: string } | null;

// Nothing here is logged and no input is echoed back: email and password stay
// out of logs and URLs. The Supabase error text is also not shown, so the form
// does not reveal whether an email is already registered.
export async function signUp(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      error: "Enter a valid email and a password of at least 12 characters.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    return { error: "Could not create the account. Please try again." };
  }

  // TEMPORARY: the dashboard does not exist yet (Phase 4), so go to the start page.
  redirect("/");
}
