import { Banknote, Boxes, Scale, TrendingUp } from "lucide-react";
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
import {
  useGetConsolidatedProfitLossQuery,
  useGetOutstandingBalancesQuery,
  useGetStockSummaryQuery,
} from "@/features/dashboard/dashboardApi";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

function total(values: readonly string[]): number {
  return values.reduce((sum, value) => sum + Number(value || 0), 0);
}

export function OwnerDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const profit = useGetConsolidatedProfitLossQuery({
    startDate: today,
    endDate: today,
  });
  const balances = useGetOutstandingBalancesQuery();
  const stock = useGetStockSummaryQuery();

  if (profit.isLoading || balances.isLoading || stock.isLoading) {
    return <PageSkeleton rows={5} />;
  }

  if (profit.isError || balances.isError || stock.isError) {
    return (
      <ErrorState
        title="Dashboard data is unavailable"
        onRetry={() => {
          void profit.refetch();
          void balances.refetch();
          void stock.refetch();
        }}
      />
    );
  }

  const profitData = profit.data?.data;
  const balanceData = balances.data?.data ?? [];
  const stockData = stock.data?.data.summary ?? [];
  const stockTotal = total(stockData.map((item) => item.quantityKg));
  const outstandingTotal = total(balanceData.map((item) => item.balance));
  const departmentStock = Object.entries(
    stockData.reduce<Record<string, number>>((summary, item) => {
      summary[item.departmentId] =
        (summary[item.departmentId] ?? 0) + Number(item.quantityKg || 0);
      return summary;
    }, {}),
  );

  return (
    <PageContainer>
      <PageHeader
        title="Business dashboard"
        description="Today's consolidated operational snapshot."
      />
      <StatCardGrid>
        <StatCard
          label="External revenue"
          value={money.format(Number(profitData?.externalRevenue ?? 0))}
          icon={TrendingUp}
        />
        <StatCard
          label="Net profit"
          value={money.format(Number(profitData?.netProfit ?? 0))}
          icon={Banknote}
        />
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
      <DashboardSection
        title="Stock by department"
        description="Live values from GET /reports/stock-summary."
      >
        {departmentStock.length ? (
          <StatCardGrid>
            {departmentStock.map(([departmentId, quantity]) => (
              <StatCard
                key={departmentId}
                label={`Department ${departmentId.slice(0, 8)}`}
                value={`${quantity.toFixed(2)} kg`}
                icon={Boxes}
              />
            ))}
          </StatCardGrid>
        ) : (
          <EmptyState
            title="No stock balances"
            description="No stock summary rows were returned."
          />
        )}
      </DashboardSection>
      <DashboardSection title="Per-department revenue and gross profit">
        <EmptyState
          title="Coming soon"
          description="The backend does not currently expose per-department revenue or gross-profit report endpoints."
        />
      </DashboardSection>
      <DashboardSection title="Quick links">
        <QuickLinkGrid>
          <Button asChild variant="outline">
            <Link to="/brokerage">Brokerage entry</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/supply">Supply entry</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/wastage">Wastage entry</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/fresh-chicken-shop">Shop entry</Link>
          </Button>
        </QuickLinkGrid>
      </DashboardSection>
    </PageContainer>
  );
}
