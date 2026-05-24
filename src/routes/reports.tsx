import { createFileRoute } from "@tanstack/react-router";
import { useFiles, useDivisions, isIncomplete } from "@/lib/files-store";
import { Download, PieChart, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const files = useFiles();
  const divisions = useDivisions();

  const total = files.length;
  const incomplete = files.filter(isIncomplete).length;
  const complete = total - incomplete;

  const byDivision = divisions.map((d) => ({
    name: d.name,
    count: files.filter((f) => f.division === d.name).length,
  }));
  const maxDiv = Math.max(1, ...byDivision.map((d) => d.count));

  const officers = Array.from(new Set(files.map((f) => f.officer).filter(Boolean))) as string[];
  const byOfficer = officers
    .map((o) => ({ name: o, count: files.filter((f) => f.officer === o).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxOff = Math.max(1, ...byOfficer.map((o) => o.count));

  const completePct = total ? Math.round((complete / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-xl p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold inline-flex items-center gap-2">
              <PieChart className="size-4 text-primary" /> Completion overview
            </h2>
            <button className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Download className="size-3.5" /> Export
            </button>
          </div>
          <div className="flex items-center gap-6">
            <DonutChart percent={completePct} />
            <div className="space-y-2 text-sm">
              <Legend color="bg-success" label="Complete" value={complete} />
              <Legend color="bg-warning" label="Incomplete" value={incomplete} />
              <Legend color="bg-secondary" label="Total" value={total} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold inline-flex items-center gap-2 mb-4">
            <BarChart3 className="size-4 text-primary" /> Files per division
          </h2>
          <div className="space-y-3">
            {byDivision.map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{d.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${(d.count / maxDiv) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-semibold mb-4">Top demand officers</h2>
        {byOfficer.length === 0 ? (
          <p className="text-sm text-muted-foreground">No officer data yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {byOfficer.map((o) => (
              <div key={o.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{o.name}</span>
                  <span className="text-muted-foreground">{o.count}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-chart-2" style={{ width: `${(o.count / maxOff) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DonutChart({ percent }: { percent: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-32 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} stroke="var(--color-secondary)" strokeWidth="12" fill="none" />
        <circle
          cx="50" cy="50" r={r}
          stroke="var(--color-success)" strokeWidth="12" fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (c * percent) / 100}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-xl font-semibold">{percent}%</div>
          <div className="text-[10px] text-muted-foreground">complete</div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2.5 rounded-sm ${color}`} />
      <span className="text-muted-foreground w-20">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
