import { useRouterState } from "@tanstack/react-router";
import { Search, Bell, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/add": "Add File",
  "/search": "Search Files",
  "/divisions": "Divisions",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "Dashboard";

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4 sticky top-0 z-10">
      <div>
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">Office records management system</p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Link
          to="/search"
          className="hidden lg:flex items-center gap-2 w-72 h-9 px-3 rounded-md bg-secondary text-muted-foreground text-sm hover:bg-accent transition-colors"
        >
          <Search className="size-4" />
          <span>Quick search files…</span>
          <kbd className="ml-auto text-[10px] bg-background border border-border rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </Link>
        <button className="relative size-9 rounded-md border border-border bg-card hover:bg-accent grid place-items-center">
          <Bell className="size-4" />
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />
        </button>
        <Link
          to="/add"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
        >
          <Plus className="size-4" />
          New File
        </Link>
      </div>
    </header>
  );
}
