import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { db, messagesTable } from "@workspace/db";

const router = Router();
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

type CursorPayload = {
  internalTsUtc: string;
  providerMessageId: string;
};

function decodeCursor(value: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as CursorPayload;
    if (!parsed.internalTsUtc || !parsed.providerMessageId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

router.get("/messages", async (req: Request, res: Response) => {
  const limitRaw = Number(req.query.limit ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), MAX_LIMIT) : DEFAULT_LIMIT;

  const accountIds = String(req.query.accounts ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const mailbox = typeof req.query.mailbox === "string" ? req.query.mailbox.trim() : undefined;
  const label = typeof req.query.label === "string" ? req.query.label.trim() : undefined;
  const unread = req.query.unread === "true" ? true : req.query.unread === "false" ? false : undefined;
  const startDate = typeof req.query.startDate === "string" ? new Date(req.query.startDate) : undefined;
  const endDate = typeof req.query.endDate === "string" ? new Date(req.query.endDate) : undefined;

  if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
    return res.status(400).json({ error: "Invalid startDate/endDate" });
  }

  const conditions = [] as any[];

  if (accountIds.length > 0) {
    conditions.push(inArray(messagesTable.accountId, accountIds));
  }
  if (mailbox) {
    conditions.push(eq(messagesTable.mailbox, mailbox));
  }
  if (label) {
    conditions.push(sql`${label} = ANY(${messagesTable.labelsOrFolders})`);
  }
  if (unread !== undefined) {
    conditions.push(eq(messagesTable.unread, unread));
  }
  if (startDate) {
    conditions.push(sql`${messagesTable.internalTsUtc} >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`${messagesTable.internalTsUtc} <= ${endDate}`);
  }

  if (typeof req.query.cursor === "string") {
    const decoded = decodeCursor(req.query.cursor);
    if (!decoded) {
      return res.status(400).json({ error: "Invalid cursor" });
    }

    const cursorTs = new Date(decoded.internalTsUtc);
    if (Number.isNaN(cursorTs.getTime())) {
      return res.status(400).json({ error: "Invalid cursor timestamp" });
    }

    conditions.push(
      or(
        lt(messagesTable.internalTsUtc, cursorTs),
        and(eq(messagesTable.internalTsUtc, cursorTs), lt(messagesTable.providerMessageId, decoded.providerMessageId)),
      ),
    );
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: messagesTable.id,
      account_id: messagesTable.accountId,
      thread_id: messagesTable.threadId,
      provider_message_id: messagesTable.providerMessageId,
      mailbox: messagesTable.mailbox,
      labels_or_folders: messagesTable.labelsOrFolders,
      unread: messagesTable.unread,
      internal_ts_utc: messagesTable.internalTsUtc,
      subject: messagesTable.subject,
      from_address: messagesTable.fromAddress,
      snippet: messagesTable.snippet,
      utc_date: sql<string>`to_char(${messagesTable.internalTsUtc} at time zone 'UTC', 'YYYY-MM-DD')`,
      local_date: sql<string>`to_char(${messagesTable.internalTsUtc}, 'YYYY-MM-DD')`,
    })
    .from(messagesTable)
    .where(whereClause)
    .orderBy(desc(messagesTable.internalTsUtc), desc(messagesTable.providerMessageId))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = pageRows.at(-1);

  const next_cursor = hasMore && lastRow?.internal_ts_utc
    ? encodeCursor({ internalTsUtc: lastRow.internal_ts_utc.toISOString(), providerMessageId: lastRow.provider_message_id })
    : null;

  return res.json({
    rows: pageRows,
    next_cursor,
  });
});

export default router;
