import { Router } from "express";
import { pool } from "../db/pool.js";
import { loadFiles } from "./files.js";
import type {
  AppSettings,
  Division,
  FileRecord,
  SupplyOrderDetail,
  ValueThresholdLevel,
} from "../types.js";
import { fromDbJsonArray, fromDbText } from "../utils/db-values.js";
import { buildDashboardSummary } from "../utils/dashboard-summary.js";
import {
  canUseAllDivisions,
  getDivisionScopeCondition,
  requireAuth,
  type AuthRequest,
} from "../utils/auth.js";
import { asyncHandler, HttpError } from "../utils/http.js";

export const dashboardRouter = Router();

type DivisionRow = {
  id: string;
  name: string;
  code: string | null;
  allocated_capital: string | null;
  allocated_revenue: string | null;
  ad: string | null;
};

type SettingsRow = {
  financial_year: string;
  selected_year: string;
  year_selection_locked: boolean;
  theme: AppSettings["theme"];
  theme_tint: AppSettings["themeTint"];
  deletion_password: string;
  tcec_committees: unknown;
  milestones: unknown;
  table_field_presets: unknown;
  active_user_id: string | null;
};

const modeNames = ["OBM", "PBM", "SBM", "LBM", "LPC"];
const fileTypeNames = ["General", "AMC", "MPC"];
const snapshotAttributeDefinitions = [
  { key: "tcec", column: "f.tcec", label: "TCEC", yesLabel: "TCEC", noLabel: "Non TCEC" },
  { key: "gte", column: "f.gte", label: "GTE", yesLabel: "GTE", noLabel: "Non GTE" },
  { key: "gem", column: "f.gem", label: "GeM", yesLabel: "GeM", noLabel: "Non GeM" },
  {
    key: "highValue",
    column: "f.high_value",
    label: "High Value",
    yesLabel: "High Value",
    noLabel: "Non High Value",
  },
  { key: "ad", column: "f.ad", label: "AD", yesLabel: "AD", noLabel: "Non AD" },
  { key: "rqa", column: "f.rqa", label: "R&QA", yesLabel: "R&QA", noLabel: "Non R&QA" },
  { key: "ifa", column: "f.ifa", label: "IFA", yesLabel: "IFA", noLabel: "Non IFA" },
  { key: "psb", column: "f.psb", label: "PSB", yesLabel: "PSB", noLabel: "Non PSB" },
  { key: "bg", column: "f.bg", label: "BG", yesLabel: "BG", noLabel: "Non BG" },
  {
    key: "rfpVetting",
    column: "f.rfp_vetting",
    label: "RFP vetting",
    yesLabel: "RFP vetting",
    noLabel: "Non RFP vetting",
  },
  {
    key: "refloat",
    column: "f.refloat",
    label: "Refloat",
    yesLabel: "Refloat",
    noLabel: "Non Refloat",
  },
  { key: "rst", column: "f.rst", label: "RST", yesLabel: "RST", noLabel: "Non RST" },
] as const;

const statusMilestoneDefinitions = [
  {
    key: "scrutiny",
    label: "Scrutiny",
    reviewedColumn: "f.scrutiny_date",
    currentColumn: "f.scrutiny_completion_date",
  },
  {
    key: "highValue",
    label: "High Value",
    reviewedColumn: "f.high_value_meeting_date",
    currentColumn: "f.high_value_minutes_date",
    appliesColumn: "f.high_value",
  },
  {
    key: "tcec",
    label: "Pre-TCEC",
    reviewedColumn: "f.pre_tcec_date",
    currentColumn: "f.pre_tcec_minutes_date",
    appliesColumn: "f.tcec",
  },
  {
    key: "ad",
    label: "AD",
    currentColumn: "f.ad_vetting_date",
    appliesColumn: "f.ad",
  },
  {
    key: "rqa",
    label: "R&QA",
    currentColumn: "f.rqa_approval_date",
    appliesColumn: "f.rqa",
  },
  { key: "control", label: "Controlling", currentColumn: "f.imms_date", aliases: ["Controlling", "Controlled"] },
  {
    key: "ifa",
    label: "IFA",
    reviewedColumn: "f.ifa_sent_date",
    currentColumn: "f.ifa_final_date",
    appliesColumn: "f.ifa",
  },
  {
    key: "cfa",
    label: "CFA",
    reviewedColumn: "f.cfa_sent_date",
    currentColumn: "f.cfa_date",
  },
  { key: "bidding", label: "Bidding", currentColumn: "f.bidding_stage_over", yesComplete: true },
  {
    key: "postTcec",
    label: "Post-TCEC",
    reviewedColumn: "f.post_tcec_date",
    currentColumn: "f.post_tcec_minutes_date",
    appliesColumn: "f.tcec",
  },
  {
    key: "cnc",
    label: "CNC",
    reviewedColumn: "f.cnc_date",
    currentColumn: "f.cnc_approval_date",
    appliesColumn: "f.tcec",
  },
  { key: "supplyOrder", label: "Supply Order", supplyOrderDate: "so_date" },
  {
    key: "bankGuarantee",
    label: "Bank Guarantee",
    appliesColumn: "f.bg",
    supplyOrderDate: "bg_validity_date",
  },
  { key: "payment", label: "Payment", supplyOrderDate: "payment_date" },
] as const;

