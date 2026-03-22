export const SPACES = [
  { id: "cloud", label: "双云", color: "#7a9baa" },
  { id: "network", label: "网络", color: "#8aaa8a" },
  { id: "database", label: "数据库", color: "#b89a7a" },
  { id: "app", label: "应用", color: "#9a8ab0" },
  { id: "emergency", label: "应急", color: "#b08a8a" },
  { id: "regulation", label: "规章制度", color: "#9a9a8a" },
];

export const ALL_TAGS = {
  cloud: ["阿里云", "腾讯云", "容器服务", "对象存储", "负载均衡"],
  network: ["防火墙", "VPN", "DNS", "SDN", "交换机"],
  database: ["MySQL", "Redis", "MongoDB", "备份策略", "主从同步"],
  app: ["部署流程", "微服务", "API网关", "监控告警", "日志管理"],
  emergency: ["故障处理", "灾备演练", "升级预案", "回滚流程"],
  regulation: ["操作规范", "审批流程", "安全合规", "变更管理"],
};

export const INITIAL_CARDS = [
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
