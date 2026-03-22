// ── Bionic Reading (English only) ─────────────────────────────────────
function bionicHtml(html) {
    return html.replace(/(<[^>]+>)|([a-zA-Z]{3,})/g, (match, tag, word) => {
        if (tag) return tag;
        const n = Math.ceil(word.length * 0.6);
        return `<b style="font-weight:800;color:#111">${word.slice(0, n)}</b><span style="color:#aaa">${word.slice(n)}</span>`;
    });
}

import { useState, useRef, useEffect, useCallback } from "react";

const SPACES = [
    { id: "cloud", label: "双云", color: "#7a9baa" },  // 莫兰迪蓝灰
    { id: "network", label: "网络", color: "#8aaa8a" },  // 莫兰迪绿灰
    { id: "database", label: "数据库", color: "#b89a7a" },  // 莫兰迪棕褐
    { id: "app", label: "应用", color: "#9a8ab0" },  // 莫兰迪紫灰
    { id: "emergency", label: "应急", color: "#b08a8a" },  // 莫兰迪红褐
    { id: "regulation", label: "规章制度", color: "#9a9a8a" },  // 莫兰迪橄榄
];

function spaceColor(spaceId) {
    return SPACES.find(s => s.id === spaceId)?.color || "#aaa";
}

const ALL_TAGS = {
    cloud: ["阿里云", "腾讯云", "容器服务", "对象存储", "负载均衡"],
    network: ["防火墙", "VPN", "DNS", "SDN", "交换机"],
    database: ["MySQL", "Redis", "MongoDB", "备份策略", "主从同步"],
    app: ["部署流程", "微服务", "API网关", "监控告警", "日志管理"],
    emergency: ["故障处理", "灾备演练", "升级预案", "回滚流程"],
    regulation: ["操作规范", "审批流程", "安全合规", "变更管理"],
};

const INITIAL_CARDS = [
    { id: 1, space: "cloud", tags: ["阿里云"], content: "<p>ECS 实例到期前 30 天会收到告警通知，需提前在控制台续费，避免自动停机影响业务。</p>", link: null, note: "", caption: "", createdAt: Date.now() - 86400000 * 1 },
    { id: 2, space: "cloud", tags: ["容器服务"], content: "<h2>ACK 集群扩容流程</h2><h3>前置检查</h3><p>确认当前节点资源使用率，CPU &gt; 80% 或内存 &gt; 85% 时触发扩容。检查节点池配置，确认实例规格和镜像版本与现有节点一致。</p><h3>操作步骤</h3><ol><li>登录 ACK 控制台，进入目标集群</li><li>选择「节点管理 &gt; 节点池」</li><li>点击目标节点池的「扩容」按钮</li><li>填写扩容数量，建议每次不超过现有节点数的 50%</li><li>确认配置后提交，等待节点 Ready 状态</li></ol><p>扩容完成后执行 <code>kubectl get nodes</code> 确认新节点加入集群。</p>", link: "https://help.aliyun.com/ack", note: "", caption: "", createdAt: Date.now() - 86400000 * 2 },
    { id: 3, space: "network", tags: ["防火墙"], content: "<p>出方向默认放行，入方向默认拒绝。新增业务端口必须走变更审批流程，不得直接在控制台操作。</p>", link: null, note: "", caption: "", createdAt: Date.now() - 86400000 * 0.5 },
    { id: 4, space: "database", tags: ["Redis"], content: "<h2>Redis 主从切换操作规范</h2><p>主节点故障、维护升级、主动容灾演练等场景下需要进行主从切换。</p><ul><li>确认从节点复制延迟 &lt; 1s</li><li>通知业务方做好重连准备</li><li>确认监控告警已静默</li></ul><p>执行 <code>REPLICAOF NO ONE</code> 将从节点提升为主节点。切换中断约 10–30s。</p>", link: null, note: "", caption: "", createdAt: Date.now() - 86400000 * 3 },
    { id: 5, space: "emergency", tags: ["故障处理"], content: "<p>P0 故障响应时限 5 分钟，需立即拉起战情群，指定 Owner 和协助人，每 15 分钟同步一次进展。</p>", link: null, note: "", caption: "", createdAt: Date.now() - 86400000 * 1.5 },
    { id: 6, space: "app", tags: ["部署流程"], content: "<h2>生产环境发布流程</h2><p>发布窗口：周二、周四 20:00–22:00，紧急修复除外。节假日前最后一个工作日禁止发布。</p><ul><li>提前一天提交发布申请，附变更内容和回滚方案</li><li>测试环境验证通过，QA 签字确认</li><li>DBA 审核 SQL 变更（如有）</li></ul><p>灰度发布，先放 10% 流量，观察 15 分钟无异常后全量放开。</p>", link: "https://confluence.example.com/deploy", note: "", caption: "", createdAt: Date.now() - 86400000 * 4 },
    { id: 7, space: "regulation", tags: ["操作规范"], content: "<p>生产服务器禁止直接使用 root 账号登录，所有操作必须通过堡垒机，操作记录保留 180 天。</p>", link: null, note: "", caption: "", createdAt: Date.now() - 86400000 * 2 },
    { id: 8, space: "network", tags: ["DNS"], content: "<p>内网 DNS 解析 TTL 统一设置为 60s，外网 DNS TTL 不低于 300s。变更前确认 TTL 已降低，避免缓存导致切换延迟。</p>", link: null, note: "", caption: "", createdAt: Date.now() - 86400000 * 5 },
    { id: 9, space: "emergency", tags: ["灾备演练"], content: "<h2>季度灾备演练方案</h2><p>验证核心业务在主数据中心故障时，能否在 RTO 30 分钟内完成切换，RPO 不超过 5 分钟。</p><ol><li>通知各业务 Owner 演练时间</li><li>切断主数据中心同步链路</li><li>模拟主数据中心故障，触发自动切换</li><li>验证备用数据中心各服务正常运行</li><li>恢复主数据中心，执行数据回切</li></ol>", link: null, note: "", caption: "", createdAt: Date.now() - 86400000 * 6 },
    { id: 10, space: "database", tags: ["备份策略"], content: "<p>全量备份每天凌晨 2:00 执行，增量备份每小时一次。备份文件保留 30 天，异地存储至对象存储桶。</p>", link: null, note: "", caption: "", createdAt: Date.now() - 86400000 * 2.5 },
    { id: 11, space: "cloud", tags: ["对象存储"], content: "<p>OSS 跨区域复制开启后数据同步延迟约 15 分钟。源 Bucket 删除操作会同步至目标 Bucket，需谨慎操作。</p>", link: "https://help.aliyun.com/oss", note: "", caption: "", createdAt: Date.now() - 86400000 * 7 },
    { id: 12, space: "regulation", tags: ["变更管理"], content: "<p>所有生产变更必须提前 24 小时提交工单，紧急变更需 OnCall 负责人审批，事后 48 小时内补填变更报告。</p>", link: null, note: "", caption: "", createdAt: Date.now() - 86400000 * 3 },
];

