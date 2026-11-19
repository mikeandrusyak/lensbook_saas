import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { packageIdSchema } from "@/lib/validation/package";
import { setPackageActive } from "./actions";
import { EditPackageForm } from "./edit-form";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The id comes from the URL. A malformed one is "not found", not a database error.
  const packageId = packageIdSchema.safeParse(id);
  if (!packageId.success) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // No photographer filter on purpose: RLS returns only the caller's own package.
  // Someone else's package and a missing one both give no row, hence the same 404.
  const { data: pkg, error } = await supabase
    .from("packages")
    .select("name, description, price, duration_hours, is_active")
    .eq("id", packageId.data)
    .maybeSingle();
  if (error || !pkg) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <Link
        href="/packages"
        className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Packages
      </Link>
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Edit package</h1>
        <EditPackageForm
          packageId={packageId.data}
          defaults={{
            name: pkg.name,
            description: pkg.description ?? "",
            price: pkg.price.toFixed(2),
            durationHours: String(pkg.duration_hours),
          }}
        />
        <form
          action={setPackageActive}
          className="flex flex-col gap-2 border-t border-border pt-6"
        >
          <input type="hidden" name="packageId" value={packageId.data} />
          <input type="hidden" name="isActive" value={String(!pkg.is_active)} />
          <p className="text-sm text-muted">
            {pkg.is_active
              ? "Hidden packages are not offered on the booking page."
              : "This package is hidden and not offered on the booking page."}
          </p>
          <Button type="submit" variant="outline">
            {pkg.is_active ? "Hide package" : "Show package"}
          </Button>
        </form>
      </div>
    </main>
  );
}
