import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10">
      <AppNav active="packages" email={user.email} />

      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Packages</h1>
          <p className="text-sm text-muted">
            What couples can choose on the booking page.
          </p>
        </div>
        <Link href="/packages/new" className={buttonVariants()}>
          New package
        </Link>
      </header>

      {error ? (
        // Generic text on purpose: the raw error message is not shown or logged.
        <p role="alert">Could not load packages. Please try again.</p>
      ) : packages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-input p-8 text-center text-muted">
          No packages yet. Add one with “New package”.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {packages.map((pkg) => (
            <li
              key={pkg.id}
              className={`relative rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-px hover:border-input hover:shadow-md ${pkg.is_active ? "" : "opacity-60"}`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="truncate text-base font-semibold">
                  <Link
                    href={`/packages/${pkg.id}`}
                    // The ::after layer makes the whole card clickable.
                    className="after:absolute after:inset-0 after:content-['']"
                  >
                    {pkg.name}
                    {pkg.is_active ? "" : " (Hidden)"}
                  </Link>
                </h2>
                {/* numeric columns arrive as numbers; toFixed keeps two decimals */}
                <p className="shrink-0 font-medium">
                  CHF {pkg.price.toFixed(2)}
                </p>
              </div>
              <p className="mt-0.5 text-sm text-muted">
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
