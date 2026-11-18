"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { projectFormSchema, projectIdSchema } from "@/lib/validation/project";

export type UpdateProjectState = { error: string } | null;

// Same rules as createProject: nothing is logged, nothing is echoed back, and the raw
// database error is never shown. A project of another photographer gives the same
// generic error as any other failure, so the answer reveals nothing about it.
export async function updateProject(
  _prevState: UpdateProjectState,
  formData: FormData,
): Promise<UpdateProjectState> {
  // The id is a hidden form field: the user can change it, so it is checked again here.
  const projectId = projectIdSchema.safeParse(formData.get("projectId"));
  const parsed = projectFormSchema.safeParse({
    names: formData.get("names"),
    email: formData.get("email"),
    eventDate: formData.get("eventDate") ?? undefined,
    location: formData.get("location") ?? undefined,
  });
  if (!projectId.success || !parsed.success) {
    return { error: "Please check the fields and try again." };
  }

  const supabase = await createClient();
  // One database call changes the client and the project together. RLS decides
  // whether this project is the caller's; the status is not part of this call.
  const { error } = await supabase.rpc("update_project", {
    p_project_id: projectId.data,
    p_names: parsed.data.names,
    p_email: parsed.data.email,
    p_event_date: parsed.data.eventDate ?? undefined,
    p_location: parsed.data.location ?? undefined,
  });
  if (error) {
    return { error: "Could not save the project. Please try again." };
  }

  redirect("/dashboard");
}
