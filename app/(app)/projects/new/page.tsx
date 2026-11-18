"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ProjectFields } from "@/components/project-fields";
import { Button } from "@/components/ui/button";
import { createProject, type CreateProjectState } from "./actions";

export default function NewProjectPage() {
  const [state, formAction, pending] = useActionState<
    CreateProjectState,
    FormData
  >(createProject, null);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <ProjectFields />
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </Button>
      </form>
      <p className="text-sm text-foreground/70">
        <Link href="/dashboard" className="font-medium underline">
          Back to projects
        </Link>
      </p>
    </main>
  );
}
