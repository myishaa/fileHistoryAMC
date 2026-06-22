import type { Division, FileRecord, SupplyOrderDetail } from "@/lib/files-store";
import { getInrAmount } from "@/lib/money";

export type MmgSummaryFieldConfig = {
  key: string;
  label: string;
  enabled: boolean;
};

export type MmgSummaryFieldOption = {
  key: string;
  label: string;
  group: string;
};

export type MmgSummaryRow = {
  key: string;
  label: string;
  value: string;
};

export const mmgSummaryFieldOptions: MmgSummaryFieldOption[] = [
  { key: "allocatedCapital", label: "Allocated Capital", group: "Finance" },
  { key: "allocatedRevenue", label: "Allocated Revenue", group: "Finance" },
  { key: "intendedCapital", label: "Intended Capital (Value / %)", group: "Finance" },
  { key: "intendedRevenue", label: "Intended Revenue (Value / %)", group: "Finance" },
  { key: "bookedCapital", label: "Booked Capital (Value / %)", group: "Finance" },
  { key: "bookedRevenue", label: "Booked Revenue (Value / %)", group: "Finance" },
  { key: "committedCapital", label: "Committed Capital (Value / %)", group: "Finance" },
  { key: "committedRevenue", label: "Committed Revenue (Value / %)", group: "Finance" },
  { key: "totalDemands", label: "Total No. of demands", group: "Demand summary" },
  { key: "nonTcecDemands", label: "Non-TCEC demands", group: "Demand summary" },
  { key: "tcecDemands", label: "TCEC demands", group: "Demand summary" },
  { key: "obm", label: "OBM", group: "Modes" },
  { key: "pbm", label: "PBM", group: "Modes" },
  { key: "lpc", label: "LPC", group: "Modes" },
  { key: "sbm", label: "SBM", group: "Modes" },
  { key: "lbm", label: "LBM", group: "Modes" },
  { key: "scrutinyCompleted", label: "Scrutiny completed", group: "Scrutiny and vetting" },
  {
    key: "filesWithUsersAfterScrutiny",
    label: "Files with users after scrutiny",
    group: "Scrutiny and vetting",
  },
  { key: "scrutinyToBeDone", label: "Scrutiny to be done", group: "Scrutiny and vetting" },
  { key: "tcecCompleted", label: "TCEC completed", group: "Scrutiny and vetting" },
  {
    key: "tcecFilesWithUserAfterScrutiny",
    label: "TCEC files with user after scrutiny",
    group: "Scrutiny and vetting",
  },
  {
    key: "tcecFilesWithMmgForMeeting",
    label: "TCEC files with MMG for conducting meeting",
    group: "Scrutiny and vetting",
  },
  { key: "highValueDemands", label: "High value demands (>3Cr)", group: "Scrutiny and vetting" },
  {
    key: "highValueReviewCompleted",
    label: "High value review completed",
    group: "Scrutiny and vetting",
  },
  { key: "adVettingDemands", label: "AD vetting demands", group: "Scrutiny and vetting" },
  { key: "adVettingCompleted", label: "AD vetting completed", group: "Scrutiny and vetting" },
  { key: "adVettingRemaining", label: "AD vetting remaining", group: "Scrutiny and vetting" },
  { key: "rqaDemands", label: "R&QA demands", group: "Scrutiny and vetting" },
  { key: "rqaVettingDone", label: "R&QA vetting done", group: "Scrutiny and vetting" },
  { key: "rqaVettingRemaining", label: "R&QA vetting remaining", group: "Scrutiny and vetting" },
  { key: "controllingDone", label: "Controlling done", group: "Approvals" },
  { key: "controllingRemaining", label: "Controlling remaining", group: "Approvals" },
  { key: "filesWithIfa", label: "Files with IFA", group: "Approvals" },
  { key: "ifaApprovalDone", label: "IFA approval done", group: "Approvals" },
  { key: "cfaApprovalDone", label: "CFA approval done", group: "Approvals" },
  { key: "cfaApprovalRemaining", label: "CFA approval remaining", group: "Approvals" },
  { key: "liveBids", label: "Live bids", group: "Bidding and S.O." },
  { key: "bidsToBeOpened", label: "Bids to be opened", group: "Bidding and S.O." },
  { key: "bidsOverdueToOpen", label: "Bids overdue to open", group: "Bidding and S.O." },
  {
    key: "postTcecEvaluationInProgress",
    label: "Post TCEC evaluation in progress",
    group: "Bidding and S.O.",
  },
  { key: "postTcecCompleted", label: "Post TCEC completed", group: "Bidding and S.O." },
  { key: "cncDue", label: "CNC due", group: "Bidding and S.O." },
  { key: "cncCompleted", label: "CNC completed", group: "Bidding and S.O." },
  { key: "soPlaced", label: "S.O. placed", group: "Bidding and S.O." },
  { key: "deliveriesDueThisMonth", label: "No. of deliveries due this month", group: "Delivery" },
  {
    key: "deliveriesCompletedThisMonth",
    label: "No. of deliveries completed this month",
    group: "Delivery",
  },
  { key: "totalIrSentToUser", label: "Total IR sent to user", group: "Delivery" },
  { key: "totalIrReceived", label: "Total IR received", group: "Delivery" },
  { key: "totalPaymentDueThisMonth", label: "Total payment due this month", group: "Payment" },
  {
    key: "billsSentForCurrentMonthDeliveries",
    label: "Bills sent for current month deliveries",
    group: "Payment",
  },
  {
    key: "paymentDueFromPreviousMonths",
    label: "Payment due from previous months",
    group: "Payment",
  },
  {
    key: "billsSentForPreviousMonthsDeliveries",
    label: "Bills sent for previous months deliveries",
    group: "Payment",
  },
  { key: "totalBillsSentThisMonth", label: "Total bills sent this month", group: "Payment" },
  { key: "totalPaymentsMadeThisYear", label: "Total payments made this year", group: "Payment" },
  {
    key: "totalExpectedPaymentRemainingThisYear",
    label: "Total expected payment remaining this year",
    group: "Payment",
  },
  { key: "liveFilesThisYear", label: "Number of live files of this year", group: "Files" },
  { key: "closedFilesThisYear", label: "Number of closed files of this year", group: "Files" },
  {
    key: "liveFilesPreviousYears",
    label: "Number of live files from previous years",
    group: "Files",
  },
  { key: "cancelledDemands", label: "Cancelled demands", group: "Additional" },
  { key: "soCancelled", label: "S.O. cancelled", group: "Additional" },
  { key: "deliveriesOverdue", label: "Deliveries overdue", group: "Additional" },
  { key: "paymentsOverdue", label: "Payments overdue", group: "Additional" },
  { key: "bgPending", label: "BG pending", group: "Additional" },
  { key: "bgReceived", label: "BG received", group: "Additional" },
  {
    key: "totalSoValuePlacedThisFy",
    label: "Total S.O. value placed this FY",
    group: "Additional",
  },
  { key: "totalUnpaidSoValue", label: "Total unpaid S.O. value", group: "Additional" },
  {
    key: "filesClosedPercentage",
    label: "Files closed percentage of total demands",
    group: "Additional",
  },
];

