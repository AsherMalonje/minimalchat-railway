import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./googleAuth";
import { insertMessageSchema, updateUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes
  app.put('/api/users/profile', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/users/online-status', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/users/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
      const chats = await storage.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  app.post('/api/chats', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/chats/:chatId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
      const { chatId } = req.params;
      const messageData = insertMessageSchema.parse(req.body);
      
      // Derive toUserId from chatId for security
      const chat = await storage.getChatById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      // Ensure user is part of this chat
      if (chat.user1Id !== userId && chat.user2Id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const toUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
      
      // Validate file messages
      if (messageData.messageType === "file") {
        // Check file size (max 10MB)
        if (messageData.fileSize && messageData.fileSize > 10 * 1024 * 1024) {
          return res.status(400).json({ message: "File size too large. Maximum size is 10MB." });
        }
        
        // Check for required file metadata
        if (!messageData.fileName || !messageData.mimeType) {
          return res.status(400).json({ message: "File metadata is required for file messages" });
        }
        
        // Validate MIME types (allow common file types)
        const allowedTypes = [
          'image/', 'video/', 'audio/', 'text/', 'application/pdf',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/zip', 'application/x-zip-compressed'
        ];
        
        if (!allowedTypes.some(type => messageData.mimeType!.startsWith(type))) {
          return res.status(400).json({ message: "File type not allowed" });
        }
      }
      
      const message = await storage.createMessage({
        ...messageData,
        fromUserId: userId,
        toUserId,
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

  app.get('/api/chats/:chatId/typing', isAuthenticated, async (req: any, res) => {
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
  
  // WebSocket server for WebRTC signaling (use a specific path to avoid conflict with Vite)
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws-signaling'
  });
  
  // Store active connections and calls
  const connections = new Map<string, any>(); // userId -> WebSocket
  const activeCalls = new Map<string, {
    callId: string;
    callerId: string;
    receiverId: string;
    type: 'voice' | 'video';
    status: 'ringing' | 'active' | 'ended';
  }>();
  
  wss.on('connection', (ws, req) => {
    let userId: string | null = null;
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'register':
            userId = message.userId;
            connections.set(userId, ws);
            console.log(`User ${userId} connected to WebSocket`);
            break;
            
          case 'call-offer':
            const { receiverId, offer, callType } = message;
            const callId = Math.random().toString(36).substring(7);
            
            // Store call info
            activeCalls.set(callId, {
              callId,
              callerId: userId!,
              receiverId,
              type: callType,
              status: 'ringing'
            });
            
            // Send callId back to caller
            ws.send(JSON.stringify({
              type: 'call-initiated',
              callId
            }));
            
            // Send call offer to receiver
            const receiverWs = connections.get(receiverId);
            if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
              receiverWs.send(JSON.stringify({
                type: 'incoming-call',
                callId,
                callerId: userId,
                callerName: message.callerName,
                callType,
                offer
              }));
            } else {
              // Receiver not online
              ws.send(JSON.stringify({
                type: 'call-failed',
                reason: 'User not available'
              }));
            }
            break;
            
          case 'call-answer':
            const answerCallId = message.callId;
            const call = activeCalls.get(answerCallId);
            if (call) {
              call.status = 'active';
              
              // Send answer to caller
              const callerWs = connections.get(call.callerId);
              if (callerWs && callerWs.readyState === WebSocket.OPEN) {
                callerWs.send(JSON.stringify({
                  type: 'call-answered',
                  callId: answerCallId,
                  answer: message.answer
                }));
              }
            }
            break;
            
          case 'call-reject':
          case 'call-end':
            const endCallId = message.callId;
            const endCall = activeCalls.get(endCallId);
            if (endCall) {
              endCall.status = 'ended';
              
              // Notify the other participant
              const otherUserId = endCall.callerId === userId ? endCall.receiverId : endCall.callerId;
              const otherWs = connections.get(otherUserId);
              if (otherWs && otherWs.readyState === WebSocket.OPEN) {
                otherWs.send(JSON.stringify({
                  type: message.type === 'call-reject' ? 'call-rejected' : 'call-ended',
                  callId: endCallId
                }));
              }
              
              activeCalls.delete(endCallId);
            }
            break;
            
          case 'ice-candidate':
            const candidateCallId = message.callId;
            const candidateCall = activeCalls.get(candidateCallId);
            if (candidateCall) {
              // Forward ICE candidate to the other participant
              const otherUserId = candidateCall.callerId === userId ? candidateCall.receiverId : candidateCall.callerId;
              const otherWs = connections.get(otherUserId);
              if (otherWs && otherWs.readyState === WebSocket.OPEN) {
                otherWs.send(JSON.stringify({
                  type: 'ice-candidate',
                  callId: candidateCallId,
                  candidate: message.candidate
                }));
              }
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        connections.delete(userId);
        console.log(`User ${userId} disconnected from WebSocket`);
        
        // End any active calls for this user
        for (const [callId, call] of activeCalls.entries()) {
          if (call.callerId === userId || call.receiverId === userId) {
            const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
            const otherWs = connections.get(otherUserId);
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'call-ended',
                callId,
                reason: 'User disconnected'
              }));
            }
            activeCalls.delete(callId);
          }
        }
      }
    });
  });
  
  return httpServer;
}
