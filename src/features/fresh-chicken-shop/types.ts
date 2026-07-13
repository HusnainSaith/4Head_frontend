import type { ApiResponse } from "@/types/api";
// Reuse InternalTransfer from supply — same entity, same shape
export type { InternalTransfer } from "@/features/supply/types";

export interface ShopSale {
  id: string;
  departmentId: string;
  customerPartyId?: string | null;
  customerParty?: { id: string; name: string; partyType: string } | null;
  quantityKg: string;
  ratePerKg: string;
  profitMarginPerKg: string;
  totalAmount: string;
  paymentMethod: "cash" | "bank" | "credit";
  amountReceived: string;
  outstandingAmount: string;
  saleDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** Mirrors CreateShopSaleDto — no vehicleId, no amountReceived in create body */
export interface CreateSaleRequest {
  customerPartyId?: string;
  quantityKg: number;
  ratePerKg: number;
  paymentMethod: "cash" | "bank" | "credit";
  amountReceived?: number;
  saleDate: string;
  notes?: string;
}

export type UpdateSaleRequest = Partial<CreateSaleRequest>;

/** Mirrors StockWriteoff entity fields accepted by the shop writeoff handler */
export interface StockWriteoffRequest {
  quantityKg: number;
  reason: "spoilage" | "mortality" | "transit_loss" | "other";
  note?: string;
  writeoffDate: string;
}

export interface StockWriteoffResponse {
  id: string;
  departmentId: string;
  quantityKg: string;
  reason: string;
  note: string | null;
  writeoffDate: string;
  valuationAmount: string;
}

/** Mirrors InventoryService.getBalance return shape */
export interface StockBalance {
  id: string;
  productId: string;
  departmentId: string;
  quantityKg: string;
  wac: string;
}

/** Mirrors FreshChickenShopService.getProfitLoss return — single set, no grossProfit */
export interface ProfitLossReport {
  revenue: string;
  cogs: string;
  operatingExpenses: string;
  payrollExpenses: string;
  netProfit: string;
}

export type SaleResponse = ApiResponse<ShopSale>;
export type SalesResponse = ApiResponse<ShopSale[]>;
export type StockResponse = ApiResponse<StockBalance>;
export type WriteoffResponse = ApiResponse<StockWriteoffResponse>;
export type ProfitLossResponse = ApiResponse<ProfitLossReport>;
