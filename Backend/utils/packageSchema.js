/**
 * Dynamic Package JSON-LD for website pages.
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

const getPackagePath = () => {
    const path = String(process.env.WEBSITE_PACKAGE_PATH || "/tour-packages").trim() || "/tour-packages";
    return path.startsWith("/") ? path.replace(/\/+$/, "") : `/${path.replace(/\/+$/, "")}`;
};

const getOrg = () => {
    const site = getSiteUrl();
    const name = process.env.SCHEMA_ORG_NAME || "Grandeur Net";
    const url = trimSlash(process.env.SCHEMA_ORG_URL || site) + "/";
    return { name, url };
};

const buildPackageSchema = (pkg) => {
    const site = getSiteUrl();
    const api = getApiPublicUrl();
    const org = getOrg();
    const slug = String(pkg?.slug || "").trim();
    const pageUrl =
        String(pkg?.canonical || "").trim() ||
        (slug ? `${site}${getPackagePath()}/${slug}` : `${site}${getPackagePath()}`);

    const name = String(pkg?.metaTitle || pkg?.mainHeading || "").trim();
    const description = String(
        pkg?.metaDescription || pkg?.shortDescription || pkg?.shortHeading || ""
    ).trim();

    const images = [];
    if (pkg?.mainImage?.url) {
        const u = absoluteUrl(pkg.mainImage.url, api);
        if (u) images.push(u);
    }
    for (const img of pkg?.otherImages || []) {
        const u = absoluteUrl(img?.url, api);
        if (u && !images.includes(u)) images.push(u);
    }

    const schema = {
        "@context": "https://schema.org",
        "@type": "TouristTrip",
        name: name || undefined,
        description: description || undefined,
        url: pageUrl,
        image: images.length ? images : undefined,
        touristType: "Leisure",
        provider: {
            "@type": "Organization",
            name: org.name,
            url: org.url,
        },
    };

    if (pkg?.priceFrom != null && Number(pkg.priceFrom) > 0) {
        schema.offers = {
            "@type": "Offer",
            priceCurrency: "INR",
            price: Number(pkg.priceFrom),
            availability: "https://schema.org/InStock",
        };
    }

    if (!schema.name) delete schema.name;
    if (!schema.description) delete schema.description;
    if (!schema.image) delete schema.image;

    return schema;
};

const withPackageSchema = (pkg) => {
    if (!pkg) return pkg;
    const plain = typeof pkg.toObject === "function" ? pkg.toObject() : { ...pkg };
    const schema = buildPackageSchema(plain);
    return {
        ...plain,
        schema,
        schemaJson: JSON.stringify(schema, null, 2),
    };
};

module.exports = {
    buildPackageSchema,
    withPackageSchema,
};
