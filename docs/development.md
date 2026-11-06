# 插件开发指南

本页说明环境准备、工具使用与插件迭代。运行分工见 [架构说明](./architecture.md)，验证要求见 [测试规范](./testing.md)，上架与签名见 [发布指南](./publishing.md)。

## 首次编写插件

先按 [独立作者入口](./plugin-authoring.md) 取得配套宿主的契约、SDK 与 `extension-tool`，完成最小文本插件。再按业务选择文本、通用视图或自定义 HTML，完成单插件 fixture 与宿主交互验收，按本页新增插件并提交收录。

## 环境与目录

市场脚本只使用 Node 内置模块，无需安装 npm 依赖。Node 要求见 [`package.json`](../package.json)；编译宿主工具时，使用宿主要求的 Node 和 pnpm。

插件使用市场 [`rust-toolchain.toml`](../rust-toolchain.toml) 和各自 `Cargo.lock`；宿主工具使用宿主的工具链。`RUSTUP_TOOLCHAIN` 会覆盖目录选择，跨仓库构建前检查该变量。宿主工具所属 crate 依赖 Tauri 平台库，按 [宿主环境说明](https://github.com/YanChao001/serial-workbench/blob/main/docs/development.md#%E7%8E%AF%E5%A2%83%E8%A6%81%E6%B1%82) 准备。

从市场仓库根目录准备插件工具链：

```sh
rustup toolchain install
rustup target add wasm32-unknown-unknown
```

主要目录的职责如下：

| 路径                                           | 用途                                              |
| ---------------------------------------------- | ------------------------------------------------- |
| `plugins/<directory>/src/`                     | 插件逻辑、PDK 导出与规则单测                      |
| `plugins/<directory>/Cargo.toml`、`Cargo.lock` | 插件包元数据和固定依赖                            |
| `plugins/<directory>/extension.json`           | 宿主清单：ID、版本、命令、权限和最低宿主版本      |
| `plugins/<directory>/ui/<id>.html`             | 自定义界面的单文件源码，按命令的 ui.document 引用 |
| `plugins/<directory>/build.json`               | Cargo 编译后的 Wasm 文件名                        |
| `plugins/<directory>/smoke.json`               | 由真实宿主 worker 执行的手写验收                  |
| `listings.json`                                | 收录目录、分类和推荐标记                          |
| `scripts/`                                     | 构建、校验、签名与发布工具                        |
| `target/`                                      | Cargo 编译缓存与 Wasm 模块，不手工修改或提交      |
| `artifacts/market-<revision>/`                 | 本次修订的完整插件包与目录，不手工修改或提交      |

独立检出与子模块使用相同产物布局。`artifacts/market-<revision>/` 同时包含项目的 `LICENSE` 与 `NOTICE`；清理打包结果时保留 `target/` 编译缓存。最小作者示例使用 `artifacts/author-text/`，宿主测试的临时 fixture、报告和截图由其测试流程管理。

## 仓库来源与平台入口

项目自身的来源、配套宿主、链接格式和壁纸请求联系方式由 [`repository.config.json`](../repository.config.json) 维护。目录身份继续以 [`listings.json`](../listings.json) 的 `repository` 为准；链接配置不改变签名协议、生产公钥或客户端信任范围。

| 字段                                    | 用途                                                                 |
| --------------------------------------- | -------------------------------------------------------------------- |
| `hosting.provider`                      | 明确选择发布适配器；当前支持 `github`                                |
| `hosting.repositoryUrlTemplate`         | 由 `{repository}` 构造市场源码 URL，仓库身份来自 `listings.json`     |
| `hosting.links`                         | `file`、`tree`、`commit`、`commits`、`compare`、`release` 的链接模板 |
| `host.repository`、`host.repositoryUrl` | CI 检出的宿主身份与跨仓库文档来源                                    |
| `host.docsRef`、`host.defaultRef`       | 移动文档链接的分支与 PR CI 默认宿主 ref；生产仍要求完整 SHA          |
| `wallpaperUserAgentTemplate`            | 壁纸请求的固定 User-Agent，`{repositoryUrl}` 解析为市场源码 URL      |

`file` / `tree` 使用 `{repositoryUrl}`、`{ref}`、`{path}`；`commit` / `commits` 使用 `{repositoryUrl}`、`{ref}`；`compare` 使用 `{repositoryUrl}`、`{base}`、`{ref}`；`release` 使用 `{repositoryUrl}`、`{tag}`。URL 必须为无凭据的 HTTPS 地址，链接模板必须从 `{repositoryUrl}/` 开始；未知或缺少占位符、控制字符及无效配置会在写入前拒绝。

修改配置后，从**市场仓库根目录**运行：

```sh
node scripts/repository-config.mjs sync
node scripts/repository-config.mjs check
node --test scripts/*.test.mjs plugins/*/ui/*.test.mjs
```

`package.json` 提供同义的 `repository:sync` 与 `repository:check`。`sync` 使用已提交的 [`repository.generated.json`](../repository.generated.json) 中上次同步的配置及目录身份作为旧值，更新项目 Markdown 链接、宿主 checkout、PR CI 默认 ref 和壁纸 User-Agent。默认文档分支随 `host.docsRef` 更新，固定标签或 SHA 及第三方链接保留。命令完成后审阅差异，一起提交配置、同步记录和派生文件；旧同步记录保留至命令完成。`check` 只检查漂移。两条命令均可追加 `--root <checkout>` 指定其他检出。

同步先在相同目录暂存完整新字节，提交每个文件前比较读取时的原始字节，并拒绝覆盖随后编辑或新建的文件。安装失败时逆序恢复已替换且未被再次修改的文件；若并发编辑导致无法安全恢复，会保留当前文件和 `.repository-sync-*.bak` 原件备份，并在错误中报告恢复位置。此时先核对并保留双方内容，解决冲突后再运行同步，不直接删除报告的备份。

发布脚本通过 [`scripts/hosting.mjs`](../scripts/hosting.mjs) 选择适配器。GitHub API、`gh` 参数、源码 SHA 来源和标签复核集中在 [`scripts/hosting/github.mjs`](../scripts/hosting/github.mjs)，Release 说明使用配置中的链接模板。迁移平台时修改配置、实现适配器，并更新 [`.github/`](../.github/) 中的平台工作流；链接配置与发布 API 分别维护。

壁纸 Rust 插件通过 `include_str!` 嵌入 [`user-agent.generated.txt`](../plugins/wallpaper-browser/user-agent.generated.txt)，内容由市场配置与 `listings.repository` 派生。同步命令也更新 smoke fixture 的同一字段。宿主测试可调用只读 `wallpaperUserAgent(config, repository)` 取得相同值。修改联系方式会改变 Wasm 字节，按插件版本与发布流程验收。

## 准备宿主校验工具

市场构建使用配套宿主的专用无界面二进制 `extension-tool`，支持 `validate` 和 `test`。

### 作为宿主子模块开发

市场源码位于宿主的 `marketplace/`。以下 PowerShell 命令从**宿主仓库根目录**运行；执行完后当前目录是市场根目录：

```powershell
pnpm install --frozen-lockfile
pnpm build
cargo build --locked --manifest-path src-tauri/Cargo.toml --bin extension-tool
$env:STARTER_EXTENSION_TOOL = (Resolve-Path src-tauri/target/debug/extension-tool.exe).Path
Set-Location marketplace
rustup toolchain install
rustup target add wasm32-unknown-unknown
```

macOS / Linux 的对应命令同样从**宿主仓库根目录**运行：

```sh
pnpm install --frozen-lockfile
pnpm build
cargo build --locked --manifest-path src-tauri/Cargo.toml --bin extension-tool
export STARTER_EXTENSION_TOOL="$PWD/src-tauri/target/debug/extension-tool"
cd marketplace
rustup toolchain install
rustup target add wasm32-unknown-unknown
```

标准子模块布局会自动探测 `../src-tauri/target/debug/extension-tool(.exe)`。若设置过 `CARGO_TARGET_DIR`，变量应指向实际输出位置。宿主协议代码变化后重新构建工具。

### 独立检出市场仓库

另行检出配套宿主，在其根目录执行上一节的 `pnpm install`、`pnpm build` 与 `cargo build`，再回到市场目录准备本仓库 Rust 工具链和 Wasm 目标。两个检出目录可独立放置。

通过 `STARTER_EXTENSION_TOOL` 指定工具的**绝对路径**，例如 PowerShell：

```powershell
$env:STARTER_EXTENSION_TOOL = "E:\tools\serial-workbench\src-tauri\target\debug\extension-tool.exe"
```

macOS / Linux：

```sh
export STARTER_EXTENSION_TOOL="/absolute/path/to/serial-workbench/src-tauri/target/debug/extension-tool"
```

替换为实际位置，另开终端后重新设置。工具选择规则见 [`scripts/host-tool.mjs`](../scripts/host-tool.mjs)。

## 首次完整离线检查

从**市场仓库根目录**运行以下 PowerShell 命令：

```powershell
$env:MARKET_REVISION = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
node scripts/check.mjs
```

macOS / Linux 从**市场仓库根目录**运行：

```sh
export MARKET_REVISION="$(date -u +%s)"
node scripts/check.mjs
```

`MARKET_REVISION` 必须为正 u32，并对应未使用的产物目录；同一秒重跑时换一个值。生产修订递增要求见 [发布指南](./publishing.md#有效期与续签)。

`check` 构建并验收 `listings.json` 的全部收录项，再用一次性密钥离线验签，输出 `catalog-unsigned.json`、插件包和许可文件。当前清单为空，因此完整市场检查不会编译四个参考插件；迭代参考插件时按 [单插件检查](./testing.md#聚焦单个插件) 运行。检查范围见 [测试规范](./testing.md#真实-wasm-与手写-fixture)。

仅需构建和真实 Wasm 校验时也可在设置新修订号后，从**市场仓库根目录**运行 `node scripts/build.mjs`。`check` 已包含该步骤，不要先用相同修订号运行 `build` 再运行 `check`。

## 新增一个插件

四个参考插件都使用官方 Extism Rust PDK，独立维护 Cargo 清单和锁文件。按业务参考 [计算器](../plugins/scientific-calculator/)、[贪吃蛇](../plugins/snake/)、[内网通信](../plugins/lan-chat/) 或 [壁纸库](../plugins/wallpaper-browser/)，复用需要的逻辑并修改身份与说明。

1. 建立 `plugins/<directory>/`。目录名使用小写字母开头的小写字母、数字和连字符，最长 64 字符；不要复制 `target/` 或 `artifacts/`。
2. 修改 `Cargo.toml` 的包名、版本与许可。保留 `cdylib` 产物类型，新增依赖时审阅 Wasm 支持、许可、体积和维护情况。只为新插件生成或更新自身的 `Cargo.lock`，不要顺带升级其他插件。
3. 修改 `extension.json`。使用独立稳定 ID，版本为数字 `major.minor.patch`；为每条命令选择输入、输出、导出函数和需要的权限，视图命令按需要设置侧栏 / 窗口入口。必需权限与可选权限按实际工作流拆分，不为无关能力申请授权。
4. 修改 `build.json` 的 `artifact`，使其等于 Cargo 输出的 Wasm 基名。例如包名 `starter-extism-my-plugin` 默认对应 `starter_extism_my_plugin.wasm`。这里只允许文件名，不能填写任意路径。
5. 实现逻辑和 PDK 导出，保证导出名与清单的 `function` 一致。参考现有插件将 PDK 导出限制在 `wasm32`，让普通 Rust 单测测试规则函数；每次调用使用传入的 state / fields / host 上下文恢复状态，不依赖实例全局变量长期保留。
6. 手写 `smoke.json`，覆盖每条清单命令，再按实际能力覆盖主要动作、非法输入、拒绝授权与效果回执。fixture 格式与分层边界见 [测试规范](./testing.md#真实-wasm-与手写-fixture)。README 说明用户操作、权限、数据及已知限制；使用存储或导出时说明其语义。
7. 在 [`listings.json`](../listings.json) 增加 `{ "directory": "my-plugin", "category": "tools", "featured": false }`。分类只支持 `text`、`data`、`tools`、`games`；目录和扩展 ID 均不得重复。是否推荐由收录评审决定。

例如，新插件已经建立并修改为 `my-plugin` 后，从**市场仓库根目录**运行：

```sh
cargo generate-lockfile --manifest-path plugins/my-plugin/Cargo.toml
cargo fmt --manifest-path plugins/my-plugin/Cargo.toml
cargo test --locked --manifest-path plugins/my-plugin/Cargo.toml --target-dir target/my-plugin-native
```

将 `my-plugin` 替换为实际目录名；已有插件仅在依赖变化时更新锁文件。随后生成新的 `MARKET_REVISION` 并执行完整离线检查，在宿主中导入生成包，验收授权、安装与真实交互。

## Rust、JavaScript、TypeScript 与界面

语言与执行环境见 [架构说明](./architecture.md#语言与-wasm)。收录 JS / TS 或其他语言前，先接入构建流程，保留相同的宿主验证、fixture、打包与签名步骤。

## 自定义界面开发

简单命令不需要 HTML；复杂应用在视图命令中设置 `ui.document: "main"`，并建立 `ui/main.html`。自包含 HTML 内嵌 CSS、JavaScript、数据图片和字体，可使用 DOM / Canvas 或框架生成的单文件。保留键盘、焦点、减少动效、主题和窄屏，不引用 CDN、外部脚本或远程网页。

宿主在作者代码之前注入 SDK，HTML 不需要导入脚本。SDK 提供与宿主一致的主题 token、字体、语言、减少动效和基础控件样式；默认样式可以被作者 CSS 覆写，不必复制宿主组件或引入框架。独立窗口可选择主题和语言，包括跟随宿主语言；消费 snapshot 更新，避免只在初次加载时固定文案或画布颜色。

说明密度、提示与长文布局遵循 [宿主界面规范](https://github.com/YanChao001/serial-workbench/blob/main/docs/conventions/ui-guidelines.md#%E8%AF%B4%E6%98%8E%E4%B8%8E%E5%B8%83%E5%B1%80%E7%A8%B3%E5%AE%9A)。操作反馈使用 SDK `notify`；控件增强、原生 select 例外和样式覆写见 [SDK 默认外观](https://github.com/YanChao001/serial-workbench/blob/main/sdk/README.md#%E9%BB%98%E8%AE%A4%E5%A4%96%E8%A7%82%E4%B8%8E%E5%8A%A8%E6%95%88)。

首屏骨架由宿主真实加载状态控制，SDK 在首个视图、主题与 DOM 呈现就绪后通知展示；作者不手工发送内部握手或人为添加启动延迟。自己的异步业务仍需真实加载 / 失败状态，后续忙碌保持正文可见。宿主工具入口位于左侧当前扩展导航项或独立窗口标题栏，正文只组织业务内容。

通过 SDK 消费状态更新、执行业务动作、提交字段与草稿检查点，并保存产物；失败保留输入，按回执区分完成与取消。方法、类型和示例由 [宿主界面 SDK](https://github.com/YanChao001/serial-workbench/blob/main/sdk/README.md) 维护，不另写 DTO。

隔离界面的 sandbox 不含 `allow-forms`；浏览器可能在触发 `onsubmit` 前就阻止表单提交。操作按钮显式使用 `type="button"`，通过点击处理调用业务函数，不依赖 `onsubmit`、`requestSubmit()` 或按钮默认的 submit 行为。需要回车操作时，在对应输入框中按产品语义处理键盘事件、阻止默认提交，再调用同一业务函数；多行输入保留换行或使用明确的组合键。不要为修复按钮无响应而放宽宿主 sandbox。

高频游戏的帧和逻辑步放在界面内，必要时合并检查点，不逐帧调用 Wasm 或原生服务。普通临时游玩可以报告 `dirty: false`；真实未保存编辑用 `dirty: true`。离开暂停、返回手动恢复，并清理 RAF、音频、轮询与监听。检查点导入仍是未知数据，必须重验 schema、范围与可达性。

画布拖动和缩放在本地动画帧中绘制，串行合并最新 fields / checkpoint，业务动作前先提交末次草稿。忙碌时根据新状态协调草稿，不循环重放业务动作；实现可参考 [计算器](../plugins/scientific-calculator/README.md#绘图与科学表达式) 及其界面回归。

构建读取被引用的 `ui/<id>.html`，检查路径、UTF-8 和额度，将源码快照交给原生工具；打包时追加项目许可全文，再计算 UI 和包摘要。仅修改 HTML 也应提高已分发插件的版本。界面重载恢复本窗口已上报的字段与检查点，不重新初始化 Wasm。示例见各插件的 `ui/main.html`。

通用 HTTP 和私有 KV 由 Wasm 返回受控 effects，长连接等使用下面的固定服务；供应商 URL、网页解析与来源解释留在插件 Wasm。UI 不使用原生 IPC、Node API 或另建浏览器存储，隔离边界见 [安全规范](./security.md#执行隔离与数据能力)。

## 固定原生服务

`starter.services.request(service, request)` 只接受宿主固定的 `lan`、`wallpaper`、`resources`、`links` 与 `window` 操作。宿主附加安装身份、哈希、代次和原生窗口，重新检查当前启用与授权；插件不能传入另一个 ID、任意命令、窗口 label 或路径。完整字段以配套宿主 SDK 和 Rust 服务为准。

| 服务        | 权限                | 调用要点                                                                                     |
| ----------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `lan`       | `messaging:lan`     | 明确监听、连接与消息 / 附件发送，本机回环使用真实 TCP；导航后连接保留，iframe 卸载只清理轮询 |
| `wallpaper` | `wallpapers:manage` | 复用现有图库与设置；远程导入只接受有效 `resourceId` 和名称                                   |
| `resources` | `network:images`    | `fetch-image` 获取，`preview` / `save` 使用，`release` 释放；不持久化句柄                    |
| `links`     | `links:open`        | 用户请求打开公共 HTTPS 来源页                                                                |
| `window`    | `window:control`    | 读取、切换本插件独立原生窗口的置顶状态，嵌入主界面与浏览器不支持                             |

网络请求按配套宿主的 [来源与授权](https://github.com/YanChao001/serial-workbench/blob/main/docs/extensions.md#%E6%9D%A5%E6%BA%90%E4%B8%8E%E6%8E%88%E6%9D%83) 继承连接设置，代理授权独立于基础网络授权。壁纸库不在局部界面或检查点维护连接偏好；具体操作见 [网络连接](../plugins/wallpaper-browser/README.md#网络连接)，安全审核见 [安全规范](./security.md#原生服务与外部来源)。

新增方法或权限先完成宿主实现及边界测试，再更新插件并固定可获取的宿主提交。用户操作见 [内网通信说明](../plugins/lan-chat/README.md) 和 [壁纸说明](../plugins/wallpaper-browser/README.md)。

状态轮询与标记已读应使用独立在途状态，不把每轮查询当作手动业务忙碌；等待期间昵称、草稿和连接操作保持可用。手动动作后丢弃早先发出的旧查询回执，更新服务状态时保留用户新输入、焦点与选区。实现不应通过整页重建或周期禁用控件来保证互斥。

## 提交前

按 [测试规范](./testing.md) 选择检查，在 PR 中说明实际平台、命令、结果、权限与数据影响。提交要求和宿主子模块更新顺序见 [贡献流程](../CONTRIBUTING.md)。当前 Actions 停用，发布启用条件、触发范围和续签见 [发布指南](./publishing.md)。
