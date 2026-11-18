"use client";

import { useActionState } from "react";
import {
  ProjectFields,
  type ProjectFieldValues,
} from "@/components/project-fields";
import { Button } from "@/components/ui/button";
import { updateProject, type UpdateProjectState } from "./actions";

export function EditProjectForm({
  projectId,
  defaults,
}: {
  projectId: string;
  defaults: ProjectFieldValues;
}) {
  const [state, formAction, pending] = useActionState<
    UpdateProjectState,
    FormData
  >(updateProject, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* The id is not secret, but the user can change it: the server checks it again. */}
      <input type="hidden" name="projectId" value={projectId} />
      <ProjectFields defaults={defaults} />
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
