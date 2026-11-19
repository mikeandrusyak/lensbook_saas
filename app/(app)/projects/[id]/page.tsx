import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { projectIdSchema } from "@/lib/validation/project";
import { AccessLink } from "./access-link";
import { BookingSummary } from "./booking-summary";
import { EditProjectForm } from "./edit-form";
import { GalleryLink } from "./gallery-link";

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
  // The token hash is read only to know whether a link exists. It stays on the
  // server: only a yes/no goes to the browser. The gallery link is shown only to the
  // photographer who owns the project (RLS), in the field where they edit it.
  const { data, error } = await supabase
    .from("projects")
    .select(
      "event_date, location, access_token_hash, gallery_url, clients(names, email)",
    )
    .eq("id", projectId.data)
    .maybeSingle();
  const project = data;
  if (error || !project || !project.clients) {
    notFound();
  }

  // The signed booking, if any. contracts allows only select for the photographer, and RLS
  // limits it to their own rows. At most one row per project (unique project_id).
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("signer_name, signed_at, package_snapshot")
    .eq("project_id", projectId.data)
    .maybeSingle();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
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
      <AccessLink
        projectId={projectId.data}
        hasLink={project.access_token_hash !== null}
      />
      <GalleryLink
        projectId={projectId.data}
        galleryUrl={project.gallery_url}
      />
      {contractError ? (
        // Generic text on purpose: the raw error message is not shown or logged.
        <p role="alert" className="text-sm">
          Could not load the booking. Please try again.
        </p>
      ) : (
        <BookingSummary contract={contract} />
      )}
      </div>
      <p className="text-sm text-muted">
        <Link href="/dashboard" className="font-medium text-link underline-offset-4 hover:underline">
          Back to projects
        </Link>
      </p>
    </main>
  );
}
