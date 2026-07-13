import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { getApiErrorMessage } from "@/lib/api-error";
import { useGetStockQuery } from "../wastageApi";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" });

export function WastageStockPage() {
  const query = useGetStockQuery();
  if (query.isLoading) return <PageSkeleton rows={2} />;
  if (query.isError || !query.data?.data) return <PageContainer><ErrorState title="Wastage stock could not be loaded" description={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} /></PageContainer>;
  return <PageContainer><PageHeader title="Wastage Stock" description="Current stock balance and server-calculated weighted average cost." /><div className="grid gap-4 sm:grid-cols-2"><StatCard label="Quantity" value={`${query.data.data.quantityKg} kg`} /><StatCard label="Weighted average cost" value={money.format(Number(query.data.data.wac))} /></div></PageContainer>;
}
