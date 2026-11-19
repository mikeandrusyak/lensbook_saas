import { packageSnapshotSchema } from "@/lib/validation/booking";

export type SignedContract = {
  signer_name: string;
  signed_at: string;
  package_snapshot: unknown;
};

// Read-only block: what the couple signed on the booking page. Server component, no state.
// `contract` is null while the couple has not signed yet.
export function BookingSummary({
  contract,
}: {
  contract: SignedContract | null;
}) {
  if (!contract) {
    return (
      <section className="flex flex-col gap-1 rounded-xl bg-secondary p-4">
        <h2 className="font-medium">Booking</h2>
        <p className="text-sm text-muted">Not signed yet.</p>
      </section>
    );
  }

  // The snapshot is a jsonb column (typed as Json): check its shape instead of casting.
  const snapshot = packageSnapshotSchema.safeParse(contract.package_snapshot);

  return (
    <section className="flex flex-col gap-1 rounded-xl bg-secondary p-4">
      <h2 className="font-medium">Booking signed</h2>
      {/* React escapes the text, so a signature with HTML tags is shown, not run */}
      <p className="text-sm">
        Signed by {contract.signer_name} on {contract.signed_at.slice(0, 10)}
      </p>
      {snapshot.success ? (
        <p className="text-sm text-muted">
          {snapshot.data.name} · CHF {snapshot.data.price.toFixed(2)} ·{" "}
          {snapshot.data.duration_hours} h
          {snapshot.data.description ? ` · ${snapshot.data.description}` : ""}
        </p>
      ) : (
        <p className="text-sm text-muted">
          Package details unavailable.
        </p>
      )}
    </section>
  );
}
