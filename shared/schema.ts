import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: text("profile_image_url"),
  username: varchar("username").unique(),
  bio: text("bio"),
  colorTag: varchar("color_tag").default("#2563eb"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull(),
  toUserId: varchar("to_user_id").notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"), // text, voice, file
  fileName: varchar("file_name"), // For file messages
  fileSize: integer("file_size"), // File size in bytes
  mimeType: varchar("mime_type"), // MIME type for files
  isWhisper: boolean("is_whisper").default(false),
  whisperExpiresAt: timestamp("whisper_expires_at"),
  isSeen: boolean("is_seen").default(false),
  seenAt: timestamp("seen_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chats table (for chat metadata)
export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull(),
  user2Id: varchar("user2_id").notNull(),
  lastMessageId: varchar("last_message_id"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Typing indicators table
export const typingIndicators = pgTable("typing_indicators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  chatId: varchar("chat_id").notNull(),
  isTyping: boolean("is_typing").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  fromUser: one(users, {
    fields: [messages.fromUserId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  toUser: one(users, {
    fields: [messages.toUserId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

export const chatsRelations = relations(chats, ({ one }) => ({
  user1: one(users, {
    fields: [chats.user1Id],
    references: [users.id],
  }),
  user2: one(users, {
    fields: [chats.user2Id],
    references: [users.id],
  }),
  lastMessage: one(messages, {
    fields: [chats.lastMessageId],
    references: [messages.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  username: true,
  bio: true,
  colorTag: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  toUserId: true,
  content: true,
  messageType: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  isWhisper: true,
});

export const insertChatSchema = createInsertSchema(chats).pick({
  user1Id: true,
  user2Id: true,
});

export const updateUserSchema = insertUserSchema.partial();

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Message = typeof messages.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type TypingIndicator = typeof typingIndicators.$inferSelect;

// Extended types for API responses
export type ChatWithDetails = Chat & {
  otherUser: User;
  lastMessage?: Message;
  unreadCount: number;
};

export type MessageWithUser = Message & {
  fromUser: User;
};
