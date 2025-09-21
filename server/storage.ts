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
  getChatById(chatId: string): Promise<Chat | undefined>;
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

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private messages = new Map<string, Message>();
  private chats = new Map<string, Chat>();
  private typingIndicators = new Map<string, TypingIndicator>();

  // Helper to generate UUIDs
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = userData.id ? this.users.get(userData.id) : undefined;
    const user: User = {
      id: userData.id || this.generateId(),
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      username: userData.username || null,
      bio: userData.bio || null,
      colorTag: userData.colorTag || "#2563eb",
      isOnline: userData.isOnline || false,
      lastSeen: existingUser?.lastSeen || new Date(),
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: UpdateUser): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) throw new Error("User not found");
    
    const updatedUser: User = {
      ...existingUser,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      user.updatedAt = new Date();
    }
  }

  // Chat operations
  async getChatById(chatId: string): Promise<Chat | undefined> {
    return this.chats.get(chatId);
  }

  async getOrCreateChat(user1Id: string, user2Id: string): Promise<Chat> {
    // Find existing chat
    for (const chat of this.chats.values()) {
      if ((chat.user1Id === user1Id && chat.user2Id === user2Id) ||
          (chat.user1Id === user2Id && chat.user2Id === user1Id)) {
        return chat;
      }
    }

    // Create new chat
    const chat: Chat = {
      id: this.generateId(),
      user1Id,
      user2Id,
      lastMessageId: null,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    };
    this.chats.set(chat.id, chat);
    return chat;
  }

  async getUserChats(userId: string): Promise<ChatWithDetails[]> {
    const userChats: ChatWithDetails[] = [];
    
    for (const chat of this.chats.values()) {
      if (chat.user1Id === userId || chat.user2Id === userId) {
        const otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
        const otherUser = this.users.get(otherUserId);
        
        if (otherUser) {
          const lastMessage = chat.lastMessageId ? this.messages.get(chat.lastMessageId) : undefined;
          const unreadCount = Array.from(this.messages.values()).filter(msg => 
            msg.toUserId === userId && !msg.isSeen &&
            ((msg.fromUserId === chat.user1Id && msg.toUserId === chat.user2Id) ||
             (msg.fromUserId === chat.user2Id && msg.toUserId === chat.user1Id))
          ).length;

          userChats.push({
            ...chat,
            otherUser,
            lastMessage,
            unreadCount,
          });
        }
      }
    }

    return userChats.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  // Message operations
  async createMessage(messageData: InsertMessage & { fromUserId: string }): Promise<Message> {
    const message: Message = {
      id: this.generateId(),
      fromUserId: messageData.fromUserId,
      toUserId: messageData.toUserId,
      content: messageData.content,
      messageType: messageData.messageType || "text",
      fileName: messageData.fileName || null,
      fileSize: messageData.fileSize || null,
      mimeType: messageData.mimeType || null,
      isWhisper: messageData.isWhisper || false,
      whisperExpiresAt: messageData.isWhisper ? new Date(Date.now() + 10 * 1000) : null,
      isSeen: false,
      seenAt: null,
      createdAt: new Date(),
    };
    this.messages.set(message.id, message);

    // Update chat's last message
    const chat = await this.getOrCreateChat(messageData.fromUserId, messageData.toUserId);
    chat.lastMessageId = message.id;
    chat.lastMessageAt = message.createdAt;

    return message;
  }

  async getChatMessages(chatId: string, limit = 50, offset = 0): Promise<MessageWithUser[]> {
    const chat = this.chats.get(chatId);
    if (!chat) return [];

    const chatMessages = Array.from(this.messages.values())
      .filter(msg => 
        ((msg.fromUserId === chat.user1Id && msg.toUserId === chat.user2Id) ||
         (msg.fromUserId === chat.user2Id && msg.toUserId === chat.user1Id)) &&
        (!msg.isWhisper || (msg.whisperExpiresAt && msg.whisperExpiresAt > new Date()))
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit)
      .map(message => {
        const fromUser = this.users.get(message.fromUserId);
        return {
          ...message,
          fromUser: fromUser!,
        };
      })
      .reverse();

    return chatMessages;
  }

  async markMessagesAsSeen(chatId: string, userId: string): Promise<void> {
    const chat = this.chats.get(chatId);
    if (!chat) return;

    for (const message of this.messages.values()) {
      if (message.toUserId === userId && 
          ((message.fromUserId === chat.user1Id && message.toUserId === chat.user2Id) ||
           (message.fromUserId === chat.user2Id && message.toUserId === chat.user1Id)) &&
          !message.isSeen) {
        message.isSeen = true;
        message.seenAt = new Date();
      }
    }
  }

  async deleteExpiredWhisperMessages(): Promise<void> {
    const now = new Date();
    for (const [id, message] of this.messages.entries()) {
      if (message.isWhisper && message.whisperExpiresAt && message.whisperExpiresAt <= now) {
        this.messages.delete(id);
      }
    }
  }

  // Typing indicators
  async setTypingIndicator(userId: string, chatId: string, isTyping: boolean): Promise<void> {
    const key = `${userId}-${chatId}`;
    
    if (isTyping) {
      const indicator: TypingIndicator = {
        id: this.generateId(),
        userId,
        chatId,
        isTyping: true,
        createdAt: new Date(),
      };
      this.typingIndicators.set(key, indicator);
    } else {
      this.typingIndicators.delete(key);
    }
  }

  async getTypingIndicators(chatId: string, excludeUserId: string): Promise<TypingIndicator[]> {
    const fiveSecondsAgo = new Date(Date.now() - 5 * 1000);
    
    return Array.from(this.typingIndicators.values()).filter(indicator =>
      indicator.chatId === chatId &&
      indicator.userId !== excludeUserId &&
      indicator.createdAt > fiveSecondsAgo
    );
  }

  async cleanupOldTypingIndicators(): Promise<void> {
    const fiveSecondsAgo = new Date(Date.now() - 5 * 1000);
    
    for (const [key, indicator] of this.typingIndicators.entries()) {
      if (indicator.createdAt <= fiveSecondsAgo) {
        this.typingIndicators.delete(key);
      }
    }
  }

  // Search
  async searchUsers(query: string, excludeUserId: string): Promise<User[]> {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.users.values())
      .filter(user => {
        if (user.id === excludeUserId) return false;
        
        return (
          (user.username && user.username.toLowerCase().includes(lowerQuery)) ||
          (user.firstName && user.firstName.toLowerCase().includes(lowerQuery)) ||
          (user.lastName && user.lastName.toLowerCase().includes(lowerQuery)) ||
          (user.email && user.email.toLowerCase().includes(lowerQuery))
        );
      })
      .slice(0, 20);
  }
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    if (!db) throw new Error("Database not available");
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
  async getChatById(chatId: string): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
    return chat;
  }

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
