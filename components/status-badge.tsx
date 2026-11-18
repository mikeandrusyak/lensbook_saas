import {
  statusBadgeClass,
  statusLabel,
  type ProjectStatus,
} from "@/lib/projects/status";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${statusBadgeClass(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}
