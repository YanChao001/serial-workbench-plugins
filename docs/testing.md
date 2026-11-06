# 测试与验收

本页说明如何按改动选择检查、编写 fixture 和验收宿主交互。环境与 `extension-tool` 的准备见 [开发指南](./development.md)，签名与上线见 [发布指南](./publishing.md)。

## 按改动选择检查

| 修改范围                             | 本地检查起点                                                | 按影响补充的验收                             |
| ------------------------------------ | ----------------------------------------------------------- | -------------------------------------------- |
| 文档、示例命令                       | 对照实际脚本、路径和 CLI 参数；检查相关 Markdown 格式及链接 | 平台特有命令未执行时明确说明                 |
| 市场脚本、目录协议、签名或发布流程   | 对应脚本测试；影响共享构建或产物时执行完整 `check`          | 生产凭据与权限、真实发布结果                 |
| 插件规则、state / fields 或 PDK 导出 | 受影响插件的规则单测、格式 / Clippy、真实 Wasm `test`       | 实际宿主交互；输入、状态与额度边界           |
| 清单、权限、视图、导出产物           | 单插件真实 Wasm fixture 与相关界面回归；交付前完整 `check`  | 安装与授权；受影响语言、布局、键盘或保存流程 |
| 私有存储、并发或宿主 effects         | 相关规则、成功 / 失败回执 fixture；宿主服务变更测对应边界   | CAS、取消、重开及持久化恢复中受影响的行为    |
| 宿主 API / ABI 协议联动              | 重建指定宿主工具后完整 `check`，同步相关宿主测试            | 受影响平台、桌面生命周期与正式安装环境       |

