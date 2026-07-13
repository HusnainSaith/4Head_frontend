/**
 * Auth tokens are stored in plain, JavaScript-readable cookies rather than httpOnly cookies. This deliberate project choice is convenient but remains exposed to script-based token theft and is not an added security boundary; moving to httpOnly cookies later requires backend Set-Cookie support. The access token is still attached manually as a bearer header, and the cached profile is UI bootstrap data only, never an authorization authority.
 */
import Cookies from "js-cookie";
import { getTokenExpiration } from "@/lib/jwt";

const ACCESS_TOKEN_COOKIE = "4head_access_token";
const REFRESH_TOKEN_COOKIE = "4head_refresh_token";
const AUTH_PROFILE_COOKIE = "4head_auth_profile";

const cookieOptions: Cookies.CookieAttributes = {
  path: "/",
  secure: !import.meta.env.DEV,
  sameSite: "strict",
};

function setJwtCookie(name: string, token: string): void {
  const expires = getTokenExpiration(token);
  if (!expires || expires.getTime() <= Date.now()) {
    Cookies.remove(name, cookieOptions);
    return;
  }
  Cookies.set(name, token, { ...cookieOptions, expires });
}

export function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): void {
  setJwtCookie(ACCESS_TOKEN_COOKIE, accessToken);
  setJwtCookie(REFRESH_TOKEN_COOKIE, refreshToken);
}

export function getAccessToken(): string | null {
  return Cookies.get(ACCESS_TOKEN_COOKIE) ?? null;
}

export function getRefreshToken(): string | null {
  return Cookies.get(REFRESH_TOKEN_COOKIE) ?? null;
}

export function setAuthProfile(profile: unknown): void {
  const refreshToken = getRefreshToken();
  const expires = refreshToken ? getTokenExpiration(refreshToken) : null;
  if (!expires) return;
  Cookies.set(AUTH_PROFILE_COOKIE, JSON.stringify(profile), {
    ...cookieOptions,
    expires,
  });
}

export function getAuthProfile(): unknown {
  const profile = Cookies.get(AUTH_PROFILE_COOKIE);
  if (!profile) return null;
  try {
    return JSON.parse(profile) as unknown;
  } catch {
    return null;
  }
}

export function clearAuthCookies(): void {
  Cookies.remove(ACCESS_TOKEN_COOKIE, cookieOptions);
  Cookies.remove(REFRESH_TOKEN_COOKIE, cookieOptions);
  Cookies.remove(AUTH_PROFILE_COOKIE, cookieOptions);
}
