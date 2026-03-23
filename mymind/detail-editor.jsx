import { useRef, useEffect } from "react";

export function DetailEditor({ value, onChange }) {
  const ref = useRef(null);
  const q = useRef(null);

  useEffect(() => {
    if (q.current || !ref.current || !window.Quill) return;
    const inst = new window.Quill(ref.current, {
      theme: "bubble",
      placeholder: "编辑内容…",
      modules: {
        toolbar: [
          ["bold", "link"],
          [{ "background": [] }],
          [{ header: 1 }, { header: 2 }, { header: 3 }],
        ],
      },
    });
    if (value) inst.clipboard.dangerouslyPasteHTML(value);
    inst.on("text-change", () => {
      const h = inst.root.innerHTML;
      onChange(h === "<p><br></p>" ? "" : h);
    });
    q.current = inst;
  }, [value, onChange]);

  return (
    <div className="detail-editor-wrap" style={{ flex: 1, minHeight: 200 }}>
      <div ref={ref} />
    </div>
  );
}
