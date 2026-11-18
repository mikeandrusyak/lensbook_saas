import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Lensbook</h1>
      <p className="max-w-md text-lg text-foreground/70">
        A calm place for wedding photographers to keep clients, contracts and
        galleries in order.
      </p>
      <Link href="/login" className={buttonVariants()}>
        Sign in
      </Link>
    </main>
  );
}
