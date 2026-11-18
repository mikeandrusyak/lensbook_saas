// Same values and order as the database enum public.project_status.
export const PROJECT_STATUSES = [
  "inquiry",
  "consultation",
  "retainer_paid",
  "awaiting_event",
  "gallery_delivered",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// Class names are written out in full: Tailwind finds classes by scanning the
// source for complete strings, so they cannot be built from parts.
const STATUS_INFO: Record<ProjectStatus, { label: string; badgeClass: string }> =
  {
    inquiry: {
      label: "Inquiry",
      badgeClass: "bg-status-inquiry-bg text-status-inquiry-fg",
    },
    consultation: {
      label: "Consultation",
      badgeClass: "bg-status-consultation-bg text-status-consultation-fg",
    },
    retainer_paid: {
      label: "Retainer Paid",
      badgeClass: "bg-status-retainer-paid-bg text-status-retainer-paid-fg",
    },
    awaiting_event: {
      label: "Awaiting Event",
      badgeClass: "bg-status-awaiting-event-bg text-status-awaiting-event-fg",
    },
    gallery_delivered: {
      label: "Gallery Delivered",
      badgeClass:
        "bg-status-gallery-delivered-bg text-status-gallery-delivered-fg",
    },
  };

export function statusLabel(status: ProjectStatus): string {
  return STATUS_INFO[status].label;
}

export function statusBadgeClass(status: ProjectStatus): string {
  return STATUS_INFO[status].badgeClass;
}
