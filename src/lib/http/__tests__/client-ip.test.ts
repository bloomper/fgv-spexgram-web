import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/http/client-ip";

describe("clientIp", () => {
  it("prefers Cloudflare's header, then the proxy's", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "192.0.2.7", "x-forwarded-for": "10.0.0.1" }))).toBe("192.0.2.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.3, 10.0.0.1" }))).toBe("198.51.100.3");
    expect(clientIp(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("ignores what is not an address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "evil<script>" }))).toBeNull();
    expect(clientIp(new Headers())).toBeNull();
  });
});
