import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Check, CheckCheck, Clock, Play, Pause, FileText, Download, Image, Video, Music } from "lucide-react";
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

function FileMessageDisplay({ message, isOwn }: { message: MessageWithUser; isOwn: boolean }) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    return FileText;
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = () => {
    try {
      const base64Data = message.content;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: message.mimeType || 'application/octet-stream' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = message.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const FileIcon = getFileIcon(message.mimeType || '');

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
      isOwn 
        ? "bg-white/10 border-white/20" 
        : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
    }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        isOwn ? "bg-white/20" : "bg-blue-100 dark:bg-blue-900"
      }`}>
        <FileIcon className={`w-5 h-5 ${
          isOwn ? "text-white" : "text-blue-600 dark:text-blue-400"
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          isOwn ? "text-white" : "text-gray-900 dark:text-white"
        }`}>
          {message.fileName || 'Unknown file'}
        </p>
        <p className={`text-xs ${
          isOwn ? "text-white/70" : "text-gray-500 dark:text-gray-400"
        }`}>
          {formatFileSize(message.fileSize)}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={downloadFile}
        className={`p-2 ${
          isOwn 
            ? "text-white hover:bg-white/20" 
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
        }`}
        data-testid="button-file-download"
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
}

function VoiceMessagePlayer({ audioData, isOwn }: { audioData: string; isOwn: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element from base64 data
    const audio = new Audio(`data:audio/webm;base64,${audioData}`);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioData]);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center space-x-3">
      <Button 
        size="sm" 
        className={`w-8 h-8 rounded-full p-0 ${
          isOwn 
            ? "bg-white/20 hover:bg-white/30" 
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        onClick={togglePlayback}
        data-testid="button-voice-play"
      >
        {isPlaying ? (
          <Pause className="w-3 h-3 text-white" />
        ) : (
          <Play className="w-3 h-3 text-white" />
        )}
      </Button>
      <div className="flex-1">
        <div className={`h-1 rounded-full overflow-hidden ${
          isOwn ? "bg-white/30" : "bg-gray-200 dark:bg-gray-600"
        }`}>
          <div 
            className={`h-full rounded-full transition-all duration-100 ${
              isOwn ? "bg-white" : "bg-blue-600"
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className={`text-xs mt-1 ${
          isOwn ? "text-white/80" : "text-gray-500 dark:text-gray-400"
        }`}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

export function MessageBubble({ message, isOwn, currentUser }: MessageBubbleProps) {
  const time = format(new Date(message.createdAt || new Date()), "h:mm a");
  
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
              <VoiceMessagePlayer audioData={message.content} isOwn={true} />
            ) : message.messageType === "file" ? (
              <FileMessageDisplay message={message} isOwn={true} />
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
            <VoiceMessagePlayer audioData={message.content} isOwn={false} />
          ) : message.messageType === "file" ? (
            <FileMessageDisplay message={message} isOwn={false} />
          ) : (
            <p className="text-gray-900 dark:text-white">{message.content}</p>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-2">{time}</span>
      </div>
    </div>
  );
}
