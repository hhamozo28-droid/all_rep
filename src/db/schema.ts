import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
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

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  plainPassword: text("plain_password"),
  language: text("language").notNull().default("ar"),
  blocked: boolean("blocked").notNull().default(false),
  downloads: integer("downloads").notNull().default(0),
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

export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