function mapDivision(row: DivisionRow): Division {
  return {
    id: row.id,
    name: row.name,
    code: fromDbText(row.code),
    allocatedCapital: fromDbText(row.allocated_capital),
    allocatedRevenue: fromDbText(row.allocated_revenue),
    ad: fromDbText(row.ad),
  };
}

function mapSettings(row: SettingsRow): AppSettings {
  return {
    financialYear: row.financial_year,
    selectedYear: row.selected_year,
    financialYears: [row.financial_year, row.selected_year].filter(Boolean),
    yearSelectionLocked: row.year_selection_locked,
    theme: row.theme,
    themeTint: row.theme_tint,
    deletionPassword: row.deletion_password,
    tcecCommittees: fromDbJsonArray(row.tcec_committees) as string[],
    valueThresholdLevels: [],
    milestones: fromDbJsonArray(row.milestones) as string[],
    tableFieldPresets: fromDbJsonArray(row.table_field_presets),
    activeUserId: fromDbText(row.active_user_id) || undefined,
  };
}

async function loadDivisions(user: ReturnType<typeof requireAuth>, financialYear: string) {
  const values: unknown[] = [];
  const conditions = ["coalesce(a.active, false)", "d.archived_at is null"];
  if (!canUseAllDivisions(user)) {
    if (user.divisionIds.length) {
      values.push(user.divisionIds);
      conditions.push(`d.id = any($${values.length}::uuid[])`);
    } else {
      conditions.push("false");
    }
  }
  values.push(financialYear);
  const yearParam = values.length;
  const result = await pool.query<DivisionRow>(
    `select
       d.id,
       d.name,
       d.code,
       coalesce(a.allocated_capital, d.allocated_capital) as allocated_capital,
       coalesce(a.allocated_revenue, d.allocated_revenue) as allocated_revenue,
       d.ad
     from divisions d
     left join division_year_allocations a
       on a.division_id = d.id and a.financial_year = $${yearParam}
     where ${conditions.join(" and ")}
     order by d.name asc`,
    values,
  );
  return result.rows.map(mapDivision);
}

async function loadSettings() {
  const result = await pool.query<SettingsRow>(
    `select financial_year, selected_year, year_selection_locked, theme, theme_tint, deletion_password,
            tcec_committees, milestones, table_field_presets, active_user_id
     from app_settings
     where id = true`,
  );
  if (!result.rows[0]) throw new HttpError(404, "Settings row not found. Run seed defaults.");
  return mapSettings(result.rows[0]);
}

