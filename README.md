# Serial Workbench 插件市场

配套 [Serial Workbench](https://github.com/YanChao001/serial-workbench) 的 Wasm 插件市场（plugin marketplace），使用 Rust、WebAssembly 与 Extism，维护插件收录、包校验、签名目录和发布工具。

This repository contains the Wasm plugin marketplace and authoring tools for Serial Workbench, a Tauri desktop application for serial port debugging.

当前收录清单为空，生产公钥待配置，GitHub Actions 停用。以下四个目录提供开发参考源码；市场启用步骤见 [发布与管理](./docs/publishing.md)。

## 开发参考源码

| 插件                                                | 参考内容                           |
| --------------------------------------------------- | ---------------------------------- |
| [计算器](./plugins/scientific-calculator/README.md) | 科学计算、单位换算、汇率与私有存储 |
| [贪吃蛇](./plugins/snake/README.md)                 | 游戏状态、输入、重放与自定义界面   |
| [内网通信](./plugins/lan-chat/README.md)            | 局域网消息、附件与会话导出         |
| [壁纸库](./plugins/wallpaper-browser/README.md)     | 图源搜索、下载与本机图库管理       |

## 快速开始

首次编写插件按 [独立作者入口](./docs/plugin-authoring.md) 完成最小示例，再按 [开发指南](./docs/development.md) 迭代，通过 [贡献流程](./CONTRIBUTING.md) 提交收录。

市场可以独立检出，也可作为宿主的 `marketplace/` 子模块工作。Node 要求见 [package.json](./package.json)，Rust 版本见 [rust-toolchain.toml](./rust-toolchain.toml)。市场脚本没有 npm 依赖，以下命令从本仓库根目录运行：

```sh
node --test scripts/*.test.mjs plugins/*/ui/*.test.mjs
```

编译和真实运行 Wasm 前，按 [准备宿主校验工具](./docs/development.md#准备宿主校验工具) 安装 `extension-tool` 与 Wasm 编译目标。参考插件使用单插件验收；完整 `check` 构建并验证 `listings.json` 中的收录项，命令见 [开发指南](./docs/development.md)，检查范围见 [测试规范](./docs/testing.md#按改动选择检查)。

## 文档与贡献

[文档索引](./docs/README.md) · [贡献流程](./CONTRIBUTING.md) · [智能体入口](./AGENTS.md) · [安全规范](./docs/security.md)

市场采用 GitHub Flow：短期分支通过 PR squash merge 合入 `main`。跨仓库协作见 [贡献流程](./CONTRIBUTING.md#分支提交与-pr)，宿主配套、签名与发布见 [发布与管理](./docs/publishing.md)。

## 开源许可

本仓库采用 [Apache License 2.0](./LICENSE)，版权说明见 [NOTICE](./NOTICE)。参考插件中使用的第三方组件沿用各自许可证；外部作者提交的插件须明确自身许可。
