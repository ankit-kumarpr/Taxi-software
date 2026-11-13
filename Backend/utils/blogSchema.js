/**
 * Builds dynamic BlogPosting JSON-LD for a blog document.
 * Placeholders (BLOG_URL, title, image, dates, etc.) are filled from the blog + env.
 *
 * Env (optional):
 *   WEBSITE_URL              e.g. https://grandeurnet.com
 *   WEBSITE_BLOG_PATH        e.g. /blog   (default /blog)
 *   API_PUBLIC_URL           public origin for /uploads images
 *   SCHEMA_ORG_NAME          default "Grandeur Net"
 *   SCHEMA_ORG_URL           default WEBSITE_URL
 *   SCHEMA_ORG_LOGO          publisher logo URL
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

const toIso = (value) => {
    if (!value) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
};

const getSiteUrl = () =>
    trimSlash(process.env.WEBSITE_URL || process.env.SCHEMA_ORG_URL || "https://grandeurnet.com");

const getApiPublicUrl = () =>
    trimSlash(
        process.env.API_PUBLIC_URL ||
            process.env.BACKEND_URL ||
            `http://localhost:${process.env.PORT || 5500}`
    );

const getBlogPath = () => {
    const path = String(process.env.WEBSITE_BLOG_PATH || "/blog").trim() || "/blog";
    return path.startsWith("/") ? path.replace(/\/+$/, "") : `/${path.replace(/\/+$/, "")}`;
};

const getOrg = () => {
    const site = getSiteUrl();
    const name = process.env.SCHEMA_ORG_NAME || "Grandeur Net";
    const url = trimSlash(process.env.SCHEMA_ORG_URL || site) + "/";
    const logo =
        process.env.SCHEMA_ORG_LOGO ||
        absoluteUrl("/images/logo.png", site) ||
        "https://grandeurnet.com/images/logo.png";
    return { name, url, logo };
};

/**
 * @param {object} blog - lean blog document
 * @returns {object} schema.org BlogPosting JSON-LD
 */
const buildBlogPostingSchema = (blog) => {
    const site = getSiteUrl();
    const api = getApiPublicUrl();
    const org = getOrg();
    const slug = String(blog?.slug || "").trim();
    const blogUrl = slug ? `${site}${getBlogPath()}/${slug}` : `${site}${getBlogPath()}`;

    const headline = String(blog?.metaTitle || blog?.mainHeading || "").trim();
    const description = String(
        blog?.metaDescription || blog?.shortContent || blog?.shortHeading || ""
    ).trim();

    const images = [];
    if (blog?.mainImage?.url) {
        const u = absoluteUrl(blog.mainImage.url, api);
        if (u) images.push(u);
    }
    for (const img of blog?.otherImages || []) {
        const u = absoluteUrl(img?.url, api);
        if (u && !images.includes(u)) images.push(u);
    }

    const schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": blogUrl,
        },
        headline: headline || undefined,
        description: description || undefined,
        image: images.length ? images : undefined,
        author: {
            "@type": "Organization",
            name: org.name,
            url: org.url,
        },
        publisher: {
            "@type": "Organization",
            name: org.name,
            url: org.url,
            logo: {
                "@type": "ImageObject",
                url: org.logo,
            },
        },
        datePublished: toIso(blog?.createdAt),
        dateModified: toIso(blog?.updatedAt || blog?.createdAt),
    };

    // Drop undefined keys for clean JSON-LD
    if (!schema.headline) delete schema.headline;
    if (!schema.description) delete schema.description;
    if (!schema.image) delete schema.image;
    if (!schema.datePublished) delete schema.datePublished;
    if (!schema.dateModified) delete schema.dateModified;

    return schema;
};

/** Attach schema + schemaJson; strip legacy schemaScript from payload. */
const withBlogSchema = (blog) => {
    if (!blog) return blog;
    const plain = typeof blog.toObject === "function" ? blog.toObject() : { ...blog };
    delete plain.schemaScript;
    const schema = buildBlogPostingSchema(plain);
    return {
        ...plain,
        schema,
        schemaJson: JSON.stringify(schema, null, 2),
    };
};

module.exports = {
    buildBlogPostingSchema,
    withBlogSchema,
};
