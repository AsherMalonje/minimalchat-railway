import {
  users,
  messages,
  chats,
  typingIndicators,
  type User,
  type UpsertUser,
  type InsertMessage,
  type Message,
  type Chat,
  type ChatWithDetails,
  type MessageWithUser,
  type UpdateUser,
  type TypingIndicator,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, count, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: UpdateUser): Promise<User>;
  updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void>;
  
  // Chat operations
  getOrCreateChat(user1Id: string, user2Id: string): Promise<Chat>;
  getUserChats(userId: string): Promise<ChatWithDetails[]>;
  
  // Message operations
  createMessage(message: InsertMessage & { fromUserId: string }): Promise<Message>;
  getChatMessages(chatId: string, limit?: number, offset?: number): Promise<MessageWithUser[]>;
  markMessagesAsSeen(chatId: string, userId: string): Promise<void>;
  deleteExpiredWhisperMessages(): Promise<void>;
  
  // Typing indicators
  setTypingIndicator(userId: string, chatId: string, isTyping: boolean): Promise<void>;
  getTypingIndicators(chatId: string, excludeUserId: string): Promise<TypingIndicator[]>;
  cleanupOldTypingIndicators(): Promise<void>;
  
  // Search
  searchUsers(query: string, excludeUserId: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: UpdateUser): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        isOnline, 
        lastSeen: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, id));
  }

  // Chat operations
  async getOrCreateChat(user1Id: string, user2Id: string): Promise<Chat> {
    // Try to find existing chat
    const [existingChat] = await db
      .select()
      .from(chats)
      .where(
        or(
          and(eq(chats.user1Id, user1Id), eq(chats.user2Id, user2Id)),
          and(eq(chats.user1Id, user2Id), eq(chats.user2Id, user1Id))
        )
      );

    if (existingChat) {
      return existingChat;
    }

    // Create new chat
    const [newChat] = await db
      .insert(chats)
      .values({
        user1Id,
        user2Id,
      })
      .returning();

    return newChat;
  }

  async getUserChats(userId: string): Promise<ChatWithDetails[]> {
    const userChats = await db
      .select({
        chat: chats,
        user1: users,
        user2: users,
        lastMessage: messages,
        unreadCount: sql<number>`
          CAST(COUNT(CASE WHEN ${messages.toUserId} = ${userId} AND ${messages.isSeen} = false THEN 1 END) AS INTEGER)
        `,
      })
      .from(chats)
      .leftJoin(users, eq(users.id, chats.user1Id))
      .leftJoin(messages, eq(messages.id, chats.lastMessageId))
      .where(or(eq(chats.user1Id, userId), eq(chats.user2Id, userId)))
      .groupBy(chats.id, users.id, messages.id)
      .orderBy(desc(chats.lastMessageAt));

    return userChats.map(({ chat, user1, user2, lastMessage, unreadCount }) => ({
      ...chat,
      otherUser: chat.user1Id === userId ? user2! : user1!,
      lastMessage: lastMessage || undefined,
      unreadCount: unreadCount || 0,
    }));
  }

  // Message operations
  async createMessage(messageData: InsertMessage & { fromUserId: string }): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...messageData,
        whisperExpiresAt: messageData.isWhisper 
          ? new Date(Date.now() + 10 * 1000) // 10 seconds
          : null,
      })
      .returning();

    // Update chat's last message
    const chat = await this.getOrCreateChat(messageData.fromUserId, messageData.toUserId);
    await db
      .update(chats)
      .set({
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
      })
      .where(eq(chats.id, chat.id));

    return message;
  }

  async getChatMessages(chatId: string, limit = 50, offset = 0): Promise<MessageWithUser[]> {
    const chat = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
    if (!chat.length) return [];

    const { user1Id, user2Id } = chat[0];

    const chatMessages = await db
      .select({
        message: messages,
        fromUser: users,
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.fromUserId))
      .where(
        and(
          or(
            and(eq(messages.fromUserId, user1Id), eq(messages.toUserId, user2Id)),
            and(eq(messages.fromUserId, user2Id), eq(messages.toUserId, user1Id))
          ),
          or(
            eq(messages.isWhisper, false),
            and(
              eq(messages.isWhisper, true),
              sql`${messages.whisperExpiresAt} > NOW()`
            )
          )
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    return chatMessages.map(({ message, fromUser }) => ({
      ...message,
      fromUser,
    })).reverse();
  }

  async markMessagesAsSeen(chatId: string, userId: string): Promise<void> {
    const chat = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
    if (!chat.length) return;

    const { user1Id, user2Id } = chat[0];
    
    await db
      .update(messages)
      .set({ isSeen: true, seenAt: new Date() })
      .where(
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

  async deleteExpiredWhisperMessages(): Promise<void> {
    await db
      .delete(messages)
      .where(
        and(
          eq(messages.isWhisper, true),
          sql`${messages.whisperExpiresAt} <= NOW()`
        )
      );
  }

  // Typing indicators
  async setTypingIndicator(userId: string, chatId: string, isTyping: boolean): Promise<void> {
    if (isTyping) {
      await db
        .insert(typingIndicators)
        .values({ userId, chatId, isTyping })
        .onConflictDoUpdate({
          target: [typingIndicators.userId, typingIndicators.chatId],
          set: { isTyping: true, createdAt: new Date() },
        });
    } else {
      await db
        .delete(typingIndicators)
        .where(
          and(
            eq(typingIndicators.userId, userId),
            eq(typingIndicators.chatId, chatId)
          )
        );
    }
  }

  async getTypingIndicators(chatId: string, excludeUserId: string): Promise<TypingIndicator[]> {
    return await db
      .select()
      .from(typingIndicators)
      .where(
        and(
          eq(typingIndicators.chatId, chatId),
          sql`${typingIndicators.userId} != ${excludeUserId}`,
          sql`${typingIndicators.createdAt} > NOW() - INTERVAL '5 seconds'`
        )
      );
  }

  async cleanupOldTypingIndicators(): Promise<void> {
    await db
      .delete(typingIndicators)
      .where(sql`${typingIndicators.createdAt} <= NOW() - INTERVAL '5 seconds'`);
  }

  // Search
  async searchUsers(query: string, excludeUserId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.id} != ${excludeUserId}`,
          or(
            sql`${users.username} ILIKE ${'%' + query + '%'}`,
            sql`${users.firstName} ILIKE ${'%' + query + '%'}`,
            sql`${users.lastName} ILIKE ${'%' + query + '%'}`,
            sql`${users.email} ILIKE ${'%' + query + '%'}`
          )
        )
      )
      .limit(20);
  }
}

export const storage = new DatabaseStorage();
