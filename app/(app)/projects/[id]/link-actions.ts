"use server";

import { createClient } from "@/lib/supabase/server";
import { generateToken, hashToken, hashToPostgres } from "@/lib/tokens";
import { projectIdSchema } from "@/lib/validation/project";

export type AccessLinkState =
  | { token: string }
  | { error: string }
  | null;

const ERROR = "Could not create the link. Please try again.";

// Creates a new booking token for a project and stores ONLY its SHA-256 hash.
// The token itself is returned once, to be shown to the photographer, and is never
// stored, logged or put into a URL parameter. Creating a new token replaces the hash,
// so the previous link stops matching.
export async function createAccessLink(
  _prevState: AccessLinkState,
  formData: FormData,
): Promise<AccessLinkState> {
  const projectId = projectIdSchema.safeParse(formData.get("projectId"));
  if (!projectId.success) {
    return { error: ERROR };
  }

  const token = generateToken();
  const supabase = await createClient();

  // RLS lets the photographer update only their own projects. For someone else's
  // project the update touches no row and raises no error, so check the result.
  const { data, error } = await supabase
    .from("projects")
    .update({ access_token_hash: hashToPostgres(hashToken(token)) })
    .eq("id", projectId.data)
    .select("id");
  if (error || !data || data.length === 0) {
    return { error: ERROR };
  }

  return { token };
}
