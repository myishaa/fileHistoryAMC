import { Router } from "express";
import { pool } from "../db/pool.js";
import { loadFiles } from "./files.js";
import type { AppSettings, Division } from "../types.js";
import { fromDbJsonArray, fromDbText } from "../utils/db-values.js";
import { buildDashboardSummary } from "../utils/dashboard-summary.js";
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
    theme: row.theme,
    themeTint: row.theme_tint,
    deletionPassword: row.deletion_password,
    tcecCommittees: fromDbJsonArray(row.tcec_committees) as string[],
    milestones: fromDbJsonArray(row.milestones) as string[],
    tableFieldPresets: fromDbJsonArray(row.table_field_presets),
    activeUserId: fromDbText(row.active_user_id) || undefined,
  };
}

async function loadDivisions() {
  const result = await pool.query<DivisionRow>(
    `select id, name, code, allocated_capital, allocated_revenue, ad
     from divisions
     order by name asc`,
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

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
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
    const [files, divisions, settings] = await Promise.all([
      loadFiles(),
      loadDivisions(),
      loadSettings(),
    ]);
    const selectedYearFiles = settings.selectedYear
      ? files.filter((file) => file.year === settings.selectedYear)
      : files;

    response.json({
      summary: buildDashboardSummary({
        files: selectedYearFiles,
        divisions,
        settings,
        division: readString(request.query.division) ?? "all",
        analyticsDivision: readString(request.query.analyticsDivision) ?? "all",
        liveMilestones: readList(request.query.liveMilestones),
      }),
    });
  }),
);
