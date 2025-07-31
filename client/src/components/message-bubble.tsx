import { format } from "date-fns";
import { Check, CheckCheck, Clock, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { MessageWithUser, User } from "@shared/schema";

interface MessageBubbleProps {
  message: MessageWithUser;
  isOwn: boolean;
  currentUser: User;
}

function UserInitials({ user }: { user: User }) {
  const name = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.email || "U";
  
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function MessageBubble({ message, isOwn, currentUser }: MessageBubbleProps) {
  const time = format(new Date(message.createdAt), "h:mm a");
  
  if (isOwn) {
    return (
      <div className="flex items-end justify-end space-x-2 mb-4">
        <div className="flex flex-col max-w-xs">
          <div 
            className={`px-4 py-2 shadow-sm rounded-lg rounded-tr-none ${
              message.isWhisper
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "text-white"
            }`}
            style={{ 
              backgroundColor: message.isWhisper ? undefined : (currentUser.colorTag || "#2563eb")
            }}
          >
            {message.messageType === "voice" ? (
              <div className="flex items-center space-x-3">
                <Button size="sm" className="w-8 h-8 bg-white/20 rounded-full p-0">
                  <Play className="w-3 h-3 text-white" />
                </Button>
                <div className="flex-1">
                  <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-1/3 rounded-full"></div>
                  </div>
                  <span className="text-xs text-white/80 mt-1">0:23</span>
                </div>
              </div>
            ) : (
              <p>{message.content}</p>
            )}
            {message.isWhisper && (
              <Clock className="absolute top-1 right-1 w-3 h-3 text-white opacity-75" />
            )}
          </div>
          <div className="flex items-center justify-end mt-1 mr-2 space-x-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{time}</span>
            {message.isSeen ? (
              <CheckCheck className="w-3 h-3 text-blue-600" />
            ) : (
              <Check className="w-3 h-3 text-gray-400" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-2 mb-4">
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={message.fromUser.profileImageUrl || undefined} />
        <AvatarFallback 
          className="text-white text-xs font-medium"
          style={{ backgroundColor: message.fromUser.colorTag || "#2563eb" }}
        >
          <UserInitials user={message.fromUser} />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col max-w-xs">
        <div className="bg-white dark:bg-gray-800 rounded-lg rounded-tl-none px-4 py-2 shadow-sm">
          {message.messageType === "voice" ? (
            <div className="flex items-center space-x-3">
              <Button size="sm" className="w-8 h-8 bg-blue-600 rounded-full p-0">
                <Play className="w-3 h-3 text-white" />
              </Button>
              <div className="flex-1">
                <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-1/3 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">0:23</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-900 dark:text-white">{message.content}</p>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-2">{time}</span>
      </div>
    </div>
  );
}
