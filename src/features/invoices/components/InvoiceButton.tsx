import type { MouseEvent } from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLazyGetInvoiceBySourceQuery } from "../invoicesApi";
import { usePrintInvoice } from "./usePrintInvoice";

export function InvoiceButton({ sourceType, sourceId, label = "Print Invoice" }: { sourceType: string; sourceId: string; label?: string }) {
  const [getBySource, state] = useLazyGetInvoiceBySourceQuery();
  const { printInvoice, isPrinting } = usePrintInvoice();
  const loading = state.isFetching || isPrinting;
  const onClick = async (event: MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await getBySource({ sourceType, sourceId }).unwrap();
      if (!response.data) return toast.info("Invoice not available yet");
      await printInvoice(response.data.id);
    } catch {
      toast.info("Invoice not available yet");
    }
  };
  return <Button type="button" variant="outline" size="sm" disabled={loading} onClick={(event) => void onClick(event)}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}{label}</Button>;
}
