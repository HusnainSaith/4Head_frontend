import { useEffect, useRef, type ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PageSkeleton } from "@/components/common/Skeletons";
import { useRefreshMutation } from "@/features/auth/authApi";
import {
  loggedOut,
  selectIsCheckingAuth,
  sessionRestored,
} from "@/features/auth/authSlice";
import { isSessionUser } from "@/features/auth/types";
import {
  clearAuthCookies,
  getAccessToken,
  getAuthProfile,
  getRefreshToken,
} from "@/lib/auth-cookies";
import { isTokenUnexpired } from "@/lib/jwt";
import type { AppDispatch } from "@/store/store";

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const isCheckingAuth = useSelector(selectIsCheckingAuth);
  const [refresh] = useRefreshMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const restore = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      const profile = getAuthProfile();

      if (!isSessionUser(profile)) {
        clearAuthCookies();
        dispatch(loggedOut());
        return;
      }

      if (accessToken && isTokenUnexpired(accessToken)) {
        dispatch(sessionRestored(profile));
        return;
      }

      if (refreshToken && isTokenUnexpired(refreshToken)) {
        try {
          await refresh({ refreshToken }).unwrap();
          dispatch(sessionRestored(profile));
          return;
        } catch {
          // Fall through to the single local-session cleanup path.
        }
      }

      clearAuthCookies();
      dispatch(loggedOut());
    };

    void restore();
  }, [dispatch, refresh]);

  return isCheckingAuth ? <PageSkeleton rows={5} /> : children;
}
