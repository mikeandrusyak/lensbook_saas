"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { galleryUrlFieldSchema } from "@/lib/validation/gallery";
import { projectIdSchema } from "@/lib/validation/project";

export type GalleryLinkState = { saved: true } | { error: string } | null;

// Saves or removes the gallery link of a project. The link is personal data of the
// couple: it is never logged, never echoed in an error and never put into a URL.
export async function saveGalleryLink(
  _prevState: GalleryLinkState,
  formData: FormData,
): Promise<GalleryLinkState> {
  // The id is a hidden form field: the user can change it, so it is checked again here.
  const projectId = projectIdSchema.safeParse(formData.get("projectId"));
  const galleryUrl = galleryUrlFieldSchema.safeParse(
    formData.get("galleryUrl"),
  );
  if (!projectId.success) {
    return { error: "Could not save the link. Please try again." };
  }
  if (!galleryUrl.success) {
    return {
      error:
        "Enter a link that starts with https://, or leave the field empty.",
    };
  }

  const supabase = await createClient();
  // RLS decides whether this project is the caller's. null is passed as "no argument"
  // (undefined): the function's default null then removes the link.
  const { error } = await supabase.rpc("set_gallery_url", {
    p_project_id: projectId.data,
    p_gallery_url: galleryUrl.data ?? undefined,
  });
  if (error) {
    // 23514 (check_violation): the link was removed while the status is Gallery Delivered.
    // The code is safe to act on; the raw message is not shown.
    if (error.code === "23514") {
      return { error: "A delivered project needs a gallery link." };
    }
    return { error: "Could not save the link. Please try again." };
  }

  // Reload the page data so the field shows what is now stored.
  revalidatePath(`/projects/${projectId.data}`);
  return { saved: true };
}
