# DCP 共同能力契约（0.2.3b1）

目标是在双方都支持的场景中复用上游插件的行为。功能让步意味着不纳入比较场景，不模拟 DSH 的全部宿主能力，也不回滚已经完成的压缩。

| 能力 | 约定 |
|---|---|
| Cordis | 使用真实框架、插件注册、依赖注入、初始化和销毁 |
| 压缩内核 | 原样加载 compaction-basic、tool-result-pruner、compaction-image-offload、attachment-local、token-meter、SessionStore、SessionProjectionRegistry |
| 配置 | 直接交给 DSH 解析；不自动缩放 headroom、不另设摘要上限 |
| 自动压力 | 转换为 `agent/pre-step`；上游处理阈值、裁剪、选区、收敛和失败日志 |
| 手动压缩 | 上游 `compactNow()`；以 pi 当前投影创建一次空闲维护场景，不额外预裁剪 |
| 溢出 | pi 错误转换为 DSH 的上下文错误；DSH listener 独占压缩恢复决策和次数预算 |
| 模型 | 一次操作内固定物理模型。未显式配置摘要模型时，上游优先使用最后一次成功回答的模型，其次使用最近的请求路由。历史模型需要在 pi 中仍可解析。切换前准入和虚拟路由不在兼容范围内 |
| 输入 | 压缩期间拒绝新提交并提示稍后重试；不实现 DSH 的 maintenance inbox |
| 内容 | 文本、思考文本及签名、普通工具调用/结果，以及用户和工具结果中的 PNG/JPEG/WebP/GIF；普通文件附件和 assistant 图片输出不支持 |
| 命令 | 无自定义摘要指令；pi 自身的手动入口准入检查仍有效；`/dcp-compact` 要求空闲 |
| 存储 | pi 保有会话/分支格式；压缩变更先提交 pi 日志，再应用到请求；不改写整个会话文件 |

兼容宿主保留同一个 Cordis 插件实例和 Agent 身份，供上游保存恢复预算；分支切换会重新建立 Agent 身份。每次操作从当前 pi 投影创建并正式发布一个真实 DSH Session，记录真实 DSH 事务，并将结果转回 pi 条目。宿主特有的 seed 事件位置和数字 seq 不要求一致；选中的逻辑消息必须一致。

DSH 的 `sessions.flush()` 接到真实的 pi transaction 日志提交。它不是空函数。手动操作只有提交完成后才返回；提交失败使用上游的 persistence 错误分类。进程中断后，已提交 journal 能重新应用尚未来得及转换成 pi 原生 compaction/context_edit 的变更。`--no-session` 等内存会话遵循 pi 本身的非持久化语义，不承诺落盘。

pi 已完成消息没有 DSH 原始 delta 时序。适配层用已完成的块构建零相对时间的 block-end 投影，以保留上游 usage 锚点的计量语义；它不声称重现原始流。provider 请求经过 pi 自己的规范化，缓存前缀和逐字节 HTTP payload 不属于一致性承诺。

压缩时只接受声明的无并发输入场景。pi 正常 prompt 入口由 input hook 拒绝；绕过该入口的其他扩展若修改了投影，提交前检查会报错。这里没有额外队列或复杂回滚机制。不支持的能力会明确报告，不静默切换成 pi 默认摘要。

`test/differential.test.ts` 在相同输入和确定性模型响应下，比较兼容层与直接运行上游 Cordis 插件的行为：请求正文/预算、usage 计量、逻辑选区、裁剪事件、替换结果、失败、flush 和重试。其他 pi SDK 测试验证真实扩展入口、会话持久化、压缩中输入拒绝和界面渲染。这证明声明场景下的行为，而不代表所有 provider 或长任务的摘要保真率已被测量。

本次 Cordis 兼容层改造需要注意：Node.js 要求随上游源码提升为 ^24.22.3 || >=26.13.1；移除了自动 headroom 缩放、手动预裁剪和额外紧急压缩；小窗口模型需要显式配置适合的上游策略；带图片的历史现可执行摘要和图片省略；手动摘要指令不再接受。历史 journal 和展示元数据继续可读。

图片通过上游 attachment-local 真实校验和规范化，保存在 pi 会话目录下 `.dcp-assets/`。保留区的原始 pi 图片继续发送；进入摘要的图片使用从附件派生的请求版本。上游图片省略插件选择最旧的图片出现位置，适配层将带恢复路径的占位文本提交到 pi 日志，即使原 DSH 消息 seq 没变也必须提交。省略后取消仍保留已完成的选择；不会产生未完成的摘要 checkpoint。

模型图片数量约束来自 pi 的 `inputLimits.images`，默认请求限制随上游 pi-ai 使用 50 张及 20 MiB base64 图片预算。摘要请求版本默认 4MP / 1MiB，受 pi 声明的 resize 限制进一步约束。摘要和主请求各自按实际发送的图片字节做准入，通过结构化 `IMAGE_OFFLOAD_REQUIRED` 交给上游恢复；不猜测远端错误文本中的省略数量。pi-ai 上游未声明精确图片 token 价格，因此仍使用附件引用启发式计量及 provider usage 锚点，不承诺视觉 token 精确一致。

图片对象和请求缓存需要保留才能使用历史占位文本中的恢复路径；没有自动 GC。pi2dsh 导出使用 DSH_HOME 附件存储，导入缺失图片对象会明确失败，不能静默丢图。`test/images.test.ts` 覆盖图片摘要、保留区、文本裁剪、主请求/摘要内省略、持久化、取消与上游差分；转换测试覆盖原样归档和 foreign DSH 附件恢复；真实 pi SDK 测试验证图片进入摘要 provider。
