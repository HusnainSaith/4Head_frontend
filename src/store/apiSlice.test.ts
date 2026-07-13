import { configureStore } from "@reduxjs/toolkit";

const authState = vi.hoisted(() => ({
  accessToken: "expired-access-token",
  refreshToken: "valid-refresh-token",
}));

vi.mock("@/lib/auth-cookies", () => ({
  getAccessToken: () => authState.accessToken,
  getRefreshToken: () => authState.refreshToken,
  setAuthCookies: (accessToken: string, refreshToken: string) => {
    authState.accessToken = accessToken;
    authState.refreshToken = refreshToken;
  },
  clearAuthCookies: vi.fn(),
}));

vi.mock("@/lib/jwt", () => ({ isTokenUnexpired: () => true }));

describe("apiSlice refresh concurrency", () => {
  it("performs exactly one refresh for five simultaneous 401 responses", async () => {
    authState.accessToken = "expired-access-token";
    authState.refreshToken = "valid-refresh-token";
    let refreshCalls = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      if (request.url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        await Promise.resolve();
        return new Response(
          JSON.stringify({ data: { accessToken: "fresh-access-token" } }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (request.headers.get("Authorization") === "Bearer fresh-access-token") {
        return new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "expired" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { apiSlice } = await import("./apiSlice");
    const auditApi = apiSlice.injectEndpoints({
      endpoints: (builder) => ({
        auditWidget: builder.query<unknown, number>({
          query: (id) => `/audit/widgets/${id}`,
        }),
      }),
    });
    const store = configureStore({
      reducer: { [auditApi.reducerPath]: auditApi.reducer },
      middleware: (getDefault) => getDefault().concat(auditApi.middleware),
    });

    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((id) =>
        store.dispatch(auditApi.endpoints.auditWidget.initiate(id)),
      ),
    );

    expect(refreshCalls).toBe(1);
    expect(results.every((result) => result.isSuccess)).toBe(true);
    vi.unstubAllGlobals();
  });
});
