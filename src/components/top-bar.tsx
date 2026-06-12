import { useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  FilePlus2,
  LayoutDashboard,
  Moon,
  Plus,
  ScanLine,
  Search,
  Settings,
  Sun,
  UserRound,
  LogOut,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { store, useActiveUser, useFiles, useSettings } from "@/lib/files-store";

const nav = [
  { to: "/add", label: "Add File", icon: FilePlus2 },
  { to: "/search", label: "Search Files", icon: Search },
  { to: "/quick-entry", label: "Quick Entry", icon: ScanLine },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function TopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settings = useSettings();
  const files = useFiles();
  const activeUser = useActiveUser();
  const isDark = settings.theme === "dark";
  const canManageAdminSettings = activeUser?.role === "admin";
  const canUpdateAppearance = Boolean(activeUser);
  const canSelectYear = Boolean(activeUser);
  const canViewUserSettings =
    activeUser?.role === "admin" || activeUser?.role === "sub_admin" || activeUser?.role === "editor";
  const canAddFiles = activeUser?.role === "admin" || activeUser?.role === "sub_admin" || activeUser?.role === "editor";
  const visibleNav = nav.filter((item) => {
    if (item.to === "/settings") return canViewUserSettings;
    if (item.to === "/add" || item.to === "/quick-entry") return canAddFiles;
    return true;
  });
  const yearOptions = Array.from(
    new Set(
      [settings.financialYear, settings.selectedYear, ...files.map((file) => file.year)]
        .map((year) => year?.trim())
        .filter((year): year is string => Boolean(year)),
    ),
  ).sort((a, b) => b.localeCompare(a));

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
      <div className="min-h-14 px-4 lg:px-6 py-2.5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5 mr-2">
          <div className="size-8 rounded-md border border-border bg-secondary grid place-items-center">
            <UserRound className="size-4 text-primary" />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-medium text-muted-foreground">User</div>
            <div className="text-sm font-semibold">{activeUser?.name ?? "Not signed in"}</div>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1">
          {visibleNav.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm transition-colors " +
                  (active
                    ? "bg-secondary text-foreground border border-border"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground")
                }
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground">Year</span>
            <select
              value={settings.selectedYear}
              onChange={(event) => store.updateSettings({ selectedYear: event.target.value })}
              disabled={!canSelectYear}
              className="h-6 min-w-20 bg-transparent text-sm font-semibold text-foreground outline-none"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => store.updateSettings({ theme: isDark ? "light" : "dark" })}
            disabled={!canUpdateAppearance}
            title={isDark ? "Switch to white theme" : "Switch to dark theme"}
            aria-label={isDark ? "Switch to white theme" : "Switch to dark theme"}
            className="size-8 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50 grid place-items-center"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {canAddFiles ? (
            <Link
              to="/add"
              search={{ fileId: undefined, section: undefined }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              <Plus className="size-4" />
              New File
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void store.logout()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-sm font-medium hover:bg-accent"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
