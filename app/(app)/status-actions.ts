"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { neighborStatus, type ProjectStatus } from "@/lib/projects/status";
import { createClient } from "@/lib/supabase/server";
import { projectIdSchema } from "@/lib/validation/project";

export type ChangeStatusState = { error: string } | null;

const directionSchema = z.enum(["forward", "back"]);

const ERROR = "Could not change the status.";

// Moves a project one step forward or back. The current status is read from the
// database, never from the form: a user could fake it and try to skip steps. The
// database trigger enforces the one-step rule as well. Errors are generic: the raw
// database error is neither shown nor logged.
export async function changeStatus(
  _prevState: ChangeStatusState,
  formData: FormData,
): Promise<ChangeStatusState> {
  const projectId = projectIdSchema.safeParse(formData.get("projectId"));
  const direction = directionSchema.safeParse(formData.get("direction"));
  if (!projectId.success || !direction.success) {
    return { error: ERROR };
  }

  const supabase = await createClient();

  // RLS returns only the caller's own project: someone else's id gives no row.
  const { data, error: readError } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId.data)
    .maybeSingle();
  const current = (data as { status: ProjectStatus } | null)?.status;
  if (readError || !current) {
    return { error: ERROR };
  }

  const next = neighborStatus(current, direction.data);
  if (!next) {
    return { error: ERROR };
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({ status: next })
    .eq("id", projectId.data);
  if (updateError) {
    return { error: ERROR };
  }

  // The project list is rendered on the server: ask Next to render it again.
  revalidatePath("/dashboard");
  return null;
}
