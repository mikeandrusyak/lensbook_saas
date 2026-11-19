"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAccessLink, type AccessLinkState } from "./link-actions";

export function AccessLink({
  projectId,
  hasLink,
}: {
  projectId: string;
  hasLink: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    AccessLinkState,
    FormData
  >(createAccessLink, null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // The token exists only in this component's state: it is not stored anywhere,
  // so after a reload it is gone and only a new link can be created.
  const token = state && "token" in state ? state.token : null;
  const error = state && "error" in state ? state.error : null;
  const link = token ? `${window.location.origin}/book/${token}` : null;
  // Once a link exists, replacing it needs a confirmation: the old one stops working.
  const exists = hasLink || token !== null;

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the link stays selectable in the field.
    }
  }

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 className="text-lg font-semibold tracking-tight">Booking link</h2>
      <p className="text-sm text-muted">
        {exists
          ? "A link exists. The link cannot be shown again, and a new link makes the old one stop working."
          : "No link yet. Create one to send to the couple."}
      </p>

      {link && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            Copy it now: it is shown only once.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={link}
              aria-label="Booking link"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {exists && !confirming ? (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirming(true)}
          >
            New link
          </Button>
        </div>
      ) : (
        <form
          action={(formData) => {
            // A fresh token starts a fresh "Copied" label and leaves the confirm step.
            setConfirming(false);
            setCopied(false);
            formAction(formData);
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          {exists && (
            <p role="alert" className="text-sm font-medium">
              The old link will stop working. Create a new one?
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="outline" disabled={pending}>
              {pending
                ? "Creating…"
                : exists
                  ? "Yes, create new link"
                  : "Create link"}
            </Button>
            {exists && (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
