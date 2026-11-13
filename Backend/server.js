const http = require("http");
const app = require("./app");
const { initSocket } = require("./utils/socket");
const { startVendorDocumentReminderJob } = require("./jobs/vendorDocumentReminder.job");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
    startVendorDocumentReminderJob();
});

process.on("unhandledRejection", (reason) => {
    console.error(`[${new Date().toISOString()}] UNHANDLED REJECTION:`, reason);
    server.close(() => {
        console.error("Server closed due to unhandled rejection. Exiting...");
        process.exit(1);
    });
});

process.on("uncaughtException", (err) => {
    console.error(`[${new Date().toISOString()}] UNCAUGHT EXCEPTION:`, err.stack || err.message);
    server.close(() => {
        console.error("Server closed due to uncaught exception. Exiting...");
        process.exit(1);
    });
});

process.on("SIGTERM", () => {
    console.log(`[${new Date().toISOString()}] SIGTERM received. Shutting down gracefully...`);
    server.close(() => {
        console.log("Server closed. Goodbye.");
        process.exit(0);
    });
});
