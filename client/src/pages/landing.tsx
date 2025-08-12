import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardContent className="p-8 text-center">
            {/* Logo/Brand */}
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">MinimalChat</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Simple, secure messaging</p>
            </div>

            {/* Features */}
            <div className="space-y-4 mb-8 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Real-time messaging</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Whisper mode messages</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Custom color themes</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Minimalist design</span>
              </div>
            </div>

            {/* Sign In Button */}
            <Button 
              onClick={() => window.location.href = '/api/auth/google'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Sign In with Google
            </Button>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Secure authentication powered by Google
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
