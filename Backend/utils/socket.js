const { Server } = require("socket.io");
const { verifyAccessToken } = require("./tokenUtils");

let io = null;

const getAllowedOrigins = () =>
    (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: getAllowedOrigins(),
            credentials: true,
        },
        path: "/socket.io",
    });

    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                (socket.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "");
            if (!token) return next(new Error("Unauthorized"));
            const decoded = verifyAccessToken(token);
            socket.user = {
                id: String(decoded.id),
                role: decoded.role || "ADMIN",
            };
            return next();
        } catch (err) {
            return next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        const { id, role } = socket.user;
        if (role === "ADMIN") {
            socket.join("admins");
            socket.join(`admin:${id}`);
        } else if (role === "VENDOR") {
            socket.join(`vendor:${id}`);
        } else if (role === "DRIVER") {
            socket.join(`driver:${id}`);
        }

        socket.on("disconnect", () => {});
    });

    return io;
};

const getIO = () => io;

const emitToAdmins = (event, payload) => {
    if (!io) return;
    io.to("admins").emit(event, payload);
};

const emitToVendor = (vendorId, event, payload) => {
    if (!io || !vendorId) return;
    io.to(`vendor:${String(vendorId)}`).emit(event, payload);
};

const emitToVendors = (vendorIds, event, payload) => {
    if (!io || !vendorIds?.length) return;
    for (const id of vendorIds) {
        emitToVendor(id, event, payload);
    }
};

module.exports = {
    initSocket,
    getIO,
    emitToAdmins,
    emitToVendor,
    emitToVendors,
};
