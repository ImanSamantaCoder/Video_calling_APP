import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from "../context/SocketProvider";
import peer from "../service/peer";

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [stream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [canNegotiate, setCanNegotiate] = useState(true);
  const [isConnectionStable, setIsConnectionStable] = useState(false); // ✅ new

  // 🟢 When another user joins the room
  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`✅ ${email} joined the room`);
    setRemoteSocketId(id);
  }, []);

  // 📞 When I click CALL (Caller)
  const handleCallUser = useCallback(async () => {
    console.log("📞 Starting call...");

    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(localStream);

    const offer = await peer.getOffer(localStream);
    console.log("📤 Sending offer:", offer);
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [socket, remoteSocketId]);

  // 📩 When OFFER comes from another user (Receiver)
  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      console.log("📞 Incoming call from:", from);

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(localStream);

      const ans = await peer.getAnswer(offer, localStream);
      console.log("📤 Sending answer:", ans);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  // ✅ When ANSWER comes back (Caller)
  const handleCallAccepted = useCallback(
    async ({ from, ans }) => {
      console.log("✅ Call accepted by:", from);
      await peer.setRemoteDescription(ans);
    },
    []
  );

  // ⚙️ Handle negotiationneeded safely
  const handleNegotiationNeeded = useCallback(async () => {
    // 🧱 NEW: ignore negotiation until stable connection
    if (!isConnectionStable) {
      console.log("⏸️ Ignoring negotiation — connection not stable yet");
      return;
    }

    if (!canNegotiate) {
      console.log("⏸️ Skipping negotiation (recently triggered)");
      return;
    }

    try {
      setCanNegotiate(false);
      console.log("⚙️ negotiationneeded fired — creating new offer...");

      const offer = await peer.peer.createOffer();
      await peer.peer.setLocalDescription(offer);
      socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
    } catch (err) {
      console.error("❌ Negotiation error:", err);
    } finally {
      setTimeout(() => setCanNegotiate(true), 1000);
    }
  }, [socket, remoteSocketId, canNegotiate, isConnectionStable]);

  const handleNegoNeedIncoming = useCallback(
    async ({ from, offer }) => {
      console.log("🔁 Incoming negotiation offer from:", from);
      const ans = await peer.getAnswer(offer, stream);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket, stream]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    if (!ans?.sdp || !ans?.type) {
      console.warn("⚠️ Skipping invalid negotiation answer:", ans);
      return;
    }
    console.log("🔁 Final negotiation answer received");
    await peer.setRemoteDescription(ans);
  }, []);

  // 🎥 Remote media
  useEffect(() => {
    if (!peer.peer) return;
    peer.peer.ontrack = (event) => {
      const [remoteStream] = event.streams;
      console.log("📡 Remote stream received");
      setRemoteStream(remoteStream);
    };

    // 🧱 Detect stable connection state
    peer.peer.onconnectionstatechange = () => {
      console.log("🔗 Connection state:", peer.peer.connectionState);
      if (peer.peer.connectionState === "connected") {
        console.log("✅ Connection stable — negotiation allowed now");
        setIsConnectionStable(true);
      }
    };
  }, []);

  // 🧩 negotiationneeded event listener
  useEffect(() => {
    if (!peer.peer) return;
    peer.peer.addEventListener("negotiationneeded", handleNegotiationNeeded);
    return () => {
      peer.peer.removeEventListener(
        "negotiationneeded",
        handleNegotiationNeeded
      );
    };
  }, [handleNegotiationNeeded]);

  // 🔌 Socket event registration
  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncoming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncoming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleNegoNeedIncoming,
    handleNegoNeedFinal,
  ]);

  return (
    <div>
      <h1>Room Page</h1>
      <h2>{remoteSocketId ? "Connected ✅" : "Waiting for user..."}</h2>

      {remoteSocketId && <button onClick={handleCallUser}>📞 Call</button>}

      {/* Local video */}
      {stream && (
        <video
          autoPlay
          muted
          playsInline
          ref={(videoEl) => {
            if (videoEl) videoEl.srcObject = stream;
          }}
          style={{ height: "300px", width: "250px", background: "#000" }}
        />
      )}

      {/* Remote video */}
      {remoteStream && (
        <video
          autoPlay
          playsInline
          ref={(videoEl) => {
            if (videoEl) videoEl.srcObject = remoteStream;
          }}
          style={{ height: "300px", width: "250px", background: "#000" }}
        />
      )}
    </div>
  );
};

export default RoomPage;
