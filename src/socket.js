import { io } from "socket.io-client";
import { getSessionToken } from "./services/session.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export function connectSocket(userId) {
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit("register", userId);
}

export function disconnectSocket() {
  socket.disconnect();
}

export default socket;