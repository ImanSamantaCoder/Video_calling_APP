import React, { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  // ✅ Include the protocol (http://)
  const socket = useMemo(
    () => io("http://localhost:8000", { transports: ["websocket"] }),
    []
  );

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
