import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertMessageSchema, updateUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes
  app.put('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = updateUserSchema.parse(req.body);
      
      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post('/api/users/online-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isOnline } = z.object({ isOnline: z.boolean() }).parse(req.body);
      
      await storage.updateUserOnlineStatus(userId, isOnline);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating online status:", error);
      res.status(500).json({ message: "Failed to update online status" });
    }
  });

  app.get('/api/users/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { q } = z.object({ q: z.string().min(1) }).parse(req.query);
      
      const users = await storage.searchUsers(q, userId);
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Chat routes
  app.get('/api/chats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const chats = await storage.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  app.post('/api/chats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { otherUserId } = z.object({ otherUserId: z.string() }).parse(req.body);
      
      const chat = await storage.getOrCreateChat(userId, otherUserId);
      res.json(chat);
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  app.get('/api/chats/:chatId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chatId } = req.params;
      const { limit, offset } = z.object({
        limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
        offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
      }).parse(req.query);
      
      const messages = await storage.getChatMessages(chatId, limit, offset);
      
      // Mark messages as seen
      await storage.markMessagesAsSeen(chatId, userId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/chats/:chatId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chatId } = req.params;
      const messageData = insertMessageSchema.parse(req.body);
      
      const message = await storage.createMessage({
        ...messageData,
        fromUserId: userId,
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Typing indicators
  app.post('/api/chats/:chatId/typing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chatId } = req.params;
      const { isTyping } = z.object({ isTyping: z.boolean() }).parse(req.body);
      
      await storage.setTypingIndicator(userId, chatId, isTyping);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting typing indicator:", error);
      res.status(500).json({ message: "Failed to set typing indicator" });
    }
  });

  app.get('/api/chats/:chatId/typing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chatId } = req.params;
      
      const indicators = await storage.getTypingIndicators(chatId, userId);
      res.json(indicators);
    } catch (error) {
      console.error("Error fetching typing indicators:", error);
      res.status(500).json({ message: "Failed to fetch typing indicators" });
    }
  });

  // Cleanup routes (called periodically)
  app.post('/api/cleanup/whisper-messages', async (req, res) => {
    try {
      await storage.deleteExpiredWhisperMessages();
      res.json({ success: true });
    } catch (error) {
      console.error("Error cleaning up whisper messages:", error);
      res.status(500).json({ message: "Failed to cleanup whisper messages" });
    }
  });

  app.post('/api/cleanup/typing-indicators', async (req, res) => {
    try {
      await storage.cleanupOldTypingIndicators();
      res.json({ success: true });
    } catch (error) {
      console.error("Error cleaning up typing indicators:", error);
      res.status(500).json({ message: "Failed to cleanup typing indicators" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