function plain(html) {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function isLong(html) {
    return /<h[123]/.test(html) || plain(html).length > 160;
}
function getH(html) {
    const m = html.match(/<h[123][^>]*>(.*?)<\/h[123]>/i);
    return m ? plain(m[1]) : null;
}
function relTime(ts) {
    const d = Math.floor((Date.now() - ts) / 86400000);
    if (d === 0) return "今天";
    if (d === 1) return "昨天";
    if (d < 30) return `${d} 天前`;
    return `${Math.floor(d / 30)} 个月前`;
}

// ── Icons ──────────────────────────────────────────────────────────────
const XIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const TrashIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6m4-6v6" /><path d="M9 6V4h6v2" /></svg>;
const ShareIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>;
const CircleIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /></svg>;
const EditIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const PenIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const LinkIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
const PlusSmall = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;

// ── Card ──────────────────────────────────────────────────────────────
function Card({ card, onClick }) {
    const [hov, setHov] = useState(false);
    const long = isLong(card.content);
    const title = getH(card.content);
    const text = plain(card.content);
    const short = !long && text.length < 80;
    const bodyPreview = title ? text.replace(title, "").trim() : text;

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

                {/* Hover meta */}
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

            {/* Caption — show below card. For docs use h2 title, for notes use caption field */}
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

// ── Detail inline editor ──────────────────────────────────────────────
function DetailEditor({ value, onChange }) {
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
    }, []);
    return <div className="detail-editor-wrap" style={{ flex: 1, minHeight: 200 }}><div ref={ref} /></div>;
}