const optionByKey = new Map(mmgSummaryFieldOptions.map((option) => [option.key, option]));

export function getDefaultMmgSummaryFields() {
  return mmgSummaryFieldOptions.map((option) => ({
    key: option.key,
    label: option.label,
    enabled: true,
  }));
}

export function normalizeMmgSummaryFields(value: unknown): MmgSummaryFieldConfig[] {
  if (!Array.isArray(value) || value.length === 0) return getDefaultMmgSummaryFields();
  const byKey = new Map<string, MmgSummaryFieldConfig>();
  value.forEach((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.key !== "string" || !optionByKey.has(candidate.key)) return;
    const option = optionByKey.get(candidate.key);
    byKey.set(candidate.key, {
      key: candidate.key,
      label:
        typeof candidate.label === "string" && candidate.label.trim()
          ? candidate.label.trim()
          : (option?.label ?? candidate.key),
      enabled: candidate.enabled !== false,
    });
  });
  return mmgSummaryFieldOptions.map(
    (option) =>
      byKey.get(option.key) ?? {
        key: option.key,
        label: option.label,
        enabled: true,
      },
  );
}

export function buildMmgSummaryRows({
  files,
  divisions,
  previousYearFiles,
  config,
  financialYear,
}: {
  files: FileRecord[];
  divisions: Division[];
  previousYearFiles?: FileRecord[];
  config: MmgSummaryFieldConfig[];
  financialYear: string;
}): MmgSummaryRow[] {
  const values = getMmgSummaryValues(files, divisions, previousYearFiles ?? [], financialYear);
  return normalizeMmgSummaryFields(config)
    .filter((field) => field.enabled)
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: values[field.key] ?? "0",
    }));
}

