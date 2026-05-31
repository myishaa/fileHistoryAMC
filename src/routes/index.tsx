import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  type FileRecord,
  type SupplyOrderDetail,
  useAccessibleDivisions,
  useAccessibleFiles,
} from "@/lib/files-store";
import { formatThousandsAndLakhs, getInrAmount, hasAmount, parseAmount } from "@/lib/money";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/search" });
  },
});

export function Dashboard() {
  const files = useAccessibleFiles();
  const divisions = useAccessibleDivisions();
  const navigate = useNavigate();
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [activeDashboardTab, setActiveDashboardTab] = useState<"snapshot" | "status" | "finance">(
    "status",
  );
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
  const milestoneFlow = getMilestoneFlow(dashboardFiles);
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
        sum + (hasAmount(file.soValueCapital) ? 0 : (getInrAmount(file.valueCapital, file) ?? 0)),
      0,
    ),
    bookedRevenue: dashboardFiles.reduce(
      (sum, file) =>
        sum + (hasAmount(file.soValueRevenue) ? 0 : (getInrAmount(file.valueRevenue, file) ?? 0)),
      0,
    ),
    projectedCapital: dashboardFiles.reduce(
      (sum, file) =>
        sum + (!hasFilledField(file, "imms") ? (getInrAmount(file.valueCapital, file) ?? 0) : 0),
      0,
    ),
    projectedRevenue: dashboardFiles.reduce(
      (sum, file) =>
        sum + (!hasFilledField(file, "imms") ? (getInrAmount(file.valueRevenue, file) ?? 0) : 0),
      0,
    ),
    spentCapital: dashboardFiles.reduce(
      (sum, file) => sum + (getInrAmount(file.soValueCapital, file) ?? 0),
      0,
    ),
    spentRevenue: dashboardFiles.reduce(
      (sum, file) => sum + (getInrAmount(file.soValueRevenue, file) ?? 0),
      0,
    ),
  };
  const capitalBookedPercent = getPercent(
    financeTotals.bookedCapital,
    financeTotals.allocatedCapital,
  );
  const revenueBookedPercent = getPercent(
    financeTotals.bookedRevenue,
    financeTotals.allocatedRevenue,
  );
  const capitalProjectedPercent = getPercent(
    financeTotals.projectedCapital,
    financeTotals.allocatedCapital,
  );
  const revenueProjectedPercent = getPercent(
    financeTotals.projectedRevenue,
    financeTotals.allocatedRevenue,
  );
  const capitalSpentPercent = getPercent(
    financeTotals.spentCapital,
    financeTotals.allocatedCapital,
  );
  const revenueSpentPercent = getPercent(
    financeTotals.spentRevenue,
    financeTotals.allocatedRevenue,
  );

  const topSummaryStats = [
    {
      label: "TCEC",
      value: [
        {
          label: "TCEC",
          value: dashboardFiles.filter((file) => isYes(file.tcec)).length,
          searchFilter: "tcecFiles",
        },
        {
          label: "Non TCEC",
          value: dashboardFiles.filter((file) => isNo(file.tcec)).length,
          searchFilter: "nonTcecFiles",
        },
      ],
      hint: "TCEC and non TCEC files",
    },
  ];

  const compactSummaryStats = [];

  const summaryStats = [];

  const financePercentStats = [
    {
      label: "Projected",
      value: {
        capital: formatPercent(capitalProjectedPercent),
        revenue: formatPercent(revenueProjectedPercent),
      },
      hint: "Capital / Revenue projected against allocation",
    },
    {
      label: "Booked",
      value: {
        capital: formatPercent(capitalBookedPercent),
        revenue: formatPercent(revenueBookedPercent),
      },
      hint: "Capital / Revenue booked in INR",
    },
    {
      label: "Committed",
      value: {
        capital: formatPercent(capitalSpentPercent),
        revenue: formatPercent(revenueSpentPercent),
      },
      hint: "Capital / Revenue committed in INR",
    },
  ];
  const financeBoxTitleClass = "text-sm font-extrabold text-foreground";

  const openSearchFilter = (dashboardFilter: string) => {
    navigate({
      to: "/search",
      search: {
        dashboardFilter,
        division: activeDivision === "all" ? undefined : activeDivision,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-card)]">
          {[
            { key: "status", label: "Status" },
            { key: "snapshot", label: "Snapshot" },
            { key: "finance", label: "Finance" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveDashboardTab(tab.key as "snapshot" | "status" | "finance")}
              className={
                "h-8 rounded-md px-3 text-sm font-medium transition-colors " +
                (activeDashboardTab === tab.key
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground")
              }
            >
              {tab.label}
            </button>
          ))}
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

      {activeDashboardTab === "snapshot" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-bold">Snapshot</h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {topSummaryStats.map((stat) => (
                <SummaryMetric
                  key={stat.label}
                  {...stat}
                  onClick={
                    stat.searchFilter ? () => openSearchFilter(stat.searchFilter) : undefined
                  }
                  onSubMetricClick={(dashboardFilter) => openSearchFilter(dashboardFilter)}
                />
              ))}
              <div className="grid grid-cols-2 gap-2">
                {compactSummaryStats.map((stat) => (
                  <SummaryMetric
                    key={stat.label}
                    {...stat}
                    compact
                    onClick={() => openSearchFilter(stat.searchFilter)}
                    onSubMetricClick={(dashboardFilter) => openSearchFilter(dashboardFilter)}
                  />
                ))}
              </div>
              {summaryStats.map((stat) => (
                <SummaryMetric
                  key={stat.label}
                  {...stat}
                  onClick={
                    stat.searchFilter ? () => openSearchFilter(stat.searchFilter) : undefined
                  }
                  onSubMetricClick={(dashboardFilter) => openSearchFilter(dashboardFilter)}
                />
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold">Bidding mode</h2>
                <p className="text-xs text-muted-foreground">Files grouped by bidding mode</p>
              </div>
            </div>
            {modeCounts.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                {modeCounts.map((mode) => (
                  <button
                    type="button"
                    key={mode.name}
                    onClick={() => openSearchFilter(`mode:${mode.name}`)}
                    className="rounded-lg border border-border bg-secondary/35 p-4 text-left hover:bg-accent"
                  >
                    <div className="text-xs text-muted-foreground">{mode.name}</div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight">{mode.count}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No modes recorded yet.</div>
            )}
          </div>
        </section>
      ) : null}

      {activeDashboardTab === "status" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-bold">Status</h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">Milestone flow</h3>
                <p className="text-xs text-muted-foreground">
                  Pending files at each clearance stage
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-right">
                <div className="text-[11px] font-medium text-muted-foreground">Total files</div>
                <div className="text-lg font-semibold tabular-nums">{dashboardFiles.length}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {milestoneFlow.map((milestone, index) =>
                milestone.key === "delivery" ? (
                  <DeliveryFlowNode
                    key={milestone.key}
                    milestone={milestone}
                    index={index}
                    isLast={index === milestoneFlow.length - 1}
                    onCompletedClick={() => openSearchFilter("deliveryCompleted")}
                    onDueClick={() => openSearchFilter("deliveryDue")}
                  />
                ) : milestone.key === "deliveryPeriod" ? (
                  <DeliveryPeriodFlowNode
                    key={milestone.key}
                    milestone={milestone}
                    index={index}
                    isLast={index === milestoneFlow.length - 1}
                    onValidClick={() => openSearchFilter("deliveryPeriodValid")}
                    onExpiredClick={() => openSearchFilter("deliveryPeriodExpired")}
                    onExtendedClick={() => openSearchFilter("deliveryPeriodExtended")}
                  />
                ) : (
                  <MilestoneFlowNode
                    key={milestone.key}
                    milestone={milestone}
                    index={index}
                    isLast={index === milestoneFlow.length - 1}
                    onTotalClick={() => openSearchFilter(`milestoneTotal:${milestone.key}`)}
                    onUnderProcessClick={() =>
                      openSearchFilter(`milestoneUnderProcess:${milestone.key}`)
                    }
                    onActiveClick={() => openSearchFilter(`milestone:${milestone.key}`)}
                    onReviewedClick={() => openSearchFilter(`milestoneReviewed:${milestone.key}`)}
                    onPendingClick={() => openSearchFilter(`milestonePending:${milestone.key}`)}
                    onClearedClick={() => openSearchFilter(`milestoneCleared:${milestone.key}`)}
                    onLiveBidsClick={() => openSearchFilter("liveBids")}
                    onBidOverdueClick={() => openSearchFilter("bidOverdue")}
                    onLiveSupplyOrdersClick={() => openSearchFilter("liveSupplyOrders")}
                  />
                ),
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeDashboardTab === "finance" ? (
        <section>
          <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold">Finance</h2>
                <p className="text-xs text-muted-foreground">Allocated and booked amounts</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-secondary/35 p-4">
                <div className={financeBoxTitleClass}>Allocated</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-md border border-border bg-card px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">Capital</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">
                      {formatCurrency(financeTotals.allocatedCapital)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">Revenue</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">
                      {formatCurrency(financeTotals.allocatedRevenue)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/35 p-4">
                <div className={financeBoxTitleClass}>Projected</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-md border border-border bg-card px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">Capital</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">
                      {formatCurrency(financeTotals.projectedCapital)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">Revenue</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">
                      {formatCurrency(financeTotals.projectedRevenue)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/35 p-4">
                <div className={financeBoxTitleClass}>Booked</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-md border border-border bg-card px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">Capital</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">
                      {formatCurrency(financeTotals.bookedCapital)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">Revenue</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">
                      {formatCurrency(financeTotals.bookedRevenue)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/35 p-4">
                <div className={financeBoxTitleClass}>Committed</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-md border border-border bg-card px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">Capital</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">
                      {formatCurrency(financeTotals.spentCapital)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">Revenue</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">
                      {formatCurrency(financeTotals.spentRevenue)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {financePercentStats.map((stat) => (
                <SummaryMetric key={stat.label} {...stat} titleClassName={financeBoxTitleClass} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  onClick,
  onSubMetricClick,
  titleClassName,
  compact = false,
}: {
  label: string;
  value:
    | number
    | string
    | { capital: string; revenue: string }
    | Array<{ label: string; value: number | string; searchFilter?: string }>;
  onClick?: () => void;
  onSubMetricClick?: (dashboardFilter: string) => void;
  titleClassName?: string;
  compact?: boolean;
}) {
  const subMetrics = Array.isArray(value) ? value : undefined;
  const content = (
    <>
      <div className="flex items-center justify-between">
        <div className={titleClassName ?? "text-sm font-bold text-muted-foreground"}>{label}</div>
      </div>
      {subMetrics ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {subMetrics.map((item) => {
            const subContent = (
              <>
                <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
                <div className="text-lg font-semibold tracking-tight">{item.value}</div>
              </>
            );

            if (item.searchFilter && onSubMetricClick) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onSubMetricClick(item.searchFilter!)}
                  className="rounded-md border border-border bg-card px-2 py-2 text-left hover:bg-accent"
                >
                  {subContent}
                </button>
              );
            }

            return (
              <div key={item.label} className="rounded-md border border-border bg-card px-2 py-2">
                {subContent}
              </div>
            );
          })}
        </div>
      ) : typeof value === "object" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-card px-2 py-2">
            <div className="text-xs font-medium text-muted-foreground">Capital</div>
            <div className="text-lg font-semibold tracking-tight">{value.capital}</div>
          </div>
          <div className="rounded-md border border-border bg-card px-2 py-2">
            <div className="text-xs font-medium text-muted-foreground">Revenue</div>
            <div className="text-lg font-semibold tracking-tight">{value.revenue}</div>
          </div>
        </div>
      ) : (
        <div
          className={
            compact
              ? "mt-3 text-xl font-semibold tracking-tight"
              : "mt-3 text-2xl font-semibold tracking-tight"
          }
        >
          {value}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={
          "rounded-lg border border-border bg-secondary/35 text-left hover:bg-accent " +
          (compact ? "p-3" : "p-4")
        }
      >
        {content}
      </button>
    );
  }

  return (
    <div className={"rounded-lg border border-border bg-secondary/35 " + (compact ? "p-3" : "p-4")}>
      {content}
    </div>
  );
}

function MilestoneFlowNode({
  milestone,
  index,
  isLast,
  onTotalClick,
  onUnderProcessClick,
  onActiveClick,
  onReviewedClick,
  onPendingClick,
  onClearedClick,
  onLiveBidsClick,
  onBidOverdueClick,
  onLiveSupplyOrdersClick,
}: {
  milestone: {
    key: string;
    label: string;
    completedLabel: string;
    totalLabel: string;
    pendingLabel: string;
    total: number;
    underProcess: number;
    active: number;
    pending: number;
    reviewed: number;
    hasReviewed: boolean;
    cleared: number;
    liveBids?: number;
    overdueBids?: number;
    liveSupplyOrders?: number;
  };
  index: number;
  isLast: boolean;
  onTotalClick: () => void;
  onUnderProcessClick: () => void;
  onActiveClick: () => void;
  onReviewedClick: () => void;
  onPendingClick: () => void;
  onClearedClick: () => void;
  onLiveBidsClick: () => void;
  onBidOverdueClick: () => void;
  onLiveSupplyOrdersClick: () => void;
}) {
  const tone = getMilestoneTone(milestone.active);
  const widthPercent =
    milestone.total > 0 ? Math.round((milestone.cleared / milestone.total) * 100) : 0;
  const underProcessLabel = previousStageLabelKeys.has(milestone.key)
    ? "At previous stages"
    : "Under process";

  return (
    <div className="relative min-w-0">
      <div
        className={
          "group flex h-full w-full flex-col justify-between rounded-lg border p-2.5 text-left transition hover:shadow-[var(--shadow-card)] " +
          tone.card
        }
      >
        <span className="flex flex-col gap-2">
          <span className="flex min-w-0 items-center gap-2 border-b border-border/60 pb-2">
            <span
              className={
                "grid size-7 shrink-0 place-items-center rounded-md text-[11px] font-bold " +
                tone.step
              }
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{milestone.label}</span>
            </span>
          </span>
          <span className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={onTotalClick}
              className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
            >
              <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                {milestone.totalLabel}
              </span>
              <span className="block text-base font-semibold tabular-nums">{milestone.total}</span>
            </button>
            <button
              type="button"
              onClick={onClearedClick}
              className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
            >
              <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                {milestone.completedLabel}
              </span>
              <span className="block text-base font-semibold tabular-nums">
                {milestone.cleared}
              </span>
            </button>
            {milestone.key === "cnc" ? (
              <button
                type="button"
                onClick={onUnderProcessClick}
                className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
              >
                <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                  {underProcessLabel}
                </span>
                <span className="block text-base font-semibold tabular-nums">
                  {milestone.underProcess}
                </span>
              </button>
            ) : null}
            {milestone.hasReviewed && milestone.key !== "scrutiny" && milestone.key !== "cnc" ? (
              <button
                type="button"
                onClick={onUnderProcessClick}
                className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
              >
                <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                  {underProcessLabel}
                </span>
                <span className="block text-base font-semibold tabular-nums">
                  {milestone.underProcess}
                </span>
              </button>
            ) : null}
            {milestone.key === "bidding" ? (
              <>
                <button
                  type="button"
                  onClick={onLiveBidsClick}
                  className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
                >
                  <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                    Live
                  </span>
                  <span className="block text-base font-semibold tabular-nums">
                    {milestone.liveBids ?? 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onBidOverdueClick}
                  className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
                >
                  <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                    Overdue
                  </span>
                  <span className="block text-base font-semibold tabular-nums">
                    {milestone.overdueBids ?? 0}
                  </span>
                </button>
              </>
            ) : null}
            {milestone.key === "supplyOrder" ? (
              <button
                type="button"
                onClick={onLiveSupplyOrdersClick}
                className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
              >
                <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                  Live
                </span>
                <span className="block text-base font-semibold tabular-nums">
                  {milestone.liveSupplyOrders ?? 0}
                </span>
              </button>
            ) : null}
            {milestone.key === "scrutiny" ? (
              <span aria-hidden="true" className="rounded-md border border-transparent px-2 py-1" />
            ) : null}
            {milestone.hasReviewed || milestone.key === "cnc" ? (
              <>
                <button
                  type="button"
                  onClick={onActiveClick}
                  className={
                    "rounded-md px-2 py-1 text-center hover:ring-2 hover:ring-ring/30 " + tone.count
                  }
                >
                  <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                    Under process
                  </span>
                  <span className="block text-base font-semibold tabular-nums">
                    {milestone.active}
                  </span>
                </button>
                {milestone.hasReviewed ? (
                  <button
                    type="button"
                    onClick={onReviewedClick}
                    className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
                  >
                    <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                      Reviewed
                    </span>
                    <span className="block text-base font-semibold tabular-nums">
                      {milestone.reviewed}
                    </span>
                  </button>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              onClick={onPendingClick}
              className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
            >
              <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                {milestone.pendingLabel}
              </span>
              <span className="block text-base font-semibold tabular-nums">
                {milestone.pending}
              </span>
            </button>
            {!milestone.hasReviewed && milestone.key !== "cnc" ? (
              <button
                type="button"
                onClick={onUnderProcessClick}
                className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
              >
                <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                  {underProcessLabel}
                </span>
                <span className="block text-base font-semibold tabular-nums">
                  {milestone.underProcess}
                </span>
              </button>
            ) : null}
          </span>
        </span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-background">
          <span
            className={"block h-full rounded-full " + tone.bar}
            style={{ width: `${widthPercent}%` }}
          />
        </span>
      </div>
      {!isLast ? (
        <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 translate-x-1/2 rounded-full border border-border bg-card p-1 text-muted-foreground xl:block">
          <ArrowRight className="size-4" />
        </div>
      ) : null}
    </div>
  );
}

function DeliveryPeriodFlowNode({
  milestone,
  index,
  isLast,
  onValidClick,
  onExpiredClick,
  onExtendedClick,
}: {
  milestone: {
    key: string;
    label: string;
    valid: number;
    expired: number;
    extended: number;
  };
  index: number;
  isLast: boolean;
  onValidClick: () => void;
  onExpiredClick: () => void;
  onExtendedClick: () => void;
}) {
  const tone = getMilestoneTone(milestone.expired);

  return (
    <div className="relative min-w-0">
      <div
        className={
          "group flex h-full w-full flex-col justify-between rounded-lg border p-2.5 text-left transition hover:shadow-[var(--shadow-card)] " +
          tone.card
        }
      >
        <span className="flex flex-col gap-2">
          <span className="flex min-w-0 items-center gap-2 border-b border-border/60 pb-2">
            <span
              className={
                "grid size-7 shrink-0 place-items-center rounded-md text-[11px] font-bold " +
                tone.step
              }
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{milestone.label}</span>
            </span>
          </span>
          <span className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={onValidClick}
              className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
            >
              <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                Valid
              </span>
              <span className="block text-base font-semibold tabular-nums">{milestone.valid}</span>
            </button>
            <button
              type="button"
              onClick={onExpiredClick}
              className={
                "rounded-md px-2 py-1 text-center hover:ring-2 hover:ring-ring/30 " + tone.count
              }
            >
              <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                Expired
              </span>
              <span className="block text-base font-semibold tabular-nums">
                {milestone.expired}
              </span>
            </button>
            <button
              type="button"
              onClick={onExtendedClick}
              className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
            >
              <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                Extended
              </span>
              <span className="block text-base font-semibold tabular-nums">
                {milestone.extended}
              </span>
            </button>
          </span>
        </span>
      </div>
      {!isLast ? (
        <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 translate-x-1/2 rounded-full border border-border bg-card p-1 text-muted-foreground xl:block">
          <ArrowRight className="size-4" />
        </div>
      ) : null}
    </div>
  );
}

const previousStageLabelKeys = new Set([
  "highValue",
  "tcec",
  "ad",
  "rqa",
  "control",
  "ifa",
  "cfa",
  "bidding",
  "cnc",
  "postTcec",
  "supplyOrder",
  "bankGuarantee",
  "payment",
]);

function DeliveryFlowNode({
  milestone,
  index,
  isLast,
  onCompletedClick,
  onDueClick,
}: {
  milestone: {
    key: string;
    label: string;
    completed: number;
    due: number;
  };
  index: number;
  isLast: boolean;
  onCompletedClick: () => void;
  onDueClick: () => void;
}) {
  const tone = getMilestoneTone(milestone.due);

  return (
    <div className="relative min-w-0">
      <div
        className={
          "group flex h-full w-full flex-col justify-between rounded-lg border p-2.5 text-left transition hover:shadow-[var(--shadow-card)] " +
          tone.card
        }
      >
        <span className="flex flex-col gap-2">
          <span className="flex min-w-0 items-center gap-2 border-b border-border/60 pb-2">
            <span
              className={
                "grid size-7 shrink-0 place-items-center rounded-md text-[11px] font-bold " +
                tone.step
              }
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{milestone.label}</span>
            </span>
          </span>
          <span className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onCompletedClick}
              className="rounded-md border border-border bg-card px-2 py-1 text-center hover:bg-accent hover:ring-2 hover:ring-ring/30"
            >
              <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                Completed
              </span>
              <span className="block text-base font-semibold tabular-nums">
                {milestone.completed}
              </span>
            </button>
            <button
              type="button"
              onClick={onDueClick}
              className={
                "rounded-md px-2 py-1 text-center hover:ring-2 hover:ring-ring/30 " + tone.count
              }
            >
              <span className="block text-[9px] font-medium uppercase leading-tight text-muted-foreground">
                Due
              </span>
              <span className="block text-base font-semibold tabular-nums">{milestone.due}</span>
            </button>
          </span>
        </span>
      </div>
      {!isLast ? (
        <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 translate-x-1/2 rounded-full border border-border bg-card p-1 text-muted-foreground xl:block">
          <ArrowRight className="size-4" />
        </div>
      ) : null}
    </div>
  );
}

function getMilestoneTone(count: number) {
  if (count === 0) {
    return {
      card: "border-success/30 bg-success/10 hover:bg-success/15",
      step: "bg-success text-success-foreground",
      count: "bg-success/15 text-foreground",
      bar: "bg-success",
    };
  }
  if (count >= 10) {
    return {
      card: "border-destructive/30 bg-destructive/10 hover:bg-destructive/15",
      step: "bg-destructive text-destructive-foreground",
      count: "bg-destructive/15 text-foreground",
      bar: "bg-destructive",
    };
  }
  return {
    card: "border-warning/35 bg-warning/10 hover:bg-warning/15",
    step: "bg-warning text-warning-foreground",
    count: "bg-warning/15 text-foreground",
    bar: "bg-warning",
  };
}

function getModeCounts(files: ReturnType<typeof useAccessibleFiles>) {
  const modes = ["OBM", "PBM", "SBM", "LBM", "LPC"];
  const counts = files.reduce<Record<string, number>>((current, file) => {
    const mode = file.mode?.trim().toUpperCase();
    if (!mode || !modes.includes(mode)) return current;
    current[mode] = (current[mode] ?? 0) + 1;
    return current;
  }, {});

  return modes.map((name) => ({ name, count: counts[name] ?? 0 }));
}

const milestoneDefinitions = [
  {
    key: "scrutiny",
    label: "Scrutiny",
    totalLabel: "Total files",
    reviewed: "scrutinyDate",
    current: "scrutinyCompletionDate",
  },
  {
    key: "highValue",
    label: "High Value",
    totalLabel: "Total cases",
    reviewed: "highValueMeetingDate",
    current: "highValueMinutesDate",
    applies: (file) => isYes(file.highValue),
  },
  {
    key: "tcec",
    label: "Pre-TCEC",
    totalLabel: "Total cases",
    reviewed: "preTcecDate",
    current: "preTcecMinutesDate",
    applies: (file) => isYes(file.tcec),
  },
  {
    key: "ad",
    label: "AD",
    totalLabel: "Total cases",
    current: "adVettingDate",
    applies: (file) => isYes(file.ad),
  },
  {
    key: "rqa",
    label: "R&QA",
    totalLabel: "Total cases",
    current: "rqaApprovalDate",
    applies: (file) => isYes(file.rqa),
  },
  { key: "control", label: "Controlled", totalLabel: "Total files", current: "immsDate" },
  {
    key: "ifa",
    label: "IFA",
    totalLabel: "Total cases",
    reviewed: "ifaSentDate",
    current: "ifaFinalDate",
    applies: (file) => isYes(file.ifa),
  },
  { key: "cfa", label: "CFA", totalLabel: "Total files", current: "cfaDate" },
  {
    key: "bidding",
    label: "Bidding",
    totalLabel: "Total files",
    current: "biddingStageOver",
  },
  {
    key: "postTcec",
    label: "Post-TCEC",
    totalLabel: "Total cases",
    reviewed: "postTcecDate",
    current: "postTcecMinutesDate",
    applies: (file) => isYes(file.tcec),
  },
  {
    key: "cnc",
    label: "CNC",
    totalLabel: "Total cases",
    reviewed: "cncDate",
    current: "cncApprovalDate",
    applies: (file) => isYes(file.tcec),
  },
  {
    key: "supplyOrder",
    label: "Supply Order",
    completedLabel: "Placed",
    totalLabel: "Total files",
    current: "soDate",
  },
  {
    key: "bankGuarantee",
    label: "Bank Guarantee",
    completedLabel: "Received",
    totalLabel: "Total cases",
    current: "bgValidityDate",
    applies: (file) => isYes(file.bg),
  },
  { key: "payment", label: "Payment", totalLabel: "Total files", current: "paymentDate" },
] satisfies Array<{
  key: string;
  label: string;
  completedLabel?: string;
  totalLabel?: string;
  pendingLabel?: string;
  reviewed?: keyof FileRecord | keyof SupplyOrderDetail;
  current: keyof FileRecord | keyof SupplyOrderDetail;
  applies?: (file: FileRecord) => boolean;
}>;

function getMilestoneFlow(files: ReturnType<typeof useAccessibleFiles>) {
  const flow = milestoneDefinitions.map((milestone) => {
    const applicableFiles = files.filter((file) => isMilestoneApplicable(file, milestone));
    const reachedFiles = applicableFiles.filter((file) => isEligibleMilestone(file, milestone));
    const reviewed = reachedFiles.filter((file) => isMilestoneReviewed(file, milestone)).length;
    const cleared = reachedFiles.filter((file) => isMilestoneComplete(file, milestone)).length;
    const reached = reachedFiles.length;
    return {
      key: milestone.key,
      label: milestone.label,
      completedLabel: milestone.completedLabel ?? "Completed",
      totalLabel: milestone.totalLabel ?? "Total",
      pendingLabel: milestone.pendingLabel ?? "Pending",
      total: applicableFiles.length,
      underProcess: Math.max(0, applicableFiles.length - reached),
      active: Math.max(0, reached - cleared),
      pending: Math.max(0, reached - reviewed - cleared),
      reviewed,
      hasReviewed: Boolean(milestone.reviewed),
      cleared,
      liveBids: milestone.key === "bidding" ? files.filter(isFileTenderLive).length : undefined,
      overdueBids: milestone.key === "bidding" ? files.filter(isBidOverdue).length : undefined,
      liveSupplyOrders:
        milestone.key === "supplyOrder" ? files.filter(isLiveSupplyOrder).length : undefined,
    };
  });
  const supplyOrderIndex = flow.findIndex((milestone) => milestone.key === "supplyOrder");
  const delivery = {
    key: "delivery",
    label: "Delivery",
    completed: files.filter(isDeliveryCompleted).length,
    due: files.filter(isDeliveryDue).length,
  };
  const deliveryPeriod = {
    key: "deliveryPeriod",
    label: "Delivery Period",
    valid: files.filter(isDeliveryPeriodValid).length,
    expired: files.filter(isDeliveryPeriodExpired).length,
    extended: files.filter(isDeliveryPeriodExtended).length,
  };

  const withDeliveryPeriod =
    supplyOrderIndex === -1
      ? [...flow, deliveryPeriod]
      : [
          ...flow.slice(0, supplyOrderIndex + 1),
          deliveryPeriod,
          ...flow.slice(supplyOrderIndex + 1),
        ];
  const bankGuaranteeIndex = withDeliveryPeriod.findIndex(
    (milestone) => milestone.key === "bankGuarantee",
  );

  if (bankGuaranteeIndex === -1) return [...withDeliveryPeriod, delivery];
  return [
    ...withDeliveryPeriod.slice(0, bankGuaranteeIndex + 1),
    delivery,
    ...withDeliveryPeriod.slice(bankGuaranteeIndex + 1),
  ];
}

function isPendingMilestone(file: FileRecord, milestone: (typeof milestoneDefinitions)[number]) {
  return (
    isEligibleMilestone(file, milestone) &&
    !isMilestoneReviewed(file, milestone) &&
    !isMilestoneComplete(file, milestone)
  );
}

function isEligibleMilestone(file: FileRecord, milestone: (typeof milestoneDefinitions)[number]) {
  return (
    isMilestoneApplicable(file, milestone) && isPreviousApplicableMilestoneComplete(file, milestone)
  );
}

function isMilestoneApplicable(file: FileRecord, milestone: (typeof milestoneDefinitions)[number]) {
  return milestone.applies ? milestone.applies(file) : true;
}

function isPreviousApplicableMilestoneComplete(
  file: FileRecord,
  milestone: (typeof milestoneDefinitions)[number],
) {
  if (milestone.key === "bankGuarantee") {
    return isSupplyOrderPlaced(file);
  }

  let previousMilestone: (typeof milestoneDefinitions)[number] | undefined;
  for (const item of milestoneDefinitions) {
    if (item.key === milestone.key) break;
    if (isMilestoneApplicable(file, item)) {
      previousMilestone = item;
    }
  }
  return previousMilestone
    ? isMilestoneComplete(file, previousMilestone)
    : hasMilestoneDate(file, "receivedDate");
}

function isMilestoneComplete(file: FileRecord, milestone: (typeof milestoneDefinitions)[number]) {
  if (milestone.key === "bidding") {
    return isYes(file.biddingStageOver);
  }
  return hasMilestoneDate(file, milestone.current);
}

function isMilestoneReviewed(file: FileRecord, milestone: (typeof milestoneDefinitions)[number]) {
  if (!milestone.reviewed) return false;
  return hasMilestoneDate(file, milestone.reviewed) && !isMilestoneComplete(file, milestone);
}

function hasMilestoneDate(file: FileRecord, key: keyof FileRecord | keyof SupplyOrderDetail) {
  return supplyOrderDateKeys.has(key as keyof SupplyOrderDetail)
    ? fileSupplyOrders(file).some((order) => hasFilledString(order[key as keyof SupplyOrderDetail]))
    : hasFilledField(file, key as keyof FileRecord);
}

const supplyOrderDateKeys = new Set<keyof SupplyOrderDetail>([
  "soDate",
  "bgValidityDate",
  "paymentDate",
]);

function fileSupplyOrders(file: FileRecord) {
  const rows =
    file.supplyOrders
      ?.map((row) => ({ ...row }))
      .filter((row) => Object.values(row).some((value) => Boolean(String(value ?? "").trim()))) ??
    [];
  if (rows.length) return rows;

  const legacy: SupplyOrderDetail = {
    soDate: file.soDate,
    dpDate: file.dpDate,
    bgValidityDate: file.bgValidityDate,
    dpExtension: file.dpExtension,
    revisedDp: file.revisedDp,
    materialReceiptDate: file.materialReceiptDate,
    paymentDate: file.paymentDate,
    bgReturnDate: file.bgReturnDate,
  };
  return Object.values(legacy).some((value) => Boolean(String(value ?? "").trim())) ? [legacy] : [];
}

function hasFilledField(file: FileRecord, key: keyof FileRecord) {
  const value = file[key];
  return typeof value === "string" ? hasFilledString(value) : Boolean(value);
}

function hasFilledString(value: string | undefined) {
  return Boolean(value?.trim());
}

function isYes(value: string | undefined) {
  return value?.trim().toLowerCase() === "yes";
}

function isNo(value: string | undefined) {
  return value?.trim().toLowerCase() === "no";
}

function isFileTenderLive(file: FileRecord) {
  if (hasDate(file.refloatBiddingDate) && hasDate(file.refloatBidOpeningDate)) {
    return isDateInRangeToday(file.refloatBiddingDate, file.refloatBidOpeningDate);
  }

  return isDateInRangeToday(file.bidDate, file.bidOpeningDate);
}

function isBidOverdue(file: FileRecord) {
  const activeOpeningDate = file.refloatBidOpeningDate || file.bidOpeningDate;
  return isNo(file.bidOpened) && isDateBeforeToday(activeOpeningDate);
}

function isLiveSupplyOrder(file: FileRecord) {
  return hasFilledField(file, "soDate") && isDateAfterToday(file.dpDate);
}

function isBgToBeReceived(file: FileRecord) {
  return (
    isYes(file.bg) && hasFilledField(file, "soDate") && !hasFilledField(file, "bgValidityDate")
  );
}

function isBgToBeReturned(file: FileRecord) {
  return (
    isYes(file.bg) &&
    hasFilledField(file, "bgValidityDate") &&
    isDateBeforeToday(file.bgValidityDate) &&
    !hasFilledField(file, "bgReturnDate")
  );
}

function isDpExpired(file: FileRecord) {
  return isDateBeforeToday(file.dpDate) && !hasFilledField(file, "revisedDp");
}

function isDeliveryOverdue(file: FileRecord) {
  const deliveryDate = hasFilledField(file, "revisedDp") ? file.revisedDp : file.dpDate;
  return isDateBeforeToday(deliveryDate);
}

function isDeliveryCompleted(file: FileRecord) {
  return isDeliveryActive(file) && fileSupplyOrders(file).some(isCompletedDeliveryOrder);
}

function isDeliveryDue(file: FileRecord) {
  return isDeliveryActive(file) && fileSupplyOrders(file).some(isDueDeliveryOrder);
}

function isDeliveryActive(file: FileRecord) {
  return isSupplyOrderPlaced(file);
}

function isCompletedDeliveryOrder(order: SupplyOrderDetail) {
  return hasFilledString(order.materialReceiptDate);
}

function isDueDeliveryOrder(order: SupplyOrderDetail) {
  return (
    !hasFilledString(order.materialReceiptDate) && isDateBeforeToday(getDeliveryDueDate(order))
  );
}

function getDeliveryDueDate(order: SupplyOrderDetail) {
  return hasFilledString(order.revisedDp) ? order.revisedDp : order.dpDate;
}

function isDeliveryPeriodValid(file: FileRecord) {
  return isDeliveryPeriodActive(file) && fileSupplyOrders(file).some(isValidDeliveryPeriodOrder);
}

function isDeliveryPeriodExpired(file: FileRecord) {
  return isDeliveryPeriodActive(file) && fileSupplyOrders(file).some(isExpiredDeliveryPeriodOrder);
}

function isDeliveryPeriodExtended(file: FileRecord) {
  return isDeliveryPeriodActive(file) && fileSupplyOrders(file).some(isExtendedDeliveryPeriodOrder);
}

function isDeliveryPeriodActive(file: FileRecord) {
  return isSupplyOrderPlaced(file);
}

function isSupplyOrderPlaced(file: FileRecord) {
  const supplyOrderMilestone = milestoneDefinitions.find(
    (milestone) => milestone.key === "supplyOrder",
  );
  return supplyOrderMilestone ? isMilestoneComplete(file, supplyOrderMilestone) : false;
}

function isValidDeliveryPeriodOrder(order: SupplyOrderDetail) {
  return (
    !hasFilledString(order.revisedDp) &&
    isDateAfterToday(order.dpDate) &&
    !hasFilledString(order.materialReceiptDate)
  );
}

function isExpiredDeliveryPeriodOrder(order: SupplyOrderDetail) {
  const deliveryPeriodDate = getDeliveryPeriodDate(order);
  return (
    Boolean(deliveryPeriodDate) &&
    isDateBeforeToday(deliveryPeriodDate) &&
    !hasFilledString(order.materialReceiptDate)
  );
}

function isExtendedDeliveryPeriodOrder(order: SupplyOrderDetail) {
  return (
    hasFilledString(order.revisedDp) &&
    isDateAfterToday(order.revisedDp) &&
    !hasFilledString(order.materialReceiptDate)
  );
}

function getDeliveryPeriodDate(order: SupplyOrderDetail) {
  return hasFilledString(order.revisedDp) ? order.revisedDp : order.dpDate;
}

function isPaymentDue(file: FileRecord) {
  return hasFilledField(file, "materialReceiptDate") && !hasFilledField(file, "paymentDate");
}

function isDateInRangeToday(startDate: string | undefined, endDate: string | undefined) {
  const startTime = parseLocalDateTime(startDate ?? "");
  const endTime = parseLocalDateTime(endDate ?? "");
  const todayTime = parseLocalDateTime(formatLocalDate(new Date()));

  if (startTime === undefined || endTime === undefined || todayTime === undefined) {
    return false;
  }

  return startTime <= todayTime && todayTime <= endTime;
}

function isDateBeforeToday(date: string | undefined) {
  const dateTime = parseLocalDateTime(date ?? "");
  const todayTime = parseLocalDateTime(formatLocalDate(new Date()));

  if (dateTime === undefined || todayTime === undefined) {
    return false;
  }

  return dateTime < todayTime;
}

function isDateAfterToday(date: string | undefined) {
  const dateTime = parseLocalDateTime(date ?? "");
  const todayTime = parseLocalDateTime(formatLocalDate(new Date()));

  if (dateTime === undefined || todayTime === undefined) {
    return false;
  }

  return dateTime > todayTime;
}

function hasDate(date: string | undefined) {
  return parseLocalDateTime(date ?? "") !== undefined;
}

function parseLocalDateTime(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(`${date}T00:00:00`);
  const time = parsed.getTime();
  return Number.isNaN(time) ? undefined : time;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPercent(value: number, total: number) {
  if (total <= 0) return undefined;
  return (value / total) * 100;
}

function formatPercent(value: number | undefined) {
  if (value === undefined) return "0%";
  return `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatCurrency(value: number) {
  return formatThousandsAndLakhs(value);
}
