import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";
import { Button, buttonVariants } from "@/components/ui/button";
import { daysUntil } from "@/lib/projects/days-until";
import { formatDaysUntil } from "@/lib/projects/format-days-until";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../actions";

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
  const projects = data ?? [];
  const today = new Date();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted">Signed in as {user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects/new" className={buttonVariants()}>
            New project
          </Link>
          <Link href="/packages" className={buttonVariants({ variant: "ghost" })}>
            Packages
          </Link>
          <form action={logout}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {error ? (
        // Generic text on purpose: the raw error message is not shown or logged.
        <p role="alert">Could not load projects. Please try again.</p>
      ) : projects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-input p-8 text-center text-muted">
          No projects yet. Create your first one with “New project”.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="relative flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-px hover:border-input hover:shadow-md"
            >
              <div className="min-w-0">
                <Link
                  href={`/projects/${project.id}`}
                  // The ::after layer stretches the link over the whole card; the controls sit above it.
                  className="block truncate text-base font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {project.clients?.names ?? "Unknown client"}
                </Link>
                <p className="mt-0.5 text-sm text-muted">
                  {project.event_date
                    ? `${project.event_date} (${formatDaysUntil(daysUntil(project.event_date, today))})`
                    : "No date yet"}
                  {project.location ? ` · ${project.location}` : ""}
                </p>
              </div>
              <div className="relative z-10 flex flex-col items-end gap-2">
                <StatusBadge status={project.status} />
                <StatusControls projectId={project.id} status={project.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
