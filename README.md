# Serial Workbench 插件市场

[Serial Workbench](https://github.com/YanChao001/serial-workbench) 的独立 Node 插件市场基础仓库，采用 [Apache-2.0](./LICENSE)，归属见 [NOTICE](./NOTICE)。

当前提供 v1 签名目录工具，支持从固定目录身份和公钥验证索引、按名称和标签检索，并按宿主协议及 Node 运行时筛选版本。运行 `npm test` 验证。正式插件收录、目录签发、宿主市场接线和发布自动化按 M5 交付。 [目录格式和用法](./docs/catalog.md)

可独立检出或作为宿主 `marketplace/` 子模块。身份和 Node 约束读取 [package.json](./package.json)。维护从[文档索引](./docs/README.md)、[贡献流程](./CONTRIBUTING.md)及 [AGENTS](./AGENTS.md)开始；安全见[规范](./docs/security.md)。
