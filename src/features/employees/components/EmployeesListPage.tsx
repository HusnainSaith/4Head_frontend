import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeletons";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogFooter,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { selectUserDepartmentId,selectUserRole } from "@/features/auth/authSlice";
import { useListDepartmentsQuery } from "@/features/vehicles/vehiclesApi";
import { getApiErrorMessage } from "@/lib/api-error";
import { Role } from "@/types/enums";
import { useCreateEmployeeMutation,useDeactivateEmployeeMutation,useListEmployeesQuery } from "../employeesApi";
import type { CreateEmployeeRequest,Employee } from "../types";

const schema=z.object({fullName:z.string().min(1),designation:z.string().min(1),phone:z.string(),cnicOrIdNumber:z.string(),baseSalary:z.coerce.number().positive(),joiningDate:z.string().min(1),departmentId:z.string().uuid()});
const money=new Intl.NumberFormat("en-PK",{style:"currency",currency:"PKR"});
export function EmployeesListPage(){
  const navigate=useNavigate();const role=useSelector(selectUserRole);const own=useSelector(selectUserDepartmentId);const management=role===Role.OWNER||role===Role.ACCOUNTANT;
  const[department,setDepartment]=useState("");const[open,setOpen]=useState(false);const effectiveDepartment=management?department:own??"";const query=useListEmployeesQuery({departmentId:effectiveDepartment||undefined},{skip:!management&&!own});const departments=useListDepartmentsQuery(undefined,{skip:!management});const[create,state]=useCreateEmployeeMutation();const[deactivate]=useDeactivateEmployeeMutation();
  const columns:DataTableColumn<Employee>[]=[{id:"name",header:"Full name",cell:(e)=>e.fullName},{id:"designation",header:"Designation",cell:(e)=>e.designation},{id:"department",header:"Department",cell:(e)=><Badge variant="secondary">{e.department?.name??e.departmentId}</Badge>},{id:"salary",header:"Base salary",cell:(e)=>money.format(Number(e.baseSalary)),align:"right"},{id:"joining",header:"Joining date",cell:(e)=>String(e.joiningDate).slice(0,10)},{id:"status",header:"Status",cell:(e)=><Badge variant={e.isActive?"success":"warning"}>{e.isActive?"Active":"Inactive"}</Badge>},{id:"actions",header:"",cell:(e)=>e.isActive?<Button size="sm" variant="outline" onClick={(event)=>{event.stopPropagation();void deactivate(e.id).unwrap().then(()=>toast.success("Employee deactivated")).catch((error)=>toast.error(getApiErrorMessage(error)));}}>Deactivate</Button>:null}];
  if(query.isLoading)return <PageSkeleton rows={6}/>;if(query.isError)return <PageContainer><ErrorState title="Employees could not be loaded" description={getApiErrorMessage(query.error)} onRetry={()=>void query.refetch()}/></PageContainer>;
  return <PageContainer><PageHeader title="Employees" actions={<Button onClick={()=>setOpen(true)}>Register Employee</Button>}/>{management?<div className="max-w-sm"><Label>Department filter</Label><Select value={department||"all"} onValueChange={(v)=>setDepartment(v==="all"?"":v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{(departments.data?.data??[]).map((d)=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>:null}<DataTable columns={columns} data={query.data?.data??[]} getRowId={(e)=>e.id} onRowClick={(e)=>navigate(`/employees/${e.id}`)} emptyContent={<EmptyState title="No employees found"/>}/><EmployeeDialog open={open} fixedDepartmentId={management?undefined:own??undefined} departments={departments.data?.data??[]} loading={state.isLoading} onClose={()=>setOpen(false)} onSubmit={async(body)=>{try{await create(body).unwrap();toast.success("Employee registered");setOpen(false);}catch(error){toast.error(getApiErrorMessage(error));}}}/></PageContainer>;
}
function EmployeeDialog({open,fixedDepartmentId,departments,loading,onClose,onSubmit}:{open:boolean;fixedDepartmentId?:string;departments:Array<{id:string;name:string}>;loading:boolean;onClose:()=>void;onSubmit:(body:CreateEmployeeRequest)=>Promise<void>}){const[values,setValues]=useState({fullName:"",designation:"",phone:"",cnicOrIdNumber:"",baseSalary:"",joiningDate:new Date().toISOString().slice(0,10),departmentId:fixedDepartmentId??""});const field=(key:keyof typeof values)=>(e:React.ChangeEvent<HTMLInputElement>)=>setValues({...values,[key]:e.target.value});return <Dialog open={open} onOpenChange={(v)=>{if(!v)onClose();}}><DialogContent><DialogHeader><DialogTitle>Register Employee</DialogTitle></DialogHeader><form className="space-y-3" onSubmit={(e)=>{e.preventDefault();const parsed=schema.safeParse({...values,departmentId:fixedDepartmentId??values.departmentId});if(parsed.success)void onSubmit({...parsed.data,phone:parsed.data.phone||undefined,cnicOrIdNumber:parsed.data.cnicOrIdNumber||undefined});}}>{[["Full name","fullName"],["Designation","designation"],["Phone","phone"],["CNIC or ID number","cnicOrIdNumber"],["Base salary","baseSalary"],["Joining date","joiningDate"]].map(([label,key])=><div key={key}><Label htmlFor={`employee-${key}`}>{label}</Label><Input id={`employee-${key}`} type={key==="baseSalary"?"number":key==="joiningDate"?"date":"text"} value={values[key as keyof typeof values]} onChange={field(key as keyof typeof values)}/></div>)}<div><Label>Department</Label>{fixedDepartmentId?<Input value={fixedDepartmentId} disabled/>:<Select value={values.departmentId} onValueChange={(v)=>setValues({...values,departmentId:v})}><SelectTrigger><SelectValue placeholder="Select department"/></SelectTrigger><SelectContent>{departments.map((d)=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>}</div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" isLoading={loading}>Register</Button></DialogFooter></form></DialogContent></Dialog>}
