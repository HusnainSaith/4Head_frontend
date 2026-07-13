import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { StatCard } from "@/components/common/StatCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { selectUserDepartmentCode, selectUserRole } from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import { useCreateShopStockWriteoffMutation, useGetShopStockQuery } from "../shopApi";
import type { StockWriteoffRequest } from "../types";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" });
type WriteoffReason = StockWriteoffRequest["reason"];

export function ShopStockPage() {
  const query = useGetShopStockQuery();
  const role = useSelector(selectUserRole);
  const dept = useSelector(selectUserDepartmentCode);
  const canWrite =
    role === Role.OWNER ||
    role === Role.ACCOUNTANT ||
    (role === Role.DEPARTMENT_STAFF && dept === DepartmentCode.FRESH_CHICKEN_SHOP);

  const [open, setOpen] = useState(false);
  const [writeoff, state] = useCreateShopStockWriteoffMutation();

  if (query.isLoading) return <PageSkeleton rows={2} />;
  if (query.isError || !query.data?.data)
    return (
      <PageContainer>
        <ErrorState
          title="Shop stock could not be loaded"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );

  const stock = query.data.data;

  return (
    <PageContainer>
      <PageHeader
        title="Shop Stock"
        actions={canWrite ? <Button onClick={() => setOpen(true)}>Record Write-off</Button> : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Quantity" value={`${stock.quantityKg} kg`} />
        <StatCard label="Weighted average cost" value={money.format(Number(stock.wac))} />
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        This stock is fed exclusively by internal transfers from Supply. The Fresh Chicken Shop has
        no purchase-creation screen — see <strong>Incoming Transfers</strong> for the source records.
      </p>
      <WriteoffDialog
        open={open}
        loading={state.isLoading}
        onClose={() => setOpen(false)}
        onSubmit={async (body) => {
          try {
            const result = await writeoff(body).unwrap();
            toast.success(`Write-off recorded: ${money.format(Number(result.data.valuationAmount))}`);
            setOpen(false);
          } catch (e) {
            toast.error(getApiErrorMessage(e));
          }
        }}
      />
    </PageContainer>
  );
}

function WriteoffDialog({
  open,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: StockWriteoffRequest) => Promise<void>;
}) {
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<WriteoffReason>("spoilage");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const handleClose = () => {
    setQty(""); setReason("spoilage"); setNote(""); setDate(new Date().toISOString().slice(0, 10));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Write-off</DialogTitle>
          <DialogDescription>The server values the loss at the current weighted average cost.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const q = Number(qty);
            if (Number.isFinite(q) && q > 0)
              void onSubmit({ quantityKg: q, reason, note: note || undefined, writeoffDate: date });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="wo-qty">Quantity (kg) *</Label>
            <Input id="wo-qty" type="number" min="0.001" step="0.001" required value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as WriteoffReason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["spoilage", "mortality", "transit_loss", "other"] as WriteoffReason[]).map((r) => (
                  <SelectItem key={r} value={r}>{r.replaceAll("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wo-date">Date *</Label>
            <Input id="wo-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wo-note">Note</Label>
            <Input id="wo-note" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" isLoading={loading}>Record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
