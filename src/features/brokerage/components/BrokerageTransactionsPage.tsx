import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api-error";
import { selectUserRole } from "@/features/auth/authSlice";
import { useListPartiesQuery } from "@/features/parties/partiesApi";
import { PartyType } from "@/features/parties/types";
import { DepartmentVehicleSelect } from "@/features/vehicles/components/DepartmentVehicleSelect";
import { DepartmentCode, Role } from "@/types/enums";
import {
  useCreateBrokeragePurchaseMutation, useCreateBrokerageSaleMutation,
  useDeleteBrokeragePurchaseMutation, useDeleteBrokerageSaleMutation,
  useListBrokeragePurchasesQuery, useListBrokerageSalesQuery,
} from "../brokerageApi";
import type { BrokeragePurchase, BrokerageSale, BrokeragePaymentMethod } from "../types";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" });
type Kind = "purchase" | "sale";

export function BrokerageTransactionsPage({ kind }: { kind: Kind }) {
  const purchases = useListBrokeragePurchasesQuery(undefined, { skip: kind !== "purchase" });
  const sales = useListBrokerageSalesQuery(undefined, { skip: kind !== "sale" });
  const query = kind === "purchase" ? purchases : sales;
  const role = useSelector(selectUserRole);
  const canWrite = role === Role.OWNER || role === Role.ACCOUNTANT || role === Role.DEPARTMENT_STAFF;
  const [open, setOpen] = useState(false);
  const [createPurchase, purchaseState] = useCreateBrokeragePurchaseMutation();
  const [createSale, saleState] = useCreateBrokerageSaleMutation();
  const [deletePurchase] = useDeleteBrokeragePurchaseMutation();
  const [deleteSale] = useDeleteBrokerageSaleMutation();
  const records = (query.data?.data?.items ?? []) as Array<BrokeragePurchase | BrokerageSale>;

  const columns: DataTableColumn<BrokeragePurchase | BrokerageSale>[] = [
    { id: "party", header: kind === "purchase" ? "Seller (Farm)" : "Buyer", cell: (row) => row.party?.name ?? "—" },
    { id: "quantity", header: "Quantity", cell: (row) => `${row.quantityKg} kg`, align: "right" },
    { id: "rate", header: "Rate/kg", cell: (row) => money.format(Number(row.ratePerKg)), align: "right" },
    ...(kind === "sale" ? [{ id: "commission", header: "Commission/kg", cell: (row: BrokeragePurchase | BrokerageSale) => money.format(Number((row as BrokerageSale).commissionPerKg)), align: "right" as const }] : []),
    { id: "total", header: "Total", cell: (row) => money.format(Number(row.totalAmount)), align: "right" },
    { id: "payment", header: "Payment", cell: (row) => row.paymentMethod },
    { id: "date", header: "Date", cell: (row) => kind === "purchase" ? (row as BrokeragePurchase).purchaseDate : (row as BrokerageSale).saleDate },
    ...(canWrite ? [{ id: "actions", header: "Actions", cell: (row: BrokeragePurchase | BrokerageSale) => <Button variant="ghost" size="sm" onClick={() => void (kind === "purchase" ? deletePurchase(row.id) : deleteSale(row.id))}>Delete</Button>, align: "right" as const }] : []),
  ];

  if (query.isLoading) return <PageSkeleton rows={6} />;
  if (query.isError) return <PageContainer><ErrorState title={`${kind === "purchase" ? "Purchases" : "Sales"} could not be loaded`} onRetry={() => void query.refetch()} /></PageContainer>;

  return <PageContainer>
    <PageHeader title={`Brokerage ${kind === "purchase" ? "Purchases" : "Sales"}`} actions={canWrite ? <Button onClick={() => setOpen(true)}><Plus />Record {kind}</Button> : undefined} />
    <DataTable columns={columns} data={records} getRowId={(row) => row.id} emptyContent={<EmptyState title={`No ${kind}s recorded`} />} />
    <TransactionDialog kind={kind} open={open} loading={purchaseState.isLoading || saleState.isLoading} onClose={() => setOpen(false)} onSubmit={async (values) => {
      try {
        if (kind === "purchase") {
          await createPurchase({ partyId: values.partyId || undefined, quantityKg: values.quantityKg, ratePerKg: values.ratePerKg, paymentMethod: values.paymentMethod, purchaseDate: values.date, vehicleId: values.vehicleId || undefined, description: values.description || undefined }).unwrap();
        } else {
          await createSale({ partyId: values.partyId || undefined, quantityKg: values.quantityKg, ratePerKg: values.ratePerKg, paymentMethod: values.paymentMethod, saleDate: values.date, vehicleId: values.vehicleId || undefined, description: values.description || undefined }).unwrap();
        }
        toast.success(`${kind === "purchase" ? "Purchase" : "Sale"} recorded`);
        setOpen(false);
      } catch (error) { toast.error(getApiErrorMessage(error)); }
    }} />
  </PageContainer>;
}

