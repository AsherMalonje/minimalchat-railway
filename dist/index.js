var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  chats: () => chats,
  chatsRelations: () => chatsRelations,
  insertChatSchema: () => insertChatSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertUserSchema: () => insertUserSchema,
  messages: () => messages,
  messagesRelations: () => messagesRelations,
  sessions: () => sessions,
  typingIndicators: () => typingIndicators,
  updateUserSchema: () => updateUserSchema,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  bio: text("bio"),
  colorTag: varchar("color_tag").default("#2563eb"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull(),
  toUserId: varchar("to_user_id").notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"),
  // text, voice
  isWhisper: boolean("is_whisper").default(false),
  whisperExpiresAt: timestamp("whisper_expires_at"),
  isSeen: boolean("is_seen").default(false),
  seenAt: timestamp("seen_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull(),
  user2Id: varchar("user2_id").notNull(),
  lastMessageId: varchar("last_message_id"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});
var typingIndicators = pgTable("typing_indicators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  chatId: varchar("chat_id").notNull(),
  isTyping: boolean("is_typing").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" })
}));
var messagesRelations = relations(messages, ({ one }) => ({
  fromUser: one(users, {
    fields: [messages.fromUserId],
    references: [users.id],
    relationName: "sentMessages"
  }),
  toUser: one(users, {
    fields: [messages.toUserId],
    references: [users.id],
    relationName: "receivedMessages"
  })
}));
var chatsRelations = relations(chats, ({ one }) => ({
  user1: one(users, {
    fields: [chats.user1Id],
    references: [users.id]
  }),
  user2: one(users, {
    fields: [chats.user2Id],
    references: [users.id]
  }),
  lastMessage: one(messages, {
    fields: [chats.lastMessageId],
    references: [messages.id]
  })
}));
var insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  username: true,
  bio: true,
  colorTag: true
});
var insertMessageSchema = createInsertSchema(messages).pick({
  toUserId: true,
  content: true,
  messageType: true,
  isWhisper: true
});
var insertChatSchema = createInsertSchema(chats).pick({
  user1Id: true,
  user2Id: true
});
var updateUserSchema = insertUserSchema.partial();

// server/db.ts
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var client = new Client({
  connectionString: process.env.DATABASE_URL
});
client.connect().catch(console.error);
var db = drizzle(client, { schema: schema_exports });

// server/storage.ts
import { eq, and, or, desc, sql as sql2 } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  async updateUser(id, updates) {
    const [user] = await db.update(users).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return user;
  }
  async updateUserOnlineStatus(id, isOnline) {
    await db.update(users).set({
      isOnline,
      lastSeen: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, id));
  }
  // Chat operations
  async getOrCreateChat(user1Id, user2Id) {
    const [existingChat] = await db.select().from(chats).where(
      or(
        and(eq(chats.user1Id, user1Id), eq(chats.user2Id, user2Id)),
        and(eq(chats.user1Id, user2Id), eq(chats.user2Id, user1Id))
      )
    );
    if (existingChat) {
      return existingChat;
    }
    const [newChat] = await db.insert(chats).values({
      user1Id,
      user2Id
    }).returning();
    return newChat;
  }
  async getUserChats(userId) {
    const userChats = await db.select({
      chat: chats,
      user1: users,
      user2: users,
      lastMessage: messages,
      unreadCount: sql2`
          CAST(COUNT(CASE WHEN ${messages.toUserId} = ${userId} AND ${messages.isSeen} = false THEN 1 END) AS INTEGER)
        `
    }).from(chats).leftJoin(users, eq(users.id, chats.user1Id)).leftJoin(messages, eq(messages.id, chats.lastMessageId)).where(or(eq(chats.user1Id, userId), eq(chats.user2Id, userId))).groupBy(chats.id, users.id, messages.id).orderBy(desc(chats.lastMessageAt));
    return userChats.map(({ chat, user1, user2, lastMessage, unreadCount }) => ({
      ...chat,
      otherUser: chat.user1Id === userId ? user2 : user1,
      lastMessage: lastMessage || void 0,
      unreadCount: unreadCount || 0
    }));
  }
  // Message operations
  async createMessage(messageData) {
    const [message] = await db.insert(messages).values({
      ...messageData,
      whisperExpiresAt: messageData.isWhisper ? new Date(Date.now() + 10 * 1e3) : null
    }).returning();
    const chat = await this.getOrCreateChat(messageData.fromUserId, messageData.toUserId);
    await db.update(chats).set({
      lastMessageId: message.id,
      lastMessageAt: message.createdAt
    }).where(eq(chats.id, chat.id));
    return message;
  }
  async getChatMessages(chatId, limit = 50, offset = 0) {
    const chat = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
    if (!chat.length) return [];
    const { user1Id, user2Id } = chat[0];
    const chatMessages = await db.select({
      message: messages,
      fromUser: users
    }).from(messages).innerJoin(users, eq(users.id, messages.fromUserId)).where(
      and(
        or(
          and(eq(messages.fromUserId, user1Id), eq(messages.toUserId, user2Id)),
          and(eq(messages.fromUserId, user2Id), eq(messages.toUserId, user1Id))
        ),
        or(
          eq(messages.isWhisper, false),
          and(
            eq(messages.isWhisper, true),
            sql2`${messages.whisperExpiresAt} > NOW()`
          )
        )
      )
    ).orderBy(desc(messages.createdAt)).limit(limit).offset(offset);
    return chatMessages.map(({ message, fromUser }) => ({
      ...message,
      fromUser
    })).reverse();
  }
  async markMessagesAsSeen(chatId, userId) {
    const chat = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
    if (!chat.length) return;
    const { user1Id, user2Id } = chat[0];
    await db.update(messages).set({ isSeen: true, seenAt: /* @__PURE__ */ new Date() }).where(
      and(
        eq(messages.toUserId, userId),
        or(
          and(eq(messages.fromUserId, user1Id), eq(messages.toUserId, user2Id)),
          and(eq(messages.fromUserId, user2Id), eq(messages.toUserId, user1Id))
        ),
        eq(messages.isSeen, false)
      )
    );
  }
  async deleteExpiredWhisperMessages() {
    await db.delete(messages).where(
      and(
        eq(messages.isWhisper, true),
        sql2`${messages.whisperExpiresAt} <= NOW()`
      )
    );
  }
  // Typing indicators
  async setTypingIndicator(userId, chatId, isTyping) {
    if (isTyping) {
      await db.insert(typingIndicators).values({ userId, chatId, isTyping }).onConflictDoUpdate({
        target: [typingIndicators.userId, typingIndicators.chatId],
        set: { isTyping: true, createdAt: /* @__PURE__ */ new Date() }
      });
    } else {
      await db.delete(typingIndicators).where(
        and(
          eq(typingIndicators.userId, userId),
          eq(typingIndicators.chatId, chatId)
        )
      );
    }
  }
  async getTypingIndicators(chatId, excludeUserId) {
    return await db.select().from(typingIndicators).where(
      and(
        eq(typingIndicators.chatId, chatId),
        sql2`${typingIndicators.userId} != ${excludeUserId}`,
        sql2`${typingIndicators.createdAt} > NOW() - INTERVAL '5 seconds'`
      )
    );
  }
  async cleanupOldTypingIndicators() {
    await db.delete(typingIndicators).where(sql2`${typingIndicators.createdAt} <= NOW() - INTERVAL '5 seconds'`);
  }
  // Search
  async searchUsers(query, excludeUserId) {
    return await db.select().from(users).where(
      and(
        sql2`${users.id} != ${excludeUserId}`,
        or(
          sql2`${users.username} ILIKE ${"%" + query + "%"}`,
          sql2`${users.firstName} ILIKE ${"%" + query + "%"}`,
          sql2`${users.lastName} ILIKE ${"%" + query + "%"}`,
          sql2`${users.email} ILIKE ${"%" + query + "%"}`
        )
      )
    ).limit(20);
  }
};
var storage = new DatabaseStorage();

