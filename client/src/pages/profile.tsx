import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, QrCode } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { UpdateUser } from "@shared/schema";

const colorOptions = [
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#10b981" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Teal", value: "#14b8a6" },
];

function UserInitials({ user }: { user: any }) {
  const name = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.email || "U";
  
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Profile() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    colorTag: "#2563eb",
  });

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        bio: user.bio || "",
        colorTag: user.colorTag || "#2563eb",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: UpdateUser) => {
      await apiRequest("PUT", "/api/users/profile", updates);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (!user) {
    // Redirect to login if not authenticated
    useEffect(() => {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }, [toast]);
    
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mr-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h1>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <Avatar className="w-24 h-24 mx-auto">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback 
                  className="text-white text-2xl font-medium"
                  style={{ backgroundColor: formData.colorTag }}
                >
                  <UserInitials user={user} />
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="sm"
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full p-0"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <h2 className="text-xl font-semibold mt-4 text-gray-900 dark:text-white">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user.username || user.email
              }
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
          </div>

          {/* Profile Settings */}
          <div className="space-y-6">
            {/* Username */}
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter your username"
                className="w-full"
              />
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </Label>
              <Textarea
                id="bio"
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Write something about yourself..."
                className="w-full"
              />
            </div>

            {/* Color Tag */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chat Bubble Color
              </Label>
              <div className="flex flex-wrap gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      formData.colorTag === color.value
                        ? "border-white dark:border-gray-700 shadow-lg scale-110"
                        : "border-gray-200 dark:border-gray-600 hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, colorTag: color.value })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>

            {/* QR Code */}
            <Card>
              <CardContent className="p-4 text-center">
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your QR Code
                </Label>
                <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-lg mx-auto flex items-center justify-center mb-3">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Share this QR code for quick contact add
                </p>
              </CardContent>
            </Card>

            {/* Settings Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
                <Label htmlFor="dark-mode" className="text-gray-900 dark:text-white">Dark Mode</Label>
                <Switch
                  id="dark-mode"
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
                <span className="text-gray-900 dark:text-white">Privacy & Security</span>
                <Button variant="ghost" size="sm" className="text-gray-400">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Button>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
                <span className="text-gray-900 dark:text-white">Data & Storage</span>
                <Button variant="ghost" size="sm" className="text-gray-400">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Button>
              </div>
            </div>

            {/* Logout Button */}
            <Button
              type="button"
              onClick={handleLogout}
              variant="destructive"
              className="w-full py-3 rounded-lg font-medium mt-6"
            >
              Sign Out
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
