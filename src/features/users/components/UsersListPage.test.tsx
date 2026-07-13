import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import authReducer from "@/features/auth/authSlice";
import { RoleGuard } from "@/routes/RoleGuard";
import {
  authenticatedState,
  departmentUser,
  ownerUser,
} from "@/test/auth-fixtures";
import { Role } from "@/types/enums";

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(),
  listRoles: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
  departments: vi.fn(),
}));

vi.mock("../usersApi", () => ({
  useListUsersQuery: mocks.listUsers,
  useListUserRolesQuery: mocks.listRoles,
  useCreateUserMutation: () => [mocks.create, { isLoading: false }],
  useUpdateUserMutation: () => [mocks.update, { isLoading: false }],
  useDeactivateUserMutation: () => [mocks.deactivate, { isLoading: false }],
}));
vi.mock("@/features/vehicles/vehiclesApi", () => ({
  useListDepartmentsQuery: mocks.departments,
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { UsersListPage } from "./UsersListPage";

const staff = {
  id: "user-2",
  fullName: "Supply Staff",
  email: "staff@example.com",
  phone: "03001234567",
  roleId: "role-staff",
  role: {
    id: "role-staff",
    name: Role.DEPARTMENT_STAFF,
    description: null,
  },
  departmentId: "department-1",
  department: { id: "department-1", name: "Supply", type: "SUPPLY" },
  isActive: true,
  createdAt: "2026-07-13T00:00:00Z",
  updatedAt: "2026-07-13T00:00:00Z",
  deletedAt: null,
};

function renderGuarded(user: typeof ownerUser) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authenticatedState(user) },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/users"]}>
        <RoleGuard allowedRoles={[Role.OWNER]}>
          <UsersListPage />
        </RoleGuard>
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listUsers.mockReturnValue({
    data: { data: [staff] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.listRoles.mockReturnValue({
    data: {
      data: [
        { id: "role-owner", name: Role.OWNER, description: null },
        { id: "role-staff", name: Role.DEPARTMENT_STAFF, description: null },
      ],
    },
    isError: false,
  });
  mocks.departments.mockReturnValue({
    data: {
      data: [{ id: "department-1", name: "Supply", type: "SUPPLY" }],
    },
    isError: false,
  });
});

describe("UsersListPage", () => {
  it("renders users and confirms before deactivation", async () => {
    mocks.deactivate.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    renderGuarded(ownerUser);
    expect(screen.getByText("Supply Staff")).toBeInTheDocument();
    expect(screen.getByText("Department staff")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(screen.getByText("Deactivate user?")).toBeInTheDocument();
    const deactivateButtons = screen.getAllByRole("button", {
      name: "Deactivate",
    });
    fireEvent.click(deactivateButtons[deactivateButtons.length - 1]);
    await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledWith("user-2"));
  });

  it("opens the create form and requires an owner-set initial password", () => {
    renderGuarded(ownerUser);
    fireEvent.click(screen.getByRole("button", { name: "Add User" }));
    expect(screen.getByText("Add User", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Initial password/)).toBeInTheDocument();
    expect(
      screen.getByText(/backend does not send invitations/i),
    ).toBeInTheDocument();
  });

  it("blocks a non-owner before the page mounts or fetches users", () => {
    renderGuarded(departmentUser);
    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(mocks.listUsers).not.toHaveBeenCalled();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });
});
