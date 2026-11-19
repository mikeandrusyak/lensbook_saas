"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveGalleryLink, type GalleryLinkState } from "./gallery-actions";

// Field for the link to the external gallery. Leaving it empty removes the link.
// type="url", pattern and maxLength are only hints; the server checks everything again.
export function GalleryLink({
  projectId,
  galleryUrl,
}: {
  projectId: string;
  galleryUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    GalleryLinkState,
    FormData
  >(saveGalleryLink, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor="galleryUrl" className="text-sm font-medium">
        Gallery link (optional)
      </label>
      <Input
        id="galleryUrl"
        name="galleryUrl"
        type="url"
        pattern="https://.*"
        placeholder="https://"
        autoComplete="off"
        maxLength={2000}
        defaultValue={galleryUrl ?? ""}
      />
      <p className="text-sm text-muted">
        Only https:// links. Required before the status Gallery Delivered.
      </p>
      {state && "error" in state && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state && "saved" in state && (
        <p role="status" className="text-sm">
          Saved.
        </p>
      )}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save link"}
      </Button>
    </form>
  );
}
