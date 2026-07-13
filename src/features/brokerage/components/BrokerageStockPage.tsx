import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { selectUserDepartmentId, selectUserRole } from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api-error";
import { Role } from "@/types/enums";
import { useCreateBrokerageStockWriteoffMutation, useGetBrokerageStockQuery } from "../brokerageApi";
import type { StockWriteoffReason } from "../types";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" });
export function BrokerageStockPage() {
  const query = useGetBrokerageStockQuery(); const role = useSelector(selectUserRole);
  const assignedDepartmentId = useSelector(selectUserDepartmentId); const [open, setOpen] = useState(false);
  const [writeoff, state] = useCreateBrokerageStockWriteoffMutation();
  const canWrite = role === Role.OWNER || role === Role.ACCOUNTANT || role === Role.DEPARTMENT_STAFF;
  if (query.isLoading) return <PageSkeleton rows={3} />;
  if (query.isError || !query.data?.data) return <PageContainer><ErrorState title="Brokerage stock could not be loaded" onRetry={() => void query.refetch()} /></PageContainer>;
  const stock = query.data.data;
  return <PageContainer><PageHeader title="Brokerage Stock" actions={canWrite && assignedDepartmentId ? <Button onClick={()=>setOpen(true)}>Record write-off</Button> : undefined} />
    <div className="grid gap-4 sm:grid-cols-2"><StatCard label="Quantity" value={`${stock.quantityKg} kg`} /><StatCard label="Weighted average cost" value={money.format(Number(stock.wac))} /></div>
    <p className="text-sm text-muted-foreground">Wastage Loss valuation will be calculated by the server using the current weighted average cost when the write-off is submitted.</p>
    {assignedDepartmentId ? <WriteoffDialog open={open} loading={state.isLoading} onClose={()=>setOpen(false)} onSubmit={async (quantityKg, reason, writeoffDate, note) => { try { const result=await writeoff({ departmentId: assignedDepartmentId, quantityKg, reason, writeoffDate, note: note || undefined }).unwrap(); toast.success(`Write-off recorded: ${money.format(Number(result.data.valuationAmount))}`); setOpen(false); } catch(error){ toast.error(getApiErrorMessage(error)); } }} /> : null}
  </PageContainer>;
}
function WriteoffDialog({open,loading,onClose,onSubmit}:{open:boolean;loading:boolean;onClose:()=>void;onSubmit:(q:number,r:StockWriteoffReason,d:string,n:string)=>Promise<void>}){
  const [quantity,setQuantity]=useState(""); const [reason,setReason]=useState<StockWriteoffReason>("spoilage"); const [date,setDate]=useState(new Date().toISOString().slice(0,10)); const [note,setNote]=useState("");
  return <Dialog open={open} onOpenChange={(n)=>{if(!n)onClose();}}><DialogContent><DialogHeader><DialogTitle>Record write-off</DialogTitle><DialogDescription>The server values the loss at current WAC.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(e)=>{e.preventDefault();const q=Number(quantity);if(Number.isFinite(q)&&q>0)void onSubmit(q,reason,date,note);}}>
    <div><Label htmlFor="writeoff-quantity">Quantity (kg)</Label><Input id="writeoff-quantity" type="number" min="0.001" step="0.001" required value={quantity} onChange={(e)=>setQuantity(e.target.value)} /></div>
    <div><Label>Reason</Label><Select value={reason} onValueChange={(v)=>setReason(v as StockWriteoffReason)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["spoilage","mortality","transit_loss","other"].map((r)=><SelectItem key={r} value={r}>{r.replaceAll("_"," ")}</SelectItem>)}</SelectContent></Select></div>
    <div><Label htmlFor="writeoff-date">Date</Label><Input id="writeoff-date" type="date" required value={date} onChange={(e)=>setDate(e.target.value)} /></div><div><Label htmlFor="writeoff-note">Note</Label><Input id="writeoff-note" maxLength={255} value={note} onChange={(e)=>setNote(e.target.value)} /></div>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" isLoading={loading}>Record</Button></DialogFooter></form></DialogContent></Dialog>;
}
