import type { NextConfig } from "next";
import { bookingRoute } from "./lib/security/booking-headers";
import { globalRoute } from "./lib/security/global-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev only: lets the dev server be opened from the VM address, not only localhost.
  allowedDevOrigins: ["192.168.64.2"],
  async headers() {
    // Order matters: for the same header key the later rule wins, so /book/* overrides Referrer-Policy.
    return [globalRoute, bookingRoute];
  },
};

export default nextConfig;
