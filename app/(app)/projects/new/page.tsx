"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="names" className="text-sm font-medium">
            Couple&apos;s names
          </label>
          <Input id="names" name="names" maxLength={200} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            maxLength={254}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="eventDate" className="text-sm font-medium">
            Event date (optional)
          </label>
          <Input id="eventDate" name="eventDate" type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="location" className="text-sm font-medium">
            Location (optional)
          </label>
          <Input id="location" name="location" maxLength={200} />
        </div>
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
