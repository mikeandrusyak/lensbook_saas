import type { NextConfig } from "next";
import { bookingRoute } from "./lib/security/booking-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev only: lets the dev server be opened from the VM address, not only localhost.
  allowedDevOrigins: ["192.168.64.2"],
  async headers() {
    return [bookingRoute];
  },
};

export default nextConfig;
