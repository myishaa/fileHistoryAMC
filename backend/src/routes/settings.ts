import { Router } from "express";
import { pool } from "../db/pool.js";
import type { AppSettings, AppTheme, AppThemeTint } from "../types.js";
import { fromDbJsonArray, fromDbText, toDbText } from "../utils/db-values.js";
import { asyncHandler, HttpError, requireObjectBody, requireString } from "../utils/http.js";

export const settingsRouter = Router();

const themes = new Set<AppTheme>(["light", "dark"]);
const themeTints = new Set<AppThemeTint>(["plain", "yellow", "green", "blue", "pink", "lavender"]);

type SettingsRow = {
  financial_year: string;
  selected_year: string;
  theme: AppTheme;
  theme_tint: AppThemeTint;
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
    theme: row.theme,
    themeTint: row.theme_tint,
    deletionPassword: row.deletion_password,
    tcecCommittees: fromDbJsonArray(row.tcec_committees) as string[],
    milestones: fromDbJsonArray(row.milestones) as string[],
    tableFieldPresets: fromDbJsonArray(row.table_field_presets),
    activeUserId: fromDbText(row.active_user_id) || undefined,
  };
}

async function getSettings() {
  const result = await pool.query<SettingsRow>(
    `select financial_year, selected_year, theme, theme_tint, deletion_password,
            tcec_committees, milestones, table_field_presets, active_user_id
     from app_settings
     where id = true`,
  );
  if (!result.rows[0]) throw new HttpError(404, "Settings row not found. Run seed defaults.");
  return mapSettings(result.rows[0]);
}

function readTheme(value: unknown) {
  if (typeof value !== "string" || !themes.has(value as AppTheme)) {
    throw new HttpError(400, "theme must be light or dark.");
  }
  return value as AppTheme;
}

function readThemeTint(value: unknown) {
  if (typeof value !== "string" || !themeTints.has(value as AppThemeTint)) {
    throw new HttpError(400, "themeTint is invalid.");
  }
  return value as AppThemeTint;
}

function readArray(value: unknown, field: string) {
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be an array.`);
  return JSON.stringify(value);
}

settingsRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    response.json({ settings: await getSettings() });
  }),
);

settingsRouter.patch(
  "/",
  asyncHandler(async (request, response) => {
    const body = requireObjectBody(request.body);
    const fields: string[] = [];
    const values: unknown[] = [];

    const addField = (column: string, value: unknown, cast = "") => {
      values.push(value);
      fields.push(`${column} = $${values.length}${cast}`);
    };

    if ("financialYear" in body) addField("financial_year", requireString(body.financialYear, "financialYear"));
    if ("selectedYear" in body) addField("selected_year", requireString(body.selectedYear, "selectedYear"));
    if ("theme" in body) addField("theme", readTheme(body.theme));
    if ("themeTint" in body) addField("theme_tint", readThemeTint(body.themeTint));
    if ("deletionPassword" in body) addField("deletion_password", toDbText(body.deletionPassword) ?? "");
    if ("tcecCommittees" in body) {
      addField("tcec_committees", readArray(body.tcecCommittees, "tcecCommittees"), "::jsonb");
    }
    if ("milestones" in body) addField("milestones", readArray(body.milestones, "milestones"), "::jsonb");
    if ("tableFieldPresets" in body) {
      addField("table_field_presets", readArray(body.tableFieldPresets, "tableFieldPresets"), "::jsonb");
    }
    if ("activeUserId" in body) addField("active_user_id", toDbText(body.activeUserId));

    if (!fields.length) throw new HttpError(400, "No settings fields provided.");

    await pool.query(`update app_settings set ${fields.join(", ")} where id = true`, values);
    response.json({ settings: await getSettings() });
  }),
);
