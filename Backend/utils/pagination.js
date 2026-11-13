const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePagination = (page, limit) => {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    return { pageNum, limitNum, skip };
};

const paginationMeta = (total, pageNum, limitNum) => ({
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 0,
    limit: limitNum,
});

module.exports = { escapeRegex, parsePagination, paginationMeta };
