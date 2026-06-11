import { Router } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import type { FileRecord, FirmDetail, FileRemark, SupplyOrderDetail } from "../types.js";
import { type FileSearchParams, searchFiles } from "../utils/file-search.js";
import {
  fromDbDate,
  fromDbText,
  toDbDate,
  toDbInteger,
  toDbNumber,
  toDbText,
} from "../utils/db-values.js";
import { asyncHandler, HttpError, requireObjectBody, requireParam } from "../utils/http.js";

export const filesRouter = Router();

type ValueKind = "text" | "date" | "number" | "integer";

const fileFields = {
  title: ["title", "text"],
  officer: ["officer", "text"],
  imms: ["imms", "text"],
  date: ["file_date", "date"],
  year: ["year", "text"],
  uniqueCode: ["unique_code", "text"],
  receivedDate: ["received_date", "date"],
  scrutinyDate: ["scrutiny_date", "date"],
  scrutinyResponseDate: ["scrutiny_response_date", "date"],
  scrutinyCompletionDate: ["scrutiny_completion_date", "date"],
  immsDate: ["imms_date", "date"],
  fileNo: ["file_no", "text"],
  indentor: ["indentor", "text"],
  demandDescription: ["demand_description", "text"],
  valueCapital: ["value_capital", "number"],
  valueRevenue: ["value_revenue", "number"],
  currency: ["currency", "text"],
  exchangeRate: ["exchange_rate", "number"],
  gte: ["gte", "text"],
  fileType: ["file_type", "text"],
  tcec: ["tcec", "text"],
  mode: ["mode", "text"],
  gem: ["gem", "text"],
  highValue: ["high_value", "text"],
  ad: ["ad", "text"],
  rqa: ["rqa", "text"],
  ifa: ["ifa", "text"],
  psb: ["psb", "text"],
  bg: ["bg", "text"],
  rfpVetting: ["rfp_vetting", "text"],
  highValueMeetingDate: ["high_value_meeting_date", "date"],
  highValueMinutesDate: ["high_value_minutes_date", "date"],
  preTcecDate: ["pre_tcec_date", "date"],
  preTcecMinutesDate: ["pre_tcec_minutes_date", "date"],
  preTcecCommitteeNo: ["pre_tcec_committee_no", "text"],
  adVettingDate: ["ad_vetting_date", "date"],
  rqaApprovalDate: ["rqa_approval_date", "date"],
  ifaSentDate: ["ifa_sent_date", "date"],
  ifaFinalDate: ["ifa_final_date", "date"],
  cfaSentDate: ["cfa_sent_date", "date"],
  cfaDate: ["cfa_date", "date"],
  gemUndertakingDate: ["gem_undertaking_date", "date"],
  rfpVettingInitiationDate: ["rfp_vetting_initiation_date", "date"],
  rfpVettingApprovalDate: ["rfp_vetting_approval_date", "date"],
  tenderLive: ["tender_live", "text"],
  bidDate: ["bid_date", "date"],
  bidOpeningDate: ["bid_opening_date", "date"],
  bidOpened: ["bid_opened", "text"],
  refloat: ["refloat", "text"],
  postTcecDate: ["post_tcec_date", "date"],
  postTcecMinutesDate: ["post_tcec_minutes_date", "date"],
  postTcecCommitteeNumber: ["post_tcec_committee_number", "text"],
  refloatBiddingDate: ["refloat_bidding_date", "date"],
  refloatBidOpeningDate: ["refloat_bid_opening_date", "date"],
  refloatPostTcecDate: ["refloat_post_tcec_date", "date"],
  refloatPostTcecMinutesDate: ["refloat_post_tcec_minutes_date", "date"],
  refloatPostTcecCommitteeNo: ["refloat_post_tcec_committee_no", "text"],
  rst: ["rst", "text"],
  biddingStageOver: ["bidding_stage_over", "text"],
  cncDate: ["cnc_date", "date"],
  cncApprovalDate: ["cnc_approval_date", "date"],
  noOfSo: ["no_of_so", "integer"],
  soNo: ["so_no", "text"],
  gemSoNo: ["gem_so_no", "text"],
  soDate: ["so_date", "date"],
  soValueCapital: ["so_value_capital", "number"],
  soValueRevenue: ["so_value_revenue", "number"],
  dpDate: ["dp_date", "date"],
  firm: ["firm", "text"],
  bgValidityDate: ["bg_validity_date", "date"],
  dpExtension: ["dp_extension", "text"],
  dpExtensionCount: ["dp_extension_count", "integer"],
  ld: ["ld", "text"],
  revisedDp: ["revised_dp", "date"],
  materialReceiptDate: ["material_receipt_date", "date"],
  billSentForPaymentDate: ["bill_sent_for_payment_date", "date"],
  paymentDate: ["payment_date", "date"],
  paymentMode: ["payment_mode", "text"],
  bgReturnDate: ["bg_return_date", "date"],
  demandCancelled: ["demand_cancelled", "text"],
  soCancelled: ["so_cancelled", "text"],
  soCancelledDate: ["so_cancelled_date", "date"],
  currentMilestone: ["current_milestone", "text"],
} as const satisfies Record<string, readonly [string, ValueKind]>;

