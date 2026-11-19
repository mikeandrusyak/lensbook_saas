import Link from "next/link";
import { logout } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";

// Top bar of the logged-in area: brand, two sections as tabs, sign out.
// `active` is passed by the page, so this stays a plain server component.
export function AppNav({
  active,
  email,
}: {
  active: "projects" | "packages";
  email?: string;
}) {
  const tab = (isActive: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted hover:text-foreground"
    }`;

  return (
    <nav className="flex items-center justify-between gap-3 border-b border-border pb-4">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-primary"
        >
          Lensbook
        </Link>
        <div className="flex gap-1">
          <Link
            href="/dashboard"
            className={tab(active === "projects")}
            aria-current={active === "projects" ? "page" : undefined}
          >
            Projects
          </Link>
          <Link
            href="/packages"
            className={tab(active === "packages")}
            aria-current={active === "packages" ? "page" : undefined}
          >
            Packages
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {email && (
          <span className="hidden text-sm text-muted sm:inline">{email}</span>
        )}
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </nav>
  );
}
