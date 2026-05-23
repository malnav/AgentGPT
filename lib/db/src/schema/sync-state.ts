import { createInsertSchema } from "drizzle-zod";
import { bigint, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const syncStateTable = pgTable(
  "sync_state",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    accountId: text("account_id").notNull(),
    mailbox: text("mailbox").notNull(),
    provider: text("provider", { enum: ["gmail", "imap"] }).notNull(),
    gmailHistoryId: text("gmail_history_id"),
    gmailPageToken: text("gmail_page_token"),
    imapUidValidity: bigint("imap_uid_validity", { mode: "number" }),
    imapHighestUid: integer("imap_highest_uid"),
    imapHighestModSeq: text("imap_highest_modseq"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("sync_state_account_mailbox_idx").on(table.accountId, table.mailbox)],
);

export const insertSyncStateSchema = createInsertSchema(syncStateTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSyncState = z.infer<typeof insertSyncStateSchema>;
export type SyncState = typeof syncStateTable.$inferSelect;
