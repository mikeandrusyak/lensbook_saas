"use client";

import { useActionState } from "react";
import { changeStatus, type ChangeStatusState } from "@/app/(app)/status-actions";
import { Button } from "@/components/ui/button";
import {
  neighborStatus,
  statusLabel,
  type ProjectStatus,
} from "@/lib/projects/status";

// Two buttons that move a project one step back or forward. They only offer the
// neighbouring statuses; the server and the database check the rule again.
export function StatusControls({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const [state, formAction, pending] = useActionState<
    ChangeStatusState,
    FormData
  >(changeStatus, null);

  const back = neighborStatus(status, "back");
  const forward = neighborStatus(status, "forward");

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex gap-2">
        {/* The clicked button sends its own name and value, which is the direction. */}
        <Button
          type="submit"
          name="direction"
          value="back"
          variant="outline"
          size="sm"
          disabled={pending || !back}
          aria-label={back ? `Move back to ${statusLabel(back)}` : "Back"}
        >
          Back
        </Button>
        <Button
          type="submit"
          name="direction"
          value="forward"
          variant="outline"
          size="sm"
          disabled={pending || !forward}
          aria-label={
            forward ? `Move forward to ${statusLabel(forward)}` : "Next"
          }
        >
          Next
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
