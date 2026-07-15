import { useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  selectUserDepartmentCode,
  selectUserRole,
} from "@/features/auth/authSlice";
import {
  useCreatePartyMutation,
  useListPartiesQuery,
} from "@/features/parties/partiesApi";
import { PartyType } from "@/features/parties/types";
import { DepartmentBalancesPanel } from "@/features/parties/components/DepartmentBalancesPanel";
import { InvoiceButton } from "@/features/invoices/components/InvoiceButton";
import { getApiErrorMessage } from "@/lib/api-error";
import { DepartmentCode, Role } from "@/types/enums";
import {
  useCreateShopSaleMutation,
  useDeleteShopSaleMutation,
  useGetShopStockQuery,
  useListShopSalesQuery,
} from "../shopApi";
import type { CreateSaleRequest, ShopSale } from "../types";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
});

const shopSaleSchema = z
  .object({
    liveWeightKg: z.number().positive("Live weight must be greater than zero."),
    dressedWeightKg: z
      .number()
      .positive("Dressed weight must be greater than zero."),
    ratePerKg: z.number().positive("Sale rate must be greater than zero."),
  })
  .refine((value) => value.dressedWeightKg <= value.liveWeightKg, {
    path: ["dressedWeightKg"],
    message: "Dressed weight cannot exceed live weight.",
  });

const columns: DataTableColumn<ShopSale>[] = [
  {
    id: "customer",
    header: "Customer",
    cell: (r) =>
      r.customerPartyId ? (
        <a
          className="font-medium text-primary hover:underline"
          href={`/parties/${r.customerPartyId}`}
        >
          {r.customerParty?.name ?? "View statement"}
        </a>
      ) : (
        "—"
      ),
  },
  {
    id: "liveWeight",
    header: "Live / dressed",
    cell: (r) => `${r.liveWeightKg} / ${r.dressedWeightKg} kg`,
    align: "right",
  },
  {
    id: "rate",
    header: "Rate/kg",
    cell: (r) => money.format(Number(r.ratePerKg)),
    align: "right",
  },
  {
    id: "shrinkage",
    header: "Processing loss",
    cell: (r) =>
      `${r.shrinkageKg} kg / ${money.format(Number(r.processingLossAmount))}`,
    align: "right",
  },
  {
    id: "grossProfit",
    header: "Gross profit",
    cell: (r) => money.format(Number(r.grossProfitAmount)),
    align: "right",
  },
  {
    id: "total",
    header: "Total",
    cell: (r) => money.format(Number(r.totalAmount)),
    align: "right",
  },
  {
    id: "payment",
    header: "Payment",
    cell: (r) => <Badge variant="secondary">{r.paymentMethod}</Badge>,
  },
  {
    id: "received",
    header: "Received / Total",
    cell: (r) =>
      `${money.format(Number(r.amountReceived))} / ${money.format(Number(r.totalAmount))}`,
    align: "right",
  },
  {
    id: "outstanding",
    header: "Initial receivable",
    cell: (r) => money.format(Number(r.outstandingAmount)),
    align: "right",
  },
  {
    id: "date",
    header: "Sale date",
    cell: (r) => String(r.saleDate).slice(0, 10),
  },
];

