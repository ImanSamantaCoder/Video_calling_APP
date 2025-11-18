// /service/peer.js
class PeerService {
  constructor() {
    this.peer = null;
    this._lastLocalStream = null;
    this.createPeer();
  }

  // 🧩 Create a new RTCPeerConnection
  createPeer() {
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    });

    this.peer.onconnectionstatechange = () => {
      console.log("🔗 Connection state:", this.peer.connectionState);
    };

    this.peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 ICE candidate:", event.candidate);
      }
    };

    console.log("🆕 New RTCPeerConnection created");
  }

  // 📞 Create an SDP offer (caller)
  async getOffer(localStream) {
    try {
      // ✅ Only rebuild if peer is closed or missing
      if (!this.peer || this.peer.connectionState === "closed") {
        console.warn("⚠️ Creating new RTCPeerConnection (none active)");
        this.createPeer();
      }

      // Attach tracks safely
      if (localStream) {
        this._lastLocalStream = localStream;
        const senders = this.peer.getSenders();
        for (const track of localStream.getTracks()) {
          const already = senders.find((s) => s.track === track);
          if (!already) this.peer.addTrack(track, localStream);
        }
      }

      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(offer);
      return offer;
    } catch (err) {
      console.error("❌ Error creating offer:", err);
    }
  }

  // 📩 Create an SDP answer (callee)
  async getAnswer(offer, localStream) {
    try {
      if (!this.peer || this.peer.connectionState === "closed") {
        console.warn("⚠️ Creating new RTCPeerConnection for answer");
        this.createPeer();
      }

      if (localStream) {
        this._lastLocalStream = localStream;
        const senders = this.peer.getSenders();
        for (const track of localStream.getTracks()) {
          const already = senders.find((s) => s.track === track);
          if (!already) this.peer.addTrack(track, localStream);
        }
      }

      await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peer.createAnswer();
      await this.peer.setLocalDescription(answer);
      return answer;
    } catch (err) {
      console.error("❌ Error creating answer:", err);
    }
  }

  // 📡 Set the remote description
  async setRemoteDescription(ans) {
    try {
      if (!this.peer || !ans?.sdp || !ans?.type) {
        console.error("⚠️ Invalid SDP in setRemoteDescription:", ans);
        return;
      }
      await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
    } catch (err) {
      console.error("❌ setRemoteDescription failed:", err);
    }
  }

  // ♻️ Re-add old tracks if needed after reconnection
  reAddTracks() {
    if (this._lastLocalStream && this.peer) {
      for (const track of this._lastLocalStream.getTracks()) {
        const already = this.peer.getSenders().find((s) => s.track === track);
        if (!already) this.peer.addTrack(track, this._lastLocalStream);
      }
    }
  }
}

export default new PeerService();
