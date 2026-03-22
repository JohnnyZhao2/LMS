import { useState, useEffect } from "react";
import { SPACES, ALL_TAGS } from './constants';
import { plain, getH } from './utils';
import { XIcon, LinkIcon } from './icons';

export function AddModal({ activeSpace, onClose, onSave }) {
  const [space, setSpace] = useState(activeSpace || "");
  const [tags, setTags] = useState([]);
  const [tag, setTag] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [caption, setCaption] = useState("");
  const [ready, setReady] = useState(!!window.Quill);
  const spaceTags = ALL_TAGS[space] || [];

  useEffect(() => {
    if (window.Quill) {
      setReady(true);
      return;
    }
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.bubble.min.css";
    document.head.appendChild(l);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);

  const ok = content && content !== "<p><br></p>" && plain(content).trim().length > 0;

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeIn .15s ease"
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 560,
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "88vh",
          overflow: "hidden",
          animation: "popIn .2s ease"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: "18px 22px 0",
          display: "flex",
          gap: 8,
          alignItems: "center"
        }}>
          <div style={{ flex: 1, position: "relative" }}>
            <select
              value={space}
              onChange={e => {
                setSpace(e.target.value);
                setTag("");
              }}
              style={{
                width: "100%",
                border: "1.5px solid #eee",
                borderRadius: 10,
                padding: "8px 32px 8px 12px",
                fontSize: 13,
                color: space ? "#333" : "#bbb",
                background: "#fafafa",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="">选择空间</option>
              {SPACES.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#bbb",
              fontSize: 10
            }}>
              ▾
            </span>
          </div>
          {space && (ALL_TAGS[space] || []).length > 0 && (
            <div style={{ flex: 1, position: "relative" }}>
              <select
                value={tag}
                onChange={e => setTag(e.target.value)}
                style={{
                  width: "100%",
                  border: "1.5px solid #eee",
                  borderRadius: 10,
                  padding: "8px 32px 8px 12px",
                  fontSize: 13,
                  color: tag ? "#333" : "#bbb",
                  background: "#fafafa",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="">系统标签</option>
                {(ALL_TAGS[space] || []).map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "#bbb",
                fontSize: 10
              }}>
                ▾
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#ccc",
              display: "flex",
              padding: 4
            }}
          >
            <XIcon />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 22px" }}>
          <textarea
            value={plain(content)}
            onChange={e => setContent("<p>" + e.target.value.split("\n").join("</p><p>") + "</p>")}
            placeholder="写点什么…"
            autoFocus
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              background: "none",
              fontSize: 15,
              lineHeight: 1.75,
              color: "#1a1a1a",
              fontFamily: "inherit",
              minHeight: 200
            }}
          />
        </div>
        <div style={{
          padding: "10px 22px 18px",
          borderTop: "1px solid #f5f5f5",
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}>
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="卡片标题（展示在卡片底部）"
            style={{
              border: "1.5px solid #eee",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 13,
              color: "#333",
              outline: "none",
              background: "#fafafa"
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#ddd" }}>
              <LinkIcon />
            </span>
            <input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="关联链接（可选）"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 13,
                color: "#7090cc",
                background: "none"
              }}
            />
            <button
              onClick={onClose}
              style={{
                border: "1.5px solid #eee",
                borderRadius: 10,
                padding: "7px 14px",
                fontSize: 13,
                cursor: "pointer",
                background: "none",
                color: "#bbb",
                fontFamily: "inherit"
              }}
            >
              取消
            </button>
            <button
              onClick={() => {
                if (!ok) return;
                onSave({
                  id: Date.now(),
                  space: space || null,
                  tags: tags,
                  content,
                  link: link.trim() || null,
                  note: "",
                  caption: caption.trim() || getH(content) || plain(content).slice(0, 24),
                  createdAt: Date.now()
                });
                onClose();
              }}
              disabled={!ok}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "7px 20px",
                fontSize: 13,
                fontWeight: 500,
                cursor: ok ? "pointer" : "not-allowed",
                background: ok ? "#111" : "#f0f0f0",
                color: ok ? "#fff" : "#ccc",
                fontFamily: "inherit"
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
