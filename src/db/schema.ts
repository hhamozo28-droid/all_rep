import {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
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
