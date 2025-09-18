export class WebRTCService {
  private ws: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private userId: string | null = null;

  // Event handlers
  onIncomingCall?: (callInfo: {
    callId: string;
    callerId: string;
    callerName: string;
    callType: 'voice' | 'video';
  }) => void;
  
  onCallAnswered?: () => void;
  onCallRejected?: () => void;
  onCallEnded?: (reason?: string) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onCallFailed?: (reason: string) => void;

  constructor() {
    this.setupPeerConnection();
  }

  private setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentCallId) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          callId: this.currentCallId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStream?.(this.remoteStream);
    };
  }

  connect(userId: string) {
    this.userId = userId;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-signaling`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.sendSignalingMessage({
        type: 'register',
        userId
      });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleSignalingMessage(message);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (this.userId) {
          this.connect(this.userId);
        }
      }, 3000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private async handleSignalingMessage(message: any) {
    switch (message.type) {
      case 'call-initiated':
        this.currentCallId = message.callId;
        break;

      case 'incoming-call':
        this.currentCallId = message.callId;
        this.onIncomingCall?.({
          callId: message.callId,
          callerId: message.callerId,
          callerName: message.callerName,
          callType: message.callType
        });
        
        // Set remote description from offer
        if (this.peerConnection && message.offer) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        }
        break;

      case 'call-answered':
        if (this.peerConnection && message.answer) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
          this.onCallAnswered?.();
        }
        break;

      case 'call-rejected':
        this.currentCallId = null;
        this.onCallRejected?.();
        this.cleanup();
        break;

      case 'call-ended':
        this.currentCallId = null;
        this.onCallEnded?.(message.reason);
        this.cleanup();
        break;

      case 'call-failed':
        this.currentCallId = null;
        this.onCallFailed?.(message.reason);
        this.cleanup();
        break;

      case 'ice-candidate':
        if (this.peerConnection && message.candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
        break;
    }
  }

  async startCall(receiverId: string, callType: 'voice' | 'video', callerName: string) {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });

      this.onLocalStream?.(this.localStream);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Create offer
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      // Send offer through signaling
      this.sendSignalingMessage({
        type: 'call-offer',
        receiverId,
        offer,
        callType,
        callerName
      });

    } catch (error) {
      console.error('Error starting call:', error);
      this.onCallFailed?.('Failed to access media devices');
    }
  }

  async answerCall(callId: string, callType: 'voice' | 'video') {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });

      this.onLocalStream?.(this.localStream);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Create answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      // Send answer through signaling
      this.sendSignalingMessage({
        type: 'call-answer',
        callId,
        answer
      });

    } catch (error) {
      console.error('Error answering call:', error);
      this.rejectCall(callId);
    }
  }

  rejectCall(callId: string) {
    this.sendSignalingMessage({
      type: 'call-reject',
      callId
    });
    this.currentCallId = null;
    this.cleanup();
  }

  endCall() {
    if (this.currentCallId) {
      this.sendSignalingMessage({
        type: 'call-end',
        callId: this.currentCallId
      });
    }
    this.currentCallId = null;
    this.cleanup();
  }

  toggleMute() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return !audioTracks[0]?.enabled;
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return !videoTracks[0]?.enabled;
    }
    return false;
  }

  private sendSignalingMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.setupPeerConnection(); // Create new one for next call
    }

    this.remoteStream = null;
  }

  disconnect() {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const webrtcService = new WebRTCService();