import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { webrtcService } from '@/lib/webrtc';
import { useToast } from '@/hooks/use-toast';

interface CallManagerProps {
  currentUserId: string;
  currentUserName: string;
}

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callType: 'voice' | 'video';
}

// Global call manager instance
let globalCallManager: {
  startCall: (receiverId: string, receiverName: string, callType: 'voice' | 'video') => Promise<void>;
} | null = null;

export function CallManager({ currentUserId, currentUserName }: CallManagerProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    otherUserName: string;
    callType: 'voice' | 'video';
    isOutgoing: boolean;
    status: 'connecting' | 'ringing' | 'active';
  } | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const { toast } = useToast();

  // Define startCall method
  const startCall = async (receiverId: string, receiverName: string, callType: 'voice' | 'video') => {
    setActiveCall({
      callId: 'temp',
      otherUserName: receiverName,
      callType,
      isOutgoing: true,
      status: 'connecting'
    });

    try {
      await webrtcService.startCall(receiverId, callType, currentUserName);
      setActiveCall(prev => prev ? { ...prev, status: 'ringing' } : null);
    } catch (error) {
      setActiveCall(null);
      toast({
        title: "Failed to start call",
        description: "Could not access camera or microphone",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Expose call functionality globally
    globalCallManager = { startCall };
    
    // Connect to WebRTC service
    webrtcService.connect(currentUserId);

    // Set up event handlers
    webrtcService.onIncomingCall = (callInfo) => {
      setIncomingCall(callInfo);
    };

    webrtcService.onCallAnswered = () => {
      setActiveCall(prev => prev ? { ...prev, status: 'active' } : null);
    };

    webrtcService.onCallRejected = () => {
      setActiveCall(null);
      toast({
        title: "Call rejected",
        description: "The call was rejected",
      });
    };

    webrtcService.onCallEnded = (reason) => {
      setActiveCall(null);
      setIncomingCall(null);
      if (reason) {
        toast({
          title: "Call ended",
          description: reason,
        });
      }
    };

    webrtcService.onCallFailed = (reason) => {
      setActiveCall(null);
      toast({
        title: "Call failed",
        description: reason,
        variant: "destructive",
      });
    };

    webrtcService.onLocalStream = (stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };

    webrtcService.onRemoteStream = (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
    };

    return () => {
      globalCallManager = null;
      webrtcService.disconnect();
    };
  }, [currentUserId, toast]);

  const answerCall = async () => {
    if (!incomingCall) return;

    setActiveCall({
      callId: incomingCall.callId,
      otherUserName: incomingCall.callerName,
      callType: incomingCall.callType,
      isOutgoing: false,
      status: 'connecting'
    });

    await webrtcService.answerCall(incomingCall.callId, incomingCall.callType);
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    webrtcService.rejectCall(incomingCall.callId);
    setIncomingCall(null);
  };

  const endCall = () => {
    webrtcService.endCall();
    setActiveCall(null);
  };

  const toggleMute = () => {
    const newMuted = webrtcService.toggleMute();
    setIsMuted(newMuted);
  };

  const toggleVideo = () => {
    const newVideoOff = webrtcService.toggleVideo();
    setIsVideoOff(newVideoOff);
  };

  return (
    <>
      {/* Incoming call dialog */}
      <Dialog open={!!incomingCall} onOpenChange={() => setIncomingCall(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-incoming-call">
          <DialogHeader>
            <DialogTitle>Incoming {incomingCall?.callType} call</DialogTitle>
            <DialogDescription>
              {incomingCall?.callerName} is calling you
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-4 mt-6">
            <Button
              onClick={rejectCall}
              variant="destructive"
              size="lg"
              className="rounded-full p-4"
              data-testid="button-reject-call"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              onClick={answerCall}
              variant="default"
              size="lg"
              className="rounded-full p-4 bg-green-600 hover:bg-green-700"
              data-testid="button-answer-call"
            >
              {incomingCall?.callType === 'video' ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active call dialog */}
      <Dialog open={!!activeCall} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-2xl h-[600px]" data-testid="dialog-active-call">
          <DialogHeader>
            <DialogTitle>
              {activeCall?.callType === 'video' ? 'Video Call' : 'Voice Call'} with {activeCall?.otherUserName}
            </DialogTitle>
            <DialogDescription>
              {activeCall?.status === 'connecting' && 'Connecting...'}
              {activeCall?.status === 'ringing' && 'Ringing...'}
              {activeCall?.status === 'active' && 'Call in progress'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 relative">
            {activeCall?.callType === 'video' && (
              <>
                {/* Remote video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover bg-gray-900 rounded-lg"
                  data-testid="video-remote"
                />
                
                {/* Local video (picture-in-picture) */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute top-4 right-4 w-32 h-24 object-cover bg-gray-700 rounded-lg border-2 border-white"
                  data-testid="video-local"
                />
              </>
            )}
            
            {activeCall?.callType === 'voice' && (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <div className="text-center text-white">
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-12 w-12" />
                  </div>
                  <h3 className="text-xl font-semibold">{activeCall.otherUserName}</h3>
                  <p className="text-white/80">{activeCall.status}</p>
                </div>
                {/* Audio element for voice calls */}
                <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
              </div>
            )}
          </div>

          {/* Call controls */}
          <div className="flex justify-center gap-4 mt-4">
            <Button
              onClick={toggleMute}
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full p-4"
              data-testid="button-toggle-mute"
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            
            {activeCall?.callType === 'video' && (
              <Button
                onClick={toggleVideo}
                variant={isVideoOff ? "destructive" : "secondary"}
                size="lg"
                className="rounded-full p-4"
                data-testid="button-toggle-video"
              >
                {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>
            )}
            
            <Button
              onClick={endCall}
              variant="destructive"
              size="lg"
              className="rounded-full p-4"
              data-testid="button-end-call"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Call action buttons component for chat interface
interface CallButtonsProps {
  userId: string;
  userName: string;
  onStartCall: (receiverId: string, receiverName: string, callType: 'voice' | 'video') => void;
}

export function CallButtons({ userId, userName, onStartCall }: CallButtonsProps) {
  const handleVoiceCall = () => {
    if (globalCallManager) {
      globalCallManager.startCall(userId, userName, 'voice');
    } else {
      onStartCall(userId, userName, 'voice');
    }
  };

  const handleVideoCall = () => {
    if (globalCallManager) {
      globalCallManager.startCall(userId, userName, 'video');
    } else {
      onStartCall(userId, userName, 'video');
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleVoiceCall}
        variant="ghost"
        size="sm"
        className="rounded-full p-2"
        data-testid={`button-voice-call-${userId}`}
      >
        <PhoneCall className="h-4 w-4" />
      </Button>
      <Button
        onClick={handleVideoCall}
        variant="ghost"
        size="sm"
        className="rounded-full p-2"
        data-testid={`button-video-call-${userId}`}
      >
        <Video className="h-4 w-4" />
      </Button>
    </div>
  );
}