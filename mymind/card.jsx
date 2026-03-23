import { useState } from "react";
import { bionicHtml, isLong, getH, plain, relTime } from './utils';
import { LinkIcon } from './icons';

export function Card({ card, onClick }) {
  const [hov, setHov] = useState(false);
  const long = isLong(card.content);
  const title = getH(card.content);
  const text = plain(card.content);
  const short = !long && text.length < 80;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onClick(card)}
      style={{ cursor: "pointer", breakInside: "avoid", marginBottom: 14 }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 18,
        padding: short ? "28px 26px 24px" : "24px 26px 22px",
        position: "relative",
        transition: "box-shadow .22s ease, transform .22s ease",
        boxShadow: hov
          ? "0 4px 20px rgba(0,0,0,0.08)"
          : "0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
        border: hov ? "2.5px solid #a8b8cc" : "2.5px solid transparent",
        transform: "none",
      }}>
        {long ? (
          <div className="card-rich" dangerouslySetInnerHTML={{ __html: bionicHtml(card.content) }} />
        ) : (
          <p style={{
            margin: 0,
            fontSize: short ? 20 : 15,
            lineHeight: short ? 1.45 : 1.72,
            color: "#1a1a1a",
            letterSpacing: short ? "-0.02em" : "-0.01em",
          }}
            dangerouslySetInnerHTML={{ __html: bionicHtml(text) }}
          />
        )}

        <div style={{
          marginTop: 14, display: "flex", alignItems: "center", gap: 8,
          opacity: hov ? 1 : 0,
          transform: hov ? "none" : "translateY(3px)",
          transition: "opacity .18s, transform .18s",
        }}>
          {card.link && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#ccc", fontSize: 11.5 }}>
              <LinkIcon /> {card.link.replace(/^https?:\/\//, "").split("/")[0]}
            </span>
          )}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "#ccc" }}>{relTime(card.createdAt)}</span>
        </div>
      </div>

      {(() => {
        const t = getH(card.content);
        const label = t || card.caption;
        if (!label) return null;
        return (
          <p style={{ margin: "5px 6px 0", fontSize: 12, color: "#b8b8b8", lineHeight: 1.3 }}>
            {label}
          </p>
        );
      })()}
    </div>
  );
}
