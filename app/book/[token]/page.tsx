import { notFound } from "next/navigation";
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
    // Generic text on purpose: the raw error message is not shown or logged.
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4 py-10">
        <p role="alert">Could not load this page. Please try again later.</p>
      </main>
    );
  }

  // null (unknown token) fails the schema, the same as any other wrong shape.
  const parsed = bookingViewSchema.safeParse(data);
  if (!parsed.success) {
    notFound();
  }
  const booking = parsed.data;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Booking for {booking.names}
        </h1>
        <p className="text-foreground/70">
          {booking.event_date ?? "Date to be agreed"}
          {booking.location ? ` · ${booking.location}` : ""}
        </p>
      </header>

      {booking.already_signed ? (
        <p>This booking is already signed. Thank you!</p>
      ) : booking.packages.length === 0 ? (
        <p className="text-foreground/70">
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