function getMmgSummaryValues(
  files: FileRecord[],
  divisions: Division[],
  previousYearFiles: FileRecord[],
  financialYear: string,
) {
  const allocatedCapital = divisions.reduce(
    (sum, division) => sum + (parseAmount(division.allocatedCapital) ?? 0),
    0,
  );
  const allocatedRevenue = divisions.reduce(
    (sum, division) => sum + (parseAmount(division.allocatedRevenue) ?? 0),
    0,
  );
  const nonCancelledFiles = files.filter((file) => !isCancelledDemand(file));
  const currentMonthKey = getCurrentMonthKey();
  const fyRange = getFinancialYearRange(financialYear);
  const intendedCapital = sumFiles(nonCancelledFiles, (file) =>
    hasFilledString(file.imms) ? 0 : getFileAmount(file, "capital"),
  );
  const intendedRevenue = sumFiles(nonCancelledFiles, (file) =>
    hasFilledString(file.imms) ? 0 : getFileAmount(file, "revenue"),
  );
  const committedCapital = sumOrders(files, ({ file, order }) =>
    isCancelledOrder(file, order) ? 0 : getOrderAmount(file, order, "capital"),
  );
  const committedRevenue = sumOrders(files, ({ file, order }) =>
    isCancelledOrder(file, order) ? 0 : getOrderAmount(file, order, "revenue"),
  );
  const bookedCapital = sumFiles(nonCancelledFiles, (file) =>
    hasAnyOrderAmount(file, "capital") ? 0 : getFileAmount(file, "capital"),
  );
  const bookedRevenue = sumFiles(nonCancelledFiles, (file) =>
    hasAnyOrderAmount(file, "revenue") ? 0 : getFileAmount(file, "revenue"),
  );
  const orders = effectiveOrderEntries(files);
  const liveFiles = files.filter((file) => !isCancelledDemand(file) && !isFileClosed(file));
  const closedFiles = files.filter(isFileClosed);
  const livePreviousYearFiles = previousYearFiles.filter(
    (file) => !isCancelledDemand(file) && !isFileClosed(file),
  );

  const values: Record<string, string> = {
    allocatedCapital: formatMoney(allocatedCapital),
    allocatedRevenue: formatMoney(allocatedRevenue),
    intendedCapital: formatValuePercent(intendedCapital, allocatedCapital),
    intendedRevenue: formatValuePercent(intendedRevenue, allocatedRevenue),
    bookedCapital: formatValuePercent(bookedCapital, allocatedCapital),
    bookedRevenue: formatValuePercent(bookedRevenue, allocatedRevenue),
    committedCapital: formatValuePercent(committedCapital, allocatedCapital),
    committedRevenue: formatValuePercent(committedRevenue, allocatedRevenue),
    totalDemands: formatCount(files.length),
    nonTcecDemands: formatCount(files.filter((file) => isNo(file.tcec)).length),
    tcecDemands: formatCount(files.filter((file) => isYes(file.tcec)).length),
    obm: countMode(files, "OBM"),
    pbm: countMode(files, "PBM"),
    lpc: countMode(files, "LPC"),
    sbm: countMode(files, "SBM"),
    lbm: countMode(files, "LBM"),
    scrutinyCompleted: countFiles(files, (file) => hasFilledString(file.scrutinyCompletionDate)),
    filesWithUsersAfterScrutiny: countFiles(
      files,
      (file) => !hasFilledString(file.scrutinyCompletionDate),
    ),
    scrutinyToBeDone: countFiles(files, (file) => !hasFilledString(file.scrutinyDate)),
    tcecCompleted: countFiles(
      files,
      (file) => isYes(file.tcec) && hasFilledString(file.preTcecMinutesDate),
    ),
    tcecFilesWithUserAfterScrutiny: countFiles(
      files,
      (file) =>
        isYes(file.tcec) &&
        hasFilledString(file.scrutinyCompletionDate) &&
        !hasFilledString(file.preTcecDate),
    ),
    tcecFilesWithMmgForMeeting: countFiles(
      files,
      (file) =>
        isYes(file.tcec) &&
        hasFilledString(file.preTcecDate) &&
        !hasFilledString(file.preTcecMinutesDate),
    ),
    highValueDemands: countFiles(files, (file) => isYes(file.highValue)),
    highValueReviewCompleted: countFiles(files, (file) =>
      hasFilledString(file.highValueMinutesDate),
    ),
    adVettingDemands: countFiles(files, (file) => isYes(file.ad)),
    adVettingCompleted: countFiles(files, (file) => hasFilledString(file.adVettingDate)),
    adVettingRemaining: countFiles(
      files,
      (file) => isYes(file.ad) && !hasFilledString(file.adVettingDate),
    ),
    rqaDemands: countFiles(files, (file) => isYes(file.rqa)),
    rqaVettingDone: countFiles(files, (file) => hasFilledString(file.rqaApprovalDate)),
    rqaVettingRemaining: countFiles(
      files,
      (file) => isYes(file.rqa) && !hasFilledString(file.rqaApprovalDate),
    ),
    controllingDone: countFiles(
      files,
      (file) => hasFilledString(file.imms) || hasFilledString(file.immsDate),
    ),
    controllingRemaining: countFiles(
      files,
      (file) => !hasFilledString(file.imms) && !hasFilledString(file.immsDate),
    ),
    filesWithIfa: countFiles(
      files,
      (file) => hasFilledString(file.ifaSentDate) && !hasFilledString(file.ifaFinalDate),
    ),
    ifaApprovalDone: countFiles(files, (file) => hasFilledString(file.ifaFinalDate)),
    cfaApprovalDone: countFiles(files, (file) => hasFilledString(file.cfaDate)),
    cfaApprovalRemaining: countFiles(files, (file) => !hasFilledString(file.cfaDate)),
    liveBids: countFiles(files, (file) => isYes(file.tenderLive)),
    bidsToBeOpened: countFiles(files, isBidToBeOpened),
    bidsOverdueToOpen: countFiles(files, isBidOverdueToOpen),
    postTcecEvaluationInProgress: countFiles(
      files,
      (file) =>
        isYes(file.tcec) &&
        hasFilledString(file.postTcecDate) &&
        !hasFilledString(file.postTcecMinutesDate),
    ),
    postTcecCompleted: countFiles(files, (file) => hasFilledString(file.postTcecMinutesDate)),
    cncDue: countFiles(
      files,
      (file) =>
        isYes(file.tcec) &&
        !hasFilledString(file.cncDate) &&
        !hasFilledString(file.cncApprovalDate),
    ),
    cncCompleted: countFiles(files, (file) => hasFilledString(file.cncApprovalDate)),
    soPlaced: countFiles(files, (file) => fileSupplyOrders(file).some(hasSupplyOrderDate)),
    deliveriesDueThisMonth: formatCount(
      orders.filter(
        ({ file, order }) =>
          !isCancelledOrder(file, order) &&
          monthMatches(getDeliveryPeriodDate(order), currentMonthKey) &&
          !hasFilledString(order.materialReceiptDate),
      ).length,
    ),
    deliveriesCompletedThisMonth: formatCount(
      orders.filter(
        ({ file, order }) =>
          !isCancelledOrder(file, order) &&
          monthMatches(order.materialReceiptDate, currentMonthKey),
      ).length,
    ),
    totalIrSentToUser: formatCount(
      orders.filter(
        ({ file, order }) =>
          !isCancelledOrder(file, order) && hasFilledString(order.irPreparationDate),
      ).length,
    ),
    totalIrReceived: formatCount(
      orders.filter(
        ({ file, order }) => !isCancelledOrder(file, order) && hasFilledString(order.irReceiptDate),
      ).length,
    ),
    totalPaymentDueThisMonth: formatCount(
      orders.filter(
        ({ file, order }) =>
          !isCancelledOrder(file, order) &&
          monthMatches(order.materialReceiptDate, currentMonthKey) &&
          !hasFilledString(order.paymentDate),
      ).length,
    ),
    billsSentForCurrentMonthDeliveries: formatCount(
      orders.filter(
        ({ file, order }) =>
          !isCancelledOrder(file, order) &&
          monthMatches(order.materialReceiptDate, currentMonthKey) &&
          hasFilledString(order.billSentForPaymentDate),
      ).length,
    ),
    paymentDueFromPreviousMonths: formatCount(
      orders.filter(
        ({ file, order }) =>
          !isCancelledOrder(file, order) &&
          monthBefore(order.materialReceiptDate, currentMonthKey) &&
          !hasFilledString(order.paymentDate),
      ).length,
    ),
    billsSentForPreviousMonthsDeliveries: formatCount(
      orders.filter(
        ({ file, order }) =>
          !isCancelledOrder(file, order) &&
          monthBefore(order.materialReceiptDate, currentMonthKey) &&
          monthMatches(order.billSentForPaymentDate, currentMonthKey),
      ).length,
    ),
    totalBillsSentThisMonth: formatCount(
      orders.filter(
        ({ file, order }) =>
          !isCancelledOrder(file, order) &&
          monthMatches(order.billSentForPaymentDate, currentMonthKey),
      ).length,
    ),
    totalPaymentsMadeThisYear: formatMoney(
      sumOrders(files, ({ file, order }) =>
        !isCancelledOrder(file, order) && dateInFinancialYear(order.paymentDate, fyRange)
          ? getOrderTotal(file, order)
          : 0,
      ),
    ),
    totalExpectedPaymentRemainingThisYear: formatMoney(
      sumOrders(files, ({ file, order }) =>
        !isCancelledOrder(file, order) &&
        dateInFinancialYear(getDeliveryPeriodDate(order), fyRange) &&
        !hasFilledString(order.materialReceiptDate) &&
        !hasFilledString(order.paymentDate)
          ? getOrderTotal(file, order)
          : 0,
      ),
    ),
    liveFilesThisYear: formatCount(liveFiles.length),
    closedFilesThisYear: formatCount(closedFiles.length),
    liveFilesPreviousYears: formatCount(livePreviousYearFiles.length),
    cancelledDemands: countFiles(files, isCancelledDemand),
    soCancelled: formatCount(orders.filter(({ order }) => isYes(order.soCancelled)).length),
    deliveriesOverdue: formatCount(
      orders.filter(
        ({ file, order }) =>
          !isCancelledOrder(file, order) &&
          Boolean(getDeliveryPeriodDate(order)) &&
          isBeforeToday(getDeliveryPeriodDate(order)) &&
          !hasFilledString(order.materialReceiptDate),
      ).length,
    ),
    paymentsOverdue: formatCount(
      orders.filter(
        ({ file, order }) =>
          !isCancelledOrder(file, order) &&
          monthBefore(order.materialReceiptDate, currentMonthKey) &&
          !hasFilledString(order.paymentDate),
      ).length,
    ),
    bgPending: formatCount(
      orders.filter(
        ({ file, order }) =>
          isYes(file.bg) &&
          !isCancelledOrder(file, order) &&
          hasSupplyOrderDate(order) &&
          !hasFilledString(order.bgValidityDate),
      ).length,
    ),
    bgReceived: formatCount(
      orders.filter(
        ({ file, order }) =>
          isYes(file.bg) && !isCancelledOrder(file, order) && hasFilledString(order.bgValidityDate),
      ).length,
    ),
    totalSoValuePlacedThisFy: formatMoney(
      sumOrders(files, ({ file, order }) =>
        !isCancelledOrder(file, order) && dateInFinancialYear(order.soDate, fyRange)
          ? getOrderTotal(file, order)
          : 0,
      ),
    ),
    totalUnpaidSoValue: formatMoney(
      sumOrders(files, ({ file, order }) =>
        !isCancelledOrder(file, order) && !hasFilledString(order.paymentDate)
          ? getOrderTotal(file, order)
          : 0,
      ),
    ),
    filesClosedPercentage: `${getPercent(closedFiles.length, files.length)}%`,
  };
  return values;
}

