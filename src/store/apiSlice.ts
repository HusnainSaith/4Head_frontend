import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { loggedOut } from "@/features/auth/authSlice";
import type { RefreshResponse } from "@/features/auth/types";
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from "@/lib/auth-cookies";
import { isTokenUnexpired } from "@/lib/jwt";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  // Never send the frontend-managed token cookies automatically. Authentication
  // is exclusively the explicit bearer header prepared below.
  credentials: "omit",
  prepareHeaders: (headers) => {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return headers;
  },
});

type RawBaseQuery = typeof rawBaseQuery;
type BaseQueryApi = Parameters<RawBaseQuery>[1];
type BaseQueryExtraOptions = Parameters<RawBaseQuery>[2];

function isRefreshResponse(value: unknown): value is RefreshResponse {
  if (typeof value !== "object" || value === null) return false;
  const envelope = value as Record<string, unknown>;
  if (typeof envelope.data !== "object" || envelope.data === null) return false;
  const data = envelope.data as Record<string, unknown>;
  return typeof data.accessToken === "string";
}

function isSessionEndpoint(args: string | FetchArgs): boolean {
  const url = typeof args === "string" ? args : args.url;
  return ["/auth/login", "/auth/refresh", "/auth/logout"].some((path) =>
    url.endsWith(path),
  );
}

async function refreshSession(
  api: BaseQueryApi,
  extraOptions: BaseQueryExtraOptions,
): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthCookies();
    api.dispatch(loggedOut());
    return false;
  }

  const result = await rawBaseQuery(
    {
      url: "/auth/refresh",
      method: "POST",
      body: { refreshToken },
    },
    api,
    extraOptions,
  );

  if (!result.error && isRefreshResponse(result.data)) {
    const nextAccessToken = result.data.data.accessToken;
    if (isTokenUnexpired(nextAccessToken) && isTokenUnexpired(refreshToken)) {
      // The backend does not rotate refresh tokens, so the existing refresh
      // token is written again with the expiry encoded in its own exp claim.
      setAuthCookies(nextAccessToken, refreshToken);
      return true;
    }
  }

  clearAuthCookies();
  api.dispatch(loggedOut());
  return false;
}

let refreshInFlight: Promise<boolean> | null = null;

const baseQueryWithRefresh: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401 || isSessionEndpoint(args)) {
    return result;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshSession(api, extraOptions).finally(() => {
      refreshInFlight = null;
    });
  }

  const refreshed = await refreshInFlight;
  return refreshed ? rawBaseQuery(args, api, extraOptions) : result;
};

/** Single RTK Query API; feature modules extend it with injectEndpoints(). */
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRefresh,
  tagTypes: [
    "Party",
    "PartyStatement",
    "BrokeragePurchase",
    "BrokerageSale",
    "BrokerageStock",
    "BrokerageReport",
    "BrokerageStockMovement",
    "WastagePurchase",
    "WastageSale",
    "WastageStock",
    "WastageReport",
    "SupplyPurchase",
    "SupplySale",
    "SupplyStock",
    "SupplyReport",
    "InternalTransfer",
    "FreshChickenStock",
    "Vehicle",
    "VehicleFuelLog",
    "VehicleMaintenanceLog",
    "Expense",
    "Employee",
    "EmployeeAdvance",
    "EmployeeBonus",
    "SalaryRun",
    "ShopSale",
    "ShopReport",
    "User",
    "Role",
    "ConsolidatedReport",
    "Invoice",
    "Notification",
    "DepartmentBalance",
  ],
  endpoints: () => ({}),
});
