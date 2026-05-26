import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { type FileRecord, useAccessibleDivisions, useAccessibleFiles } from "@/lib/files-store";
import { BadgeIndianRupee, CheckCircle2, ClipboardList, FileText, Layers3 } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/search" });
  },
});

export function Dashboard() {
  const files = useAccessibleFiles();
  const divisions = useAccessibleDivisions();
  const [selectedDivision, setSelectedDivision] = useState("all");
  const selectedDivisionIsAccessible =
    selectedDivision === "all" || divisions.some((division) => division.name === selectedDivision);
  const activeDivision = selectedDivisionIsAccessible ? selectedDivision : "all";
  const dashboardFiles = useMemo(
    () =>
      activeDivision === "all" ? files : files.filter((file) => file.division === activeDivision),
    [activeDivision, files],
  );
  const dashboardDivisions = useMemo(
    () =>
      activeDivision === "all"
        ? divisions
        : divisions.filter((division) => division.name === activeDivision),
    [activeDivision, divisions],
  );

  const modeCounts = getModeCounts(dashboardFiles);
  const maxModeCount = Math.max(1, ...modeCounts.map((mode) => mode.count));
  const workflowStatusGroups = getWorkflowStatusGroups(dashboardFiles);
  const financeTotals = {
    allocatedCapital: dashboardDivisions.reduce(
      (sum, division) => sum + (parseAmount(division.allocatedCapital) ?? 0),
      0,
    ),
    allocatedRevenue: dashboardDivisions.reduce(
      (sum, division) => sum + (parseAmount(division.allocatedRevenue) ?? 0),
      0,
    ),
    bookedCapital: dashboardFiles.reduce(
      (sum, file) =>
        sum + (parseAmount(file.soValueCapital) ?? parseAmount(file.valueCapital) ?? 0),
      0,
    ),
    bookedRevenue: dashboardFiles.reduce(
      (sum, file) =>
        sum + (parseAmount(file.soValueRevenue) ?? parseAmount(file.valueRevenue) ?? 0),
      0,
    ),
  };

  const summaryStats = [
    {
      label: "Total files",
      value: dashboardFiles.length,
      icon: FileText,
      hint: "All files added",
      tone: "primary",
    },
    {
      label: "Demands controlled",
      value: dashboardFiles.filter((file) => hasFilledField(file, "imms")).length,
      icon: ClipboardList,
      hint: "IMMS number filled",
      tone: "accent",
    },
    {
      label: "TCEC files",
      value: dashboardFiles.filter((file) => isYes(file.tcec)).length,
      icon: CheckCircle2,
      hint: "TCEC marked Yes",
      tone: "success",
    },
    {
      label: "Non TCEC files",
      value: dashboardFiles.filter((file) => isNo(file.tcec)).length,
      icon: ClipboardList,
      hint: "TCEC marked No",
      tone: "accent",
    },
    {
      label: "High value files",
      value: dashboardFiles.filter((file) => isYes(file.highValue)).length,
      icon: ClipboardList,
      hint: "High value marked Yes",
      tone: "accent",
    },
    {
      label: "R&QA vetting",
      value: dashboardFiles.filter((file) => isYes(file.rqa)).length,
      icon: CheckCircle2,
      hint: "R&QA marked Yes",
      tone: "success",
    },
    {
      label: "IFA concurrence",
      value: dashboardFiles.filter((file) => isYes(file.ifa)).length,
      icon: ClipboardList,
      hint: "IFA marked Yes",
      tone: "accent",
    },
  ];

  const financeStats = [
    { label: "Capital allocated", value: financeTotals.allocatedCapital },
    { label: "Revenue allocated", value: financeTotals.allocatedRevenue },
    { label: "Capital booked", value: financeTotals.bookedCapital },
    { label: "Revenue booked", value: financeTotals.bookedRevenue },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Summary</h2>
            <p className="text-xs text-muted-foreground">Demand and supply order status</p>
          </div>
          <label className="flex min-w-[220px] flex-col gap-1 text-xs text-muted-foreground">
            <span>Division</span>
            <select
              value={activeDivision}
              onChange={(event) => setSelectedDivision(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="all">All accessible divisions</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.name}>
                  {division.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryStats.map((stat) => (
              <SummaryMetric key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Workflow Status</h2>
          <p className="text-xs text-muted-foreground">
            Stage counts based on their own date fields
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {workflowStatusGroups.map((group) => (
              <div
                key={group.title}
                className="rounded-lg border border-border bg-secondary/35 p-4"
              >
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  {group.title}
                </h3>
                <div className="mt-3 space-y-2">
                  {group.statuses.map((status) => (
                    <div
                      key={status.label}
                      className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2"
                    >
                      <span className="text-sm font-medium">{status.label}</span>
                      <span className="text-base font-semibold tabular-nums">{status.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-5">
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold">Mode</h2>
              <p className="text-xs text-muted-foreground">Files grouped by mode</p>
            </div>
            <div className="size-8 grid place-items-center rounded-md bg-accent text-accent-foreground">
              <Layers3 className="size-4" />
            </div>
          </div>
          {modeCounts.length ? (
            <ul className="space-y-3">
              {modeCounts.map((mode) => (
                <li key={mode.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{mode.name}</span>
                    <span className="text-muted-foreground">{mode.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(mode.count / maxModeCount) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">No modes recorded yet.</div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold">Finance</h2>
              <p className="text-xs text-muted-foreground">Allocated and booked amounts</p>
            </div>
            <div className="size-8 grid place-items-center rounded-md bg-success/15 text-success">
              <BadgeIndianRupee className="size-4" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {financeStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-secondary/35 p-4">
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">
                  {formatCurrency(stat.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  hint,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  hint: string;
  tone: "primary" | "success" | "accent";
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/35 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={
            "size-8 grid place-items-center rounded-md " +
            (tone === "success"
              ? "bg-success/15 text-success"
              : tone === "primary"
                ? "bg-primary/10 text-primary"
                : "bg-accent text-accent-foreground")
          }
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}

function getModeCounts(files: ReturnType<typeof useAccessibleFiles>) {
  const counts = files.reduce<Record<string, number>>((current, file) => {
    const mode = file.mode?.trim();
    if (!mode) return current;
    current[mode] = (current[mode] ?? 0) + 1;
    return current;
  }, {});

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const workflowStatusGroups = [
  {
    title: "Scrutiny & Demand",
    statuses: [
      {
        label: "Scrutiny completed",
        matches: (file) => hasFilledField(file, "scrutinyCompletionDate"),
      },
      {
        label: "Scrutiny under progress",
        matches: (file) => !hasFilledField(file, "scrutinyDate"),
      },
    ],
  },
  {
    title: "Pre-TCEC",
    statuses: [
      { label: "Completed", matches: (file) => hasFilledField(file, "preTcecMinutesDate") },
      {
        label: "Remaining",
        matches: (file) =>
          hasFilledField(file, "scrutinyCompletionDate") && !hasFilledField(file, "preTcecDate"),
      },
    ],
  },
  {
    title: "High value committee",
    statuses: [
      { label: "Completed", matches: (file) => hasFilledField(file, "highValueMinutesDate") },
      {
        label: "Remaining",
        matches: (file) => hasFilledField(file, "highValueMeetingDate"),
      },
    ],
  },
  {
    title: "AD vetting",
    statuses: [
      { label: "Completed", matches: (file) => hasFilledField(file, "adVettingDate") },
      {
        label: "Remaining",
        matches: (file) =>
          hasFilledField(file, "preTcecDate") && !hasFilledField(file, "adVettingDate"),
      },
    ],
  },
  {
    title: "R&QA approval",
    statuses: [{ label: "Completed", matches: (file) => hasFilledField(file, "rqaApprovalDate") }],
  },
  {
    title: "IFA concurrence",
    statuses: [
      { label: "Completed", matches: (file) => hasFilledField(file, "ifaFinalDate") },
      {
        label: "Remaining",
        matches: (file) => hasFilledField(file, "ifaSentDate"),
      },
    ],
  },
  {
    title: "CFA approval",
    statuses: [{ label: "Completed", matches: (file) => hasFilledField(file, "cfaDate") }],
  },
] satisfies Array<{
  title: string;
  statuses: Array<{ label: string; matches: (file: FileRecord) => boolean }>;
}>;

function getWorkflowStatusGroups(files: ReturnType<typeof useAccessibleFiles>) {
  return workflowStatusGroups.map((group) => ({
    title: group.title,
    statuses: group.statuses.map((status) => ({
      label: status.label,
      count: files.filter(status.matches).length,
    })),
  }));
}

function hasFilledField(file: FileRecord, key: keyof FileRecord) {
  const value = file[key];
  return typeof value === "string" ? Boolean(value.trim()) : Boolean(value);
}

function isYes(value: string | undefined) {
  return value?.trim().toLowerCase() === "yes";
}

function isNo(value: string | undefined) {
  return value?.trim().toLowerCase() === "no";
}

function parseAmount(value: string | undefined) {
  const cleaned = (value ?? "").replace(/,/g, "").trim();
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}
