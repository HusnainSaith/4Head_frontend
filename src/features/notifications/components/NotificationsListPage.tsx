import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api-error";
import { useGetNotificationsQuery, useRetryNotificationMutation } from "../notificationsApi";
import type { Notification, NotificationStatus } from "../types";

function statusVariant(status: NotificationStatus): "default" | "secondary" | "destructive" {
  return status === "failed" ? "destructive" : status === "pending" ? "secondary" : "default";
}

export function NotificationsListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<NotificationStatus | "all">("all");
  const [sourceType, setSourceType] = useState("");
  const query = useGetNotificationsQuery({ page, limit: 20, status: status === "all" ? undefined : status, sourceType: sourceType || undefined });
  const [retry, retryState] = useRetryNotificationMutation();
  const columns: DataTableColumn<Notification>[] = [
    { id: "title", header: "Title", cell: (row) => <div><div className="font-medium">{row.title}</div>{row.errorMessage ? <div className="max-w-xs truncate text-xs text-destructive">{row.errorMessage}</div> : null}</div> },
    { id: "type", header: "Type", cell: (row) => row.type },
    { id: "recipient", header: "Recipient", cell: (row) => row.recipientEmail ?? row.recipientUser?.email ?? "—" },
    { id: "source", header: "Source", cell: (row) => row.sourceType.replaceAll("_", " ") },
    { id: "status", header: "Status", cell: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge> },
    { id: "sent", header: "Sent At", cell: (row) => row.sentAt ? new Date(row.sentAt).toLocaleString("en-PK") : "—" },
    { id: "actions", header: "Actions", cell: (row) => row.status === "failed" ? <Button size="sm" variant="outline" disabled={retryState.isLoading} onClick={() => void retry(row.id).unwrap().then(() => toast.success("Notification sent")).catch((error) => toast.error(getApiErrorMessage(error)))}>Retry</Button> : "—" },
  ];
  return <PageContainer><PageHeader title="Email Notifications" description="Delivery history for transaction emails." /><div className="mb-4 grid gap-3 md:grid-cols-2"><Select value={status} onValueChange={(value) => { setStatus(value as NotificationStatus | "all"); setPage(1); }}><SelectTrigger aria-label="Notification status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select><Input aria-label="Source type" placeholder="Filter source type" value={sourceType} onChange={(event) => { setSourceType(event.target.value); setPage(1); }} /></div><DataTable columns={columns} data={query.data?.data.items ?? []} getRowId={(row) => row.id} isLoading={query.isLoading} isError={query.isError} onRetry={() => void query.refetch()} pagination={{ page, pageSize: 20, total: query.data?.data.pagination.total ?? 0 }} onPageChange={setPage} /></PageContainer>;
}