const supplyOrderFields = {
  soNo: ["so_no", "text"],
  gemSoNo: ["gem_so_no", "text"],
  soDate: ["so_date", "date"],
  soValueCapital: ["so_value_capital", "number"],
  soValueRevenue: ["so_value_revenue", "number"],
  dpDate: ["dp_date", "date"],
  firm: ["firm", "text"],
  bgValidityDate: ["bg_validity_date", "date"],
  dpExtension: ["dp_extension", "text"],
  dpExtensionCount: ["dp_extension_count", "integer"],
  ld: ["ld", "text"],
  revisedDp: ["revised_dp", "date"],
  materialReceiptDate: ["material_receipt_date", "date"],
  billSentForPaymentDate: ["bill_sent_for_payment_date", "date"],
  paymentDate: ["payment_date", "date"],
  paymentMode: ["payment_mode", "text"],
  bgReturnDate: ["bg_return_date", "date"],
  demandCancelled: ["demand_cancelled", "text"],
  soCancelled: ["so_cancelled", "text"],
  soCancelledDate: ["so_cancelled_date", "date"],
} as const satisfies Record<string, readonly [string, ValueKind]>;

type FileRow = Record<string, unknown> & {
  id: string;
  division: string | null;
  created_at: Date | string;
};

type FileChildren = {
  invitedFirms: Map<string, FirmDetail[]>;
  bidderFirms: Map<string, FirmDetail[]>;
  supplyOrders: Map<string, SupplyOrderDetail[]>;
  remarks: Map<string, FileRemark[]>;
  completedMilestones: Map<string, string[]>;
};

function toDbValue(value: unknown, kind: ValueKind) {
  if (kind === "date") return toDbDate(value);
  if (kind === "number") return toDbNumber(value);
  if (kind === "integer") return toDbInteger(value);
  return toDbText(value);
}

function fromDbValue(value: unknown, kind: ValueKind) {
  if (kind === "date") return fromDbDate(value);
  return fromDbText(value);
}

