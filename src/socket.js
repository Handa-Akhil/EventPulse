import { io } from "socket.io-client";
import { getSessionToken } from "./services/session.js";

function getSocketBaseUrl() {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return undefined;
}

const socket = io(getSocketBaseUrl(), {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export function connectSocket() {
  const token = getSessionToken();

  if (!token) {
    return;
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  socket.auth = {};

  if (socket.connected) {
    socket.disconnect();
  }
}

export default socket;
