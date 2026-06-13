import { Router } from "express";
import { pool } from "../db/pool.js";
import type { AppSettings, FileRecord, SupplyOrderDetail } from "../types.js";
import { loadFiles } from "./files.js";
import { fromDbJsonArray, fromDbText } from "../utils/db-values.js";
import { buildReportsSummary } from "../utils/report-summary.js";
import { getDivisionScopeCondition, requireAuth, type AuthRequest } from "../utils/auth.js";
import { asyncHandler, HttpError } from "../utils/http.js";

export const reportsRouter = Router();

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

function readNonNegativeInteger(value: unknown, fallback: number) {
  const text = readString(value);
  const parsed = Number.parseInt(text ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

reportsRouter.get(
  "/summary",
  asyncHandler(async (request, response) => {
    const user = requireAuth(request as AuthRequest);
    const scope = getDivisionScopeCondition(user);
    const [files, settings] = await Promise.all([
      loadFiles(scope.sql ? `where ${scope.sql}` : "", scope.values),
      loadSettings(),
    ]);
    const selectedYear = readString(request.query.selectedYear) ?? settings.selectedYear;
    const selectedYearFiles =
      selectedYear === allActiveFilesYear
        ? files.filter((file) => !isInactiveFile(file))
        : selectedYear
          ? files.filter((file) => isFileActiveInYear(file, selectedYear))
          : files;

    response.json({
      summary: buildReportsSummary({
        files: selectedYearFiles,
        division: readString(request.query.division) ?? "all",
        delayDays: readNonNegativeInteger(request.query.delayDays, 5),
        delayMilestone: readString(request.query.delayMilestone) ?? "all",
      }),
    });
  }),
);
