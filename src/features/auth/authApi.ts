import { credentialsSet } from "@/features/auth/authSlice";
import type {
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshRequest,
  RefreshResponse,
  SessionUser,
} from "@/features/auth/types";
import {
  getRefreshToken,
  setAuthCookies,
  setAuthProfile,
} from "@/lib/auth-cookies";
import { decodeJwtPayload } from "@/lib/jwt";
import { apiSlice } from "@/store/apiSlice";
import { DepartmentCode } from "@/types/enums";

function getDepartmentCode(accessToken: string): DepartmentCode | null {
  const value = decodeJwtPayload(accessToken)?.departmentCode;
  return value &&
    Object.values(DepartmentCode).includes(value as DepartmentCode)
    ? (value as DepartmentCode)
    : null;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      async onQueryStarted(_request, { dispatch, queryFulfilled }) {
        const { data: response } = await queryFulfilled;
        const { accessToken, refreshToken, user } = response.data;
        const sessionUser: SessionUser = {
          ...user,
          departmentCode: getDepartmentCode(accessToken),
        };
        setAuthCookies(accessToken, refreshToken);
        setAuthProfile(sessionUser);
        dispatch(credentialsSet(sessionUser));
      },
    }),
    refresh: builder.mutation<RefreshResponse, RefreshRequest>({
      query: (body) => ({ url: "/auth/refresh", method: "POST", body }),
      async onQueryStarted(_request, { queryFulfilled }) {
        const refreshToken = getRefreshToken();
        const { data: response } = await queryFulfilled;
        if (refreshToken) {
          setAuthCookies(response.data.accessToken, refreshToken);
        }
      },
    }),
    logout: builder.mutation<LogoutResponse, LogoutRequest>({
      query: (body) => ({ url: "/auth/logout", method: "POST", body }),
    }),
  }),
});

export const { useLoginMutation, useRefreshMutation, useLogoutMutation } =
  authApi;
