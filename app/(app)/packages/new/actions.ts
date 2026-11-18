"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { packageFormSchema } from "@/lib/validation/package";

export type CreatePackageState = { error: string } | null;

// Invalid input and database errors give generic messages; the raw error is never shown.
export async function createPackage(
  _prevState: CreatePackageState,
  formData: FormData,
): Promise<CreatePackageState> {
  // FormData.get returns null for a missing field; the schema treats undefined as missing.
  const parsed = packageFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    price: formData.get("price"),
    durationHours: formData.get("durationHours"),
  });
  if (!parsed.success) {
    return { error: "Please check the fields and try again." };
  }

  const supabase = await createClient();
  // getUser() verifies the token with the Auth server. The id must come from the
  // session, never from the form.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // The RLS policy "packages_insert_own" (with check) rejects any other photographer_id.
  const { error } = await supabase.from("packages").insert({
    photographer_id: user.id,
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    duration_hours: parsed.data.durationHours,
  });
  if (error) {
    return { error: "Could not create the package. Please try again." };
  }

  redirect("/packages");
}
