import { useState, useEffect, useRef } from "react";
import { Paperclip, Smile, Clock, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

interface MessageInputProps {
  chatId: string;
  onMessageSent: () => void;
}

export function MessageInput({ chatId, onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isWhisperMode, setIsWhisperMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout>();

  // Handle typing indicator
  useEffect(() => {
    const handleTyping = async (typing: boolean) => {
      if (isTyping !== typing) {
        setIsTyping(typing);
        try {
          await apiRequest("POST", `/api/chats/${chatId}/typing`, { isTyping: typing });
        } catch (error) {
          console.error("Failed to set typing indicator:", error);
        }
      }
    };

    if (message.trim()) {
      handleTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 2000);
    } else {
      handleTyping(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, chatId, isTyping]);

  // Stop typing when component unmounts
  useEffect(() => {
    return () => {
      if (isTyping) {
        apiRequest("POST", `/api/chats/${chatId}/typing`, { isTyping: false })
          .catch(console.error);
      }
    };
  }, [chatId, isTyping]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    const messageContent = message.trim();
    setMessage("");

    try {
      // Stop typing indicator
      if (isTyping) {
        await apiRequest("POST", `/api/chats/${chatId}/typing`, { isTyping: false });
        setIsTyping(false);
      }

      // Send message
      await apiRequest("POST", `/api/chats/${chatId}/messages`, {
        content: messageContent,
        messageType: "text",
        isWhisper: isWhisperMode,
        toUserId: "", // This will be filled by the backend based on chatId
      });

      onMessageSent();
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessage(messageContent); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    setIsSending(true);
    
    try {
      // Convert audio to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        await apiRequest("POST", `/api/chats/${chatId}/messages`, {
          content: base64Audio,
          messageType: "voice",
          isWhisper: isWhisperMode,
          toUserId: "", // This will be filled by the backend based on chatId
        });
        
        onMessageSent();
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error("Failed to send voice message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-end space-x-3">
        <Button variant="ghost" size="sm" className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600">
          <Paperclip className="w-5 h-5" />
        </Button>
        
        <div className="flex-1">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 flex items-center space-x-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-0"
              disabled={isSending}
            />
            <Button variant="ghost" size="sm" className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600">
              <Smile className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {/* Whisper Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={`p-2 transition-colors ${
              isWhisperMode 
                ? "text-purple-500 hover:text-purple-600" 
                : "text-gray-500 dark:text-gray-400 hover:text-purple-500"
            }`}
            onClick={() => setIsWhisperMode(!isWhisperMode)}
            title="Whisper Mode (10s auto-delete)"
          >
            <Clock className="w-5 h-5" />
          </Button>
          
          {/* Voice Record Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className={`p-2 transition-colors ${
              isRecording 
                ? "text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20" 
                : "text-gray-500 dark:text-gray-400 hover:text-blue-600"
            }`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSending}
            title={isRecording ? "Stop Recording" : "Voice Message"}
            data-testid="button-voice-record"
          >
            <Mic className="w-5 h-5" />
          </Button>
          
          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {isWhisperMode && (
        <div className="mt-2 text-xs text-purple-500 dark:text-purple-400 text-center">
          Whisper mode: Messages will self-destruct in 10 seconds
        </div>
      )}
      
      {isRecording && (
        <div className="mt-2 flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-red-500 font-medium">Recording... {formatTime(recordingTime)}</span>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
