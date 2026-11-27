import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { SpecialtyOtherLink } from "@/types/specialty";

export const specialties = pgTable(
  "specialties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    idx: integer("idx").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    contentType: text("content_type"),
    modules: integer("modules").notNull().default(0),
    lessons: integer("lessons").notNull().default(0),
    filesCount: integer("files_count").notNull().default(0),
    sizeMb: numeric("size_mb", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    links: jsonb("links").$type<string[]>().notNull().default([]),
    /** Public Archive.org mirrors, shown under the "other links" tab. */
    otherLinks: jsonb("other_links").$type<SpecialtyOtherLink[]>().notNull().default([]),
    version: integer("version").notNull().default(1),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("specialties_code_idx").on(t.code)],
);

/** Metadata for pedagogical PDF guides uploaded to GitHub (`guides/`). */
export const guides = pgTable("guides", {
  id: uuid("id").primaryKey().defaultRandom(),
  path: text("path").notNull().unique(),
  sha: text("sha").notNull(),
  size: integer("size").notNull(),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  downloads: integer("downloads").notNull().default(0),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Staging rows for chunked guide uploads; reassembled server-side. `data` is base64-encoded. */
export const guideUploadChunks = pgTable("guide_upload_chunks", {
  sessionId: text("session_id").notNull(),
  partIndex: integer("part_index").notNull(),
  data: text("data").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.sessionId, t.partIndex] })]);

/**
 * PDF/Word lesson files. Attached to a specialty by its stable `code` (the
 * catalog UUID changes whenever the Word catalog is republished).
 */
export const lessonFiles = pgTable("lesson_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  specialtyCode: text("specialty_code").notNull(),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull().unique(),
  sha: text("sha").notNull(),
  downloads: integer("downloads").notNull().default(0),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("lesson_files_code_idx").on(t.specialtyCode)]);

/** Staging rows for chunked lesson-file uploads; reassembled server-side. */
export const lessonUploadChunks = pgTable("lesson_upload_chunks", {
  sessionId: text("session_id").notNull(),
  partIndex: integer("part_index").notNull(),
  data: text("data").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.sessionId, t.partIndex] })]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  plainPassword: text("plain_password"),
  language: text("language").notNull().default("ar"),
  blocked: boolean("blocked").notNull().default(false),
  downloads: integer("downloads").notNull().default(0),
  // NULL = unlimited (existing accounts); registered users start with 3.
  downloadLimit: integer("download_limit"),
  // Set when a user has seen the admin's welcome message at login (once per account).
  welcomeShown: boolean("welcome_shown").notNull().default(false),
  // New self-registered accounts wait for admin approval before they can sign in.
  approved: boolean("approved").notNull().default(true),
  // Self-deleted from the app: the row stays (admin keeps the credentials) but
  // the account can neither log in nor be re-registered. Only the admin can
  // permanently delete it from the panel.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Admin notifications shown to every signed-in user. */
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  message: text("message").notNull(),
  // null = broadcast to all users; otherwise a message for one account only.
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Per-user read state for notifications. */
export const notificationReads = pgTable("notification_reads", {
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.notificationId] })]);

/** Emails of permanently deleted accounts: they can never be registered again. */
export const deletedAccounts = pgTable("deleted_accounts", {
  email: text("email").primaryKey(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Files served from private S3 storage. `kind` is either "guide" or
 * "specialty"; `itemId` points at the matching row in `guides` or
 * `specialties`. `linkIndex` is NULL for guides.
 */
export const hostedFiles = pgTable("hosted_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  itemId: uuid("item_id").notNull(),
  linkIndex: integer("link_index"),
  objectKey: text("object_key").notNull().unique(),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  mimeType: text("mime_type"),
  sha256: text("sha256"),
  fileName: text("file_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One-attempt download capabilities. Only the SHA-256 hash of the random token
 * is stored; the raw token lives only in the short-lived URL given to the user.
 */
export const downloadGrants = pgTable("download_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  sessionHash: text("session_hash"),
  kind: text("kind").notNull(),
  itemId: uuid("item_id").notNull(),
  linkIndex: integer("link_index"),
  mode: text("mode").notNull().default("open"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("download_grants_user_idx").on(t.userId),
  index("download_grants_expires_idx").on(t.expiresAt),
]);

export const userSessions = pgTable(
  "user_sessions",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    deviceId: text("device_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("user_sessions_token_idx").on(t.token)],
);

export const specialtyDownloads = pgTable(
  "specialty_downloads",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    specialtyId: uuid("specialty_id").notNull().references(() => specialties.id, { onDelete: "cascade" }),
    downloads: integer("downloads").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.specialtyId] })],
);

export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
