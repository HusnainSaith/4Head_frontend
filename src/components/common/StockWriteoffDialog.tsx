import { useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const stockWriteoffReasons = [
  "spoilage",
  "mortality",
  "transit_loss",
  "other",
] as const;

export type StockWriteoffReason = (typeof stockWriteoffReasons)[number];

export interface StockWriteoffInput {
  quantityKg: number;
  reason: StockWriteoffReason;
  note?: string;
  writeoffDate: string;
}

const schema = z.object({
  quantityKg: z.number().positive("Quantity must be greater than zero."),
  reason: z.enum(stockWriteoffReasons),
  note: z.string().max(255, "Note must be 255 characters or fewer.").optional(),
  writeoffDate: z.string().min(1, "Date is required."),
});

export function StockWriteoffDialog({
  open,
  availableKg,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  availableKg: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: StockWriteoffInput) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<StockWriteoffReason>("spoilage");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setQuantity("");
    setReason("spoilage");
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Shrinkage</DialogTitle>
          <DialogDescription>
            Available: {availableKg} kg. The server validates stock and values
            the loss at the locked current WAC.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const parsed = schema.safeParse({
              quantityKg: Number(quantity),
              reason,
              writeoffDate: date,
              note: note.trim() || undefined,
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "Check the form.");
              return;
            }
            if (parsed.data.quantityKg > Number(availableKg)) {
              setError(`Insufficient stock. Available: ${availableKg} kg.`);
              return;
            }
            setError("");
            await onSubmit(parsed.data);
            reset();
          }}
        >
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="shrinkage-quantity">Quantity (kg) *</Label>
            <Input
              id="shrinkage-quantity"
              type="number"
              min="0.001"
              max={availableKg}
              step="0.001"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as StockWriteoffReason)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stockWriteoffReasons.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shrinkage-date">Date *</Label>
            <Input
              id="shrinkage-date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shrinkage-note">Note</Label>
            <Input
              id="shrinkage-note"
              maxLength={255}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Record shrinkage
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
