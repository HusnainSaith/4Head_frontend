import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMocks = vi.hoisted(() => ({
  get: vi.fn<(name: string) => string | undefined>(),
  set: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("js-cookie", () => ({ default: cookieMocks }));

import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from "@/lib/auth-cookies";

function createToken(expiresAt: number): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: "user-1",
    exp: expiresAt,
  })}.signature`;
}

beforeEach(() => vi.clearAllMocks());

describe("auth-cookies", () => {
  it("uses each JWT expiry and clears every auth cookie", () => {
    const now = Math.floor(Date.now() / 1000);
    const accessToken = createToken(now + 900);
    const refreshToken = createToken(now + 604_800);

    setAuthCookies(accessToken, refreshToken);

    expect(cookieMocks.set).toHaveBeenNthCalledWith(
      1,
      "4head_access_token",
      accessToken,
      expect.objectContaining({
        sameSite: "strict",
        expires: expect.any(Date),
      }),
    );
    expect(cookieMocks.set).toHaveBeenNthCalledWith(
      2,
      "4head_refresh_token",
      refreshToken,
      expect.objectContaining({
        sameSite: "strict",
        expires: expect.any(Date),
      }),
    );

    cookieMocks.get.mockImplementation((name) =>
      name === "4head_access_token" ? accessToken : refreshToken,
    );
    expect(getAccessToken()).toBe(accessToken);
    expect(getRefreshToken()).toBe(refreshToken);

    clearAuthCookies();
    expect(cookieMocks.remove).toHaveBeenCalledTimes(3);
  });
});
