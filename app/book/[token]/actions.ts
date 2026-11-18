"use server";

import { createClient } from "@/lib/supabase/server";
import {
  bookingFormSchema,
  bookingTokenSchema,
} from "@/lib/validation/booking";

export type SubmitBookingState = { error: string } | { done: true } | null;

// The token is bound on the server (see page.tsx), so it is not a form field.
// Every failure gives the same generic text: the couple (or a guesser) cannot tell
// a wrong token from a hidden package or a missing consent. Nothing is logged.
export async function submitBooking(
  token: string,
  _prevState: SubmitBookingState,
  formData: FormData,
): Promise<SubmitBookingState> {
  const failure = {
    error:
      "Could not save your booking. Please check the fields and try again.",
  };

  if (!bookingTokenSchema.safeParse(token).success) {
    return failure;
  }

  // FormData.get returns null for a missing field; the schema treats undefined as missing.
  const parsed = bookingFormSchema.safeParse({
    packageId: formData.get("packageId") ?? undefined,
    signerName: formData.get("signerName") ?? undefined,
    consent: formData.get("consent") ?? undefined,
    names: formData.get("names") ?? undefined,
    location: formData.get("location") ?? undefined,
  });
  if (!parsed.success) {
    return failure;
  }

  const supabase = await createClient();
  // submit_booking checks the token, the package and the consent again. It returns true
  // when signed (also when it was signed before) and false in every other case.
  const { data, error } = await supabase.rpc("submit_booking", {
    p_token: token,
    p_package_id: parsed.data.packageId,
    p_signer_name: parsed.data.signerName,
    p_consent: parsed.data.consent,
    // The generated types allow undefined (not null) for omitted optional arguments.
    p_names: parsed.data.names ?? undefined,
    p_location: parsed.data.location ?? undefined,
  });
  if (error || data !== true) {
    return failure;
  }

  return { done: true };
}