async function loadValueThresholdLevels(financialYear: string): Promise<ValueThresholdLevel[]> {
  const result = await pool.query<{
    id: string;
    level_number: number;
    label: string;
    min_value: string | null;
    max_value: string | null;
    applies_to: ValueThresholdLevel["appliesTo"];
  }>(
    `select id, level_number, label, min_value, max_value, applies_to
     from value_threshold_levels
     where financial_year = $1
     order by level_number asc`,
    [financialYear],
  );
  return result.rows.map((row) => ({
    id: row.id,
    label: row.label,
    levelNumber: row.level_number,
    minValue: fromDbText(row.min_value) || undefined,
    maxValue: fromDbText(row.max_value) || undefined,
    appliesTo: row.applies_to,
  }));
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

const allActiveFilesYear = "__all_active_files__";

function isFileActiveInYear(file: { year?: string; activeYears?: string[] }, year: string) {
  return file.year === year || file.activeYears?.includes(year);
}

function isPaymentCompletedFile(file: { completedMilestones?: string[] }) {
  return Boolean(
    file.completedMilestones?.some((milestone) => milestone.trim().toLowerCase() === "payment"),
  );
}

function isYes(value: string | undefined) {
  return (value ?? "").trim().toLowerCase() === "yes";
}

function isInactiveFile(
  file: Pick<
    FileRecord,
    "completedMilestones" | "demandCancelled" | "soCancelled" | "supplyOrders"
  >,
) {
  return (
    isPaymentCompletedFile(file) ||
    isYes(file.demandCancelled) ||
    isYes(file.soCancelled) ||
    Boolean(
      file.supplyOrders?.some(
        (order: SupplyOrderDetail) => isYes(order.demandCancelled) || isYes(order.soCancelled),
      ),
    )
  );
}

function readList(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function addValue(values: unknown[], value: unknown) {
  values.push(value);
  return `$${values.length}`;
}

function getSelectedYearCondition(selectedYear: string | undefined, values: unknown[]) {
  if (!selectedYear) return undefined;
  if (selectedYear === allActiveFilesYear) {
    return `(not exists (
        select 1 from file_completed_milestones completed
        where completed.file_id = f.id and lower(completed.milestone) = 'payment'
      )
      and lower(coalesce(f.demand_cancelled, '')) <> 'yes'
      and lower(coalesce(f.so_cancelled, '')) <> 'yes'
      and not exists (
        select 1 from supply_orders so
        where so.file_id = f.id
          and (
            lower(coalesce(so.demand_cancelled, '')) = 'yes'
            or lower(coalesce(so.so_cancelled, '')) = 'yes'
          )
      ))`;
  }

  const placeholder = addValue(values, selectedYear);
  return `(f.year = ${placeholder} or exists (
    select 1 from file_year_activity a
    where a.file_id = f.id and a.financial_year = ${placeholder} and a.status = 'active'
  ))`;
}

function getDashboardFileWhereSql({
  scopeSql,
  scopeValues,
  selectedYear,
  activeDivision,
  activeAnalyticsDivision,
}: {
  scopeSql: string;
  scopeValues: unknown[];
  selectedYear: string | undefined;
  activeDivision: string;
  activeAnalyticsDivision: string;
}) {
  const conditions: string[] = [];
  const values = [...scopeValues];
  if (scopeSql) conditions.push(scopeSql);

  const selectedYearCondition = getSelectedYearCondition(selectedYear, values);
  if (selectedYearCondition) conditions.push(selectedYearCondition);

  if (activeDivision !== "all") {
    const divisionNames = Array.from(
      new Set(
        [activeDivision, activeAnalyticsDivision === "all" ? undefined : activeAnalyticsDivision]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.toLowerCase()),
      ),
    );
    if (divisionNames.length) {
      const placeholder = addValue(values, divisionNames);
      conditions.push(`lower(coalesce(d.name, '')) = any(${placeholder}::text[])`);
    }
  }

  return {
    whereSql: conditions.length ? `where ${conditions.join(" and ")}` : "",
    values,
  };
}

function appendDashboardWhereClause(
  whereSql: string,
  extraConditions: string[] = [],
) {
  const conditions = ["f.archived_at is null", ...extraConditions];
  if (!whereSql.trim()) return `where ${conditions.join(" and ")}`;
  return `${whereSql} and ${conditions.join(" and ")}`;
}

function countFilter(condition: string) {
  return `count(*) filter (where ${condition})::integer`;
}

function isYesExpression(column: string) {
  return `lower(coalesce(${column}, '')) = 'yes'`;
}

function isNoExpression(column: string) {
  return `lower(coalesce(${column}, '')) = 'no'`;
}

type SimpleDashboardCounts = {
  dashboardFileCount: number;
  modeCounts: Array<{ name: string; count: number }>;
  fileTypeCounts: Array<{ name: string; count: number }>;
  topSummaryStats: Array<{
    label: string;
    value: Array<{ label: string; value: number; searchFilter: string }>;
    hint: string;
  }>;
};

type FinanceTotals = {
  allocatedCapital: number;
  allocatedRevenue: number;
  bookedCapital: number;
  bookedRevenue: number;
  projectedCapital: number;
  projectedRevenue: number;
  spentCapital: number;
  spentRevenue: number;
};

type MiscellaneousCounts = {
  ld: number;
  demandCancelled: number;
  soCancelled: number;
  multipleSupplyOrders: number;
};

type StatusCounts = {
  milestoneRows: Array<{
    key: string;
    total: number;
    underProcess: number;
    active: number;
    pending: number;
    reviewed: number;
    cleared: number;
  }>;
  liveBids: number;
  overdueBids: number;
  inProcessBids: number;
  liveSupplyOrders: number;
  deliveryCompleted: number;
  deliveryDue: number;
  deliveryOverdue: number;
  deliveryPeriodValid: number;
  deliveryPeriodExpired: number;
  deliveryPeriodExtended: number;
};

async function loadSimpleDashboardCounts({
  whereSql,
  values,
  activeDivision,
}: {
  whereSql: string;
  values: unknown[];
  activeDivision: string;
}): Promise<SimpleDashboardCounts> {
  const queryValues = [...values];
  const extraConditions: string[] = [];
  if (activeDivision !== "all") {
    const placeholder = addValue(queryValues, activeDivision.toLowerCase());
    extraConditions.push(`lower(coalesce(d.name, '')) = ${placeholder}`);
  }

  const modeSelects = modeNames.map(
    (mode) =>
      `${countFilter(`upper(trim(coalesce(f.mode, ''))) = '${mode}'`)} as mode_${mode.toLowerCase()}`,
  );
  const fileTypeSelects = fileTypeNames.map(
    (fileType, index) =>
      `${countFilter(`trim(coalesce(f.file_type, '')) = '${fileType}'`)} as file_type_${index}`,
  );
  const attributeSelects = snapshotAttributeDefinitions.flatMap((attribute, index) => [
    `${countFilter(isYesExpression(attribute.column))} as attribute_${index}_yes`,
    `${countFilter(isNoExpression(attribute.column))} as attribute_${index}_no`,
  ]);
  const result = await pool.query<Record<string, number | string>>(
    `select
       count(*)::integer as dashboard_file_count,
       ${[...modeSelects, ...fileTypeSelects, ...attributeSelects].join(",\n       ")}
     from files f
     left join divisions d on d.id = f.division_id
     ${appendDashboardWhereClause(whereSql, extraConditions)}`,
    queryValues,
  );
  const row = result.rows[0] ?? {};
  const readCount = (key: string) => Number(row[key] ?? 0);

  return {
    dashboardFileCount: readCount("dashboard_file_count"),
    modeCounts: modeNames.map((name) => ({ name, count: readCount(`mode_${name.toLowerCase()}`) })),
    fileTypeCounts: fileTypeNames.map((name, index) => ({
      name,
      count: readCount(`file_type_${index}`),
    })),
    topSummaryStats: snapshotAttributeDefinitions.map((attribute, index) => ({
      label: attribute.label,
      value: [
        {
          label: attribute.yesLabel,
          value: readCount(`attribute_${index}_yes`),
          searchFilter: `attribute:${attribute.key}:yes`,
        },
        {
          label: attribute.noLabel,
          value: readCount(`attribute_${index}_no`),
          searchFilter: `attribute:${attribute.key}:no`,
        },
      ],
      hint: `${attribute.yesLabel} and ${attribute.noLabel} files`,
    })),
  };
}

function inrAmountExpression(column: string) {
  return `case
    when ${column} is null then 0
    when upper(trim(coalesce(f.currency, 'INR'))) in ('', 'INR') then ${column}
    when f.exchange_rate > 0 then ${column} * f.exchange_rate
    else 0
  end`;
}

function isCancelledExpression() {
  return `(${isYesExpression("f.demand_cancelled")}
    or ${isYesExpression("f.so_cancelled")}
    or exists (
      select 1 from supply_orders so_cancelled
      where so_cancelled.file_id = f.id
        and (
          ${isYesExpression("so_cancelled.demand_cancelled")}
          or ${isYesExpression("so_cancelled.so_cancelled")}
        )
    ))`;
}

function hasFilledExpression(column: string) {
  return `coalesce(${column}::text, '') <> ''`;
}

function supplyOrderExists(condition: string) {
  return `exists (
    select 1 from supply_orders so
    where so.file_id = f.id and ${condition}
  )`;
}

function supplyOrderRowExists() {
  return `exists (select 1 from supply_orders so_existing where so_existing.file_id = f.id)`;
}

function supplyOrderChildOrLegacyExpression(childCondition: string, legacyCondition: string) {
  return `(${supplyOrderExists(childCondition)} or (not ${supplyOrderRowExists()} and ${legacyCondition}))`;
}

function supplyOrderPlacedExpression() {
  return supplyOrderChildOrLegacyExpression(
    hasFilledExpression("so.so_date"),
    hasFilledExpression("f.so_date"),
  );
}

function deliveryDueOrderExpression(extraCondition = "true") {
  return supplyOrderChildOrLegacyExpression(
    `${hasFilledExpression("so.so_date")}
     and not ${hasFilledExpression("so.material_receipt_date")}
     and not ${isYesExpression("so.so_cancelled")}
     and ${extraCondition}`,
    `${hasFilledExpression("f.so_date")}
     and not ${hasFilledExpression("f.material_receipt_date")}
     and not ${isYesExpression("f.so_cancelled")}
     and ${extraCondition.replaceAll("so.", "f.")}`,
  );
}

function normalizeMilestoneExpression(column: string) {
  return `regexp_replace(lower(coalesce(${column}, '')), '[^a-z0-9]+', '', 'g')`;
}

function normalizeMilestoneName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function statusAppliesExpression(
  milestone: (typeof statusMilestoneDefinitions)[number],
) {
  return "appliesColumn" in milestone && milestone.appliesColumn
    ? isYesExpression(milestone.appliesColumn)
    : "true";
}

function statusCompleteExpression(
  milestone: (typeof statusMilestoneDefinitions)[number],
) {
  if ("yesComplete" in milestone && milestone.yesComplete) {
    return isYesExpression(milestone.currentColumn);
  }
  if ("supplyOrderDate" in milestone && milestone.supplyOrderDate) {
    return supplyOrderChildOrLegacyExpression(
      hasFilledExpression(`so.${milestone.supplyOrderDate}`),
      hasFilledExpression(`f.${milestone.supplyOrderDate}`),
    );
  }
  return "currentColumn" in milestone && milestone.currentColumn
    ? hasFilledExpression(milestone.currentColumn)
    : "false";
}

function statusReviewedExpression(
  milestone: (typeof statusMilestoneDefinitions)[number],
) {
  return "reviewedColumn" in milestone && milestone.reviewedColumn
    ? hasFilledExpression(milestone.reviewedColumn)
    : "false";
}

function statusActiveExpression(
  milestone: (typeof statusMilestoneDefinitions)[number],
) {
  const aliases =
    "aliases" in milestone && milestone.aliases ? milestone.aliases : [milestone.label];
  const normalizedAliases = aliases
    .map((alias) => `'${normalizeMilestoneName(alias)}'`)
    .join(", ");
  return `not ${isCancelledExpression()}
    and ${normalizeMilestoneExpression("f.current_milestone")} in (${normalizedAliases})`;
}

function previousApplicableCompleteExpression(index: number) {
  const previous = statusMilestoneDefinitions.slice(0, index).reverse();
  if (!previous.length) return hasFilledExpression("f.received_date");
  return `case
    ${previous
      .map(
        (milestone) =>
          `when ${statusAppliesExpression(milestone)} then ${statusCompleteExpression(milestone)}`,
      )
      .join("\n    ")}
    else ${hasFilledExpression("f.received_date")}
  end`;
}

function bankGuaranteeEligibleExpression() {
  return `not ${isCancelledExpression()}
    and ${isYesExpression("f.bg")}
    and ${supplyOrderChildOrLegacyExpression(
      `${hasFilledExpression("so.so_date")} and not ${isYesExpression("so.so_cancelled")}`,
      `${hasFilledExpression("f.so_date")} and not ${isYesExpression("f.so_cancelled")}`,
    )}`;
}

async function loadFinanceTotals({
  whereSql,
  values,
  activeDivision,
  dashboardDivisions,
}: {
  whereSql: string;
  values: unknown[];
  activeDivision: string;
  dashboardDivisions: Division[];
}): Promise<FinanceTotals> {
  const queryValues = [...values];
  const extraConditions: string[] = [];
  if (activeDivision !== "all") {
    const placeholder = addValue(queryValues, activeDivision.toLowerCase());
    extraConditions.push(`lower(coalesce(d.name, '')) = ${placeholder}`);
  }
  const cancelled = isCancelledExpression();
  const valueCapital = inrAmountExpression("f.value_capital");
  const valueRevenue = inrAmountExpression("f.value_revenue");
  const soValueCapital = inrAmountExpression("f.so_value_capital");
  const soValueRevenue = inrAmountExpression("f.so_value_revenue");
  const result = await pool.query<Record<string, string | number>>(
    `select
       coalesce(sum(case
         when ${cancelled} then 0
         when f.so_value_capital is not null then 0
         else ${valueCapital}
       end), 0) as booked_capital,
       coalesce(sum(case
         when ${cancelled} then 0
         when f.so_value_revenue is not null then 0
         else ${valueRevenue}
       end), 0) as booked_revenue,
       coalesce(sum(case
         when not ${cancelled} and not ${hasFilledExpression("f.imms")} then ${valueCapital}
         else 0
       end), 0) as projected_capital,
       coalesce(sum(case
         when not ${cancelled} and not ${hasFilledExpression("f.imms")} then ${valueRevenue}
         else 0
       end), 0) as projected_revenue,
       coalesce(sum(case when ${cancelled} then 0 else ${soValueCapital} end), 0) as spent_capital,
       coalesce(sum(case when ${cancelled} then 0 else ${soValueRevenue} end), 0) as spent_revenue
     from files f
     left join divisions d on d.id = f.division_id
     ${appendDashboardWhereClause(whereSql, extraConditions)}`,
    queryValues,
  );
  const row = result.rows[0] ?? {};
  const readAmount = (key: string) => Number(row[key] ?? 0);
  return {
    allocatedCapital: dashboardDivisions.reduce(
      (sum, division) => sum + (Number(String(division.allocatedCapital ?? "").replace(/,/g, "")) || 0),
      0,
    ),
    allocatedRevenue: dashboardDivisions.reduce(
      (sum, division) => sum + (Number(String(division.allocatedRevenue ?? "").replace(/,/g, "")) || 0),
      0,
    ),
    bookedCapital: readAmount("booked_capital"),
    bookedRevenue: readAmount("booked_revenue"),
    projectedCapital: readAmount("projected_capital"),
    projectedRevenue: readAmount("projected_revenue"),
    spentCapital: readAmount("spent_capital"),
    spentRevenue: readAmount("spent_revenue"),
  };
}

function getPercent(value: number, total: number) {
  if (total <= 0) return undefined;
  return (value / total) * 100;
}

function getFinancePercents(financeTotals: FinanceTotals) {
  return {
    capitalBooked: getPercent(financeTotals.bookedCapital, financeTotals.allocatedCapital),
    revenueBooked: getPercent(financeTotals.bookedRevenue, financeTotals.allocatedRevenue),
    capitalProjected: getPercent(financeTotals.projectedCapital, financeTotals.allocatedCapital),
    revenueProjected: getPercent(financeTotals.projectedRevenue, financeTotals.allocatedRevenue),
    capitalSpent: getPercent(financeTotals.spentCapital, financeTotals.allocatedCapital),
    revenueSpent: getPercent(financeTotals.spentRevenue, financeTotals.allocatedRevenue),
  };
}

function roundedFinanceTotals(totals: FinanceTotals): FinanceTotals {
  return {
    allocatedCapital: totals.allocatedCapital,
    allocatedRevenue: totals.allocatedRevenue,
    bookedCapital: Number(totals.bookedCapital.toFixed(6)),
    bookedRevenue: Number(totals.bookedRevenue.toFixed(6)),
    projectedCapital: Number(totals.projectedCapital.toFixed(6)),
    projectedRevenue: Number(totals.projectedRevenue.toFixed(6)),
    spentCapital: Number(totals.spentCapital.toFixed(6)),
    spentRevenue: Number(totals.spentRevenue.toFixed(6)),
  };
}

async function loadMiscellaneousCounts({
  whereSql,
  values,
  activeDivision,
}: {
  whereSql: string;
  values: unknown[];
  activeDivision: string;
}): Promise<MiscellaneousCounts> {
  const queryValues = [...values];
  const extraConditions: string[] = [];
  if (activeDivision !== "all") {
    const placeholder = addValue(queryValues, activeDivision.toLowerCase());
    extraConditions.push(`lower(coalesce(d.name, '')) = ${placeholder}`);
  }
  const result = await pool.query<Record<string, string | number>>(
    `select
       count(*) filter (
         where exists (
           select 1 from supply_orders so
           where so.file_id = f.id and ${isYesExpression("so.ld")}
         )
       )::integer as ld,
       count(*) filter (
         where exists (
           select 1 from supply_orders so
           where so.file_id = f.id and ${isYesExpression("so.demand_cancelled")}
         )
       )::integer as demand_cancelled,
       count(*) filter (
         where exists (
           select 1 from supply_orders so
           where so.file_id = f.id and ${isYesExpression("so.so_cancelled")}
         )
       )::integer as so_cancelled,
       count(*) filter (
         where (
           select count(*)
           from supply_orders so
           where so.file_id = f.id
         ) > 1
       )::integer as multiple_supply_orders
     from files f
     left join divisions d on d.id = f.division_id
     ${appendDashboardWhereClause(whereSql, extraConditions)}`,
    queryValues,
  );
  const row = result.rows[0] ?? {};
  const readCount = (key: string) => Number(row[key] ?? 0);
  return {
    ld: readCount("ld"),
    demandCancelled: readCount("demand_cancelled"),
    soCancelled: readCount("so_cancelled"),
    multipleSupplyOrders: readCount("multiple_supply_orders"),
  };
}

async function loadStatusCounts({
  whereSql,
  values,
  activeDivision,
}: {
  whereSql: string;
  values: unknown[];
  activeDivision: string;
}): Promise<StatusCounts> {
  const queryValues = [...values];
  const extraConditions: string[] = [];
  if (activeDivision !== "all") {
    const placeholder = addValue(queryValues, activeDivision.toLowerCase());
    extraConditions.push(`lower(coalesce(d.name, '')) = ${placeholder}`);
  }
  const cancelled = isCancelledExpression();
  const supplyOrderPlaced = supplyOrderPlacedExpression();
  const milestoneSelects = statusMilestoneDefinitions.flatMap((milestone, index) => {
    const prefix = `milestone_${index}`;
    const applies = statusAppliesExpression(milestone);
    const complete = statusCompleteExpression(milestone);
    const active = `${applies} and ${statusActiveExpression(milestone)}`;
    if (milestone.key === "bankGuarantee") {
      const eligible = bankGuaranteeEligibleExpression();
      const cleared = `${eligible} and ${complete}`;
      return [
        `${countFilter(eligible)} as ${prefix}_total`,
        `${countFilter(`${applies} and not (${supplyOrderPlaced})`)} as ${prefix}_under_process`,
        `${countFilter(`${eligible} and ${statusActiveExpression(milestone)}`)} as ${prefix}_active`,
        `${countFilter(`${eligible} and ${statusActiveExpression(milestone)} and not (${complete})`)}
          as ${prefix}_pending`,
        `0::integer as ${prefix}_reviewed`,
        `${countFilter(cleared)} as ${prefix}_cleared`,
      ];
    }
    const previousComplete = previousApplicableCompleteExpression(index);
    const reviewed = statusReviewedExpression(milestone);
    return [
      `${countFilter(applies)} as ${prefix}_total`,
      `${countFilter(`${applies} and not (${previousComplete})`)} as ${prefix}_under_process`,
      `${countFilter(active)} as ${prefix}_active`,
      `${countFilter(
        "reviewedColumn" in milestone && milestone.reviewedColumn
          ? `${active} and not (${reviewed}) and not (${complete})`
          : `${active} and not (${complete})`,
      )} as ${prefix}_pending`,
      `${countFilter(`${active} and ${reviewed} and not (${complete})`)} as ${prefix}_reviewed`,
      `${countFilter(`${applies} and ${complete}`)} as ${prefix}_cleared`,
    ];
  });
  const result = await pool.query<Record<string, string | number>>(
    `select
       ${milestoneSelects.join(",\n       ")},
       ${countFilter(isYesExpression("f.tender_live"))} as live_bids,
       ${countFilter(
         `${isNoExpression("f.bid_opened")}
          and (f.bid_opening_date < current_date or f.refloat_bid_opening_date < current_date)`,
       )} as overdue_bids,
       ${countFilter(
         `not ${cancelled}
          and regexp_replace(lower(coalesce(f.current_milestone, '')), '[^a-z0-9]+', '', 'g') = 'bidding'
          and not ${isYesExpression("f.tender_live")}`,
       )} as in_process_bids,
       ${countFilter(deliveryDueOrderExpression())} as live_supply_orders,
       ${countFilter(
         `${supplyOrderPlaced} and ${supplyOrderChildOrLegacyExpression(
           `${hasFilledExpression("so.so_date")} and ${hasFilledExpression("so.material_receipt_date")}`,
           `${hasFilledExpression("f.so_date")} and ${hasFilledExpression("f.material_receipt_date")}`,
         )}`,
       )} as delivery_completed,
       ${countFilter(`not ${cancelled} and ${supplyOrderPlaced} and ${deliveryDueOrderExpression()}`)}
         as delivery_due,
       ${countFilter(
         `${supplyOrderPlaced} and ${deliveryDueOrderExpression(
           "coalesce(so.revised_dp, so.dp_date) < current_date",
         )}`,
       )} as delivery_overdue,
       ${countFilter(
         `${supplyOrderPlaced} and ${supplyOrderChildOrLegacyExpression(
           `${hasFilledExpression("so.so_date")}
            and not ${hasFilledExpression("so.revised_dp")}
            and so.dp_date > current_date
            and not ${hasFilledExpression("so.material_receipt_date")}`,
           `${hasFilledExpression("f.so_date")}
            and not ${hasFilledExpression("f.revised_dp")}
            and f.dp_date > current_date
            and not ${hasFilledExpression("f.material_receipt_date")}`,
         )}`,
       )} as delivery_period_valid,
       ${countFilter(
         `not ${cancelled} and ${supplyOrderPlaced} and ${supplyOrderChildOrLegacyExpression(
           `${hasFilledExpression("so.so_date")}
            and coalesce(so.revised_dp, so.dp_date) is not null
            and coalesce(so.revised_dp, so.dp_date) < current_date
            and not ${hasFilledExpression("so.material_receipt_date")}`,
           `${hasFilledExpression("f.so_date")}
            and coalesce(f.revised_dp, f.dp_date) is not null
            and coalesce(f.revised_dp, f.dp_date) < current_date
            and not ${hasFilledExpression("f.material_receipt_date")}`,
         )}`,
       )} as delivery_period_expired,
       ${countFilter(
         `${supplyOrderPlaced} and ${supplyOrderChildOrLegacyExpression(
           `${hasFilledExpression("so.so_date")}
            and ${hasFilledExpression("so.revised_dp")}
            and so.revised_dp > current_date
            and not ${hasFilledExpression("so.material_receipt_date")}`,
           `${hasFilledExpression("f.so_date")}
            and ${hasFilledExpression("f.revised_dp")}
            and f.revised_dp > current_date
            and not ${hasFilledExpression("f.material_receipt_date")}`,
         )}`,
       )} as delivery_period_extended
     from files f
     left join divisions d on d.id = f.division_id
     ${appendDashboardWhereClause(whereSql, extraConditions)}`,
    queryValues,
  );
  const row = result.rows[0] ?? {};
  const readCount = (key: string) => Number(row[key] ?? 0);
  return {
    milestoneRows: statusMilestoneDefinitions.map((milestone, index) => {
      const prefix = `milestone_${index}`;
      return {
        key: milestone.key,
        total: readCount(`${prefix}_total`),
        underProcess: readCount(`${prefix}_under_process`),
        active: readCount(`${prefix}_active`),
        pending: readCount(`${prefix}_pending`),
        reviewed: readCount(`${prefix}_reviewed`),
        cleared: readCount(`${prefix}_cleared`),
      };
    }),
    liveBids: readCount("live_bids"),
    overdueBids: readCount("overdue_bids"),
    inProcessBids: readCount("in_process_bids"),
    liveSupplyOrders: readCount("live_supply_orders"),
    deliveryCompleted: readCount("delivery_completed"),
    deliveryDue: readCount("delivery_due"),
    deliveryOverdue: readCount("delivery_overdue"),
    deliveryPeriodValid: readCount("delivery_period_valid"),
    deliveryPeriodExpired: readCount("delivery_period_expired"),
    deliveryPeriodExtended: readCount("delivery_period_extended"),
  };
}

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

function warnIfSimpleCountsDiffer(reference: SimpleDashboardCounts, candidate: SimpleDashboardCounts) {
  if (stableJson(reference) === stableJson(candidate)) return;
  console.warn("Dashboard SQL simple counts differ from TypeScript summary.", {
    reference,
    candidate,
  });
}

function warnIfFinanceTotalsDiffer(reference: FinanceTotals, candidate: FinanceTotals) {
  if (stableJson(roundedFinanceTotals(reference)) === stableJson(roundedFinanceTotals(candidate))) {
    return;
  }
  console.warn("Dashboard SQL finance totals differ from TypeScript summary.", {
    reference,
    candidate,
  });
}

function warnIfMiscellaneousCountsDiffer(
  reference: MiscellaneousCounts,
  candidate: MiscellaneousCounts,
) {
  if (stableJson(reference) === stableJson(candidate)) return;
  console.warn("Dashboard SQL miscellaneous counts differ from TypeScript summary.", {
    reference,
    candidate,
  });
}

function getStatusCountsFromFlow(statusFlow: Array<Record<string, unknown>>): StatusCounts {
  const findRow = (key: string) => statusFlow.find((row) => row.key === key) ?? {};
  const bidding = findRow("bidding");
  const supplyOrder = findRow("supplyOrder");
  const delivery = findRow("delivery");
  const deliveryPeriod = findRow("deliveryPeriod");
  const readCount = (row: Record<string, unknown>, key: string) => Number(row[key] ?? 0);
  return {
    milestoneRows: statusMilestoneDefinitions.map((milestone) => {
      const row = findRow(milestone.key);
      return {
        key: milestone.key,
        total: readCount(row, "total"),
        underProcess: readCount(row, "underProcess"),
        active: readCount(row, "active"),
        pending: readCount(row, "pending"),
        reviewed: readCount(row, "reviewed"),
        cleared: readCount(row, "cleared"),
      };
    }),
    liveBids: readCount(bidding, "liveBids"),
    overdueBids: readCount(bidding, "overdueBids"),
    inProcessBids: readCount(bidding, "inProcessBids"),
    liveSupplyOrders: readCount(supplyOrder, "liveSupplyOrders"),
    deliveryCompleted: readCount(delivery, "completed"),
    deliveryDue: readCount(delivery, "due"),
    deliveryOverdue: readCount(delivery, "overdue"),
    deliveryPeriodValid: readCount(deliveryPeriod, "valid"),
    deliveryPeriodExpired: readCount(deliveryPeriod, "expired"),
    deliveryPeriodExtended: readCount(deliveryPeriod, "extended"),
  };
}

function mergeStatusCountsIntoFlow<T extends Array<Record<string, unknown>>>(
  statusFlow: T,
  counts: StatusCounts,
) {
  const milestoneCountByKey = new Map(counts.milestoneRows.map((row) => [row.key, row]));
  return statusFlow.map((row) => {
    const milestoneCounts = typeof row.key === "string" ? milestoneCountByKey.get(row.key) : undefined;
    const baseRow = milestoneCounts
      ? {
          ...row,
          total: milestoneCounts.total,
          underProcess: milestoneCounts.underProcess,
          active: milestoneCounts.active,
          pending: milestoneCounts.pending,
          reviewed: milestoneCounts.reviewed,
          cleared: milestoneCounts.cleared,
        }
      : row;
    if (row.key === "bidding") {
      return {
        ...baseRow,
        liveBids: counts.liveBids,
        overdueBids: counts.overdueBids,
        inProcessBids: counts.inProcessBids,
      };
    }
    if (row.key === "supplyOrder") {
      return { ...baseRow, liveSupplyOrders: counts.liveSupplyOrders };
    }
    if (row.key === "delivery") {
      return {
        ...baseRow,
        completed: counts.deliveryCompleted,
        due: counts.deliveryDue,
        overdue: counts.deliveryOverdue,
      };
    }
    if (row.key === "deliveryPeriod") {
      return {
        ...baseRow,
        valid: counts.deliveryPeriodValid,
        expired: counts.deliveryPeriodExpired,
        extended: counts.deliveryPeriodExtended,
      };
    }
    return baseRow;
  });
}

function warnIfStatusCountsDiffer(reference: StatusCounts, candidate: StatusCounts) {
  if (stableJson(reference) === stableJson(candidate)) return;
  console.warn("Dashboard SQL status counts differ from TypeScript summary.", {
    reference,
    candidate,
  });
}

dashboardRouter.get(
  "/summary",
  asyncHandler(async (request, response) => {
    const user = requireAuth(request as AuthRequest);
    const scope = getDivisionScopeCondition(user);
    const settings = await loadSettings();
    const selectedYear = readString(request.query.selectedYear) ?? settings.selectedYear;
    const divisionYear =
      selectedYear === allActiveFilesYear ? settings.financialYear : selectedYear;
    const [valueThresholdLevels, divisions] = await Promise.all([
      divisionYear ? loadValueThresholdLevels(divisionYear) : [],
      loadDivisions(user, divisionYear),
    ]);
    const requestedDivision = readString(request.query.division) ?? "all";
    const requestedAnalyticsDivision = readString(request.query.analyticsDivision) ?? "all";
    const activeDivision =
      requestedDivision === "all" || divisions.some((item) => item.name === requestedDivision)
        ? requestedDivision
        : "all";
    const activeAnalyticsDivision =
      requestedAnalyticsDivision === "all" ||
      divisions.some((item) => item.name === requestedAnalyticsDivision)
        ? requestedAnalyticsDivision
        : "all";
    const dashboardFileWhere = getDashboardFileWhereSql({
      scopeSql: scope.sql,
      scopeValues: scope.values,
      selectedYear,
      activeDivision,
      activeAnalyticsDivision,
    });
    const dashboardDivisions =
      activeDivision === "all"
        ? divisions
        : divisions.filter((division) => division.name === activeDivision);
    const [
      files,
      sqlSimpleCounts,
      sqlFinanceTotals,
      sqlMiscellaneousCounts,
      sqlStatusCounts,
    ] = await Promise.all([
      loadFiles(dashboardFileWhere.whereSql, dashboardFileWhere.values),
      loadSimpleDashboardCounts({
        whereSql: dashboardFileWhere.whereSql,
        values: dashboardFileWhere.values,
        activeDivision,
      }),
      loadFinanceTotals({
        whereSql: dashboardFileWhere.whereSql,
        values: dashboardFileWhere.values,
        activeDivision,
        dashboardDivisions,
      }),
      loadMiscellaneousCounts({
        whereSql: dashboardFileWhere.whereSql,
        values: dashboardFileWhere.values,
        activeDivision,
      }),
      loadStatusCounts({
        whereSql: dashboardFileWhere.whereSql,
        values: dashboardFileWhere.values,
        activeDivision,
      }),
    ]);
    const summary = buildDashboardSummary({
      files,
      divisions,
      settings: { ...settings, valueThresholdLevels },
      division: activeDivision,
      analyticsDivision: activeAnalyticsDivision,
      liveMilestones: readList(request.query.liveMilestones),
    });
    warnIfSimpleCountsDiffer(
      {
        dashboardFileCount: summary.dashboardFileCount,
        modeCounts: summary.modeCounts,
        fileTypeCounts: summary.fileTypeCounts,
        topSummaryStats: summary.topSummaryStats,
      },
      sqlSimpleCounts,
    );
    warnIfFinanceTotalsDiffer(summary.financeTotals, sqlFinanceTotals);
    warnIfMiscellaneousCountsDiffer(summary.miscellaneousCounts, sqlMiscellaneousCounts);
    warnIfStatusCountsDiffer(getStatusCountsFromFlow(summary.statusFlow), sqlStatusCounts);

    response.json({
      summary: {
        ...summary,
        ...sqlSimpleCounts,
        financeTotals: sqlFinanceTotals,
        financePercents: getFinancePercents(sqlFinanceTotals),
        miscellaneousCounts: sqlMiscellaneousCounts,
        statusFlow: mergeStatusCountsIntoFlow(summary.statusFlow, sqlStatusCounts),
      },
    });
  }),
);
