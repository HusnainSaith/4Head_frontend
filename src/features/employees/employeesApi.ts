import { apiSlice } from "@/store/apiSlice";
import type { ApiResponse } from "@/types/api";
import type { CreateAdvanceRequest,CreateBonusRequest,CreateEmployeeRequest,Employee,EmployeeAdvance,EmployeeBonus,PaySalaryRunRequest,RunPayrollRequest,SalaryRun } from "./types";

export const employeesApi=apiSlice.injectEndpoints({endpoints:(builder)=>({
  listEmployees:builder.query<ApiResponse<Employee[]>,{departmentId?:string}|void>({query:(p)=>({url:"/employees",params:p||undefined}),providesTags:(r)=>[{type:"Employee",id:"LIST"},...(r?.data.map(({id})=>({type:"Employee" as const,id}))??[])]}),
  getEmployee:builder.query<ApiResponse<Employee>,string>({query:(id)=>`/employees/${id}`,providesTags:(_r,_e,id)=>[{type:"Employee",id}]}),
  createEmployee:builder.mutation<ApiResponse<Employee>,CreateEmployeeRequest>({query:(body)=>({url:"/employees",method:"POST",body}),invalidatesTags:[{type:"Employee",id:"LIST"}]}),
  updateEmployee:builder.mutation<ApiResponse<Employee>,{id:string;body:Partial<CreateEmployeeRequest>}>({query:({id,body})=>({url:`/employees/${id}`,method:"PATCH",body}),invalidatesTags:(_r,_e,{id})=>[{type:"Employee",id},{type:"Employee",id:"LIST"}]}),
  deactivateEmployee:builder.mutation<ApiResponse<void>,string>({query:(id)=>({url:`/employees/${id}`,method:"DELETE"}),invalidatesTags:(_r,_e,id)=>[{type:"Employee",id},{type:"Employee",id:"LIST"}]}),
  listAdvances:builder.query<ApiResponse<EmployeeAdvance[]>,string>({query:(id)=>`/employees/${id}/advances`,providesTags:(_r,_e,id)=>[{type:"EmployeeAdvance",id}]}),
  createAdvance:builder.mutation<ApiResponse<EmployeeAdvance>,{employeeId:string;body:CreateAdvanceRequest}>({query:({employeeId,body})=>({url:`/employees/${employeeId}/advances`,method:"POST",body}),invalidatesTags:(_r,_e,{employeeId})=>[{type:"EmployeeAdvance",id:employeeId}]}),
  listBonuses:builder.query<ApiResponse<EmployeeBonus[]>,string>({query:(id)=>`/employees/${id}/bonuses`,providesTags:(_r,_e,id)=>[{type:"EmployeeBonus",id}]}),
  createBonus:builder.mutation<ApiResponse<EmployeeBonus>,{employeeId:string;body:CreateBonusRequest}>({query:({employeeId,body})=>({url:`/employees/${employeeId}/bonuses`,method:"POST",body}),invalidatesTags:(_r,_e,{employeeId})=>[{type:"EmployeeBonus",id:employeeId}]}),
  runPayroll:builder.mutation<ApiResponse<SalaryRun>,RunPayrollRequest>({query:(body)=>({url:"/payroll/runs",method:"POST",body}),invalidatesTags:(_r,_e,b)=>[{type:"SalaryRun",id:"LIST"},{type:"EmployeeAdvance",id:b.employeeId}]}),
  listSalaryRuns:builder.query<ApiResponse<SalaryRun[]>,{departmentId?:string;periodMonth?:number;periodYear?:number}|void>({query:(params)=>({url:"/payroll/runs",params:params||undefined}),providesTags:(r)=>[{type:"SalaryRun",id:"LIST"},...(r?.data.map(({id})=>({type:"SalaryRun" as const,id}))??[])]}),
  getSalaryRun:builder.query<ApiResponse<SalaryRun>,string>({query:(id)=>`/payroll/runs/${id}`,providesTags:(_r,_e,id)=>[{type:"SalaryRun",id}]}),
  markSalaryRunPaid:builder.mutation<ApiResponse<SalaryRun>,{id:string;body:PaySalaryRunRequest}>({query:({id,body})=>({url:`/payroll/runs/${id}/pay`,method:"POST",body}),invalidatesTags:(_r,_e,{id})=>[{type:"SalaryRun",id},{type:"SalaryRun",id:"LIST"}]})
})});
export const {useListEmployeesQuery,useGetEmployeeQuery,useCreateEmployeeMutation,useUpdateEmployeeMutation,useDeactivateEmployeeMutation,useListAdvancesQuery,useCreateAdvanceMutation,useListBonusesQuery,useCreateBonusMutation,useRunPayrollMutation,useListSalaryRunsQuery,useGetSalaryRunQuery,useMarkSalaryRunPaidMutation}=employeesApi;
