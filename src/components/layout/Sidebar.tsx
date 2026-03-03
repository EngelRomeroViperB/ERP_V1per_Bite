"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Layers,
  DollarSign,
  Brain,
  Users,
  GitBranch,
  Flame,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tareas", icon: CheckSquare },
  { href: "/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/areas", label: "Áreas", icon: Layers },
  { href: "/habits", label: "Hábitos", icon: Flame },
  { href: "/finances", label: "Finanzas", icon: DollarSign },
  { href: "/brain", label: "Brain", icon: Brain },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/skills", label: "Skills", icon: GitBranch },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50",
          // Mobile: fixed drawer
          "fixed inset-y-0 left-0 w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: relative, always visible, collapsible width
          "md:relative md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-56"
        )}
      >
        <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
          <span
            className={cn(
              "font-bold text-lg gradient-text truncate",
              collapsed && "md:hidden"
            )}
          >
            ERP de Vida
          </span>
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden md:block p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors",
              collapsed ? "mx-auto" : "ml-auto"
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  collapsed && "md:justify-center"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className={cn("truncate", collapsed && "md:hidden")}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-2 py-3">
          <Link
            href="/settings"
            onClick={onMobileClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
              collapsed && "md:justify-center"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className={cn(collapsed && "md:hidden")}>Configuración</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
