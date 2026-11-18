import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function PackagesPage() {
  const supabase = await createClient();
  // getUser() verifies the token with the Auth server (see the dashboard page).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // RLS limits this to the logged-in photographer's own packages.
  // Active packages first, then hidden ones; each group by price.
  const { data, error } = await supabase
    .from("packages")
    .select("id, name, description, price, duration_hours, is_active")
    .order("is_active", { ascending: false })
    .order("price", { ascending: true });
  const packages = data ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Packages</h1>
          <p className="text-foreground/70">
            What couples can choose on the booking page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/packages/new" className={buttonVariants()}>
            New package
          </Link>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline" })}
          >
            Back to projects
          </Link>
        </div>
      </header>

      {error ? (
        // Generic text on purpose: the raw error message is not shown or logged.
        <p role="alert">Could not load packages. Please try again.</p>
      ) : packages.length === 0 ? (
        <p className="text-foreground/70">No packages yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {packages.map((pkg) => (
            <li
              key={pkg.id}
              className={`rounded-lg border border-border p-4 ${pkg.is_active ? "" : "opacity-60"}`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="truncate font-medium">
                  <Link
                    href={`/packages/${pkg.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {pkg.name}
                    {pkg.is_active ? "" : " (Hidden)"}
                  </Link>
                </h2>
                {/* numeric columns arrive as numbers; toFixed keeps two decimals */}
                <p className="shrink-0 font-medium">CHF {pkg.price.toFixed(2)}</p>
              </div>
              <p className="text-sm text-foreground/70">
                {pkg.duration_hours} h
                {pkg.description ? ` · ${pkg.description}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
