"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PackageFields } from "@/components/package-fields";
import { Button } from "@/components/ui/button";
import { createPackage, type CreatePackageState } from "./actions";

export default function NewPackagePage() {
  const [state, formAction, pending] = useActionState<
    CreatePackageState,
    FormData
  >(createPackage, null);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">New package</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <PackageFields />
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create package"}
        </Button>
      </form>
      <p className="text-sm text-foreground/70">
        <Link href="/packages" className="font-medium underline">
          Back to packages
        </Link>
      </p>
    </main>
  );
}
