# 参与维护

按 [README](./README.md)确认当前范围。新增源码、资源或依赖说明用途、来源、许可和平台影响，遵循[安全规范](./docs/security.md)。

文档与配置核对格式、JSON、路径/标题链接和事实；当前无构建/测试脚本。新增可执行能力在同一变更中提供实际检查入口。PR 说明行为、原因、检查结果及相关未测范围。

使用 main 的短期分支，以中文 Conventional Commit/PR 交付完整逻辑切片，自审后 squash 合入并清理分支；全部分支保持线性，同步用 rebase/fast-forward。市场与宿主分别提交，市场合入推送后才更新宿主引用。

main 要求通过 PR、仅 squash 合入，禁止强推和删除。独占开发分支改写前固定远端 SHA，使用精确 lease；共享分支先协调。自动化仍停用，启用后按实际检查设置门槛。

贡献默认 [Apache-2.0](./LICENSE)，保留 [NOTICE](./NOTICE) 和第三方归属。文档维护见[索引](./docs/README.md)。