function readArray(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be an array.`);
  return value as Record<string, unknown>[];
}

async function resolveDivisionId(client: PoolClient, division: unknown) {
  const name = toDbText(division);
  if (!name) return null;

  const result = await client.query<{ id: string }>(
    "select id from divisions where lower(name) = lower($1)",
    [name],
  );
  if (!result.rows[0]) throw new HttpError(400, `Division not found: ${name}`);
  return result.rows[0].id;
}

function mapFile(row: FileRow, children: FileChildren): FileRecord {
  const file = {
    id: row.id,
    division: fromDbText(row.division),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    invitedFirms: children.invitedFirms.get(row.id) ?? [],
    bidderFirms: children.bidderFirms.get(row.id) ?? [],
    supplyOrders: children.supplyOrders.get(row.id) ?? [],
    remarks: children.remarks.get(row.id) ?? [],
    completedMilestones: children.completedMilestones.get(row.id) ?? [],
  } as FileRecord;

  for (const [frontendKey, [column, kind]] of Object.entries(fileFields)) {
    (file as Record<string, unknown>)[frontendKey] = fromDbValue(row[column], kind);
  }

  return file;
}

async function loadChildren(fileIds: string[]): Promise<FileChildren> {
  const children: FileChildren = {
    invitedFirms: new Map(),
    bidderFirms: new Map(),
    supplyOrders: new Map(),
    remarks: new Map(),
    completedMilestones: new Map(),
  };
  if (!fileIds.length) return children;

  const firmRows = await pool.query<{
    file_id: string;
    firm_type: "invited" | "bidder";
    firm_name: string | null;
    city: string | null;
    email_id: string | null;
  }>(
    `select file_id, firm_type, firm_name, city, email_id
     from file_firms
     where file_id = any($1::uuid[])
     order by sort_order asc, id asc`,
    [fileIds],
  );
  for (const row of firmRows.rows) {
    const firm = {
      firmName: fromDbText(row.firm_name),
      city: fromDbText(row.city),
      emailId: fromDbText(row.email_id),
    };
    const map = row.firm_type === "invited" ? children.invitedFirms : children.bidderFirms;
    map.set(row.file_id, [...(map.get(row.file_id) ?? []), firm]);
  }

  const orderRows = await pool.query<Record<string, unknown> & { file_id: string }>(
    `select *
     from supply_orders
     where file_id = any($1::uuid[])
     order by sort_order asc, id asc`,
    [fileIds],
  );
  for (const row of orderRows.rows) {
    const order: SupplyOrderDetail = {};
    for (const [frontendKey, [column, kind]] of Object.entries(supplyOrderFields)) {
      (order as Record<string, unknown>)[frontendKey] = fromDbValue(row[column], kind);
    }
    children.supplyOrders.set(row.file_id, [...(children.supplyOrders.get(row.file_id) ?? []), order]);
  }

  const remarkRows = await pool.query<{
    id: string;
    file_id: string;
    section: string;
    text: string;
    created_at: Date | string;
  }>(
    `select id, file_id, section, text, created_at
     from file_remarks
     where file_id = any($1::uuid[])
     order by created_at asc, id asc`,
    [fileIds],
  );
  for (const row of remarkRows.rows) {
    const remark = {
      id: row.id,
      section: row.section,
      text: row.text,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
    children.remarks.set(row.file_id, [...(children.remarks.get(row.file_id) ?? []), remark]);
  }

  const milestoneRows = await pool.query<{ file_id: string; milestone: string }>(
    `select file_id, milestone
     from file_completed_milestones
     where file_id = any($1::uuid[])
     order by milestone asc`,
    [fileIds],
  );
  for (const row of milestoneRows.rows) {
    children.completedMilestones.set(row.file_id, [
      ...(children.completedMilestones.get(row.file_id) ?? []),
      row.milestone,
    ]);
  }

  return children;
}

export async function loadFiles(whereSql = "", values: unknown[] = []) {
  const result = await pool.query<FileRow>(
    `select f.*, d.name as division
     from files f
     left join divisions d on d.id = f.division_id
     ${whereSql}
     order by f.created_at desc`,
    values,
  );
  const children = await loadChildren(result.rows.map((row) => row.id));
  return result.rows.map((row) => mapFile(row, children));
}

function readQueryString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readQueryBoolean(value: unknown) {
  return value === "true" || value === true;
}

function readQueryList(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readSearchParams(query: Record<string, unknown>): FileSearchParams {
  return {
    yearFilter: readQueryString(query.yearFilter),
    indentor: readQueryString(query.indentor),
    divisionFilter: readQueryString(query.divisionFilter),
    valueFrom: readQueryString(query.valueFrom),
    valueTo: readQueryString(query.valueTo),
    capitalOnly: readQueryBoolean(query.capitalOnly),
    revenueOnly: readQueryBoolean(query.revenueOnly),
    description: readQueryString(query.description),
    firm: readQueryString(query.firm),
    selectedModes: readQueryList(query.selectedModes),
    selectedFileTypes: readQueryList(query.selectedFileTypes),
    highValue: readQueryBoolean(query.highValue),
    gte: readQueryBoolean(query.gte),
    ad: readQueryBoolean(query.ad),
    rqa: readQueryBoolean(query.rqa),
    ifaFilter: readQueryBoolean(query.ifaFilter),
    psbFilter: readQueryBoolean(query.psbFilter),
    bgFilter: readQueryBoolean(query.bgFilter),
    rfpVettingFilter: readQueryBoolean(query.rfpVettingFilter),
    refloat: readQueryBoolean(query.refloat),
    cnc: readQueryBoolean(query.cnc),
    tcec: readQueryBoolean(query.tcec),
    dpFrom: readQueryString(query.dpFrom),
    dpTo: readQueryString(query.dpTo),
    rstFilter: readQueryBoolean(query.rstFilter),
    demandCancelledFilter: readQueryBoolean(query.demandCancelledFilter),
    soCancelledFilter: readQueryBoolean(query.soCancelledFilter),
    freeText: readQueryString(query.freeText),
    freeDate: readQueryString(query.freeDate),
    dashboardFilter: readQueryString(query.dashboardFilter),
    sortColumnKey: readQueryString(query.sortColumnKey),
    sortDirection: readQueryString(query.sortDirection) === "desc" ? "desc" : "asc",
    divisionWiseSort: readQueryBoolean(query.divisionWiseSort),
  };
}

function buildFileInsert(body: Record<string, unknown>, divisionId: string | null) {
  const columns = ["division_id"];
  const values: unknown[] = [divisionId];
  const placeholders = ["$1"];

  for (const [frontendKey, [column, kind]] of Object.entries(fileFields)) {
    if (!(frontendKey in body)) continue;
    values.push(toDbValue(body[frontendKey], kind));
    columns.push(column);
    placeholders.push(`$${values.length}`);
  }

  return { columns, values, placeholders };
}

function buildFileUpdate(body: Record<string, unknown>, divisionId: string | null | undefined) {
  const fields: string[] = [];
  const values: unknown[] = [];

  const addField = (column: string, value: unknown) => {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  };

  if (divisionId !== undefined) addField("division_id", divisionId);
  for (const [frontendKey, [column, kind]] of Object.entries(fileFields)) {
    if (!(frontendKey in body)) continue;
    addField(column, toDbValue(body[frontendKey], kind));
  }

  return { fields, values };
}

function hasFilledValue(row: Record<string, unknown>) {
  return Object.values(row).some((value) => String(value ?? "").trim());
}

async function replaceFirms(
  client: PoolClient,
  fileId: string,
  firmType: "invited" | "bidder",
  rows: Record<string, unknown>[],
) {
  await client.query("delete from file_firms where file_id = $1 and firm_type = $2", [fileId, firmType]);
  let sortOrder = 0;
  for (const row of rows.filter(hasFilledValue)) {
    await client.query(
      `insert into file_firms (file_id, firm_type, firm_name, city, email_id, sort_order)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        fileId,
        firmType,
        toDbText(row.firmName),
        toDbText(row.city),
        toDbText(row.emailId),
        sortOrder++,
      ],
    );
  }
}