function countMode(files: FileRecord[], mode: string) {
  return formatCount(files.filter((file) => file.mode?.trim().toUpperCase() === mode).length);
}

function countFiles(files: FileRecord[], predicate: (file: FileRecord) => boolean) {
  return formatCount(files.filter(predicate).length);
}

function sumFiles(files: FileRecord[], getValue: (file: FileRecord) => number) {
  return files.reduce((sum, file) => sum + getValue(file), 0);
}

function sumOrders(
  files: FileRecord[],
  getValue: (entry: { file: FileRecord; order: SupplyOrderDetail }) => number,
) {
  return effectiveOrderEntries(files).reduce((sum, entry) => sum + getValue(entry), 0);
}

function effectiveOrderEntries(files: FileRecord[]) {
  return files.flatMap((file) => fileSupplyOrders(file).map((order) => ({ file, order })));
}

function fileSupplyOrders(file: FileRecord) {
  const rows =
    file.supplyOrders
      ?.map((row) => ({ ...row }))
      .filter((row) => Object.values(row).some((value) => Boolean(String(value ?? "").trim()))) ??
    [];
  if (rows.length) return rows;
  const legacy: SupplyOrderDetail = {
    soNo: file.soNo,
    gemSoNo: file.gemSoNo,
    soDate: file.soDate,
    soValueCapital: file.soValueCapital,
    soValueRevenue: file.soValueRevenue,
    dpDate: file.dpDate,
    firm: file.firm,
    bgValidityDate: file.bgValidityDate,
    dpExtension: file.dpExtension,
    dpExtensionCount: file.dpExtensionCount,
    ld: file.ld,
    revisedDp: file.revisedDp,
    materialReceiptDate: file.materialReceiptDate,
    irPreparationDate: file.irPreparationDate,
    irReceiptDate: file.irReceiptDate,
    billPreparationDate: file.billPreparationDate,
    billSentForPaymentDate: file.billSentForPaymentDate,
    paymentDate: file.paymentDate,
    paymentMode: file.paymentMode,
    bgReturnDate: file.bgReturnDate,
    demandCancelled: file.demandCancelled,
    soCancelled: file.soCancelled,
    soCancelledDate: file.soCancelledDate,
  };
  return Object.values(legacy).some((value) => Boolean(String(value ?? "").trim())) ? [legacy] : [];
}