先验证受影响行为，共享入口、协议或独立失败场景改变时再扩大范围。通过后仅因新改动、失败或明确疑点重跑。市场 `check` 覆盖收录项的格式、构建、真实 Wasm 和离线验签；Node 回归、Rust 单测和 Clippy 分别运行。CI 的范围选择与产物复用见 [CI 与交付证据](#ci-与交付证据)。

## 脚本、界面与规则单测

从**市场仓库根目录**运行市场脚本与插件界面回归：

```sh
node --test scripts/*.test.mjs plugins/*/ui/*.test.mjs
```

这些测试覆盖签名、包完整性、目录规则、发布来源、仓库配置和构建工具接线，以及界面状态恢复与异步交互。界面测试在 Node 中执行真实脚本，使用 DOM / SDK 替身。配置漂移也可单独运行 `node scripts/repository-config.mjs check`；字段与同步范围见 [仓库来源配置](./development.md#仓库来源与平台入口)。

输入边界集中在规则单测；上层入口验证接线、字节快照、身份和失败传播。

规则函数优先使用原生 Rust 单测，覆盖业务不变量和对应的非法输入。从**市场仓库根目录**选择受影响插件运行：

```sh
cargo test --locked --manifest-path plugins/scientific-calculator/Cargo.toml --target-dir target/scientific-calculator-native
cargo test --locked --manifest-path plugins/snake/Cargo.toml --target-dir target/snake-native
cargo test --locked --manifest-path plugins/lan-chat/Cargo.toml --target-dir target/lan-chat-native
cargo test --locked --manifest-path plugins/wallpaper-browser/Cargo.toml --target-dir target/wallpaper-browser-native
```

原生单测覆盖规则函数，PDK 导出、Wasm 依赖与视图契约由下面的真实 Wasm 验收覆盖。

修改 Rust 代码时，同时对相同清单和 target 目录运行 `cargo clippy --locked --manifest-path <Cargo.toml> --target-dir <原生测试目录> --all-targets -- -D warnings`。CI 与发布构建会按 `listings.json` 遍历全部收录插件执行原生单测和 Clippy，市场脚本与插件使用市场工具链，宿主 CLI 单独使用宿主工具链。

## 真实 Wasm 与手写 fixture

按 [开发指南](./development.md#准备宿主校验工具) 准备工具，用未占用的新修订号执行 [完整离线检查](./development.md#首次完整离线检查)。它只遍历 `listings.json`，当前清单为空；四个参考插件使用 [单插件检查](#聚焦单个插件)。完整流程会：

1. 对 `listings.json` 的每个插件执行 `cargo fmt -- --check`，使用其锁文件编译 `wasm32-unknown-unknown` 发布模块。
2. 将清单、Wasm、被引用的 UI 源码和 fixture 读入有界快照，调用宿主工具执行一次 `test`；打包向 HTML 追加项目许可全文，再计算 UI 与包摘要。
3. 检查每条清单命令都被 1–32 个 fixture 中至少一个用例覆盖，核对返回 ID / 版本以及各项通过结果。
4. 全部收录项成功后完成 `artifacts/market-<revision>`，包含插件包、未签名目录和三份项目许可文件；失败清理本次暂存目录，保留已有产物。
5. 使用一次性内存密钥验签目录及包哈希。生产公钥保持不变，输出不含生产签名 `catalog.json`。

`test` 先检查清单、UI、导入 / 导出和模块编译，再在真实无界面 worker 内执行 fixture，按命令类型检查结果，包括完整 Rust 视图与额度校验。`validate` 仅做静态检查，不创建实例或执行 Wasm start；完整流程已包含这些检查。两个命令均无桌面窗口。

### 聚焦单个插件

修改单个插件后，先从**市场仓库根目录**重新编译对应 Wasm。以计算器为例，以下命令适用于 PowerShell 和 macOS / Linux shell：

```sh
cargo build --locked --release --target wasm32-unknown-unknown --manifest-path plugins/scientific-calculator/Cargo.toml --target-dir target/scientific-calculator
```

然后从市场根目录调用快照校验入口。PowerShell 使用 here-string 传入 JavaScript：

```powershell
@'
import { validatePlugin, resolveHostTool } from "./scripts/host-tool.mjs";
await validatePlugin({
  manifestPath: "plugins/scientific-calculator/extension.json",
  wasmPath: "target/scientific-calculator/wasm32-unknown-unknown/release/starter_extism_scientific_calculator.wasm",
  fixturePath: "plugins/scientific-calculator/smoke.json",
  uiDirectory: "plugins/scientific-calculator/ui",
  executable: await resolveHostTool(),
});
'@ | node --input-type=module
```

macOS / Linux 可用 `node --input-type=module <<'NODE'` 接收同一段 JavaScript，以独占一行的 `NODE` 结束。模块路径以 `build.json` 和实际 target-dir 为准；入口将当前清单、Wasm、HTML 和 fixture 的快照交给原生 `test`。

### 编写可发现回归的断言

每个 `smoke.json` 是一个用例对象或顺序执行的 1–32 个对象，覆盖所有清单命令。以下检查计算器启动的稳定字段；业务断言参考其 [`smoke.json`](../plugins/scientific-calculator/smoke.json)。

```json
{
  "command": "workspace",
  "input": {
    "version": 2,
    "action": null,
    "state": "",
    "fields": {},
    "locale": "en"
  },
  "expectJsonSubset": {
    "version": 2,
    "display": "Scientific calculator",
    "effects": [],
    "artifacts": []
  }
}
```

`expectOutput`、`expectJson`、`expectJsonSubset`、`expectError` 四选一，分别比较完整字符串、JSON 等价、手写对象子集和稳定错误码。`expectJsonSubset` 必须为非空对象，递归匹配声明字段，数组与标量完全相等。选择能区分正确与错误行为的状态、产物或 effect 字段。

预期由规则推导并写入仓库。`cancelAfterMs` 可设为 1–5000 毫秒，配合预期错误验证取消；选用执行时间确定长于延迟的受控用例。主动取消通常为 `USER_CANCELLED`，预算耗尽为 `EXTENSION_TIMEOUT`。

fixture 数组不会自动把上一条输出 state / fields 传给下一条，也不会共享 Wasm 实例全局状态。每条输入必须明确构造其初始请求；它们可复用 worker 进程来验证取消后恢复等行为。完整契约以 [宿主开发工具说明](https://github.com/YanChao001/serial-workbench/blob/main/docs/extensions.md#%E6%9E%84%E5%BB%BA-rust-%E7%A4%BA%E4%BE%8B) 和宿主 CLI 源码为准。

## 合成宿主上下文与真实效果

离线 fixture 可构造 `host.permissions`、`host.storage` 和 `action: "host-result"` / `results`，验证插件处理这些输入的逻辑。例如 [贪吃蛇 fixture](../plugins/snake/smoke.json) 检查 storage 请求、成功 revision 和 `CONFLICT` 回执。真实存储写入与网络请求另由宿主交互验收。

真实应用中，这些保留字段由宿主注入，页面请求不能自行伪造。按涉及的能力验证：

- 未授权时离线功能仍可用；插件不把可选授权变成启动必需条件，也不在初次打开时自动申请写入。
- 点击保存后先保持待完成状态，收到匹配 effect ID 的成功回执才宣告保存；失败、取消或响应省略不会自动重试有副作用的操作。
- 写入使用宿主当前 revision；另一窗口修改后，旧 revision 发生冲突，保留本窗口草稿并提示重新审阅。
- 具有列表操作的界面绑定稳定身份或列表 revision，刷新后不把旧索引误应用到另一条记录。
- 未来或损坏的插件数据拒绝覆盖，原始数据保留；撤销、新游戏或切换题目不会被误当作已经持久保存。

宿主 effects 或协议变化时，在宿主仓库运行权限、storage CAS、执行代次与回执的相关回归，并在目标平台验收受影响的网络、凭据、对话框或跨窗口行为。

## 固定原生服务验收

内网通信的 Wasm 用例验证入口、安全文本及附件标签导出；壁纸用例验证图源 effect 与回执解析。原生服务测试覆盖授权、安装代次、窗口归属、入参、副作用与回收：

| 变更边界   | 本地或宿主服务层检查                       | 按影响安排的真实环境检查                    |
| ---------- | ------------------------------------------ | ------------------------------------------- |
| LAN        | 规则与坏帧、真实环回 TCP、附件与历史、回收 | 两台设备、路由 / 防火墙、对话框与跨导航收信 |
| 图源规则   | 解析、输入边界、图片身份、effect / 回执    | 变更图源在目标网络的 API、限流及图片可用性  |
| 图片资源   | 授权、URL / SSRF、解码额度、句柄身份与清理 | 真实下载、WebView 预览、另存与取消          |
| 图库与背景 | 导入、配额、revision CAS、其他偏好保留     | 真实图库操作及背景多窗口同步                |
| 外部链接   | 独立授权和非法 URL 拒绝                    | 目标平台打开系统浏览器                      |

按受影响边界选择表中检查，坏输入、授权和资源所有权应有回归。网络规则见 [安全规范](./security.md#原生服务与外部来源)，图源用例见 [壁纸库测试](../plugins/wallpaper-browser/README.md#开发与验证)。真实联网记录图源、筛选、传输模式与结果。

## 界面与安装验收

普通视图由宿主绘制，自定义 HTML 由插件组织；两种路线都需检查数据和布局。中文与英文分别检查初始化及关键动作，在窄屏和常见桌面宽度下确认长文本、网格、错误与保存入口可读。用键盘检查 Tab 顺序、焦点和操作按钮；普通文本保持字面内容，Markdown 和生成文件遵循宿主安全边界。

按变更涉及的操作验证语言、主题、尺寸与生命周期，切换语言保留业务进度，临时游戏与未保存编辑使用正确 dirty 语义。插件操作与恢复边界见各自 README。

自定义 UI 按影响检查以下行为，完整 profile 与控件矩阵见 [宿主扩展验证说明](https://github.com/YanChao001/serial-workbench/blob/main/docs/testing.md#%E8%87%AA%E5%AE%9A%E4%B9%89%E6%89%A9%E5%B1%95%E7%95%8C%E9%9D%A2)：

- 首屏使用真实加载骨架和已应用的主题；前台握手停滞可重试，后台 / 离屏不误报，后续 busy 保持正文和焦点。
- 工具入口、内容高度、字号、窄屏、键盘、默认样式覆写和原生 select 例外保持可用，正文不重复宿主标题。
- 草稿合并、轮询与业务动作存在竞争时，旧回执不覆盖新输入或状态，取消不显示成功；对应竞争场景在插件界面测试中维护。
- 可选权限拒绝后保留无关离线功能。

宿主浏览器测试默认使用无头模式，不抢占正在工作的桌面。已有生产构建和 Playwright 用例可从**宿主仓库根目录**运行：

```sh
pnpm test:ui
```

该命令运行宿主已有浏览器用例。新增插件渲染用例应使用真实生成的视图，并保留动作与状态规则测试；市场自定义 HTML 的专门入口见 [无头回归](#自定义界面无头回归)。

真实窗口使用隔离环境或已安排的前台时段，以生成包和独立测试数据验收安装、权限、窗口、保存恢复或卸载。并发、撤权和安装替换变化验证 CAS 与旧请求隔离。正式安装版、平台差异和升级恢复见 [宿主桌面测试规范](https://github.com/YanChao001/serial-workbench/blob/main/docs/testing.md#%E9%81%BF%E5%85%8D%E5%B9%B2%E6%89%B0%E6%9C%AC%E6%9C%BA%E6%A1%8C%E9%9D%A2)。

## CI 与交付证据

GitHub Actions 当前停用。恢复后，[`ci.yml`](../.github/workflows/ci.yml) 仅在面向 `main` 的 PR 和手动运行时触发，使用 Ubuntu。范围由 [`ci-plan.mjs`](../scripts/ci-plan.mjs) 选择：

- 仅文档、`.test.mjs`、`ci-plan.mjs` 或两个工作流变化时运行 Node 回归。
- 其他变更、空差异或比较失败执行完整检查：Node 回归、收录项的原生单测与 Clippy、配套宿主工具构建及 `check`。手动 CI 强制完整检查。
- 完整检查成功后保留三天的未签名产物，按实际市场 Git tree 和完整宿主 SHA 命名。后续相同输入可复用本仓库分支产生的成功 CI 产物并跳过重复检查；未命中或 API 不可用时重新检查。

宿主选择与完整 SHA 要求见 [固定配套宿主](./publishing.md#固定配套宿主)。CI 新工作区使用测试修订号 `1`；本地使用未占用的修订目录。

PR 记录实际市场与宿主提交、平台、命令及结果，分别说明 Node / 浏览器替身、真实 Wasm、原生服务、真实桌面与正式安装版的验证范围。线上 latest 和签名附件另按 [发布指南](./publishing.md) 核对。

## 自定义界面无头回归

构建 CLI、内置包与市场 Wasm 后，从宿主根目录运行：

```sh
pnpm test:extensions:ui
```

它覆盖真实 HTML / SDK / 离线 Wasm、主题、键盘、草稿重载、无障碍和隔离负例，使用浏览器协议 / 对话框替身。准备、筛选与报告见 [宿主测试说明](https://github.com/YanChao001/serial-workbench/blob/main/docs/testing.md#%E8%87%AA%E5%AE%9A%E4%B9%89%E6%89%A9%E5%B1%95%E7%95%8C%E9%9D%A2)。只验证壁纸权限组合时可运行 `pnpm test:extensions:ui wallpaper-browser --capabilities-only`。
