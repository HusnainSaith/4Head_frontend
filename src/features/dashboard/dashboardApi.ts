import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";

export interface ReportDateParams {
  startDate?: string;
  endDate?: string;
}

export interface DepartmentReportParams {
  departmentId?: string;
}

export interface ConsolidatedProfitLoss {
  externalRevenue: string;
  internalTransferRevenue: string;
  totalCogs: string;
  totalExpenses: string;
  totalPayroll: string;
  netProfit: string;
  perPartnerShare: string;
}

export interface PartnerProfitShare extends ConsolidatedProfitLoss {
  partnerShare: string;
}

export interface OutstandingBalance {
  partyId: string | null;
  balance: string;
}

export interface StockSummaryItem {
  productId: string;
  departmentId: string;
  quantityKg: string;
  wac: string;
}

export interface StockMovementItem {
  id: string;
  departmentId: string;
  movementType: string;
  quantityKg: string;
  ratePerKg: string;
  resultingWac: string;
  sourceType: string;
  sourceId: string;
  movementDate: string;
}

/** Exact payload returned by GET /reports/stock-summary. */
export interface StockSummary {
  summary: StockSummaryItem[];
  movements: StockMovementItem[];
}

export interface ExpenseBreakdownItem {
  category: string | null;
  total: string;
}

export interface PayrollSummaryItem {
  departmentId: string;
  totalNetPayable: string;
  totalAdvancesDeducted: string;
  totalBonuses: string;
}

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getConsolidatedProfitLoss: builder.query<
      ApiResponse<ConsolidatedProfitLoss>,
      ReportDateParams | void
    >({
      query: (params) => ({
        url: "/reports/consolidated-profit-loss",
        params: params ?? undefined,
      }),
    }),
    getPartnerProfitShare: builder.query<
      ApiResponse<PartnerProfitShare>,
      ReportDateParams | void
    >({
      query: (params) => ({
        url: "/reports/partner-profit-share",
        params: params ?? undefined,
      }),
    }),
    getOutstandingBalances: builder.query<
      ApiResponse<OutstandingBalance[]>,
      DepartmentReportParams | void
    >({
      query: (params) => ({
        url: "/reports/outstanding-balances",
        params: params ?? undefined,
      }),
    }),
    getStockSummary: builder.query<
      ApiResponse<StockSummary>,
      DepartmentReportParams | void
    >({
      query: (params) => ({
        url: "/reports/stock-summary",
        params: params ?? undefined,
      }),
    }),
    getExpenseBreakdown: builder.query<
      ApiResponse<ExpenseBreakdownItem[]>,
      ReportDateParams & DepartmentReportParams
    >({
      query: (params) => ({ url: "/reports/expense-breakdown", params }),
    }),
    getPayrollSummary: builder.query<
      ApiResponse<PayrollSummaryItem[]>,
      ReportDateParams & DepartmentReportParams
    >({
      query: (params) => ({ url: "/reports/payroll-summary", params }),
    }),
  }),
});

export const {
  useGetConsolidatedProfitLossQuery,
  useGetPartnerProfitShareQuery,
  useGetOutstandingBalancesQuery,
  useGetStockSummaryQuery,
  useGetExpenseBreakdownQuery,
  useGetPayrollSummaryQuery,
} = dashboardApi;