function getFileAmount(file: FileRecord, type: "capital" | "revenue") {
  return getInrAmount(type === "capital" ? file.valueCapital : file.valueRevenue, file) ?? 0;
}

function getOrderAmount(file: FileRecord, order: SupplyOrderDetail, type: "capital" | "revenue") {
  return getInrAmount(type === "capital" ? order.soValueCapital : order.soValueRevenue, file) ?? 0;
}

function getOrderTotal(file: FileRecord, order: SupplyOrderDetail) {
  return getOrderAmount(file, order, "capital") + getOrderAmount(file, order, "revenue");
}

function hasAnyOrderAmount(file: FileRecord, type: "capital" | "revenue") {
  return fileSupplyOrders(file).some((order) =>
    hasAmount(type === "capital" ? order.soValueCapital : order.soValueRevenue),
  );
}

function isCancelledDemand(file: FileRecord) {
  return (
    isYes(file.demandCancelled) ||
    isYes(file.soCancelled) ||
    fileSupplyOrders(file).some((order) => isYes(order.demandCancelled) || isYes(order.soCancelled))
  );
}

function isCancelledOrder(file: FileRecord, order: SupplyOrderDetail) {
  return (
    isYes(file.demandCancelled) ||
    isYes(file.soCancelled) ||
    isYes(order.demandCancelled) ||
    isYes(order.soCancelled)
  );
}

