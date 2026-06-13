import { Router } from "express";
import { pool } from "../db/pool.js";
import type { Division } from "../types.js";
import { requireAdmin, type AuthRequest } from "../utils/auth.js";
import { fromDbDate, fromDbText, toDbNumber, toDbText } from "../utils/db-values.js";
import {
  asyncHandler,
  HttpError,
  requireObjectBody,
  requireParam,
  requireString,
} from "../utils/http.js";

export const divisionsRouter = Router();

type DivisionRow = {
  id: string;
  name: string;
  code: string | null;
  allocated_capital: string | null;
  allocated_revenue: string | null;
  ad: string | null;
  active: boolean | null;
  archived_at: Date | string | null;
};

async function getSelectedYear() {
  const result = await pool.query<{ selected_year: string }>(
    "select selected_year from app_settings where id = true",
  );
  return result.rows[0]?.selected_year;
}

async function readAllocationYear(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return (await getSelectedYear()) ?? "";
}

async function verifyDeletionPassword(value: unknown) {
  if (typeof value !== "string") throw new HttpError(400, "Deletion password is required.");
  const result = await pool.query<{ ok: boolean; configured: boolean }>(
    `select
       deletion_password <> '' as configured,
       deletion_password <> '' and deletion_password = $1 as ok
     from app_settings
     where id = true`,
    [value],
  );
  if (!result.rows[0]?.configured) {
    throw new HttpError(
      400,
      "Set a deletion password in admin settings before deleting divisions.",
    );
  }
  if (!result.rows[0].ok) throw new HttpError(403, "Incorrect deletion password.");
}

async function upsertYearAllocation(
  divisionId: string,
  financialYear: string,
  allocatedCapital: unknown,
  allocatedRevenue: unknown,
  active: unknown = true,
) {
  if (!financialYear) throw new HttpError(400, "financialYear is required for allocation.");
  await pool.query(
    `insert into division_year_allocations (
       division_id, financial_year, allocated_capital, allocated_revenue, active
     )
     values ($1, $2, $3, $4, $5)
     on conflict (division_id, financial_year)
     do update set
       allocated_capital = excluded.allocated_capital,
       allocated_revenue = excluded.allocated_revenue,
       active = excluded.active`,
    [
      divisionId,
      financialYear,
      toDbNumber(allocatedCapital),
      toDbNumber(allocatedRevenue),
      active === false ? false : true,
    ],
  );
}

function mapDivision(row: DivisionRow): Division {
  return {
    id: row.id,
    name: row.name,
    code: fromDbText(row.code),
    allocatedCapital: fromDbText(row.allocated_capital),
    allocatedRevenue: fromDbText(row.allocated_revenue),
    ad: fromDbText(row.ad),
    active: row.active ?? false,
    archivedAt: fromDbDate(row.archived_at),
  };
}

async function getDivision(id: string, financialYear?: string) {
  const result = await pool.query<DivisionRow>(
    `select
       d.id,
       d.name,
       d.code,
       coalesce(a.allocated_capital, d.allocated_capital) as allocated_capital,
       coalesce(a.allocated_revenue, d.allocated_revenue) as allocated_revenue,
       d.ad,
       coalesce(a.active, false) as active,
       d.archived_at
     from divisions d
     left join division_year_allocations a
       on a.division_id = d.id and a.financial_year = $2
     where d.id = $1`,
    [id, financialYear ?? ""],
  );
  return result.rows[0] ? mapDivision(result.rows[0]) : undefined;
}

divisionsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const financialYear = await readAllocationYear(request.query.year);
    const includeInactive = request.query.includeInactive === "true";
    const includeArchived = request.query.includeArchived === "true";
    const result = await pool.query<DivisionRow>(
      `select
         d.id,
         d.name,
         d.code,
         coalesce(a.allocated_capital, d.allocated_capital) as allocated_capital,
         coalesce(a.allocated_revenue, d.allocated_revenue) as allocated_revenue,
         d.ad,
         coalesce(a.active, false) as active,
         d.archived_at
       from divisions d
       left join division_year_allocations a
         on a.division_id = d.id and a.financial_year = $1
       where ($2::boolean or coalesce(a.active, false))
         and ($3::boolean or d.archived_at is null)
       order by d.name asc`,
      [financialYear, includeInactive, includeArchived],
    );
    response.json({ divisions: result.rows.map(mapDivision) });
  }),
);

