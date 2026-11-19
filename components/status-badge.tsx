import {
  statusBadgeClass,
  statusLabel,
  type ProjectStatus,
} from "@/lib/projects/status";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusBadgeClass(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}
