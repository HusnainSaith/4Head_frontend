import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserRole,
} from "./types";

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<ApiResponse<User[]>, void>({
      query: () => "/users",
      providesTags: (result) => [
        { type: "User", id: "LIST" },
        ...(result?.data.map(({ id }) => ({ type: "User" as const, id })) ??
          []),
      ],
    }),
    listUserRoles: builder.query<ApiResponse<UserRole[]>, void>({
      query: () => "/users/roles",
      providesTags: [{ type: "User", id: "ROLES" }],
    }),
    createUser: builder.mutation<ApiResponse<User>, CreateUserRequest>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    updateUser: builder.mutation<
      ApiResponse<User>,
      { id: string; body: UpdateUserRequest }
    >({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    deactivateUser: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListUsersQuery,
  useListUserRolesQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
} = usersApi;
