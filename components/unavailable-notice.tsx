// Shown when Supabase does not answer (for example the free-tier project is paused).
// Used by the /unavailable page and by the public booking page.
const CONTACT_EMAIL = "mykhailo.andrusiak@students.fhnw.ch";

export function UnavailableNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg font-semibold tracking-tight text-primary">Lensbook</p>
      <h1 className="text-2xl font-semibold tracking-tight" role="alert">
        The database is currently paused.
      </h1>
      <p className="text-muted">
        Please contact{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-medium text-link underline-offset-4 hover:underline"
        >
          {CONTACT_EMAIL}
        </a>{" "}
        to activate it.
      </p>
    </main>
  );
}