async function replaceSupplyOrders(client: PoolClient, fileId: string, rows: Record<string, unknown>[]) {
  await client.query("delete from supply_orders where file_id = $1", [fileId]);
  let sortOrder = 0;
  for (const row of rows.filter(hasFilledValue)) {
    const columns = ["file_id", "sort_order"];
    const values: unknown[] = [fileId, sortOrder++];
    const placeholders = ["$1", "$2"];
    for (const [frontendKey, [column, kind]] of Object.entries(supplyOrderFields)) {
      values.push(toDbValue(row[frontendKey], kind));
      columns.push(column);
      placeholders.push(`$${values.length}`);
    }
    await client.query(
      `insert into supply_orders (${columns.join(", ")})
       values (${placeholders.join(", ")})`,
      values,
    );
  }
}

async function replaceRemarks(client: PoolClient, fileId: string, rows: Record<string, unknown>[]) {
  await client.query("delete from file_remarks where file_id = $1", [fileId]);
  for (const row of rows.filter(hasFilledValue)) {
    const section = toDbText(row.section);
    const text = toDbText(row.text);
    if (!section || !text) continue;
    await client.query(
      `insert into file_remarks (file_id, section, text, created_at)
       values ($1, $2, $3, coalesce($4::timestamptz, now()))`,
      [fileId, section, text, toDbText(row.createdAt)],
    );
  }
}

async function replaceCompletedMilestones(
  client: PoolClient,
  fileId: string,
  milestones: unknown[],
) {
  await client.query("delete from file_completed_milestones where file_id = $1", [fileId]);
  for (const milestone of milestones) {
    const value = toDbText(milestone);
    if (!value) continue;
    await client.query(
      `insert into file_completed_milestones (file_id, milestone)
       values ($1, $2)
       on conflict do nothing`,
      [fileId, value],
    );
  }
}

