import type { SessionUser } from "@/features/auth/types";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Topbar({
  user,
  onLogout,
  isLoggingOut,
}: {
  user: SessionUser;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
}) {
  return (
    <header className="flex h-[64px] items-center justify-between border-b border-border bg-card px-6">
      {/* Page context slot — empty for now, keeps layout balanced */}
      <div />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto gap-3 rounded-xl px-3 py-2 hover:bg-accent"
          >
            <Avatar className="h-8 w-8 ring-2 ring-primary ring-offset-2 ring-offset-card">
              <AvatarFallback className="bg-secondary text-[11px] font-bold text-secondary-foreground">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left sm:block">
              <span className="block text-[13px] font-semibold text-foreground">
                {user.fullName}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {user.role?.name ?? "No role"}
              </span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {user.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isLoggingOut}
            onSelect={() => void onLogout()}
            className="gap-2 text-[13px] text-destructive focus:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}