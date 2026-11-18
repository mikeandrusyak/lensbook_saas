import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { daysUntil } from "@/lib/projects/days-until";
import { formatDaysUntil } from "@/lib/projects/format-days-until";
import type { ProjectStatus } from "@/lib/projects/status";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../actions";

type ProjectRow = {
  id: string;
  event_date: string | null;
  location: string | null;
  status: ProjectStatus;
  clients: { names: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  // getUser() asks the Auth server to verify the token. getSession() only reads
  // the cookie, which the user controls, so it must not decide access on the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // RLS limits this to the logged-in photographer's own projects and clients.
  // No token hash and no gallery link: the list does not need them.
  const { data, error } = await supabase
    .from("projects")
    .select("id, event_date, location, status, clients(names)")
    .order("event_date", { ascending: true, nullsFirst: false });
  const projects = (data ?? []) as unknown as ProjectRow[];
  const today = new Date();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-foreground/70">Signed in as {user.email}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects/new" className={buttonVariants()}>
            New project
          </Link>
          <form action={logout}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {error ? (
        // Generic text on purpose: the raw error message is not shown or logged.
        <p role="alert">Could not load projects. Please try again.</p>
      ) : projects.length === 0 ? (
        <p className="text-foreground/70">No projects yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/projects/${project.id}`}
                  className="block truncate font-medium underline-offset-4 hover:underline"
                >
                  {project.clients?.names ?? "Unknown client"}
                </Link>
                <p className="text-sm text-foreground/70">
                  {project.event_date
                    ? `${project.event_date} (${formatDaysUntil(daysUntil(project.event_date, today))})`
                    : "No date yet"}
                  {project.location ? ` · ${project.location}` : ""}
                </p>
              </div>
              <StatusBadge status={project.status} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
