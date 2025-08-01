import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, MessageCircle, Moon, Sun, User, Plus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/theme-provider";
import { apiRequest } from "@/lib/queryClient";
import type { ChatWithDetails, User as UserType } from "@shared/schema";

function formatTime(date: Date | string | null | undefined) {
  if (!date) return "";
  const messageDate = new Date(date);
  const now = new Date();
  const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else {
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function UserInitials({ user }: { user: UserType }) {
  const name = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.email || "U";
  
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function NewChatDialog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: searchResults } = useQuery({
    queryKey: ["/api/users/search", { q: searchQuery }],
    enabled: searchQuery.length > 0,
  });

  const handleStartChat = async (user: UserType) => {
    try {
      const response = await apiRequest("POST", "/api/chats", {
        otherUserId: user.id,
      });
      const chat = await response.json();
      setIsOpen(false);
      window.location.href = `/chat/${chat.id}`;
    } catch (error) {
      console.error("Failed to start chat:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105"
        >
          <Plus size={24} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults?.map((user: UserType) => (
              <div
                key={user.id}
                className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                onClick={() => handleStartChat(user)}
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                    <UserInitials user={user} />
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.username || user.email
                    }
                  </p>
                  {user.username && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ChatList() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const { data: chats, refetch } = useQuery({
    queryKey: ["/api/chats"],
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Auto-refetch when component mounts
  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Chats</h1>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Button>
          <Link href="/todo">
            <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <CheckSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <Avatar className="w-6 h-6">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {user && <UserInitials user={user} />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            onClick={toggleTheme}
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats && chats.length > 0 ? (
          chats.map((chat: ChatWithDetails) => (
            <Link key={chat.id} href={`/chat/${chat.id}`}>
              <div className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
                <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-600">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={chat.otherUser.profileImageUrl || undefined} />
                      <AvatarFallback 
                        className="text-white font-medium text-lg"
                        style={{ backgroundColor: chat.otherUser.colorTag || "#2563eb" }}
                      >
                        <UserInitials user={chat.otherUser} />
                      </AvatarFallback>
                    </Avatar>
                    {chat.otherUser.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    )}
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {chat.otherUser.firstName && chat.otherUser.lastName 
                          ? `${chat.otherUser.firstName} ${chat.otherUser.lastName}`
                          : chat.otherUser.username || chat.otherUser.email
                        }
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(chat.lastMessage?.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {chat.lastMessage?.content || "No messages yet"}
                      </p>
                      <div className="flex items-center space-x-1">
                        {chat.unreadCount > 0 && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No chats yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Start a conversation with someone</p>
          </div>
        )}
      </div>

      <NewChatDialog />
    </div>
  );
}
