import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-primary">Lensbook</h1>
      <p className="max-w-md text-lg text-muted">
        A calm place for wedding photographers to keep clients, contracts and
        galleries in order.
      </p>
      <Link href="/login" className={buttonVariants({ size: "lg" })}>
        Sign in
      </Link>
    </main>
  );
}
