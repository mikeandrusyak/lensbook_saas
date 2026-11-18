"use client";

import { useActionState } from "react";
import {
  PackageFields,
  type PackageFieldValues,
} from "@/components/package-fields";
import { Button } from "@/components/ui/button";
import { updatePackage, type UpdatePackageState } from "./actions";

export function EditPackageForm({
  packageId,
  defaults,
}: {
  packageId: string;
  defaults: PackageFieldValues;
}) {
  const [state, formAction, pending] = useActionState<
    UpdatePackageState,
    FormData
  >(updatePackage, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* The id is not secret, but the user can change it: the server checks it again. */}
      <input type="hidden" name="packageId" value={packageId} />
      <PackageFields defaults={defaults} />
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
