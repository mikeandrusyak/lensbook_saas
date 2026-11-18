"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { packageFormSchema, packageIdSchema } from "@/lib/validation/package";

export type UpdatePackageState = { error: string } | null;

export async function updatePackage(
  _prevState: UpdatePackageState,
  formData: FormData,
): Promise<UpdatePackageState> {
  // The id is a hidden form field: the user can change it, so it is checked again here.
  const packageId = packageIdSchema.safeParse(formData.get("packageId"));
  const parsed = packageFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    price: formData.get("price"),
    durationHours: formData.get("durationHours"),
  });
  if (!packageId.success || !parsed.success) {
    return { error: "Please check the fields and try again." };
  }

  const supabase = await createClient();
  // photographer_id and is_active are not part of this call. RLS (using) decides
  // whether the package is the caller's. select("id") returns the changed rows:
  // for someone else's package RLS hides the row, there is no error and zero rows,
  // so "no row" must count as a failure.
  const { data, error } = await supabase
    .from("packages")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      duration_hours: parsed.data.durationHours,
    })
    .eq("id", packageId.data)
    .select("id");
  if (error || data.length !== 1) {
    return { error: "Could not save the package. Please try again." };
  }

  redirect("/packages");
}

// Hide or show instead of deleting: old contracts and the booking page never
// point to a package that is gone. Same "zero rows" check as above.
export async function setPackageActive(formData: FormData): Promise<void> {
  const packageId = packageIdSchema.safeParse(formData.get("packageId"));
  // Only the two literal values count; anything else is rejected.
  const value = formData.get("isActive");
  if (!packageId.success || (value !== "true" && value !== "false")) {
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("packages")
    .update({ is_active: value === "true" })
    .eq("id", packageId.data)
    .select("id");
  if (error || data.length !== 1) {
    // Nothing changed; the page is reloaded below and shows the real state.
    redirect(`/packages/${packageId.data}`);
  }

  redirect("/packages");
}
