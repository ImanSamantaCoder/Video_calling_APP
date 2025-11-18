const { Server } = require("socket.io");

const io = new Server(8000, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // 🏠 User joins a room
  socket.on("room:join", ({ email, room }) => {
    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);

    socket.join(room);
    socket.emit("room:joined", { email, room });

    const roomMembers = Array.from(io.sockets.adapter.rooms.get(room) || []);

    // Notify both users once room has 2 members
    if (roomMembers.length === 2) {
      const otherSocketId = roomMembers.find((id) => id !== socket.id);
      const otherEmail = socketIdToEmailMap.get(otherSocketId);

      // Tell existing user about new user
      io.to(otherSocketId).emit("user:joined", { email, id: socket.id });

      // Tell new user about existing user
      setTimeout(() => {
        io.to(socket.id).emit("user:joined", { email: otherEmail, id: otherSocketId });
      }, 100);
    }
  });

  // 📞 When caller sends offer
  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incoming:call", { from: socket.id, offer });
  });

  // ✅ When callee accepts call (sends answer)
  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  // 🔁 Negotiation handling (optional for ICE restarts)
  socket.on("peer:nego:needed", ({ to, offer }) => {
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  // 🧊 ICE candidate exchange (for NAT traversal)
  socket.on("ice:candidate", ({ to, candidate }) => {
    io.to(to).emit("ice:candidate", { from: socket.id, candidate });
  });

  // ❌ Handle user disconnect
  socket.on("disconnect", () => {
    const email = socketIdToEmailMap.get(socket.id);
    socketIdToEmailMap.delete(socket.id);
    if (email) emailToSocketIdMap.delete(email);
    console.log("❌ Socket disconnected:", socket.id);
  });
});

console.log("🚀 Socket.IO signaling server running on port 8000");
