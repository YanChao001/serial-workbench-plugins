# Serial Workbench 插件市场

[Serial Workbench](https://github.com/YanChao001/serial-workbench) 的独立插件市场仓库，采用 Apache-2.0 许可证。

This repository is the foundation for the Serial Workbench Node plugin marketplace.

## 当前状态

仓库正在为 Node 插件体系重新建立基础。当前没有收录插件、正式包格式、SDK、目录协议、构建、签名或发布工具；GitHub Actions 保持停用，仓库中没有工作流。旧插件体系的源码与工具已移除，历史保留在 Git 中。

Node 插件加载和统一 SDK 计划在宿主项目的 M2 阶段实现，市场收录与分发计划在 M5 阶段实现。包格式、市场协议和验收命令随实现确定；当前仓库不提供安装、构建或发布入口。

## 参与维护

本仓库可以独立检出，也可作为宿主的 `marketplace/` 子模块。项目身份和开发 Node 约束见 [package.json](./package.json)；当前没有 npm 依赖或脚本。

[文档索引](./docs/README.md) · [贡献流程](./CONTRIBUTING.md) · [智能体入口](./AGENTS.md) · [安全规范](./docs/security.md)

所有改动从短期分支通过 PR squash merge 合入 `main`。市场合入并推送后，再更新宿主的子模块引用。

## 开源许可

本仓库采用 [Apache License 2.0](./LICENSE)，版权声明见 [NOTICE](./NOTICE)。引入第三方内容时保留其来源、版权和许可。