// ── Detail modal — left content + floating right panel ────────────────
function Detail({ card, onClose, onUpdate, onDelete }) {
    const [note, setNote] = useState(card.note || "");
    const [tags, setTags] = useState(card.tags || []);
    const [tagInput, setTagInput] = useState("");
    const [showTagInput, setShowTagInput] = useState(false);
    const [space, setSpace] = useState(card.space || "");
    const [caption, setCaption] = useState(card.caption || "");
    const [showSpaces, setShowSpaces] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState(card.content);
    const [contentChanged, setContentChanged] = useState(false);
    const [quillReady, setQuillReady] = useState(!!window.Quill);
    const original = useRef({ note: card.note || "", tags: (card.tags || []).join(","), space: card.space || "", caption: card.caption || "" });
    const spaceTags = ALL_TAGS[space] || [];
    const spaceLabel = SPACES.find(s => s.id === space)?.label;

    const addTag = (t) => {
        const v = t.trim();
        if (v && !tags.includes(v)) setTags(prev => [...prev, v]);
        setTagInput("");
    };
    const removeTag = (t) => setTags(prev => prev.filter(x => x !== t));

    useEffect(() => {
        const h = e => { if (e.key === "Escape") { if (showSpaces) setShowSpaces(false); else onClose(); } };
        window.addEventListener("keydown", h);
        document.body.style.overflow = "hidden";
        return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
    }, [onClose, showSpaces]);

    useEffect(() => {
        if (window.Quill) {
            setQuillReady(true);
            return;
        }
        // Preload Quill silently as soon as detail opens
        if (!document.querySelector('link[href*="quill.bubble"]')) {
            const l = document.createElement("link");
            l.rel = "stylesheet"; l.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.bubble.min.css";
            document.head.appendChild(l);
        }
        if (!document.querySelector('script[src*="quill.min"]')) {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
            s.onload = () => setQuillReady(true);
            document.head.appendChild(s);
        }
    }, []);



    const save = () => { onUpdate({ ...card, note, tags, space, caption, content: editContent }); };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn .18s ease" }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

            {/* Main container */}
            <div style={{ display: "flex", width: "min(1100px, 96vw)", height: "min(700px, 92vh)", borderRadius: 18, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.35)", animation: "popIn .22s cubic-bezier(.4,0,.2,1)", background: "#fff" }} onClick={e => e.stopPropagation()}>

                {/* Left — click text to edit */}
                <div style={{ flex: 1, overflowY: "auto", padding: "60px 72px 80px", display: "flex", flexDirection: "column" }}>
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

                {/* Color strip at top of right panel */}
                <div style={{ position: "absolute", top: 0, right: 0, width: 280, height: 3, background: spaceColor(card.space), borderRadius: "0 18px 0 0", opacity: 0.7 }} />
                {/* Right — meta panel */}
                <div style={{ width: 300, background: "#eef0f3", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto", position: "relative" }}>

                    {/* Header — gradient bg */}
                    <div style={{ background: "linear-gradient(160deg, #dce4ee 0%, #eef0f3 100%)", padding: "22px 20px 16px" }}>
                        <input
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            placeholder={getH(card.content) || "Title goes here"}
                            style={{ width: "100%", border: "none", background: "none", outline: "none", fontSize: 17, fontWeight: 400, color: "#6a7a8a", marginBottom: 5, lineHeight: 1.3, fontFamily: "inherit", padding: 0 }}
                        />
                        <p style={{ fontSize: 12, color: "#9aa0aa", margin: 0 }}>{relTime(card.createdAt)}</p>
                    </div>

                    {/* Body */}
                    <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column" }}>

                        {/* MIND TAGS */}
                        <div style={{ marginBottom: 18 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a0a8b0", margin: "0 0 10px" }}>系统标签</p>

                            {showTagInput && (
                                <div style={{ marginBottom: 8, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <input autoFocus value={tagInput} onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") { addTag(tagInput); setShowTagInput(false); }
                                                if (e.key === "Escape") { setTagInput(""); setShowTagInput(false); }
                                            }}
                                            placeholder=""
                                            style={{ flex: 1, border: "none", background: "none", padding: "10px 14px", fontSize: 13.5, color: "#333", outline: "none", fontFamily: "inherit" }}
                                        />
                                        <button onClick={() => { addTag(tagInput); setShowTagInput(false); }}
                                            style={{ background: "none", border: "none", padding: "0 14px", cursor: "pointer", appearance: "none", WebkitAppearance: "none", color: "#e8793a", fontSize: 20, display: "flex", alignItems: "center" }}>+</button>
                                    </div>
                                    {spaceTags.filter(t => !tags.includes(t) && (!tagInput || t.toLowerCase().includes(tagInput.toLowerCase()))).length > 0 && (
                                        <div style={{ borderTop: "1px solid #f0f0f0" }}>
                                            {spaceTags.filter(t => !tags.includes(t) && (!tagInput || t.toLowerCase().includes(tagInput.toLowerCase()))).map(t => (
                                                <button key={t} onClick={() => { addTag(t); setShowTagInput(false); }}
                                                    style={{ width: "100%", textAlign: "left", border: "none", background: "none", padding: "9px 14px", fontSize: 13.5, color: "#333", cursor: "pointer", fontFamily: "inherit" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                                <button onClick={(e) => { e.stopPropagation(); setShowTagInput(v => !v); setTagInput(""); }}
                                    style={{ background: "#e8793a", border: "none", borderRadius: 100, padding: "6px 16px", fontSize: 13, color: "#fff", cursor: "pointer", appearance: "none", WebkitAppearance: "none", fontFamily: "inherit", fontWeight: 600 }}>
                                    + 添加标签
                                </button>
                                {tags.map(t => (
                                    <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#e0e3e8", border: "none", borderRadius: 100, padding: "5px 12px", fontSize: 13, color: "#555" }}>
                                        {t}
                                        <button onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none", color: "#aaa", display: "flex", padding: 0 }}><XIcon /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* MIND NOTES */}
                        <div style={{ marginBottom: 14 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a0a8b0", margin: "0 0 8px" }}>备注</p>
                            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="添加备注…" rows={3}
                                style={{ width: "100%", background: "#fff", border: "none", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#333", resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.6 }} />
                        </div>

                        {card.link && (
                            <a href={card.link} target="_blank" rel="noreferrer"
                                style={{ fontSize: 12, color: "#7a9baa", display: "flex", alignItems: "center", gap: 5, textDecoration: "none", marginBottom: 14, wordBreak: "break-all" }}>
                                <LinkIcon />{card.link.replace(/^https?:\/\//, "")}
                            </a>
                        )}

                        <div style={{ flex: 1 }} />
                    </div>

                    {/* Bottom */}
                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "14px 20px 16px", position: "relative" }}>
                        {showSpaces && (
                            <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 20, right: 20, background: "#fff", borderRadius: 14, boxShadow: "0 -4px 28px rgba(0,0,0,0.13)", overflow: "hidden", zIndex: 10 }}>
                                {SPACES.map(s => (
                                    <button key={s.id} onClick={() => { setSpace(s.id); setShowSpaces(false); }}
                                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", background: space === s.id ? "#f0f4ff" : "none", border: "none", cursor: "pointer", fontSize: 13.5, color: "#333", fontFamily: "inherit" }}
                                        onMouseEnter={e => { if (space !== s.id) e.currentTarget.style.background = "#f9f9f9"; }}
                                        onMouseLeave={e => { if (space !== s.id) e.currentTarget.style.background = "none"; }}>
                                        <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${space === s.id ? spaceColor(s.id) : "#ccc"}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {space === s.id && <span style={{ width: 5, height: 5, borderRadius: "50%", background: spaceColor(s.id) }} />}
                                        </span>
                                        {s.label}
                                    </button>
                                ))}
                                <button onClick={() => setShowSpaces(false)}
                                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", background: "none", border: "none", borderTop: "1px solid #f0f0f0", cursor: "pointer", appearance: "none", WebkitAppearance: "none", fontSize: 13.5, color: "#e8793a", fontFamily: "inherit" }}>
                                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#e8793a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}><PlusSmall /></span>
                                    创建新空间
                                </button>
                            </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: editing ? 12 : 0 }}>
                            <button onClick={() => setShowSpaces(!showSpaces)}
                                style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid #d0d4d8", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa0aa", transition: "all .15s" }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#aaa"; e.currentTarget.style.color = "#555"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#d0d4d8"; e.currentTarget.style.color = "#9aa0aa"; }}>
                                <CircleIcon />
                            </button>
                            <button onClick={() => { onDelete(card.id); onClose(); }}
                                style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid #d0d4d8", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa0aa", transition: "all .15s" }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#e44"; e.currentTarget.style.color = "#e44"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#d0d4d8"; e.currentTarget.style.color = "#9aa0aa"; }}>
                                <TrashIcon />
                            </button>
                        </div>
                        {editing && (
                            <button onClick={save} style={{ width: "100%", background: "#111", border: "none", borderRadius: 12, padding: "12px 0", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", appearance: "none", WebkitAppearance: "none", fontFamily: "inherit" }}>
                                保存
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Rich editor // ── Rich editor ────────────────────────────────────────────────────────
function RichEditor({ value, onChange }) {
    const ref = useRef(null), q = useRef(null);
    useEffect(() => {
        if (q.current || !ref.current || !window.Quill) return;
        const inst = new window.Quill(ref.current, {
            theme: "snow", placeholder: "写点什么…",
            modules: { toolbar: [[{ header: [2, 3, false] }], ["bold", "italic"], [{ list: "ordered" }, { list: "bullet" }], ["code-block"], ["clean"]] },
        });
        if (value) inst.clipboard.dangerouslyPasteHTML(value);
        inst.on("text-change", () => { const h = inst.root.innerHTML; onChange(h === "<p><br></p>" ? "" : h); });
        q.current = inst;
    }, []);
    return <div ref={ref} />;
}

// ── Add modal ──────────────────────────────────────────────────────────
function AddModal({ activeSpace, onClose, onSave }) {
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
        if (window.Quill) { setReady(true); return; }
        const l = document.createElement("link");
        l.rel = "stylesheet"; l.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.bubble.min.css";
        document.head.appendChild(l);
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
        s.onload = () => setReady(true);
        document.head.appendChild(s);
    }, []);

    const ok = content && content !== "<p><br></p>" && plain(content).trim().length > 0;

    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "fadeIn .15s ease" }}>
            <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 560, boxShadow: "0 24px 80px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "88vh", overflow: "hidden", animation: "popIn .2s ease" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "18px 22px 0", display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                        <select value={space} onChange={e => { setSpace(e.target.value); setTag(""); }}
                            style={{ width: "100%", border: "1.5px solid #eee", borderRadius: 10, padding: "8px 32px 8px 12px", fontSize: 13, color: space ? "#333" : "#bbb", background: "#fafafa", outline: "none", cursor: "pointer" }}>
                            <option value="">选择空间</option>
                            {SPACES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#bbb", fontSize: 10 }}>▾</span>
                    </div>
                    {space && (ALL_TAGS[space] || []).length > 0 && (
                        <div style={{ flex: 1, position: "relative" }}>
                            <select value={tag} onChange={e => setTag(e.target.value)}
                                style={{ width: "100%", border: "1.5px solid #eee", borderRadius: 10, padding: "8px 32px 8px 12px", fontSize: 13, color: tag ? "#333" : "#bbb", background: "#fafafa", outline: "none", cursor: "pointer" }}>
                                <option value="">系统标签</option>
                                {(ALL_TAGS[space] || []).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#bbb", fontSize: 10 }}>▾</span>
                        </div>
                    )}
                    <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#ccc", display: "flex", padding: 4 }}><XIcon /></button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 22px" }}>
                    <textarea
                        value={plain(content)}
                        onChange={e => setContent("<p>" + e.target.value.split("\n").join("</p><p>") + "</p>")}
                        placeholder="写点什么…"
                        autoFocus
                        style={{ width: "100%", border: "none", outline: "none", resize: "none", background: "none", fontSize: 15, lineHeight: 1.75, color: "#1a1a1a", fontFamily: "inherit", minHeight: 200 }}
                    />
                </div>
                <div style={{ padding: "10px 22px 18px", borderTop: "1px solid #f5f5f5", display: "flex", flexDirection: "column", gap: 8 }}>
                    <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="卡片标题（展示在卡片底部）"
                        style={{ border: "1.5px solid #eee", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "#333", outline: "none", background: "#fafafa" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#ddd" }}><LinkIcon /></span>
                        <input value={link} onChange={e => setLink(e.target.value)} placeholder="关联链接（可选）"
                            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#7090cc", background: "none" }} />
                        <button onClick={onClose} style={{ border: "1.5px solid #eee", borderRadius: 10, padding: "7px 14px", fontSize: 13, cursor: "pointer", background: "none", color: "#bbb", fontFamily: "inherit" }}>取消</button>
                        <button onClick={() => { if (!ok) return; onSave({ id: Date.now(), space: space || null, tags: tags, content, link: link.trim() || null, note: "", caption: caption.trim() || getH(content) || plain(content).slice(0, 24), createdAt: Date.now() }); onClose(); }}
                            disabled={!ok}
                            style={{ border: "none", borderRadius: 10, padding: "7px 20px", fontSize: 13, fontWeight: 500, cursor: ok ? "pointer" : "not-allowed", background: ok ? "#111" : "#f0f0f0", color: ok ? "#fff" : "#ccc", fontFamily: "inherit" }}>
                            保存
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Inline add card ───────────────────────────────────────────────────
function AddInlineCard({ onSave, onExpand }) {
    const [focused, setFocused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [value, setValue] = useState("");
    const taRef = useRef(null);

    const handleKey = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && value.trim()) {
            e.preventDefault();
            onSave(value.trim()); setValue(""); setFocused(false); taRef.current?.blur();
        }
        if (e.key === "Escape") { setValue(""); setFocused(false); taRef.current?.blur(); }
    };

    return (
        <div style={{ marginBottom: 14, breakInside: "avoid" }}>
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    background: "#fff", borderRadius: 18, overflow: "hidden", position: "relative",
                    boxShadow: (focused || hovered)
                        ? "0 8px 16px rgba(0,0,0,0.10), 4px 8px 16px rgba(0,0,0,0.06)"
                        : "0 2px 10px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
                    border: "none",
                    transition: "box-shadow .22s ease", cursor: "text",
                }}
                onClick={() => taRef.current?.focus()}
            >
                {/* Gradient expand button — only when focused, small */}
                {focused && (
                    <button
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onExpand(value); }}
                        style={{
                            position: "absolute", top: 14, right: 14,
                            width: 16, height: 16, borderRadius: "50%", border: "none",
                            background: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)",
                            cursor: "pointer", padding: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                    >
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                    </button>
                )}

                <div style={{ padding: "22px 24px", paddingBottom: focused ? 18 : 22 }}>
                    <p style={{ margin: "0 0 12px", fontSize: 10.5, fontWeight: 700, color: "#e8793a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        添加知识
                    </p>
                    <textarea
                        ref={taRef}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => { if (!value.trim()) setFocused(false); }}
                        onKeyDown={handleKey}
                        placeholder="在这里输入…"
                        style={{
                            width: "100%", border: "none", outline: "none", resize: "none", background: "none",
                            fontSize: 15, lineHeight: 1.7, color: "#1a1a1a",
                            fontFamily: "inherit", letterSpacing: "-0.01em",
                            height: focused ? 160 : 24,
                            transition: "height .22s ease",
                            overflow: "hidden", display: "block",
                        }}
                    />
                </div>

                {/* Save button — only when focused */}
                {focused && (
                    <div style={{ padding: "0 24px 20px" }}>
                        <button
                            onMouseDown={e => {
                                e.preventDefault();
                                if (value.trim()) { onSave(value.trim()); setValue(""); setFocused(false); }
                            }}
                            style={{
                                width: "100%", border: "none", borderRadius: 100, background: "#e8793a",
                                padding: "12px 0", color: "#fff",
                                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                            }}
                        >
                            保存
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── App ────────────────────────────────────────────────────────────────
export default function App() {
    const [cards, setCards] = useState(INITIAL_CARDS);
    const [activeSpace, setActiveSpace] = useState(null);
    const [search, setSearch] = useState("");
    const [searchFocus, setSearchFocus] = useState(false);
    const [detail, setDetail] = useState(null);
    const [addModal, setAddModal] = useState(false);
    const [toast, setToast] = useState(null);
    const inputRef = useRef(null);

    const toast_ = msg => { setToast(msg); setTimeout(() => setToast(null), 2000); };
    const del = useCallback(id => { setCards(p => p.filter(c => c.id !== id)); toast_("已删除"); }, []);
    const update = useCallback(data => { setCards(p => p.map(c => c.id === data.id ? data : c)); toast_("已保存"); }, []);
    const add = useCallback(data => { setCards(p => [data, ...p]); toast_("已保存"); }, []);

    useEffect(() => {
        // Preload Quill bubble CSS
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
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); }
            if (e.key === "Escape" && !detail && !addModal) { setSearch(""); inputRef.current?.blur(); }
        };
        window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
    }, [detail, addModal]);

    const filtered = cards.filter(c => {
        if (activeSpace && c.space !== activeSpace) return false;
        const q = search.toLowerCase();
        return !q || plain(c.content).toLowerCase().includes(q) || (c.tags || []).some(t => t.toLowerCase().includes(q)) || (c.caption || "").toLowerCase().includes(q);
    });

    return (
        <div style={{ minHeight: "100vh", background: "#e8eaec", fontFamily: "'DM Sans','PingFang SC',-apple-system,sans-serif" }}>

            {/* ── Header ── */}
            <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(232,234,236,0.92)", backdropFilter: "blur(20px)" }}>

                {/* Big italic search — mymind signature */}
                <div style={{ padding: "20px 28px 0", position: "relative" }}>
                    <p style={{
                        position: "absolute", top: 14, left: 28,
                        fontSize: "clamp(24px, 3.5vw, 42px)",
                        fontStyle: "italic", fontWeight: 300,
                        color: "rgba(0,0,0,0.12)",
                        pointerEvents: "none", userSelect: "none",
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
                            width: "100%", background: "none", border: "none",
                            outline: "none",
                            fontSize: "clamp(24px, 3.5vw, 42px)",
                            fontStyle: "italic", fontWeight: 300,
                            color: "#222", letterSpacing: "-0.02em",
                            fontFamily: "Georgia, 'Times New Roman', serif",
                            lineHeight: 1, padding: 0,
                        }}
                    />
                    {/* Underline */}
                    <div style={{ height: 1, background: "rgba(0,0,0,0.1)", marginTop: 10 }} />
                </div>

                {/* Space pills */}
                <div style={{ padding: "10px 24px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {SPACES.map(s => {
                        const active = activeSpace === s.id;
                        return (
                            <button key={s.id} onClick={() => setActiveSpace(active ? null : s.id)}
                                style={{
                                    border: `2px solid ${active ? s.color : "rgba(0,0,0,0.12)"}`,
                                    borderRadius: 100, padding: "4px 14px",
                                    fontSize: 13, fontWeight: active ? 500 : 400,
                                    background: active ? `${s.color}18` : "transparent",
                                    color: active ? s.color : "#888",
                                    cursor: "pointer", fontFamily: "inherit",
                                    display: "flex", alignItems: "center", gap: 6,
                                    transition: "all .15s",
                                }}>
                                <span style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${active ? s.color : "#ccc"}`, display: "inline-block", background: active ? s.color : "none", transition: "all .15s" }} />
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* ── Cards grid ── */}
            <main style={{ padding: "16px 20px 100px", maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ columns: "240px", columnGap: 12 }}>

                    {/* Add new note card — inline expandable like mymind */}
                    <AddInlineCard
                        onSave={(text) => {
                            add({ id: Date.now(), space: activeSpace || null, tags: [], content: `<p>${text}</p>`, link: null, note: "", caption: text.slice(0, 24), createdAt: Date.now() });
                        }}
                        onExpand={(prefill) => setAddModal(true)}
                    />

                    {filtered.map((card, i) => (
                        <div key={card.id} style={{ animation: "appear .25s ease both", animationDelay: `${i * 0.015}s` }}>
                            <Card card={card} onClick={c => setDetail(c)} />
                        </div>
                    ))}
                </div>

                {search && filtered.length === 0 && (
                    <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa", fontSize: 15, fontStyle: "italic", fontFamily: "Georgia, serif" }}>
                        没有找到「{search}」
                    </div>
                )}
            </main>

            {/* Detail */}
            {detail && <Detail card={detail} onClose={() => setDetail(null)} onUpdate={d => { update(d); setDetail(d); }} onDelete={id => { del(id); setDetail(null); }} />}

            {/* Add modal */}
            {addModal && <AddModal activeSpace={activeSpace} onClose={() => setAddModal(false)} onSave={d => { add(d); setAddModal(false); }} />}

            {/* Toast */}
            {toast && <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#fff", padding: "9px 20px", borderRadius: 100, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 9999, pointerEvents: "none", animation: "appear .2s ease" }}>{toast}</div>}

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes appear { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .card-rich h2 { font-size:14.5px; font-weight:600; color:#111; margin:0 0 7px; letter-spacing:-.02em; line-height:1.3; }
        .card-rich h3 { font-size:12.5px; font-weight:600; color:#444; margin:9px 0 4px; }
        .card-rich p  { font-size:13px; line-height:1.65; color:#444; margin:0 0 6px; letter-spacing:-.005em; }
        .card-rich p:last-child { margin-bottom:0; }
        .card-rich ul, .card-rich ol { padding-left:16px; margin:4px 0 6px; }
        .card-rich li { font-size:12.5px; line-height:1.6; color:#555; margin-bottom:2px; }
        .card-rich strong { font-weight:600; color:#222; }
        .card-rich code { background:#f4f4f2; padding:1px 5px; border-radius:4px; font-size:.85em; font-family:monospace; color:#666; }
        .card-rich pre  { background:#f4f4f2; border-radius:6px; padding:8px 10px; font-size:11.5px; margin:6px 0; overflow-x:auto; line-height:1.5; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes popIn  { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }

        .detail-editor-wrap .ql-container.ql-bubble { border: none; font-family: Georgia, 'Times New Roman', serif; }
        /* Force bubble tooltip to show */
        .ql-bubble .ql-tooltip { z-index: 9999 !important; }
        .detail-editor-wrap .ql-editor { font-size: 16px; line-height: 1.85; color: #333; padding: 0; min-height: 200px; }
        .detail-editor-wrap .ql-editor.ql-blank::before { color: #ccc; font-style: normal; left: 0; }
        .detail-editor-wrap .ql-editor h2 { font-size: 28px; font-weight: 600; color: #111; margin: 0 0 20px; text-align: center; }
        .detail-editor-wrap .ql-editor h3 { font-size: 16px; font-weight: 600; margin: 20px 0 8px; font-family: 'DM Sans', sans-serif; }
        .detail-editor-wrap .ql-editor p  { margin: 0 0 14px; }
        .detail-editor-wrap .ql-editor ul, .detail-editor-wrap .ql-editor ol { padding-left: 22px; margin: 8px 0 14px; }
        .detail-editor-wrap .ql-editor li { margin-bottom: 5px; }
        .detail-editor-wrap .ql-editor code { background: #f4f4f2; padding: 2px 6px; border-radius: 4px; font-size: .88em; font-family: monospace; }
        .detail-content { font-family: Georgia, 'Times New Roman', serif; }
        .detail-content h2 { font-size:32px; font-weight:600; color:#111; margin:0 0 28px; text-align:center; letter-spacing:-.02em; line-height:1.2; }
        .detail-content h3 { font-size:17px; font-weight:600; color:#222; margin:28px 0 10px; font-family:'DM Sans',sans-serif; }
        .detail-content p  { font-size:16px; line-height:1.85; color:#333; margin:0 0 18px; }
        .detail-content p:last-child { margin:0; }
        .detail-content ul,.detail-content ol { padding-left:24px; margin:10px 0 18px; }
        .detail-content li { font-size:15px; line-height:1.8; color:#444; margin-bottom:7px; }
        .detail-content strong { font-weight:700; color:#111; }
        .detail-content em { font-style:italic; }
        .detail-content code { background:#f4f4f2; padding:2px 6px; border-radius:5px; font-size:.87em; font-family:'SF Mono',monospace; color:#555; }
        .detail-content pre  { background:#f4f4f2; border-radius:10px; padding:18px 22px; font-size:13px; margin:16px 0; overflow-x:auto; font-family:monospace; line-height:1.6; }
        .detail-content blockquote { border-left:3px solid #e0e0e0; padding-left:20px; color:#777; margin:18px 0; font-style:italic; font-size:18px; }

        .editor-wrap .ql-toolbar.ql-snow { border:none; border-bottom:1px solid #f0f0f0; padding:8px 0; }
        .editor-wrap .ql-container.ql-snow { border:none; }
        .editor-wrap .ql-editor { font-size:15px; line-height:1.75; color:#111; padding:14px 0 24px; min-height:160px; font-family:'DM Sans','PingFang SC',sans-serif; }
        .editor-wrap .ql-editor.ql-blank::before { color:#ccc; font-style:normal; }
        .editor-wrap .ql-editor h2 { font-size:19px; font-weight:600; margin:16px 0 9px; }
        .editor-wrap .ql-editor h3 { font-size:15px; font-weight:600; margin:14px 0 6px; }
        .editor-wrap .ql-editor p  { margin:0 0 9px; }
        .editor-wrap .ql-editor code { background:#f4f4f2; padding:2px 5px; border-radius:4px; }
        .editor-wrap .ql-snow .ql-stroke { stroke:#c5c5c5; }
        .editor-wrap .ql-snow .ql-fill  { fill:#c5c5c5; }
        .editor-wrap .ql-snow.ql-toolbar button:hover .ql-stroke { stroke:#222; }
        .editor-wrap .ql-snow.ql-toolbar button.ql-active .ql-stroke { stroke:#222; }

        ::placeholder { color:#c5c5c3; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#d0d0d0; border-radius:4px; }
        button,input,textarea,select { font-family:inherit; outline:none; }
        select { -webkit-appearance:none; -moz-appearance:none; appearance:none; background-image:none; }
      `}</style>
        </div>
    );
}