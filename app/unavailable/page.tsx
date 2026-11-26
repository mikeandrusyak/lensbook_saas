import { UnavailableNotice } from "@/components/unavailable-notice";

// Static page: it makes no database call, so it works while Supabase is down.
// The proxy rewrites requests here when getUser() cannot reach Supabase.
export default function UnavailablePage() {
  return <UnavailableNotice />;
}
