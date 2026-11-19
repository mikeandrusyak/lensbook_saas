"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SubmitBookingState } from "./actions";

type BookingPackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_hours: number;
};

// `action` is submitBooking with the token already bound on the server.
// The data travels in the POST body, never in the URL.
export function BookingForm({
  packages,
  defaultNames,
  defaultLocation,
  action,
}: {
  packages: BookingPackage[];
  defaultNames: string;
  defaultLocation: string | null;
  action: (
    state: SubmitBookingState,
    formData: FormData,
  ) => Promise<SubmitBookingState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  if (state && "done" in state) {
    return (
      <p
        role="status"
        className="rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        Thank you! Your booking is signed. Your photographer will be in touch.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-medium">Choose a package</legend>
        {packages.map((pkg) => (
          <label
            key={pkg.id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-input has-[:checked]:border-primary has-[:checked]:bg-accent/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
          >
            <input
              type="radio"
              name="packageId"
              value={pkg.id}
              required
              className="mt-1 accent-primary"
            />
            <span className="flex-1">
              <span className="flex items-baseline justify-between gap-4">
                {/* React escapes the text, so a name with HTML tags is shown, not run */}
                <span className="truncate font-medium">{pkg.name}</span>
                <span className="shrink-0 font-medium">
                  CHF {pkg.price.toFixed(2)}
                </span>
              </span>
              <span className="block text-sm text-muted">
                {pkg.duration_hours} h
                {pkg.description ? ` · ${pkg.description}` : ""}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="names" className="text-sm font-medium">
          Your names
        </label>
        <Input
          id="names"
          name="names"
          maxLength={200}
          defaultValue={defaultNames}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="location" className="text-sm font-medium">
          Event location
        </label>
        <Input
          id="location"
          name="location"
          maxLength={200}
          defaultValue={defaultLocation ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signerName" className="text-sm font-medium">
          Signature: type your full name
        </label>
        <Input
          id="signerName"
          name="signerName"
          maxLength={200}
          required
          autoComplete="off"
        />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 accent-primary"
        />
        <span>
          I confirm the booking of the chosen package, and that typing my name
          above counts as my signature.
        </span>
      </label>

      {state && "error" in state && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Signing…" : "Sign booking"}
      </Button>
    </form>
  );
}
