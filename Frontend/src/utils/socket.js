import { io } from "socket.io-client";
import Cookies from "js-cookie";

let socket = null;

const apiBase = () => {
  const url = import.meta.env.VITE_API_URL || "https://taxi-software.onrender.com/api/v1/";
  return url.replace(/\/api\/v1\/?$/, "");
};

export const getSocket = () => {
  if (socket?.connected) return socket;
  const token = Cookies.get("token");
  if (!token || token === "undefined" || token === "null") return null;

  if (!socket) {
    socket = io(apiBase(), {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) socket.connect();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
