import { int, mysqlTable, text, varchar, timestamp, boolean } from "drizzle-orm/mysql-core";

/**
 * Forum Credentials - Store user credentials for accessing forums securely
 * Note: Passwords are encrypted before storage
 */
export const forumCredentials = mysqlTable("forumCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  forumName: varchar("forumName", { length: 255 }).notNull(),
  forumUrl: varchar("forumUrl", { length: 500 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  // Password is encrypted with AES-256
  encryptedPassword: text("encryptedPassword").notNull(),
  // IV for encryption (stored as hex)
  encryptionIv: varchar("encryptionIv", { length: 32 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastUsed: timestamp("lastUsed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ForumCredential = typeof forumCredentials.$inferSelect;
export type InsertForumCredential = typeof forumCredentials.$inferInsert;
