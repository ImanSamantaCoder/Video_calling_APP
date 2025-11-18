import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const socket = useSocket();
  const navigate = useNavigate();

  // ✅ When server confirms successful join
  const handleRoomJoined = useCallback(
    ({ email, room }) => {
      console.log("✅ Joined room successfully:", { email, room });
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  // 🔌 Listen for "room:joined"
  useEffect(() => {
    socket.on("room:joined", handleRoomJoined);

    // Clean up listener on unmount
    return () => {
      socket.off("room:joined", handleRoomJoined);
    };
  }, [socket, handleRoomJoined]);

  // 🚀 Emit join event on submit
  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();

      if (!email.trim() || !room.trim()) {
        alert("Please enter both email and room.");
        return;
      }

      console.log("➡️ Emitting room:join", { email, room });
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Lobby Screen</h1>
      <form onSubmit={handleSubmitForm} style={{ display: "inline-block" }}>
        <div>
          <label htmlFor="email">Email ID</label>
          <br />
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: "10px", padding: "5px", width: "200px" }}
          />
        </div>

        <div>
          <label htmlFor="room">Room</label>
          <br />
          <input
            type="text"
            id="room"
            placeholder="Enter room name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            required
            style={{ marginBottom: "10px", padding: "5px", width: "200px" }}
          />
        </div>

        <button type="submit" style={{ padding: "8px 20px", cursor: "pointer" }}>
          Join
        </button>
      </form>
    </div>
  );
};

export default LobbyScreen;