// server/googleAuth.ts
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import connectPg from "connect-pg-simple";
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set. Google Auth will not work.");
}
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl
    }
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await storage.upsertUser({
              id: profile.id,
              email: profile.emails?.[0]?.value || null,
              firstName: profile.name?.givenName || null,
              lastName: profile.name?.familyName || null,
              profileImageUrl: profile.photos?.[0]?.value || null
            });
            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
  }
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app2.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );
    app2.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/" }),
      (req, res) => {
        res.redirect("/");
      }
    );
  }
  app2.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}
var isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// server/routes.ts
import { z } from "zod";
async function registerRoutes(app2) {
  await setupAuth(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.put("/api/users/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const updates = updateUserSchema.parse(req.body);
      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  app2.post("/api/users/online-status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { isOnline } = z.object({ isOnline: z.boolean() }).parse(req.body);
      await storage.updateUserOnlineStatus(userId, isOnline);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating online status:", error);
      res.status(500).json({ message: "Failed to update online status" });
    }
  });
  app2.get("/api/users/search", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { q } = z.object({ q: z.string().min(1) }).parse(req.query);
      const users2 = await storage.searchUsers(q, userId);
      res.json(users2);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });
  app2.get("/api/chats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const chats2 = await storage.getUserChats(userId);
      res.json(chats2);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });
  app2.post("/api/chats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { otherUserId } = z.object({ otherUserId: z.string() }).parse(req.body);
      const chat = await storage.getOrCreateChat(userId, otherUserId);
      res.json(chat);
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });
  app2.get("/api/chats/:chatId/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { chatId } = req.params;
      const { limit, offset } = z.object({
        limit: z.string().optional().transform((val) => val ? parseInt(val) : 50),
        offset: z.string().optional().transform((val) => val ? parseInt(val) : 0)
      }).parse(req.query);
      const messages2 = await storage.getChatMessages(chatId, limit, offset);
      await storage.markMessagesAsSeen(chatId, userId);
      res.json(messages2);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.post("/api/chats/:chatId/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { chatId } = req.params;
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage({
        ...messageData,
        fromUserId: userId
      });
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  app2.post("/api/chats/:chatId/typing", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { chatId } = req.params;
      const { isTyping } = z.object({ isTyping: z.boolean() }).parse(req.body);
      await storage.setTypingIndicator(userId, chatId, isTyping);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting typing indicator:", error);
      res.status(500).json({ message: "Failed to set typing indicator" });
    }
  });
  app2.get("/api/chats/:chatId/typing", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { chatId } = req.params;
      const indicators = await storage.getTypingIndicators(chatId, userId);
      res.json(indicators);
    } catch (error) {
      console.error("Error fetching typing indicators:", error);
      res.status(500).json({ message: "Failed to fetch typing indicators" });
    }
  });
  app2.post("/api/cleanup/whisper-messages", async (req, res) => {
    try {
      await storage.deleteExpiredWhisperMessages();
      res.json({ success: true });
    } catch (error) {
      console.error("Error cleaning up whisper messages:", error);
      res.status(500).json({ message: "Failed to cleanup whisper messages" });
    }
  });
  app2.post("/api/cleanup/typing-indicators", async (req, res) => {
    try {
      await storage.cleanupOldTypingIndicators();
      res.json({ success: true });
    } catch (error) {
      console.error("Error cleaning up typing indicators:", error);
      res.status(500).json({ message: "Failed to cleanup typing indicators" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
