"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { projectFormSchema } from "@/lib/validation/project";

export type CreateProjectState = { error: string } | null;

// Client names, email and location are personal data: nothing is logged, nothing is
// echoed back, and the raw database error is never shown. Invalid input and database
// errors give generic messages.
export async function createProject(
  _prevState: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  // FormData.get returns null for a missing field; the schema treats undefined as missing.
  const parsed = projectFormSchema.safeParse({
    names: formData.get("names"),
    email: formData.get("email"),
    eventDate: formData.get("eventDate") ?? undefined,
    location: formData.get("location") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the fields and try again." };
  }

  const supabase = await createClient();
  // One database call creates the client and the project together. The photographer
  // is not sent: the function takes it from the session (auth.uid()).
  const { error } = await supabase.rpc("create_project", {
    p_names: parsed.data.names,
    p_email: parsed.data.email,
    p_event_date: parsed.data.eventDate,
    p_location: parsed.data.location,
  });
  if (error) {
    return { error: "Could not create the project. Please try again." };
  }

  redirect("/dashboard");
}
