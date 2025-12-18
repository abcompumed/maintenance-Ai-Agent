import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "individual", "corporate"]).default("free").notNull(),
  queriesRemaining: int("queriesRemaining").default(10).notNull(),
  totalQueriesUsed: int("totalQueriesUsed").default(0).notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Subscription and Payment Records
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tier: mysqlEnum("tier", ["free", "individual", "corporate"]).notNull(),
  queriesIncluded: int("queriesIncluded").notNull(),
  queriesUsed: int("queriesUsed").default(0).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed", "cancelled"]).default("pending").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  transactionId: varchar("transactionId", { length: 255 }),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  startDate: timestamp("startDate").defaultNow().notNull(),
  expiryDate: timestamp("expiryDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// Uploaded Documents and Files
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(),
  fileSize: int("fileSize"),
  s3Key: varchar("s3Key", { length: 500 }).notNull(),
  s3Url: text("s3Url").notNull(),
  extractedText: text("extractedText"),
  ocrProcessed: boolean("ocrProcessed").default(false).notNull(),
  documentType: mysqlEnum("documentType", ["manual", "catalog", "schematic", "troubleshooting", "other"]).default("other").notNull(),
  deviceType: varchar("deviceType", { length: 255 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  deviceModel: varchar("deviceModel", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// Faults and Issues Database
export const faults = mysqlTable("faults", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  deviceType: varchar("deviceType", { length: 255 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }).notNull(),
  deviceModel: varchar("deviceModel", { length: 255 }).notNull(),
  faultDescription: text("faultDescription").notNull(),
  symptoms: text("symptoms"),
  errorCodes: text("errorCodes"),
  rootCause: text("rootCause"),
  solution: text("solution"),
  partsRequired: text("partsRequired"),
  estimatedRepairTime: varchar("estimatedRepairTime", { length: 100 }),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard", "expert"]).default("medium").notNull(),
  sourceDocumentId: int("sourceDocumentId"),
  sourceWebsite: varchar("sourceWebsite", { length: 500 }),
  linkedFaultIds: text("linkedFaultIds"),
  relatedPartNumbers: text("relatedPartNumbers"),
  views: int("views").default(0).notNull(),
  helpful: int("helpful").default(0).notNull(),
  notHelpful: int("notHelpful").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fault = typeof faults.$inferSelect;
export type InsertFault = typeof faults.$inferInsert;

// Query History and Analytics
export const queryHistory = mysqlTable("queryHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  query: text("query").notNull(),
  deviceType: varchar("deviceType", { length: 255 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  deviceModel: varchar("deviceModel", { length: 255 }),
  responseText: text("responseText"),
  relatedFaultIds: text("relatedFaultIds"),
  searchPerformed: boolean("searchPerformed").default(false).notNull(),
  sourcesUsed: text("sourcesUsed"),
  queryCost: int("queryCost").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QueryHistory = typeof queryHistory.$inferSelect;
export type InsertQueryHistory = typeof queryHistory.$inferInsert;

// Search Sources Management
export const searchSources = mysqlTable("searchSources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["forum", "manual_repository", "vendor_site", "technical_blog", "other"]).default("other").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  addedBy: int("addedBy"),
  lastScraped: timestamp("lastScraped"),
  scrapeFrequency: varchar("scrapeFrequency", { length: 50 }),
  requiresAuth: boolean("requiresAuth").default(false).notNull(),
  authCredentials: text("authCredentials"),
  respectsRobotsTxt: boolean("respectsRobotsTxt").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SearchSource = typeof searchSources.$inferSelect;
export type InsertSearchSource = typeof searchSources.$inferInsert;

// Spare Parts Database
export const spareParts = mysqlTable("spareParts", {
  id: int("id").autoincrement().primaryKey(),
  partNumber: varchar("partNumber", { length: 255 }).notNull().unique(),
  partName: varchar("partName", { length: 255 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  specifications: text("specifications"),
  datasheetUrl: varchar("datasheetUrl", { length: 500 }),
  compatibleDevices: text("compatibleDevices"),
  estimatedCost: decimal("estimatedCost", { precision: 10, scale: 2 }),
  supplierLinks: text("supplierLinks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SparePart = typeof spareParts.$inferSelect;
export type InsertSparePart = typeof spareParts.$inferInsert;

// Notifications
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  type: mysqlEnum("type", ["new_fault", "file_added", "search_failed", "subscription_expiring", "system_alert"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  isRead: boolean("isRead").default(false).notNull(),
  relatedFaultId: int("relatedFaultId"),
  relatedDocumentId: int("relatedDocumentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;