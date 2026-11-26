import { notFound } from "next/navigation";
import { UnavailableNotice } from "@/components/unavailable-notice";
import { createClient } from "@/lib/supabase/server";
import {
  bookingTokenSchema,
  bookingViewSchema,
} from "@/lib/validation/booking";
import { submitBooking } from "./actions";
import { BookingForm } from "./booking-form";

// Public page for the couple: no login, the token in the path is the only key.
// A malformed token and a token that does not exist both end in the same 404,
// so a visitor cannot tell them apart.
export default async function BookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Shape check first: garbage never reaches the database.
  if (!bookingTokenSchema.safeParse(token).success) {
    notFound();
  }

  const supabase = await createClient();
  // get_booking is the only way in: anon has no table access. The token is passed as an
  // argument and is never logged or printed.
  const { data, error } = await supabase.rpc("get_booking", { p_token: token });

  if (error) {
    // The raw error message is not shown or logged. The usual cause is a paused
    // database, so the client gets the contact for reactivating it.
    return <UnavailableNotice />;
  }

  // null (unknown token) fails the schema, the same as any other wrong shape.
  const parsed = bookingViewSchema.safeParse(data);
  if (!parsed.success) {
    notFound();
  }
  const booking = parsed.data;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <p className="text-center text-lg font-semibold tracking-tight text-primary">
        Lensbook
      </p>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Booking for {booking.names}
        </h1>
        <p className="text-muted">
          {booking.event_date ?? "Date to be agreed"}
          {booking.location ? ` · ${booking.location}` : ""}
        </p>
      </header>

      {/* Only in Gallery Delivered: get_booking returns null before that.
          noreferrer: the gallery site must not learn this page's address, which
          contains the token (the Referrer-Policy header says the same).
          noopener: the new tab gets no handle back to this page. */}
      {booking.gallery_url && (
        <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Your gallery</h2>
          <p>
            <a
              href={booking.gallery_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-link underline-offset-4 hover:underline"
            >
              Open your gallery
            </a>
          </p>
        </section>
      )}

      {booking.already_signed ? (
        <p
          role="status"
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          This booking is already signed. Thank you!
        </p>
      ) : booking.packages.length === 0 ? (
        <p className="text-muted">
          No packages are available right now. Please contact your photographer.
        </p>
      ) : (
        <BookingForm
          packages={booking.packages}
          defaultNames={booking.names}
          defaultLocation={booking.location}
          // Bound on the server: the token never becomes a form field.
          action={submitBooking.bind(null, token)}
        />
      )}
    </main>
  );
}