function isFileClosed(file: Pick<FileRecord, "completedMilestones">) {
  return Boolean(
    file.completedMilestones?.some(
      (milestone) => normalizeMilestoneName(milestone) === "fileclosed",
    ),
  );
}

function isBidToBeOpened(file: FileRecord) {
  return (
    hasFilledString(file.bidOpeningDate) &&
    !isBeforeToday(file.bidOpeningDate) &&
    !isYes(file.bidOpened) &&
    !isYes(file.biddingStageOver)
  );
}

function isBidOverdueToOpen(file: FileRecord) {
  return (
    hasFilledString(file.bidOpeningDate) &&
    isBeforeToday(file.bidOpeningDate) &&
    !isYes(file.bidOpened) &&
    !isYes(file.biddingStageOver)
  );
}

function getDeliveryPeriodDate(order: SupplyOrderDetail) {
  return getLaterDate(order.dpDate, order.revisedDp);
}

function getLaterDate(first: string | undefined, second: string | undefined) {
  const firstTime = parseDate(first);
  const secondTime = parseDate(second);
  if (firstTime === undefined) return second;
  if (secondTime === undefined) return first;
  return secondTime > firstTime ? second : first;
}

function hasSupplyOrderDate(order: SupplyOrderDetail) {
  return (
    hasFilledString(order.soDate) || hasFilledString(order.soNo) || hasFilledString(order.gemSoNo)
  );
}

