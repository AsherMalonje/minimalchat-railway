import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageBubble } from "@/components/message-bubble";
import { MessageInput } from "@/components/message-input";
import { CallManager, CallButtons } from "@/components/call-manager";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { MessageWithUser, TypingIndicator } from "@shared/schema";

function UserInitials({ user }: { user: any }) {
  const name = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.email || "U";
  
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
}

function TypingIndicator() {
  return (
    <div className="flex items-start space-x-2 mb-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg rounded-tl-none px-4 py-3 shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        </div>
      </div>
    </div>
  );
}

export default function ChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [otherUser, setOtherUser] = useState<any>(null);

  const { data: messages, refetch: refetchMessages, error: messagesError } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/chats", chatId, "messages"],
    refetchInterval: 2000, // Poll every 2 seconds for new messages
    enabled: !!chatId,
  });

  const { data: typingIndicators } = useQuery<TypingIndicator[]>({
    queryKey: ["/api/chats", chatId, "typing"],
    refetchInterval: 1000, // Poll every second for typing indicators
    enabled: !!chatId,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (messagesError && isUnauthorizedError(messagesError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [messagesError, toast]);

  // Get other user from messages
  useEffect(() => {
    if (messages && Array.isArray(messages) && messages.length > 0 && user) {
      const firstMessage = messages[0];
      const other = firstMessage.fromUser.id === user.id 
        ? messages.find(m => m.fromUser.id !== user.id)?.fromUser
        : firstMessage.fromUser;
      
      if (other) {
        setOtherUser(other);
      }
    }
  }, [messages, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMessageSent = () => {
    refetchMessages();
  };

  const handleStartCall = (receiverId: string, receiverName: string, callType: 'voice' | 'video') => {
    // Call functionality is handled by CallManager component
    console.log(`Starting ${callType} call with ${receiverName}`);
  };

  if (!chatId || !user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mr-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Button>
        </Link>
        
        <div className="flex items-center flex-1">
          {otherUser && (
            <>
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={otherUser.profileImageUrl || undefined} />
                  <AvatarFallback 
                    className="text-white font-medium"
                    style={{ backgroundColor: otherUser.colorTag || "#2563eb" }}
                  >
                    <UserInitials user={otherUser} />
                  </AvatarFallback>
                </Avatar>
                {otherUser.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                )}
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {otherUser.firstName && otherUser.lastName 
                    ? `${otherUser.firstName} ${otherUser.lastName}`
                    : otherUser.username || otherUser.email
                  }
                </h3>
                <p className="text-xs text-green-500">
                  {otherUser.isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {otherUser && (
            <CallButtons
              userId={otherUser.id}
              userName={otherUser.firstName && otherUser.lastName 
                ? `${otherUser.firstName} ${otherUser.lastName}`
                : otherUser.username || otherUser.email
              }
              onStartCall={handleStartCall}
            />
          )}
          <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages && Array.isArray(messages) && messages.length > 0 ? (
          messages.map((message: MessageWithUser) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.fromUserId === user.id}
              currentUser={user}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-2">No messages yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Start the conversation!</p>
            </div>
          </div>
        )}
        
        {/* Typing Indicator */}
        {typingIndicators && Array.isArray(typingIndicators) && typingIndicators.length > 0 && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput chatId={chatId} onMessageSent={handleMessageSent} />
      
      {/* Call Manager */}
      <CallManager 
        currentUserId={user.id} 
        currentUserName={user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.username || user.email
        }
      />
    </div>
  );
}
