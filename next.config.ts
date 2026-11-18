import type { NextConfig } from "next";
import { bookingRoute } from "./lib/security/booking-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [bookingRoute];
  },
};

export default nextConfig;