export function ShopSalesPage() {
  const query = useListShopSalesQuery();
  const stock = useGetShopStockQuery();
  const role = useSelector(selectUserRole);
  const dept = useSelector(selectUserDepartmentCode);
  const canWrite =
    role === Role.OWNER ||
    role === Role.ACCOUNTANT ||
    (role === Role.DEPARTMENT_STAFF &&
      dept === DepartmentCode.FRESH_CHICKEN_SHOP);
  const canInvoice = role === Role.OWNER || role === Role.ACCOUNTANT;

  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ShopSale | null>(null);
  const [createSale, createState] = useCreateShopSaleMutation();
  const [deleteSale, deleteState] = useDeleteShopSaleMutation();

  const availableKg = stock.data?.data.quantityKg;

  const actionColumns: DataTableColumn<ShopSale>[] = canWrite
    ? [
        {
          id: "actions",
          header: "Actions",
          cell: (r) => (
            <div className="flex gap-1">
              {canInvoice ? (
                <InvoiceButton
                  sourceType="sale"
                  sourceId={r.id}
                  label="Print"
                />
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingDelete(r)}
              >
                Delete
              </Button>
            </div>
          ),
          align: "right",
        },
      ]
    : [];

  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError)
    return (
      <PageContainer>
        <ErrorState
          title="Sales could not be loaded"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );

  return (
    <PageContainer>
      <PageHeader
        title="Shop Sales"
        actions={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus /> Record Sale
            </Button>
          ) : undefined
        }
      />
      <DepartmentBalancesPanel
        departmentCode={DepartmentCode.FRESH_CHICKEN_SHOP}
      />
      <DataTable
        columns={[...columns, ...actionColumns]}
        data={query.data?.data ?? []}
        getRowId={(r) => r.id}
        emptyContent={<EmptyState title="No sales recorded" />}
      />
      <SaleDialog
        key={open ? "new-open" : "new-closed"}
        open={open}
        availableKg={availableKg}
        wac={stock.data?.data.wac}
        loading={createState.isLoading}
        onClose={() => {
          setOpen(false);
        }}
        onSubmit={async (body) => {
          try {
            await createSale(body).unwrap();
            toast.success("Sale recorded");
            setOpen(false);
          } catch (e) {
            toast.error(getApiErrorMessage(e));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(nextOpen) => !nextOpen && setPendingDelete(null)}
        title="Cancel this shop sale?"
        description="Stock and ledger effects will be reversed. The original record remains in the audit trail."
        confirmLabel="Cancel sale"
        destructive
        loading={deleteState.isLoading}
        onConfirm={() => {
          if (!pendingDelete) return;
          void deleteSale(pendingDelete.id)
            .unwrap()
            .then(() => {
              toast.success("Sale cancelled");
              setPendingDelete(null);
            })
            .catch((error) => toast.error(getApiErrorMessage(error)));
        }}
      />
    </PageContainer>
  );
}

function SaleDialog({
  open,
  availableKg,
  wac,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  availableKg?: string;
  wac?: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreateSaleRequest) => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState("");
  const [liveWeight, setLiveWeight] = useState("");
  const [dressedWeight, setDressedWeight] = useState("");
  const [rate, setRate] = useState("");
  const [method, setMethod] = useState<"cash" | "bank" | "credit">("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [createParty, partyState] = useCreatePartyMutation();

  const partiesQuery = useListPartiesQuery(
    { type: PartyType.CUSTOMER, limit: 100 },
    { skip: !open },
  );
  const customers = partiesQuery.data?.data?.items ?? [];

  const handleClose = () => {
    setCustomerId("");
    setLiveWeight("");
    setDressedWeight("");
    setRate("");
    setMethod("cash");
    setAmountReceived("");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setFormError("");
    setShowNewCustomer(false);
    setNewName("");
    setNewPhone("");
    onClose();
  };

  const handleCreateCustomer = async () => {
    if (!newName.trim()) return;
    try {
      const result = await createParty({
        partyType: PartyType.CUSTOMER,
        name: newName.trim(),
        phone: newPhone || undefined,
      }).unwrap();
      setCustomerId(result.data.id);
      setShowNewCustomer(false);
      setNewName("");
      setNewPhone("");
      toast.success("Customer created");
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const live = Number(liveWeight);
    const dressed = Number(dressedWeight);
    const r = Number(rate);
    const parsed = shopSaleSchema.safeParse({
      liveWeightKg: live,
      dressedWeightKg: dressed,
      ratePerKg: r,
    });
    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ?? "Check the sale weights.",
      );
      return;
    }
    const total = dressed * r;
    const enteredAmount =
      amountReceived === "" ? undefined : Number(amountReceived);
    if (
      enteredAmount !== undefined &&
      (!Number.isFinite(enteredAmount) || enteredAmount < 0)
    ) {
      setFormError("Amount received cannot be negative.");
      return;
    }
    if (enteredAmount !== undefined && enteredAmount > total) {
      setFormError("Amount received cannot exceed total amount.");
      return;
    }
    const effectiveAmount = enteredAmount ?? (method === "credit" ? 0 : total);
    if (effectiveAmount < total && !customerId) {
      setFormError("Select a customer when a receivable balance remains.");
      return;
    }
    if (availableKg && live > Number(availableKg)) {
      setFormError(`Insufficient stock. Available: ${availableKg} kg`);
      return;
    }
    void onSubmit({
      customerPartyId: customerId || undefined,
      liveWeightKg: live,
      dressedWeightKg: dressed,
      ratePerKg: r,
      paymentMethod: method,
      amountReceived: enteredAmount,
      saleDate: date,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="scrollbar-hidden">
        <DialogHeader>
          <DialogTitle>Record Live-to-Dressed Sale</DialogTitle>
          <DialogDescription>
            {availableKg !== undefined
              ? `Available stock: ${availableKg} kg`
              : "Loading stock…"}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Customer</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewCustomer(!showNewCustomer)}
              >
                {showNewCustomer ? "Cancel" : "+ New customer"}
              </Button>
            </div>
            {showNewCustomer ? (
              <div className="space-y-2 rounded-md border p-3">
                <Input
                  placeholder="Customer name *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  placeholder="Phone (optional)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  isLoading={partyState.isLoading}
                  onClick={() => void handleCreateCustomer()}
                >
                  Create
                </Button>
              </div>
            ) : (
              <Select
                value={customerId || "none"}
                onValueChange={(v) => setCustomerId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Walk-in / None —</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-live-weight">
              1. Live weight pulled from stock (kg) *
            </Label>
            <Input
              id="sale-live-weight"
              type="number"
              min="0.001"
              step="0.001"
              required
              value={liveWeight}
              onChange={(e) => setLiveWeight(e.target.value)}
            />
            {availableKg && (
              <p className="text-xs text-muted-foreground">
                Available: {availableKg} kg
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-dressed-weight">
              2. Dressed weight sold (kg) *
            </Label>
            <Input
              id="sale-dressed-weight"
              type="number"
              min="0.001"
              step="0.001"
              max={liveWeight || undefined}
              required
              value={dressedWeight}
              onChange={(e) => setDressedWeight(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Processing loss:{" "}
              {Math.max(
                0,
                (Number(liveWeight) || 0) - (Number(dressedWeight) || 0),
              ).toFixed(3)}{" "}
              kg
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-rate">3. Sale rate per dressed kg *</Label>
            <Input
              id="sale-rate"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <ProfitPreview
            liveWeightKg={Number(liveWeight) || 0}
            dressedWeightKg={Number(dressedWeight) || 0}
            ratePerKg={Number(rate) || 0}
            wac={Number(wac) || 0}
          />

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as typeof method)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-amount-received">Amount received</Label>
            <Input
              id="sale-amount-received"
              type="number"
              min="0"
              step="0.01"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder={method === "credit" ? "0.00" : "Blank = full amount"}
            />
            <p className="text-xs text-muted-foreground">
              Total:{" "}
              {money.format((Number(dressedWeight) || 0) * (Number(rate) || 0))}
              . Any balance becomes receivable from the selected customer.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-date">Sale date *</Label>
            <Input
              id="sale-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-notes">Notes</Label>
            <Input
              id="sale-notes"
              maxLength={255}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProfitPreview({
  liveWeightKg,
  dressedWeightKg,
  ratePerKg,
  wac,
}: {
  liveWeightKg: number;
  dressedWeightKg: number;
  ratePerKg: number;
  wac: number;
}) {
  const revenue = dressedWeightKg * ratePerKg;
  const cogs = dressedWeightKg * wac;
  const processingLoss = Math.max(0, liveWeightKg - dressedWeightKg) * wac;
  const estimatedProfit = revenue - cogs - processingLoss;
  const minimumRate =
    dressedWeightKg > 0 ? (liveWeightKg * wac) / dressedWeightKg : 0;

  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        estimatedProfit < 0
          ? "border-destructive/30 bg-destructive/5"
          : "border-emerald-500/30 bg-emerald-500/5"
      }`}
      aria-live="polite"
    >
      <p className="font-medium">Live profit preview</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-4">
        <span>
          Revenue
          <br />
          <strong className="text-foreground">{money.format(revenue)}</strong>
        </span>
        <span>
          Dressed COGS
          <br />
          <strong className="text-foreground">{money.format(cogs)}</strong>
        </span>
        <span>
          Processing loss
          <br />
          <strong className="text-foreground">
            {money.format(processingLoss)}
          </strong>
        </span>
        <span>
          Estimated profit
          <br />
          <strong
            className={
              estimatedProfit < 0 ? "text-destructive" : "text-emerald-700"
            }
          >
            {money.format(estimatedProfit)}
          </strong>
        </span>
      </div>
      {minimumRate > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Estimated break-even rate: {money.format(minimumRate)} per dressed kg.
          Final amounts are calculated by the server using the locked WAC at
          posting time.
        </p>
      ) : null}
    </div>
  );
}