type FormValues = { partyId?: string; quantityKg: number; ratePerKg: number; paymentMethod: BrokeragePaymentMethod; date: string; vehicleId?: string; description?: string };

function TransactionDialog({ kind, open, loading, onClose, onSubmit }: {
  kind: Kind;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const [partyId, setPartyId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<BrokeragePaymentMethod>("cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [formError, setFormError] = useState("");

  // For purchases: farms are the sellers. For sales: customers/shop owners are buyers.
  const partyType = kind === "purchase" ? PartyType.FARM : PartyType.CUSTOMER;
  const partiesQuery = useListPartiesQuery({ type: partyType, limit: 100 }, { skip: !open });
  const parties = partiesQuery.data?.data?.items ?? [];

  const handleClose = () => {
    setPartyId(""); setQuantity(""); setRate("");
    setPaymentMethod("cash"); setDate(new Date().toISOString().slice(0, 10));
    setDescription(""); setVehicleId(""); setFormError("");
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    const q = Number(quantity);
    const r = Number(rate);
    if (!Number.isFinite(q) || q <= 0) { setFormError("Quantity must be a positive number."); return; }
    if (!Number.isFinite(r) || r <= 0) { setFormError("Rate per kg must be a positive number."); return; }
    if (!date) { setFormError("Date is required."); return; }
    void onSubmit({ partyId: partyId || undefined, quantityKg: q, ratePerKg: r, paymentMethod, date, vehicleId: vehicleId || undefined, description: description || undefined });
  };

  const partyLabel = kind === "purchase" ? "Seller (Farm)" : "Buyer";

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record {kind}</DialogTitle>
          <DialogDescription>
            {kind === "purchase" ? "Record a new brokerage purchase from a farm." : "Record a new brokerage sale to a buyer."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {formError ? (
            <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-party`}>{partyLabel}</Label>
            <Select value={partyId || "none"} onValueChange={(v) => setPartyId(v === "none" ? "" : v)}>
              <SelectTrigger id={`${kind}-party`}>
                <SelectValue placeholder={`Select ${partyLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-quantity`}>Quantity (kg) <span className="text-destructive">*</span></Label>
            <Input id={`${kind}-quantity`} value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="0.001" step="0.001" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-rate`}>Rate per kg <span className="text-destructive">*</span></Label>
            <Input id={`${kind}-rate`} value={rate} onChange={(e) => setRate(e.target.value)} type="number" min="0.01" step="0.01" required />
          </div>

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as BrokeragePaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-date`}>Date <span className="text-destructive">*</span></Label>
            <Input id={`${kind}-date`} value={date} onChange={(e) => setDate(e.target.value)} type="date" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-description`}>Description</Label>
            <Input id={`${kind}-description`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional note" />
          </div>

          <div className="space-y-1.5"><Label>Vehicle</Label><DepartmentVehicleSelect departmentCode={DepartmentCode.BROKERAGE} value={vehicleId} onChange={setVehicleId} /></div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" isLoading={loading}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
