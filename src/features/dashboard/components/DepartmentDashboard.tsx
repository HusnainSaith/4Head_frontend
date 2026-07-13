import { Boxes, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DashboardSection,
  QuickLinkGrid,
  StatCardGrid,
} from "@/components/common/DashboardBlocks";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useSelector } from "react-redux";
import {
  selectUserDepartmentCode,
  selectUserDepartmentId,
} from "@/features/auth/authSlice";
import {
  useGetOutstandingBalancesQuery,
  useGetStockSummaryQuery,
} from "@/features/dashboard/dashboardApi";
import { DepartmentCode } from "@/types/enums";

const departmentPath: Record<DepartmentCode, string> = {
  [DepartmentCode.BROKERAGE]: "/brokerage",
  [DepartmentCode.SUPPLY]: "/supply",
  [DepartmentCode.WASTAGE]: "/wastage",
  [DepartmentCode.FRESH_CHICKEN_SHOP]: "/fresh-chicken-shop",
};

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function DepartmentDashboard() {
  const departmentId = useSelector(selectUserDepartmentId);
  const departmentCode = useSelector(selectUserDepartmentCode);
  const stock = useGetStockSummaryQuery(
    { departmentId: departmentId ?? undefined },
    { skip: !departmentId },
  );
  const balances = useGetOutstandingBalancesQuery(
    { departmentId: departmentId ?? undefined },
    { skip: !departmentId },
  );

  if (!departmentId) {
    return (
      <ErrorState
        title="No department assigned"
        description="Ask an owner to assign your account to a department."
      />
    );
  }
  if (stock.isLoading || balances.isLoading) return <PageSkeleton rows={4} />;
  if (stock.isError || balances.isError) {
    return (
      <ErrorState
        title="Department dashboard is unavailable"
        onRetry={() => {
          void stock.refetch();
          void balances.refetch();
        }}
      />
    );
  }

  const stockRows = stock.data?.data.summary ?? [];
  const balanceRows = balances.data?.data ?? [];
  const stockTotal = stockRows.reduce(
    (sum, item) => sum + Number(item.quantityKg || 0),
    0,
  );
  const outstandingTotal = balanceRows.reduce(
    (sum, item) => sum + Number(item.balance || 0),
    0,
  );

  return (
    <PageContainer>
      <PageHeader
        title="Department dashboard"
        description="Only your assigned department is queried."
      />
      <StatCardGrid>
        <StatCard
          label="Current stock"
          value={`${stockTotal.toFixed(2)} kg`}
          icon={Boxes}
        />
        <StatCard
          label="Outstanding balance"
          value={money.format(outstandingTotal)}
          icon={Scale}
        />
      </StatCardGrid>
      <DashboardSection title="Today's purchases and sales">
        <EmptyState
          title="Coming soon"
          description="The backend has no current report endpoint for today's department purchases and sales."
        />
      </DashboardSection>
      <DashboardSection title="Quick entry">
        {departmentCode ? (
          <QuickLinkGrid>
            <Button asChild>
              <Link to={departmentPath[departmentCode]}>
                Open department entry
              </Link>
            </Button>
          </QuickLinkGrid>
        ) : (
          <EmptyState
            title="Department route unavailable"
            description="The current backend token does not contain a usable departmentCode claim."
          />
        )}
      </DashboardSection>
    </PageContainer>
  );
}
