/**
 * Dynamic Service JSON-LD for website pages.
 */

const trimSlash = (value) => String(value || "").replace(/\/+$/, "");

const absoluteUrl = (pathOrUrl, base) => {
    if (!pathOrUrl) return "";
    const raw = String(pathOrUrl).trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    const origin = trimSlash(base);
    if (!origin) return raw;
    return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

const getSiteUrl = () =>
    trimSlash(process.env.WEBSITE_URL || process.env.SCHEMA_ORG_URL || "https://grandeurnet.com");

const getApiPublicUrl = () =>
    trimSlash(
        process.env.API_PUBLIC_URL ||
            process.env.BACKEND_URL ||
            `http://localhost:${process.env.PORT || 5500}`
    );

const getServicePath = () => {
    const path = String(process.env.WEBSITE_SERVICE_PATH || "/services").trim() || "/services";
    return path.startsWith("/") ? path.replace(/\/+$/, "") : `/${path.replace(/\/+$/, "")}`;
};

const getOrg = () => {
    const site = getSiteUrl();
    const name = process.env.SCHEMA_ORG_NAME || "Grandeur Net";
    const url = trimSlash(process.env.SCHEMA_ORG_URL || site) + "/";
    return { name, url };
};

const buildServiceSchema = (service) => {
    const site = getSiteUrl();
    const api = getApiPublicUrl();
    const org = getOrg();
    const slug = String(service?.slug || "").trim();
    const pageUrl =
        String(service?.canonical || "").trim() ||
        (slug ? `${site}${getServicePath()}/${slug}` : `${site}${getServicePath()}`);

    const name = String(service?.metaTitle || service?.mainHeading || "").trim();
    const description = String(
        service?.metaDescription || service?.shortDescription || service?.shortHeading || ""
    ).trim();

    const images = [];
    if (service?.mainImage?.url) {
        const u = absoluteUrl(service.mainImage.url, api);
        if (u) images.push(u);
    }
    for (const img of service?.otherImages || []) {
        const u = absoluteUrl(img?.url, api);
        if (u && !images.includes(u)) images.push(u);
    }

    const schema = {
        "@context": "https://schema.org",
        "@type": "Service",
        name: name || undefined,
        description: description || undefined,
        url: pageUrl,
        image: images.length ? images : undefined,
        provider: {
            "@type": "Organization",
            name: org.name,
            url: org.url,
        },
        areaServed: "India",
    };

    if (!schema.name) delete schema.name;
    if (!schema.description) delete schema.description;
    if (!schema.image) delete schema.image;

    return schema;
};

const withServiceSchema = (service) => {
    if (!service) return service;
    const plain = typeof service.toObject === "function" ? service.toObject() : { ...service };
    const schema = buildServiceSchema(plain);
    return {
        ...plain,
        schema,
        schemaJson: JSON.stringify(schema, null, 2),
    };
};

module.exports = {
    buildServiceSchema,
    withServiceSchema,
};
