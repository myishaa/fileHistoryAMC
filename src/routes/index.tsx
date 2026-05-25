import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useAccessibleDivisions, useAccessibleFiles, isIncomplete } from "@/lib/files-store";
import { FileText, AlertTriangle, Building2, Clock, ArrowUpRight, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/search" });
  },
});

export function Dashboard() {
  const files = useAccessibleFiles();
  const divisions = useAccessibleDivisions();

  const total = files.length;
  const incomplete = files.filter(isIncomplete).length;
  const recent = [...files]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  const byDivision = divisions
    .map((d) => ({
      name: d.name,
      count: files.filter((f) => f.division === d.name).length,
    }))
    .sort((a, b) => b.count - a.count);

  const maxDiv = Math.max(1, ...byDivision.map((d) => d.count));

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      count: files.filter((f) => (f.date ?? f.createdAt.slice(0, 10)) === key).length,
    };
  });
  const maxDay = Math.max(1, ...last7.map((d) => d.count));

  const stats = [
    { label: "Total Files", value: total, icon: FileText, hint: "All records", tone: "primary" },
    {
      label: "Pending / Incomplete",
      value: incomplete,
      icon: AlertTriangle,
      hint: "Need updates",
      tone: "warning",
    },
    {
      label: "Divisions",
      value: divisions.length,
      icon: Building2,
      hint: "Active",
      tone: "default",
    },
    {
      label: "Added this week",
      value: last7.reduce((s, d) => s + d.count, 0),
      icon: TrendingUp,
      hint: "Last 7 days",
      tone: "success",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div
                  className={
                    "size-8 grid place-items-center rounded-md " +
                    (s.tone === "warning"
                      ? "bg-warning/15 text-warning"
                      : s.tone === "success"
                        ? "bg-success/15 text-success"
                        : s.tone === "primary"
                          ? "bg-primary/10 text-primary"
                          : "bg-accent text-accent-foreground")
                  }
                >
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.hint}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold">Files added — last 7 days</h2>
              <p className="text-xs text-muted-foreground">Daily intake activity</p>
            </div>
          </div>
          <div className="flex items-end gap-3 h-44">
            {last7.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/60 transition-all"
                    style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: 4 }}
                    title={`${d.count}`}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold mb-1">Division-wise files</h2>
          <p className="text-xs text-muted-foreground mb-4">Distribution across divisions</p>
          <ul className="space-y-3">
            {byDivision.map((d) => (
              <li key={d.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{d.count}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(d.count / maxDiv) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <div>
            <h2 className="text-sm font-semibold">Recently added files</h2>
            <p className="text-xs text-muted-foreground">Latest 5 entries</p>
          </div>
          <Link
            to="/search"
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
          >
            View all <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Title</th>
                <th className="text-left font-medium px-5 py-2.5">Division</th>
                <th className="text-left font-medium px-5 py-2.5">Officer</th>
                <th className="text-left font-medium px-5 py-2.5">IMMS</th>
                <th className="text-left font-medium px-5 py-2.5">Date</th>
                <th className="text-left font-medium px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((f) => (
                <tr key={f.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-5 py-3 font-medium">
                    {f.title ?? <em className="text-muted-foreground">Untitled</em>}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{f.division ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{f.officer ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{f.imms ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" /> {f.date ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    {isIncomplete(f) ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                        Incomplete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">
                        Complete
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