async function replaceNestedFileData(
  client: PoolClient,
  fileId: string,
  body: Record<string, unknown>,
  onlyProvided: boolean,
) {
  const invitedFirms = readArray(body.invitedFirms, "invitedFirms");
  const bidderFirms = readArray(body.bidderFirms, "bidderFirms");
  const supplyOrders = readArray(body.supplyOrders, "supplyOrders");
  const remarks = readArray(body.remarks, "remarks");
  const completedMilestones = body.completedMilestones;

  if (!onlyProvided || invitedFirms) await replaceFirms(client, fileId, "invited", invitedFirms ?? []);
  if (!onlyProvided || bidderFirms) await replaceFirms(client, fileId, "bidder", bidderFirms ?? []);
  if (!onlyProvided || supplyOrders) await replaceSupplyOrders(client, fileId, supplyOrders ?? []);
  if (!onlyProvided || remarks) await replaceRemarks(client, fileId, remarks ?? []);
  if (!onlyProvided || completedMilestones !== undefined) {
    if (completedMilestones !== undefined && !Array.isArray(completedMilestones)) {
      throw new HttpError(400, "completedMilestones must be an array.");
    }
    await replaceCompletedMilestones(client, fileId, completedMilestones ?? []);
  }
}

filesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (typeof request.query.year === "string" && request.query.year.trim()) {
      values.push(request.query.year.trim());
      conditions.push(`f.year = $${values.length}`);
    }
    if (typeof request.query.division === "string" && request.query.division.trim()) {
      values.push(request.query.division.trim());
      conditions.push(`lower(d.name) = lower($${values.length})`);
    }

    const whereSql = conditions.length ? `where ${conditions.join(" and ")}` : "";
    response.json({ files: await loadFiles(whereSql, values) });
  }),
);

filesRouter.get(
  "/search",
  asyncHandler(async (request, response) => {
    const files = await loadFiles();
    const results = searchFiles(files, readSearchParams(request.query));
    response.json({ files: results, total: results.length });
  }),
);

filesRouter.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = requireParam(request.params.id, "id");
    const files = await loadFiles("where f.id = $1", [id]);
    if (!files[0]) throw new HttpError(404, "File not found.");
    response.json({ file: files[0] });
  }),
);

filesRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const body = requireObjectBody(request.body);
    const client = await pool.connect();
    try {
      await client.query("begin");
      const divisionId = await resolveDivisionId(client, body.division);
      const insert = buildFileInsert(body, divisionId);
      const result = await client.query<{ id: string }>(
        `insert into files (${insert.columns.join(", ")})
         values (${insert.placeholders.join(", ")})
         returning id`,
        insert.values,
      );
      const fileId = result.rows[0].id;
      await replaceNestedFileData(client, fileId, body, false);
      await client.query("commit");

      const files = await loadFiles("where f.id = $1", [fileId]);
      response.status(201).json({ file: files[0] });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }),
);

filesRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const body = requireObjectBody(request.body);
    const id = requireParam(request.params.id, "id");
    const client = await pool.connect();
    try {
      await client.query("begin");
      const existing = await client.query("select id from files where id = $1", [id]);
      if (existing.rowCount === 0) throw new HttpError(404, "File not found.");
      const divisionId = "division" in body ? await resolveDivisionId(client, body.division) : undefined;
      const update = buildFileUpdate(body, divisionId);

      if (update.fields.length) {
        update.values.push(id);
        const result = await client.query(
          `update files
           set ${update.fields.join(", ")}
           where id = $${update.values.length}`,
          update.values,
        );
        if (result.rowCount === 0) throw new HttpError(404, "File not found.");
      }

      await replaceNestedFileData(client, id, body, true);
      if (!update.fields.length && Object.keys(body).length === 0) {
        throw new HttpError(400, "No file fields provided.");
      }

      await client.query("commit");
      const files = await loadFiles("where f.id = $1", [id]);
      if (!files[0]) throw new HttpError(404, "File not found.");
      response.json({ file: files[0] });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }),
);

filesRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = requireParam(request.params.id, "id");
    const files = await loadFiles("where f.id = $1", [id]);
    if (!files[0]) throw new HttpError(404, "File not found.");

    await pool.query("delete from files where id = $1", [id]);
    response.json({ deleted: true, file: files[0] });
  }),
);
