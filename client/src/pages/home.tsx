import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ChatList } from "@/components/chat-list";
import ChatRoom from "./chat-room";
import Profile from "./profile";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();

  // Set user online status when app loads
  useEffect(() => {
    const setOnlineStatus = async (isOnline: boolean) => {
      try {
        await apiRequest("POST", "/api/users/online-status", { isOnline });
      } catch (error) {
        console.error("Failed to update online status:", error);
      }
    };

    // Set online when component mounts
    setOnlineStatus(true);

    // Set offline when page unloads
    const handleBeforeUnload = () => setOnlineStatus(false);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Set online when page becomes visible, offline when hidden
    const handleVisibilityChange = () => {
      setOnlineStatus(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setOnlineStatus(false);
    };
  }, []);

  // Clean up whisper messages and typing indicators periodically
  useEffect(() => {
    const cleanup = async () => {
      try {
        await Promise.all([
          apiRequest("POST", "/api/cleanup/whisper-messages", {}),
          apiRequest("POST", "/api/cleanup/typing-indicators", {}),
        ]);
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    };

    // Run cleanup every 30 seconds
    const interval = setInterval(cleanup, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen relative shadow-xl">
      <Switch>
        <Route path="/" component={ChatList} />
        <Route path="/chat/:chatId" component={ChatRoom} />
        <Route path="/profile" component={Profile} />
      </Switch>
    </div>
  );
}
