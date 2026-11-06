# 贡献指南

本仓库通过 PR 审核和收录 Extism Wasm 插件。开发入口见 [文档索引](./docs/README.md)。

## 贡献许可

除另有明确说明外，贡献采用 [Apache-2.0 许可证](./LICENSE)。保留 [NOTICE](./NOTICE) 中的版权与许可声明；第三方内容遵循其各自许可。

## 收录或修改插件

在 `plugins/<directory>/` 中维护可独立构建的插件。首次开发先完成 [独立作者入口](./docs/plugin-authoring.md) 的最小示例，再按业务需要参考现有插件。

提交需要包含以下内容：

- **源码和许可**：完整源码、`Cargo.toml`、`Cargo.lock` 与许可证；第三方内容注明来源、归属和构建影响，Wasm 可追溯至提交的源码。
- **清单和构建入口**：`extension.json` 定义插件身份、宿主要求、命令、界面、权限及网络范围；`build.json` 指向实际编译的 Wasm。当前使用 Rust / Cargo，其他语言先补齐可审查的构建流程。
- **行为与语言**：插件 README 说明实际玩法或操作、输入限制、保存与导出、失败处理及权限用途；界面按请求的 `locale` 提供中文和英文。保持纯会话功能在不授予可选权限时可用，避免把可选存储或网络变成无关功能的启动门槛。
- **自动验证**：测试受影响的业务规则和失败场景；`smoke.json` 覆盖全部清单命令，手写业务预期，并按实际能力覆盖非法输入、授权与效果回执。方法见 [测试规范](./docs/testing.md#真实-wasm-与手写-fixture)。
- **收录信息**：在 `listings.json` 填写目录、实际分类与推荐标记；增删或调整可见能力时同步 README 与受影响的文档。

界面使用通用视图或本地单文件 HTML / CSS / JavaScript，按 [自定义界面开发](./docs/development.md#自定义界面开发) 接入主题、语言和消息桥。

新权限或服务操作须先有配套宿主实现，再用确定提交的工具验证。LAN、图片、图库与外链的授权及信任边界见 [安全规范](./docs/security.md#原生服务与外部来源)，服务替身与真实环境的验收范围见 [测试规范](./docs/testing.md#固定原生服务验收)。

## 本地检查与证据

按 [测试规范](./docs/testing.md#按改动选择检查) 选择检查，环境与命令见 [开发指南](./docs/development.md)。本地 `check` 使用一次性测试密钥。PR 记录宿主 SHA、平台、命令、结果和影响评审的未测情形；文档改动按 [维护规则](./docs/README.md#维护规则) 核对写作、事实、格式和链接。

## 分支、提交与 PR

市场采用 GitHub Flow，`main` 是唯一长期分支、默认分支和发布来源。所有改动从 `main` 创建短期分支，例如 `feature/*`、`fix/*`、`docs/*`、`chore/*`，通过 PR 以 **Squash and merge** 合回 `main`，每个 PR 留下一个逻辑提交，保持主分支线性，合并后删除短期分支。

```bash
git switch main
git pull --ff-only
git switch -c feature/plugin-change
```

开发分支可保留临时提交。PR 出现冲突或验证基线变化时，同步 `origin/main`，解决后核对差异并验证受影响行为。

单人维护保留 PR、自审与适用检查，审批人数为零。服务端默认分支设为 `main`，保护规则要求 PR 和 Require linear history，禁止强推与删除；仅开启 squash merge，关闭 merge commit 与 rebase merge，启用合并后自动删除分支。Actions 停用期间不设置无法运行的必需检查，CI 恢复并确认可运行后再启用相应门禁。

宿主同样通过 PR 合入其 `main`，两个仓库分别管理自己的分支和 PR。

提交采用 Conventional Commits，类型和 scope 使用英文，主题与正文使用中文，例如 `feat(snake): 增加进度恢复与冲突提示`。源码、必要测试和相应文档放在同一可审查的行为变更中。

PR 说明变更后的行为、原因、相关影响与验证。协议变更写明配套宿主及旧数据处理方式，保留用户原件。

通过宿主子模块协作时，两个仓库分别提交审查分支。市场合入后更新宿主的子模块引用。独立 CI 的 `STARTER_HOST_REF` 与发布的 `host_ref` 使用已审核、已推送的宿主提交，PR 记录实际验证的 SHA。

## 发布与安全问题

签名、发布、续签、下架及公钥轮换按 [发布与管理](./docs/publishing.md) 操作。

安全问题走 [私密报告渠道](./docs/security.md#漏洞与密钥事件)。普通问题提供插件与宿主版本、复现步骤、预期和实际结果，以及脱敏日志。
