import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const messagesTable = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    threadId: text("thread_id"),
    providerMessageId: text("provider_message_id").notNull(),
    mailbox: text("mailbox").notNull(),
    labelsOrFolders: text("labels_or_folders").array().notNull().default(sql`'{}'::text[]`),
    unread: boolean("unread").notNull().default(false),
    internalTsUtc: timestamp("internal_ts_utc", { withTimezone: true }),
    subject: text("subject"),
    fromAddress: text("from_address"),
    snippet: text("snippet"),
  },
  (table) => [
    index("messages_account_mailbox_internalts_desc_idx").on(
      table.accountId,
      table.mailbox,
      table.internalTsUtc.desc(),
    ),
    index("messages_account_thread_idx").on(table.accountId, table.threadId),
    index("messages_unread_partial_idx").on(table.accountId, table.internalTsUtc.desc()).where(sql`${table.unread} = true`),
  ],
);
