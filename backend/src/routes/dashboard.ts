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
  theme: AppSettings["theme"];
  theme_tint: AppSettings["themeTint"];
  deletion_password: string;
  tcec_committees: unknown;
  milestones: unknown;
  table_field_presets: unknown;
  active_user_id: string | null;
};

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
    `select financial_year, selected_year, theme, theme_tint, deletion_password,
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

dashboardRouter.get(
  "/summary",
  asyncHandler(async (request, response) => {
    const user = requireAuth(request as AuthRequest);
    const scope = getDivisionScopeCondition(user);
    const settings = await loadSettings();
    const selectedYear = readString(request.query.selectedYear) ?? settings.selectedYear;
    const divisionYear =
      selectedYear === allActiveFilesYear ? settings.financialYear : selectedYear;
    const valueThresholdLevels = divisionYear ? await loadValueThresholdLevels(divisionYear) : [];
    const [files, divisions] = await Promise.all([
      loadFiles(scope.sql ? `where ${scope.sql}` : "", scope.values),
      loadDivisions(user, divisionYear),
    ]);
    const selectedYearFiles =
      selectedYear === allActiveFilesYear
        ? files.filter((file) => !isInactiveFile(file))
        : selectedYear
          ? files.filter((file) => isFileActiveInYear(file, selectedYear))
          : files;

    response.json({
      summary: buildDashboardSummary({
        files: selectedYearFiles,
        divisions,
        settings: { ...settings, valueThresholdLevels },
        division: readString(request.query.division) ?? "all",
        analyticsDivision: readString(request.query.analyticsDivision) ?? "all",
        liveMilestones: readList(request.query.liveMilestones),
      }),
    });
  }),
);
