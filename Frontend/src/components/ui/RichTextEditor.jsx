import { useMemo } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { cn } from "../../utils/cn";

const FULL_TOOLBAR = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ size: ["small", false, "large", "huge"] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  ["blockquote", "code-block"],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ direction: "rtl" }],
  [{ align: [] }],
  ["link", "image", "video"],
  ["clean"],
];

function cleanQuillHtml(html) {
  return String(html || "")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/\u00a0/g, " ");
}

export function RichTextEditor({ value, onChange, placeholder = "Write content…", className = "" }) {
  const modules = useMemo(
    () => ({
      toolbar: FULL_TOOLBAR,
      clipboard: { matchVisual: false },
    }),
    []
  );

  const formats = useMemo(
    () => [
      "header",
      "font",
      "size",
      "bold",
      "italic",
      "underline",
      "strike",
      "color",
      "background",
      "script",
      "blockquote",
      "code-block",
      "list",
      "indent",
      "direction",
      "align",
      "link",
      "image",
      "video",
    ],
    []
  );

  return (
    <div className={cn("ui-rich-editor overflow-hidden rounded-lg border border-border bg-surface", className)}>
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={(html) => onChange?.(cleanQuillHtml(html))}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