function getCurrentMonthKey() {
  return formatLocalDate(new Date()).slice(0, 7);
}

function getFinancialYearRange(financialYear: string) {
  const startYear = readFinancialYearStart(financialYear) ?? new Date().getFullYear();
  return { start: `${startYear}-04-01`, end: `${startYear + 1}-03-31` };
}

function readFinancialYearStart(financialYear: string) {
  const match = financialYear.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function dateInFinancialYear(date: string | undefined, range: { start: string; end: string }) {
  return hasFilledString(date) && date! >= range.start && date! <= range.end;
}

function monthMatches(date: string | undefined, monthKey: string) {
  return hasFilledString(date) && date!.slice(0, 7) === monthKey;
}

function monthBefore(date: string | undefined, monthKey: string) {
  return hasFilledString(date) && date!.slice(0, 7) < monthKey;
}

function isBeforeToday(date: string | undefined) {
  return hasFilledString(date) && date! < formatLocalDate(new Date());
}

function parseDate(date: string | undefined) {
  if (!date) return undefined;
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

function hasFilledString(value: string | undefined) {
  return Boolean(value?.trim());
}

function hasAmount(value: string | undefined) {
  const text = value?.trim();
  return text ? Number(text.replace(/,/g, "")) > 0 : false;
}

function isYes(value: string | undefined) {
  return (value ?? "").trim().toLowerCase() === "yes";
}

function isNo(value: string | undefined) {
  return (value ?? "").trim().toLowerCase() === "no";
}

function normalizeMilestoneName(value: string | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseAmount(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatValuePercent(value: number, total: number) {
  return `${formatMoney(value)} / ${getPercent(value, total)}%`;
}

function getPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 10000) / 100;
}

function formatMoney(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

function formatCount(value: number) {
  return String(value);
}
