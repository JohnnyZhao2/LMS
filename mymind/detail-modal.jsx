import { useState, useRef, useEffect } from "react";
import { SPACES, ALL_TAGS } from './constants';
import { bionicHtml, getH, relTime, spaceColor } from './utils';
import { XIcon, TrashIcon, CircleIcon, LinkIcon, PlusSmall } from './icons';
import { DetailEditor } from './detail-editor';

export function Detail({ card, onClose, onUpdate, onDelete }) {
  const [note, setNote] = useState(card.note || "");
  const [tags, setTags] = useState(card.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [space, setSpace] = useState(card.space || "");
  const [caption, setCaption] = useState(card.caption || "");
  const [showSpaces, setShowSpaces] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);
  const [quillReady, setQuillReady] = useState(!!window.Quill);
  const spaceTags = ALL_TAGS[space] || [];

  const addTag = (t) => {
    const v = t.trim();
    if (v && !tags.includes(v)) setTags(prev => [...prev, v]);
    setTagInput("");
  };
  const removeTag = (t) => setTags(prev => prev.filter(x => x !== t));

  useEffect(() => {
    const h = e => {
      if (e.key === "Escape") {
        if (showSpaces) setShowSpaces(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose, showSpaces]);

  useEffect(() => {
    if (window.Quill) {
      setQuillReady(true);
      return;
    }
    if (!document.querySelector('link[href*="quill.bubble"]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.bubble.min.css";
      document.head.appendChild(l);
    }
    if (!document.querySelector('script[src*="quill.min"]')) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
      s.onload = () => setQuillReady(true);
      document.head.appendChild(s);
    }
  }, []);

  const save = () => {
    onUpdate({ ...card, note, tags, space, caption, content: editContent });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn .18s ease"
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          display: "flex",
          width: "min(1100px, 96vw)",
          height: "min(700px, 92vh)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 40px 100px rgba(0,0,0,0.35)",
          animation: "popIn .22s cubic-bezier(.4,0,.2,1)",
          background: "#fff"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "60px 72px 80px",
          display: "flex",
          flexDirection: "column"
        }}>
          {editing
            ? (quillReady
              ? <DetailEditor value={editContent} onChange={setEditContent} />
              : <div style={{ color: "#ccc", fontSize: 13 }}>加载编辑器…</div>)
            : <div
              className="detail-content"
              onClick={() => setEditing(true)}
              style={{ cursor: "text", flex: 1, minHeight: "100%" }}
              dangerouslySetInnerHTML={{ __html: bionicHtml(card.content) }}
            />
          }
        </div>

        <div style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 280,
          height: 3,
          background: spaceColor(card.space),
          borderRadius: "0 18px 0 0",
          opacity: 0.7
        }} />

        <div style={{
          width: 300,
          background: "#eef0f3",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflowY: "auto",
          position: "relative"
        }}>
          <div style={{
            background: "linear-gradient(160deg, #dce4ee 0%, #eef0f3 100%)",
            padding: "22px 20px 16px"
          }}>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder={getH(card.content) || "Title goes here"}
              style={{
                width: "100%",
                border: "none",
                background: "none",
                outline: "none",
                fontSize: 17,
                fontWeight: 400,
                color: "#6a7a8a",
                marginBottom: 5,
                lineHeight: 1.3,
                fontFamily: "inherit",
                padding: 0
              }}
            />
            <p style={{ fontSize: 12, color: "#9aa0aa", margin: 0 }}>
              {relTime(card.createdAt)}
            </p>
          </div>

          <div style={{
            padding: "18px 20px",
            flex: 1,
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ marginBottom: 18 }}>
              <p style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#a0a8b0",
                margin: "0 0 10px"
              }}>
                系统标签
              </p>

              {showTagInput && (
                <div style={{
                  marginBottom: 8,
                  background: "#fff",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <input
                      autoFocus
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          addTag(tagInput);
                          setShowTagInput(false);
                        }
                        if (e.key === "Escape") {
                          setTagInput("");
                          setShowTagInput(false);
                        }
                      }}
                      placeholder=""
                      style={{
                        flex: 1,
                        border: "none",
                        background: "none",
                        padding: "10px 14px",
                        fontSize: 13.5,
                        color: "#333",
                        outline: "none",
                        fontFamily: "inherit"
                      }}
                    />
                    <button
                      onClick={() => {
                        addTag(tagInput);
                        setShowTagInput(false);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: "0 14px",
                        cursor: "pointer",
                        appearance: "none",
                        WebkitAppearance: "none",
                        color: "#e8793a",
                        fontSize: 20,
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      +
                    </button>
                  </div>
                  {spaceTags.filter(t => !tags.includes(t) && (!tagInput || t.toLowerCase().includes(tagInput.toLowerCase()))).length > 0 && (
                    <div style={{ borderTop: "1px solid #f0f0f0" }}>
                      {spaceTags.filter(t => !tags.includes(t) && (!tagInput || t.toLowerCase().includes(tagInput.toLowerCase()))).map(t => (
                        <button
                          key={t}
                          onClick={() => {
                            addTag(t);
                            setShowTagInput(false);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            background: "none",
                            padding: "9px 14px",
                            fontSize: 13.5,
                            color: "#333",
                            cursor: "pointer",
                            fontFamily: "inherit"
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                alignItems: "center"
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTagInput(v => !v);
                    setTagInput("");
                  }}
                  style={{
                    background: "#e8793a",
                    border: "none",
                    borderRadius: 100,
                    padding: "6px 16px",
                    fontSize: 13,
                    color: "#fff",
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                    fontFamily: "inherit",
                    fontWeight: 600
                  }}
                >
                  + 添加标签
                </button>
                {tags.map(t => (
                  <span
                    key={t}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "#e0e3e8",
                      border: "none",
                      borderRadius: 100,
                      padding: "5px 12px",
                      fontSize: 13,
                      color: "#555"
                    }}
                  >
                    {t}
                    <button
                      onClick={() => removeTag(t)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        appearance: "none",
                        WebkitAppearance: "none",
                        color: "#aaa",
                        display: "flex",
                        padding: 0
                      }}
                    >
                      <XIcon />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#a0a8b0",
                margin: "0 0 8px"
              }}>
                备注
              </p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="添加备注…"
                rows={3}
                style={{
                  width: "100%",
                  background: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#333",
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.6
                }}
              />
            </div>

            {card.link && (
              <a
                href={card.link}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  color: "#7a9baa",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  textDecoration: "none",
                  marginBottom: 14,
                  wordBreak: "break-all"
                }}
              >
                <LinkIcon />{card.link.replace(/^https?:\/\//, "")}
              </a>
            )}

            <div style={{ flex: 1 }} />
          </div>

          <div style={{
            borderTop: "1px solid rgba(0,0,0,0.07)",
            padding: "14px 20px 16px",
            position: "relative"
          }}>
            {showSpaces && (
              <div style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 20,
                right: 20,
                background: "#fff",
                borderRadius: 14,
                boxShadow: "0 -4px 28px rgba(0,0,0,0.13)",
                overflow: "hidden",
                zIndex: 10
              }}>
                {SPACES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSpace(s.id);
                      setShowSpaces(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "11px 16px",
                      background: space === s.id ? "#f0f4ff" : "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13.5,
                      color: "#333",
                      fontFamily: "inherit"
                    }}
                    onMouseEnter={e => {
                      if (space !== s.id) e.currentTarget.style.background = "#f9f9f9";
                    }}
                    onMouseLeave={e => {
                      if (space !== s.id) e.currentTarget.style.background = "none";
                    }}
                  >
                    <span style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: `2px solid ${space === s.id ? spaceColor(s.id) : "#ccc"}`,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {space === s.id && (
                        <span style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: spaceColor(s.id)
                        }} />
                      )}
                    </span>
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowSpaces(false)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 16px",
                    background: "none",
                    border: "none",
                    borderTop: "1px solid #f0f0f0",
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                    fontSize: 13.5,
                    color: "#e8793a",
                    fontFamily: "inherit"
                  }}
                >
                  <span style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#e8793a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "#fff"
                  }}>
                    <PlusSmall />
                  </span>
                  创建新空间
                </button>
              </div>
            )}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              marginBottom: editing ? 12 : 0
            }}>
              <button
                onClick={() => setShowSpaces(!showSpaces)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1.5px solid #d0d4d8",
                  background: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9aa0aa",
                  transition: "all .15s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#aaa";
                  e.currentTarget.style.color = "#555";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#d0d4d8";
                  e.currentTarget.style.color = "#9aa0aa";
                }}
              >
                <CircleIcon />
              </button>
              <button
                onClick={() => {
                  onDelete(card.id);
                  onClose();
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1.5px solid #d0d4d8",
                  background: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9aa0aa",
                  transition: "all .15s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#e44";
                  e.currentTarget.style.color = "#e44";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#d0d4d8";
                  e.currentTarget.style.color = "#9aa0aa";
                }}
              >
                <TrashIcon />
              </button>
            </div>
            {editing && (
              <button
                onClick={save}
                style={{
                  width: "100%",
                  background: "#111",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 0",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                  fontFamily: "inherit"
                }}
              >
                保存
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
