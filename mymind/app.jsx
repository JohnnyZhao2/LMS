import { useState, useRef, useEffect, useCallback } from "react";
import { INITIAL_CARDS, SPACES } from './constants';
import { plain } from './utils';
import { Card } from './card';
import { Detail } from './detail-modal';
import { AddModal } from './add-modal';
import { AddInlineCard } from './add-inline-card';
import { globalStyles } from './styles';

export default function App() {
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [activeSpace, setActiveSpace] = useState(null);
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [detail, setDetail] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [toast, setToast] = useState(null);
  const inputRef = useRef(null);

  const toast_ = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const del = useCallback(id => {
    setCards(p => p.filter(c => c.id !== id));
    toast_("已删除");
  }, []);

  const update = useCallback(data => {
    setCards(p => p.map(c => c.id === data.id ? data : c));
    toast_("已保存");
  }, []);

  const add = useCallback(data => {
    setCards(p => [data, ...p]);
    toast_("已保存");
  }, []);

  useEffect(() => {
    if (!document.querySelector('link[href*="quill.bubble"]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.bubble.min.css";
      document.head.appendChild(l);
    }
    if (!window.Quill) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
      document.head.appendChild(s);
    }
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && !detail && !addModal) {
        setSearch("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [detail, addModal]);

  const filtered = cards.filter(c => {
    if (activeSpace && c.space !== activeSpace) return false;
    const q = search.toLowerCase();
    return !q || plain(c.content).toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (c.caption || "").toLowerCase().includes(q);
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#e8eaec",
      fontFamily: "'DM Sans','PingFang SC',-apple-system,sans-serif"
    }}>
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(232,234,236,0.92)",
        backdropFilter: "blur(20px)"
      }}>
        <div style={{ padding: "20px 28px 0", position: "relative" }}>
          <p style={{
            position: "absolute",
            top: 14,
            left: 28,
            fontSize: "clamp(24px, 3.5vw, 42px)",
            fontStyle: "italic",
            fontWeight: 300,
            color: "rgba(0,0,0,0.12)",
            pointerEvents: "none",
            userSelect: "none",
            letterSpacing: "-0.02em",
            fontFamily: "Georgia, 'Times New Roman', serif",
            opacity: searchFocus || search ? 0 : 1,
            transition: "opacity .2s",
            lineHeight: 1,
          }}>
            搜索知识库…
          </p>
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              outline: "none",
              fontSize: "clamp(24px, 3.5vw, 42px)",
              fontStyle: "italic",
              fontWeight: 300,
              color: "#222",
              letterSpacing: "-0.02em",
              fontFamily: "Georgia, 'Times New Roman', serif",
              lineHeight: 1,
              padding: 0,
            }}
          />
          <div style={{
            height: 1,
            background: "rgba(0,0,0,0.1)",
            marginTop: 10
          }} />
        </div>

        <div style={{
          padding: "10px 24px 12px",
          display: "flex",
          gap: 6,
          flexWrap: "wrap"
        }}>
          {SPACES.map(s => {
            const active = activeSpace === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSpace(active ? null : s.id)}
                style={{
                  border: `2px solid ${active ? s.color : "rgba(0,0,0,0.12)"}`,
                  borderRadius: 100,
                  padding: "4px 14px",
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  background: active ? `${s.color}18` : "transparent",
                  color: active ? s.color : "#888",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all .15s",
                }}
              >
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: `2px solid ${active ? s.color : "#ccc"}`,
                  display: "inline-block",
                  background: active ? s.color : "none",
                  transition: "all .15s"
                }} />
                {s.label}
              </button>
            );
          })}
        </div>
      </header>

      <main style={{
        padding: "16px 20px 100px",
        maxWidth: 1400,
        margin: "0 auto"
      }}>
        <div style={{ columns: "240px", columnGap: 12 }}>
          <AddInlineCard
            onSave={(text) => {
              add({
                id: Date.now(),
                space: activeSpace || null,
                tags: [],
                content: `<p>${text}</p>`,
                link: null,
                note: "",
                caption: text.slice(0, 24),
                createdAt: Date.now()
              });
            }}
            onExpand={(prefill) => setAddModal(true)}
          />

          {filtered.map((card, i) => (
            <div
              key={card.id}
              style={{
                animation: "appear .25s ease both",
                animationDelay: `${i * 0.015}s`
              }}
            >
              <Card card={card} onClick={c => setDetail(c)} />
            </div>
          ))}
        </div>

        {search && filtered.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "80px 0",
            color: "#aaa",
            fontSize: 15,
            fontStyle: "italic",
            fontFamily: "Georgia, serif"
          }}>
            没有找到「{search}」
          </div>
        )}
      </main>

      {detail && (
        <Detail
          card={detail}
          onClose={() => setDetail(null)}
          onUpdate={d => {
            update(d);
            setDetail(d);
          }}
          onDelete={id => {
            del(id);
            setDetail(null);
          }}
        />
      )}

      {addModal && (
        <AddModal
          activeSpace={activeSpace}
          onClose={() => setAddModal(false)}
          onSave={d => {
            add(d);
            setAddModal(false);
          }}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#111",
          color: "#fff",
          padding: "9px 20px",
          borderRadius: 100,
          fontSize: 13,
          fontWeight: 500,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          zIndex: 9999,
          pointerEvents: "none",
          animation: "appear .2s ease"
        }}>
          {toast}
        </div>
      )}

      <style>{globalStyles}</style>
    </div>
  );
}
