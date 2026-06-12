import { Router } from "express";
import { pool } from "../db/pool.js";
import type { Division } from "../types.js";
import { requireAdmin, type AuthRequest } from "../utils/auth.js";
import { fromDbText, toDbNumber, toDbText } from "../utils/db-values.js";
import { asyncHandler, HttpError, requireObjectBody, requireParam, requireString } from "../utils/http.js";

export const divisionsRouter = Router();

type DivisionRow = {
  id: string;
  name: string;
  code: string | null;
  allocated_capital: string | null;
  allocated_revenue: string | null;
  ad: string | null;
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

async function getDivision(id: string) {
  const result = await pool.query<DivisionRow>(
    `select id, name, code, allocated_capital, allocated_revenue, ad
     from divisions
     where id = $1`,
    [id],
  );
  return result.rows[0] ? mapDivision(result.rows[0]) : undefined;
}

divisionsRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const result = await pool.query<DivisionRow>(
      `select id, name, code, allocated_capital, allocated_revenue, ad
       from divisions
       order by name asc`,
    );
    response.json({ divisions: result.rows.map(mapDivision) });
  }),
);

divisionsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    requireAdmin(request as AuthRequest);
    const body = requireObjectBody(request.body);
    const name = requireString(body.name, "name");

    const result = await pool.query<DivisionRow>(
      `insert into divisions (name, code, allocated_capital, allocated_revenue, ad)
       values ($1, $2, $3, $4, $5)
       returning id, name, code, allocated_capital, allocated_revenue, ad`,
      [
        name,
        toDbText(body.code),
        toDbNumber(body.allocatedCapital),
        toDbNumber(body.allocatedRevenue),
        toDbText(body.ad) ?? "No",
      ],
    );

    response.status(201).json({ division: mapDivision(result.rows[0]) });
  }),
);

divisionsRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    requireAdmin(request as AuthRequest);
    const body = requireObjectBody(request.body);
    const id = requireParam(request.params.id, "id");
    const fields: string[] = [];
    const values: unknown[] = [];

    const addField = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if ("name" in body) addField("name", requireString(body.name, "name"));
    if ("code" in body) addField("code", toDbText(body.code));
    if ("allocatedCapital" in body) addField("allocated_capital", toDbNumber(body.allocatedCapital));
    if ("allocatedRevenue" in body) addField("allocated_revenue", toDbNumber(body.allocatedRevenue));
    if ("ad" in body) addField("ad", toDbText(body.ad));
    if ("viewerPassword" in body) {
      addField("viewer_password_hash", requireString(body.viewerPassword, "viewerPassword"));
    }

    if (!fields.length) throw new HttpError(400, "No division fields provided.");

    values.push(id);
    const setSql = fields
      .map((field) =>
        field.startsWith("viewer_password_hash = ")
          ? field.replace("viewer_password_hash = ", "viewer_password_hash = crypt(") +
            ", gen_salt('bf'))"
          : field,
      )
      .join(", ");
    const result = await pool.query<DivisionRow>(
      `update divisions
       set ${setSql}
       where id = $${values.length}
       returning id, name, code, allocated_capital, allocated_revenue, ad`,
      values,
    );

    if (!result.rows[0]) throw new HttpError(404, "Division not found.");
    response.json({ division: mapDivision(result.rows[0]) });
  }),
);

divisionsRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    requireAdmin(request as AuthRequest);
    const id = requireParam(request.params.id, "id");
    const division = await getDivision(id);
    if (!division) throw new HttpError(404, "Division not found.");

    await pool.query("delete from divisions where id = $1", [id]);
    response.json({ deleted: true, division });
  }),
);
