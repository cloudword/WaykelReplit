import { pgTable, varchar, text, timestamp, json } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Verification logs for all admin verification actions (auditable)
export const verificationLogs = pgTable("verification_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'transporter' | 'vehicle' | 'driver' | 'document'
  entityId: varchar("entity_id").notNull(),
  action: text("action").notNull(), // 'approved' | 'rejected' | 'flagged' | 'unflagged'
  reason: text("reason"),
  performedBy: varchar("performed_by").notNull(), // admin user id
  performedAt: timestamp("performed_at").defaultNow(),
  meta: json("meta"), // optional: any extra context
});

export type VerificationLog = typeof verificationLogs.$inferSelect;