divisionsRouter.post(
  "/merge",
  asyncHandler(async (request, response) => {
    requireAdmin(request as AuthRequest);
    const body = requireObjectBody(request.body);
    const financialYear = await readAllocationYear(body.financialYear);
    if (!financialYear) throw new HttpError(400, "financialYear is required.");

    if (!Array.isArray(body.sourceDivisionIds)) {
      throw new HttpError(400, "sourceDivisionIds must be an array.");
    }
    const sourceDivisionIds = Array.from(
      new Set(body.sourceDivisionIds.filter((id): id is string => typeof id === "string")),
    );
    if (sourceDivisionIds.length < 2) {
      throw new HttpError(400, "Select at least two source divisions to merge.");
    }

    const targetDivisionId =
      typeof body.targetDivisionId === "string" && body.targetDivisionId.trim()
        ? body.targetDivisionId.trim()
        : undefined;
    const targetDivisionName =
      typeof body.targetDivisionName === "string" && body.targetDivisionName.trim()
        ? body.targetDivisionName.trim()
        : undefined;
    const targetDivisionCode =
      typeof body.targetDivisionCode === "string" && body.targetDivisionCode.trim()
        ? body.targetDivisionCode.trim()
        : undefined;
    const effectiveDate =
      typeof body.effectiveDate === "string" && body.effectiveDate.trim()
        ? body.effectiveDate.trim()
        : undefined;
    const notes =
      typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : undefined;
    const moveActiveFiles = body.moveActiveFiles !== false;
    const deactivateSourceDivisions = body.deactivateSourceDivisions !== false;

    if (targetDivisionId && sourceDivisionIds.includes(targetDivisionId)) {
      throw new HttpError(400, "Target division cannot also be a source division.");
    }
    if (!targetDivisionId && !targetDivisionName) {
      throw new HttpError(400, "Select a target division or enter a new merged division name.");
    }

    const client = await pool.connect();
    let mergeId = "";
    let resolvedTargetDivisionId = targetDivisionId;
    let movedFileCount = 0;

    try {
      await client.query("begin");

      const sourceCheck = await client.query<{ count: string }>(
        `select count(*)::text as count
         from divisions
         where id = any($1::uuid[]) and archived_at is null`,
        [sourceDivisionIds],
      );
      if (Number(sourceCheck.rows[0]?.count ?? 0) !== sourceDivisionIds.length) {
        throw new HttpError(400, "One or more source divisions were not found.");
      }

      if (resolvedTargetDivisionId) {
        const targetCheck = await client.query<{ id: string }>(
          "select id from divisions where id = $1 and archived_at is null",
          [resolvedTargetDivisionId],
        );
        if (!targetCheck.rows[0]) throw new HttpError(400, "Target division was not found.");
      } else {
        const existingTarget = await client.query<{ id: string }>(
          "select id from divisions where lower(name) = lower($1) and archived_at is null",
          [targetDivisionName],
        );
        if (existingTarget.rows[0]) {
          resolvedTargetDivisionId = existingTarget.rows[0].id;
        } else {
          const createdTarget = await client.query<{ id: string }>(
            `insert into divisions (name, code, ad)
             values ($1, $2, 'No')
             returning id`,
            [targetDivisionName, targetDivisionCode ?? null],
          );
          resolvedTargetDivisionId = createdTarget.rows[0].id;
        }
      }

      await client.query(
        `insert into division_year_allocations (division_id, financial_year, active)
         values ($1, $2, true)
         on conflict (division_id, financial_year)
         do update set active = true`,
        [resolvedTargetDivisionId, financialYear],
      );

      const mergeResult = await client.query<{ id: string }>(
        `insert into division_merges (
           financial_year,
           target_division_id,
           effective_date,
           notes,
           move_active_files,
           deactivate_source_divisions
         )
         values ($1, $2, $3, $4, $5, $6)
         returning id`,
        [
          financialYear,
          resolvedTargetDivisionId,
          effectiveDate ?? null,
          notes ?? null,
          moveActiveFiles,
          deactivateSourceDivisions,
        ],
      );
      mergeId = mergeResult.rows[0].id;

      await client.query(
        `insert into division_merge_sources (merge_id, source_division_id)
         select $1, unnest($2::uuid[])`,
        [mergeId, sourceDivisionIds],
      );

      if (deactivateSourceDivisions) {
        await client.query(
          `insert into division_year_allocations (division_id, financial_year, active)
           select unnest($1::uuid[]), $2, false
           on conflict (division_id, financial_year)
           do update set active = false`,
          [sourceDivisionIds, financialYear],
        );
      }

      if (moveActiveFiles) {
        const movedFiles = await client.query<{ file_id: string }>(
          `with candidates as (
             select f.id, f.division_id
             from files f
             where f.archived_at is null
               and f.division_id = any($2::uuid[])
               and (
                 f.year = $1
                 or exists (
                   select 1
                   from file_year_activity activity
                   where activity.file_id = f.id
                     and activity.financial_year = $1
                     and activity.status = 'active'
                 )
               )
           ),
           history as (
             insert into file_division_history (
               file_id,
               from_division_id,
               to_division_id,
               financial_year,
               effective_date,
               reason,
               merge_id
             )
             select id, division_id, $3, $1, $4, $5, $6
             from candidates
             returning file_id
           ),
           moved as (
             update files f
             set division_id = $3
             from candidates c
             where f.id = c.id
             returning f.id
           )
           insert into file_year_activity (file_id, financial_year, status)
           select id, $1, 'active'
           from moved
           on conflict (file_id, financial_year)
           do update set status = 'active'
           returning file_id`,
          [
            financialYear,
            sourceDivisionIds,
            resolvedTargetDivisionId,
            effectiveDate ?? null,
            notes ?? "Division merge",
            mergeId,
          ],
        );
        movedFileCount = movedFiles.rowCount ?? 0;
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    response.status(201).json({
      merge: {
        id: mergeId,
        movedFileCount,
        targetDivision: await getDivision(resolvedTargetDivisionId!, financialYear),
      },
    });
  }),
);

divisionsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    requireAdmin(request as AuthRequest);
    const body = requireObjectBody(request.body);
    const name = requireString(body.name, "name");
    const financialYear = await readAllocationYear(body.financialYear);

    const result = await pool.query<DivisionRow>(
      `insert into divisions (name, code, ad)
       values ($1, $2, $3)
       returning id, name, code, null::numeric as allocated_capital, null::numeric as allocated_revenue, ad, true as active, archived_at`,
      [name, toDbText(body.code), toDbText(body.ad) ?? "No"],
    );
    await upsertYearAllocation(
      result.rows[0].id,
      financialYear,
      body.allocatedCapital,
      body.allocatedRevenue,
      body.active,
    );

    response.status(201).json({ division: await getDivision(result.rows[0].id, financialYear) });
  }),
);

divisionsRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    requireAdmin(request as AuthRequest);
    const body = requireObjectBody(request.body);
    const id = requireParam(request.params.id, "id");
    const financialYear = await readAllocationYear(body.financialYear);
    const fields: string[] = [];
    const values: unknown[] = [];

    const addField = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if ("name" in body) addField("name", requireString(body.name, "name"));
    if ("code" in body) addField("code", toDbText(body.code));
    if ("ad" in body) addField("ad", toDbText(body.ad));
    if ("viewerPassword" in body) {
      addField("viewer_password_hash", requireString(body.viewerPassword, "viewerPassword"));
    }

    if (fields.length) {
      values.push(id);
      const setSql = fields
        .map((field) =>
          field.startsWith("viewer_password_hash = ")
            ? field.replace("viewer_password_hash = ", "viewer_password_hash = crypt(") +
              ", gen_salt('bf'))"
            : field,
        )
        .join(", ");
      const result = await pool.query(
        `update divisions
         set ${setSql}
         where id = $${values.length}
         returning id`,
        values,
      );
      if (!result.rows[0]) throw new HttpError(404, "Division not found.");
    } else if (!(await getDivision(id, financialYear))) {
      throw new HttpError(404, "Division not found.");
    }

    if ("allocatedCapital" in body || "allocatedRevenue" in body || "active" in body) {
      await upsertYearAllocation(
        id,
        financialYear,
        body.allocatedCapital,
        body.allocatedRevenue,
        body.active,
      );
    }

    response.json({ division: await getDivision(id, financialYear) });
  }),
);

divisionsRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const user = requireAdmin(request as AuthRequest);
    const id = requireParam(request.params.id, "id");
    const division = await getDivision(id, await readAllocationYear(request.query.year));
    if (!division) throw new HttpError(404, "Division not found.");

    await pool.query(
      `update divisions
       set archived_at = now(),
           archived_by = $2,
           archive_reason = 'Archived by admin'
       where id = $1 and archived_at is null`,
      [id, user.id],
    );
    response.json({ archived: true, division });
  }),
);

divisionsRouter.get(
  "/archive/list",
  asyncHandler(async (request, response) => {
    requireAdmin(request as AuthRequest);
    const financialYear = await readAllocationYear(request.query.year);
    const result = await pool.query<DivisionRow>(
      `select
         d.id,
         d.name,
         d.code,
         coalesce(a.allocated_capital, d.allocated_capital) as allocated_capital,
         coalesce(a.allocated_revenue, d.allocated_revenue) as allocated_revenue,
         d.ad,
         coalesce(a.active, false) as active,
         d.archived_at
       from divisions d
       left join division_year_allocations a
         on a.division_id = d.id and a.financial_year = $1
       where d.archived_at is not null
       order by d.archived_at desc, d.name asc`,
      [financialYear],
    );
    response.json({ divisions: result.rows.map(mapDivision) });
  }),
);

divisionsRouter.post(
  "/:id/restore",
  asyncHandler(async (request, response) => {
    requireAdmin(request as AuthRequest);
    const id = requireParam(request.params.id, "id");
    const financialYear = await readAllocationYear(request.query.year);
    const result = await pool.query(
      `update divisions
       set archived_at = null,
           archived_by = null,
           archive_reason = null
       where id = $1
       returning id`,
      [id],
    );
    if (!result.rows[0]) throw new HttpError(404, "Division not found.");
    response.json({ division: await getDivision(id, financialYear) });
  }),
);

divisionsRouter.delete(
  "/archive/:id",
  asyncHandler(async (request, response) => {
    requireAdmin(request as AuthRequest);
    const body = requireObjectBody(request.body);
    await verifyDeletionPassword(body.deletionPassword);
    const id = requireParam(request.params.id, "id");
    const division = await getDivision(id, await readAllocationYear(request.query.year));
    if (!division?.archivedAt) throw new HttpError(404, "Archived division not found.");

    await pool.query("delete from divisions where id = $1 and archived_at is not null", [id]);
    response.json({ deleted: true, division });
  }),
);
