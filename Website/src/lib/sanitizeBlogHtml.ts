/** Quill/CMS often saves every space as &nbsp; which prevents wrapping and clips text. */
export function sanitizeBlogHtml(html: string) {
  if (!html) return "";

  return (
    String(html)
      // non-breaking spaces → normal spaces (entity + unicode)
      .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
      .replace(/\u00a0/g, " ")
      // empty paragraphs Quill inserts
      .replace(/<p>\s*<\/p>/gi, "")
      .replace(/<p><br\s*\/?><\/p>/gi, "")
      // collapse runs of spaces inside tags' text nodes (simple pass)
      .replace(/ {2,}/g, " ")
      .trim()
  );
}
