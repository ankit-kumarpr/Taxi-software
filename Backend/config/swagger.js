const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Taxi / Admin API",
            version: "1.0.0",
            description: "Auth, Departments, Designations, Vendor Types & Vendors",
        },
        servers: [
            {
                url: process.env.API_URL || "http://localhost:5500",
                description: "API Server",
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [{ BearerAuth: [] }],
    },
    apis: ["./routes/*.js"],
};

const specs = swaggerJsDoc(options);

const setupSwagger = (app) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
    console.log("✅ Swagger docs available at /api-docs");
};

module.exports = setupSwagger;
