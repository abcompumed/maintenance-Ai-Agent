import { int, mysqlTable, text, varchar, timestamp, boolean, json } from "drizzle-orm/mysql-core";

/**
 * GitHub Integration - Store GitHub OAuth tokens and repository configuration
 */
export const githubIntegration = mysqlTable("githubIntegration", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  githubUsername: varchar("githubUsername", { length: 255 }).notNull(),
  repositoryName: varchar("repositoryName", { length: 255 }).notNull(),
  repositoryUrl: varchar("repositoryUrl", { length: 500 }).notNull(),
  // OAuth token (encrypted)
  encryptedAccessToken: text("encryptedAccessToken").notNull(),
  encryptionIv: varchar("encryptionIv", { length: 32 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  autoCreateIssues: boolean("autoCreateIssues").default(true).notNull(),
  autoCreatePRs: boolean("autoCreatePRs").default(true).notNull(),
  syncSourceCode: boolean("syncSourceCode").default(true).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GitHubIntegration = typeof githubIntegration.$inferSelect;
export type InsertGitHubIntegration = typeof githubIntegration.$inferInsert;

/**
 * GitHub Issues - Track issues created in GitHub
 */
export const githubIssues = mysqlTable("githubIssues", {
  id: int("id").autoincrement().primaryKey(),
  faultId: int("faultId").notNull(),
  githubIssueNumber: int("githubIssueNumber").notNull(),
  githubIssueUrl: varchar("githubIssueUrl", { length: 500 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  status: varchar("status", { length: 50 }).default("open").notNull(), // open, closed, merged
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GitHubIssue = typeof githubIssues.$inferSelect;
export type InsertGitHubIssue = typeof githubIssues.$inferInsert;

/**
 * GitHub Pull Requests - Track PRs created in GitHub
 */
export const githubPullRequests = mysqlTable("githubPullRequests", {
  id: int("id").autoincrement().primaryKey(),
  faultId: int("faultId").notNull(),
  githubPRNumber: int("githubPRNumber").notNull(),
  githubPRUrl: varchar("githubPRUrl", { length: 500 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  branch: varchar("branch", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("open").notNull(), // open, closed, merged
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GitHubPullRequest = typeof githubPullRequests.$inferSelect;
export type InsertGitHubPullRequest = typeof githubPullRequests.$inferInsert;

/**
 * GitHub Synced Files - Track which files have been synced to GitHub
 */
export const githubSyncedFiles = mysqlTable("githubSyncedFiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  faultId: int("faultId"),
  filePath: varchar("filePath", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(), // fault, documentation, source-code
  githubPath: varchar("githubPath", { length: 500 }).notNull(),
  commitSha: varchar("commitSha", { length: 100 }),
  lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GitHubSyncedFile = typeof githubSyncedFiles.$inferSelect;
export type InsertGitHubSyncedFile = typeof githubSyncedFiles.$inferInsert;
