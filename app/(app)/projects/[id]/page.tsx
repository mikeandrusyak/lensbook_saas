import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { projectIdSchema } from "@/lib/validation/project";
import { EditProjectForm } from "./edit-form";

type ProjectRow = {
  event_date: string | null;
  location: string | null;
  clients: { names: string; email: string } | null;
};

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The id comes from the URL. A malformed one is "not found", not a database error.
  const projectId = projectIdSchema.safeParse(id);
  if (!projectId.success) {
    notFound();
  }

  const supabase = await createClient();
  // getUser() verifies the token with the Auth server; the proxy already checked
  // the route, and the page checks again (same pattern as /dashboard).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // No photographer filter on purpose: RLS returns only the caller's own project.
  // Someone else's project and a missing one both give no row, hence the same 404.
  // No token hash and no gallery link: this page does not need them.
  const { data, error } = await supabase
    .from("projects")
    .select("event_date, location, clients(names, email)")
    .eq("id", projectId.data)
    .maybeSingle();
  const project = data as unknown as ProjectRow | null;
  if (error || !project || !project.clients) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Edit project</h1>
      <EditProjectForm
        projectId={projectId.data}
        defaults={{
          names: project.clients.names,
          email: project.clients.email,
          eventDate: project.event_date ?? "",
          location: project.location ?? "",
        }}
      />
      <p className="text-sm text-foreground/70">
        <Link href="/dashboard" className="font-medium underline">
          Back to projects
        </Link>
      </p>
    </main>
  );
}
