# 原样同步 DSH 源码

`vendor/dsh-source/` 是上游文件的原样副本。压缩代码、会话和计量代码保留原路径、文件内容与 import；`dependencies/` 保存解析到的第三方运行时源码。DCP 的解析表代替 import 改写，使普通构建不需要上游的 node_modules 或工作区链接。

更新步骤：

```bash
npm run vendor:dsh -- /path/to/deepseek-harness
npm run vendor:verify -- /path/to/deepseek-harness
npm run check
npm run test:package
```

同步时只需要上游源码及可解析的依赖，不需要先构建上游 lib。工具先解析源码依赖图，在临时目录逐字节复制并成功重建，再发布快照。manifest 保存上游 commit/version、每个原文件位置、每个副本哈希及 import 解析结果。`vendor:verify` 会再次逐个比对源文件与副本。

附件后端的原生依赖 `sharp` 由 DCP 的 package.json/package-lock.json 安装，不打包其平台二进制到源码快照。同步 attachment-local 时还需核对其 sharp 版本要求，并执行包含实际图片读写的隔离安装测试。

正常构建先校验源码，再仅从本地副本重建 `vendor/dsh-runtime.mjs`，然后构建 pi 扩展。隔离安装测试会检查 tarball 包含所有副本，并在没有上游仓库的临时目录中重建内核。

对应文件可以直接由上游版本覆盖，但不能只替换文件后忽略校验：新增/删除 import 也会改变依赖闭包。推荐由同步命令统一复制并更新解析表、版本与哈希，避免漏掉传递依赖或误用旧 lib。不要对 `vendor/dsh-source/` 加本地 patch；宿主适配修改放在 `src/`，解析规则修改放在 `scripts/dsh-vendor-lib.mjs`。

如果未来导出路径或服务接口发生不兼容变化，同步、启动或差分测试必须失败并明确报告。此时更新适配层/解析规则后重新验证；不能通过修改上游压缩源码或简单更新哈希绕过错误。源码校验证明没有本地修改，差分测试用于检查适配行为，两者作用不同。
