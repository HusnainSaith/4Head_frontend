import { useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
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
  useUpdateShopSaleMutation,
} from "../shopApi";
import type { CreateSaleRequest, ShopSale } from "../types";

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
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
    id: "qty",
    header: "Quantity (kg)",
    cell: (r) => `${r.quantityKg} kg`,
    align: "right",
  },
  {
    id: "rate",
    header: "Rate/kg",
    cell: (r) => money.format(Number(r.ratePerKg)),
    align: "right",
  },
  {
    id: "margin",
    header: "Margin/kg",
    cell: (r) => money.format(Number(r.profitMarginPerKg)),
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
  const [editing, setEditing] = useState<ShopSale | null>(null);
  const [createSale, createState] = useCreateShopSaleMutation();
  const [updateSale, updateState] = useUpdateShopSaleMutation();
  const [deleteSale] = useDeleteShopSaleMutation();

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
              <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void deleteSale(r.id)
                    .unwrap()
                    .then(() => toast.success("Sale deleted"))
                    .catch((e) => toast.error(getApiErrorMessage(e)))
                }
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
        key={editing?.id ?? (open ? "new-open" : "new-closed")}
        open={open || Boolean(editing)}
        sale={editing}
        availableKg={availableKg}
        loading={createState.isLoading || updateState.isLoading}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={async (body) => {
          try {
            if (editing) {
              await updateSale({ id: editing.id, body }).unwrap();
              toast.success("Sale updated");
            } else {
              await createSale(body as CreateSaleRequest).unwrap();
              toast.success("Sale recorded");
            }
            setOpen(false);
            setEditing(null);
          } catch (e) {
            toast.error(getApiErrorMessage(e));
          }
        }}
      />
    </PageContainer>
  );
}

function SaleDialog({
  open,
  sale,
  availableKg,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  sale: ShopSale | null;
  availableKg?: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: CreateSaleRequest) => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState(sale?.customerPartyId ?? "");
  const [qty, setQty] = useState(sale ? String(sale.quantityKg) : "");
  const [rate, setRate] = useState(sale ? String(sale.ratePerKg) : "");
  const [method, setMethod] = useState<"cash" | "bank" | "credit">(
    sale?.paymentMethod ?? "cash",
  );
  const [amountReceived, setAmountReceived] = useState(
    sale ? String(sale.amountReceived) : "",
  );
  const [date, setDate] = useState(
    sale
      ? String(sale.saleDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(sale?.notes ?? "");
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
    setQty("");
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
    const q = Number(qty);
    const r = Number(rate);
    if (!Number.isFinite(q) || q <= 0) {
      setFormError("Quantity must be a positive number.");
      return;
    }
    if (!Number.isFinite(r) || r <= 0) {
      setFormError("Rate per kg must be a positive number.");
      return;
    }
    const total = q * r;
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
    if (availableKg && q > Number(availableKg)) {
      setFormError(`Insufficient stock. Available: ${availableKg} kg`);
      return;
    }
    void onSubmit({
      customerPartyId: customerId || undefined,
      quantityKg: q,
      ratePerKg: r,
      paymentMethod: method,
      amountReceived: sale ? undefined : enteredAmount,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sale ? "Edit Sale" : "Record Sale"}</DialogTitle>
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
            <Label htmlFor="sale-qty">Quantity (kg) *</Label>
            <Input
              id="sale-qty"
              type="number"
              min="0.001"
              step="0.001"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            {availableKg && (
              <p className="text-xs text-muted-foreground">
                Available: {availableKg} kg
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-rate">Rate per kg *</Label>
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
              disabled={Boolean(sale)}
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder={method === "credit" ? "0.00" : "Blank = full amount"}
            />
            <p className="text-xs text-muted-foreground">
              Total: {money.format((Number(qty) || 0) * (Number(rate) || 0))}.
              Any balance becomes receivable from the selected customer.
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
