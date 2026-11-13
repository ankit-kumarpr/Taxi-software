require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const { connectDB } = require("./config/db");
const setupSwagger = require("./config/swagger");

const app = express();

app.set("trust proxy", 1);

connectDB();
setupSwagger(app);

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'", "ws:", "wss:"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        crossOriginEmbedderPolicy: false,
        // Allow frontend (different origin/port) to load /uploads images (logo, docs)
        crossOriginResourcePolicy: { policy: "cross-origin" },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        noSniff: true,
        xssFilter: true,
        hidePoweredBy: true,
        frameguard: { action: "deny" },
    })
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : ["http://localhost:3000", "http://localhost:5173"];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow non-browser clients (Postman, server-to-server) with no Origin
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept"],
        exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
        maxAge: 86400,
    })
);

app.use(compression({ level: 6, threshold: 1024 }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const globalLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 10 minutes",
    },
    skip: (req) => req.path === "/api/v1/health",
});
app.use(globalLimiter);

app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/admin", require("./routes/admin.routes"));
app.use("/api/v1/vendor", require("./routes/vendorSelf.routes"));
app.use("/api/v1/driver", require("./routes/driverSelf.routes"));
app.use("/api/v1/car-types", require("./routes/carType.routes"));
app.use("/api/v1/trip-types", require("./routes/tripType.read.routes"));
app.use("/api/v1/drivers", require("./routes/driver.routes"));
app.use("/api/v1/vehicles", require("./routes/vehicle.routes"));
app.use("/api/v1/blogs", require("./routes/blog.public.routes"));
app.use("/api/v1/services", require("./routes/service.public.routes"));
app.use("/api/v1/packages", require("./routes/package.public.routes"));
app.use("/api/v1/website/vehicles", require("./routes/vehicle.public.routes"));
app.use("/api/v1/website/inquiries", require("./routes/websiteInquiry.routes"));

app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API is running",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
    if (err.message && err.message.startsWith("CORS policy")) {
        return res.status(403).json({ success: false, message: err.message });
    }

    if (err.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: `Invalid ${err.path}: '${err.value}' is not a valid ID`,
        });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        return res.status(409).json({
            success: false,
            message: `Duplicate value: '${err.keyValue?.[field]}' already exists for ${field}`,
        });
    }

    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({
            success: false,
            message: messages.join(", "),
        });
    }

    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
    if (err.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Token expired", code: "TOKEN_EXPIRED" });
    }

    const status = err.status || err.statusCode || 500;
    console.error(`[${new Date().toISOString()}] ERROR ${status}:`, err.stack || err.message);

    res.status(status).json({
        success: false,
        message:
            process.env.NODE_ENV === "production"
                ? "Internal Server Error"
                : err.message || "Internal Server Error",
    });
});

module.exports = app;
