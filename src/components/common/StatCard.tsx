import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
}

export function StatCard({
  label,
  value,
  delta,
  trend = "neutral",
  icon: Icon,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">
          {label}
        </CardDescription>
        {Icon ? (
          <Icon className="h-4 w-4 text-muted-foreground/60" aria-hidden />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <CardTitle className="text-2xl font-bold tracking-tight">{value}</CardTitle>
        {delta ? (
          <Badge
            variant={
              trend === "up"
                ? "success"
                : trend === "down"
                  ? "destructive"
                  : "secondary"
            }
          >
            {delta}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}