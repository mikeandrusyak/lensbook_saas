import { Button } from "@/components/ui/button";

// TEMPORARY: visual check of the status colors, remove in Phase 4 when real badges exist
const statusPreview = [
  { label: "Inquiry", className: "bg-status-inquiry-bg text-status-inquiry-fg" },
  {
    label: "Consultation",
    className: "bg-status-consultation-bg text-status-consultation-fg",
  },
  {
    label: "Retainer Paid",
    className: "bg-status-retainer-paid-bg text-status-retainer-paid-fg",
  },
  {
    label: "Awaiting Event",
    className: "bg-status-awaiting-event-bg text-status-awaiting-event-fg",
  },
  {
    label: "Gallery Delivered",
    className: "bg-status-gallery-delivered-bg text-status-gallery-delivered-fg",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Lensbook</h1>
      <p className="max-w-md text-lg text-foreground/70">
        A calm place for wedding photographers to keep clients, contracts and
        galleries in order.
      </p>
      <Button>Sign in</Button>
      <ul className="flex flex-wrap justify-center gap-2">
        {statusPreview.map(({ label, className }) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-sm font-medium ${className}`}
          >
            {label}
          </li>
        ))}
      </ul>
    </main>
  );
}
