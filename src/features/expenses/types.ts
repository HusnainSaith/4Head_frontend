export type ExpenseSourceType="manual"|"vehicle_fuel"|"vehicle_maintenance"|"stock_writeoff";
export interface ExpenseCategory{id:string;name:string;description?:string|null;categoryType:string;isActive:boolean;isSystemGenerated:boolean}
export interface Expense{id:string;departmentId:string;department?:{id:string;name:string};categoryId:string;category?:ExpenseCategory;amount:string;expenseDate:string;description?:string|null;receiptReference?:string|null;sourceType:ExpenseSourceType;sourceId?:string|null}
export interface CreateExpenseRequest{departmentId:string;categoryId:string;amount:string;expenseDate:string;description?:string;receiptReference?:string}
