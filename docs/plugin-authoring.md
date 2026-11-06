# 独立插件作者入口

从市场仓库开始，使用公开协议、SDK 和校验工具编写插件。现有构建流程支持 Rust + Extism PDK 编译的 Wasm，以及可选的自包含 HTML / CSS / JavaScript 界面。

## 当前能独立完成什么

市场仓库提供参考源码、构建打包脚本和测试说明；公开协议、界面 SDK 与 `extension-tool` 由宿主仓库提供。按下面的分工准备材料：

| 材料或操作                                         | 当前提供方式                                                | 作者需要做什么                                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Rust 插件、HTML 界面、手写 fixture、许可和权限示例 | 本仓库 `plugins/` 与[开发指南](./development.md)            | 按业务选择参考内容与所需权限                                                                      |
| 编译插件 Wasm、原生业务单测                        | 本仓库 Rust 工具链与各插件锁文件                            | 安装 Rust 和 Wasm 目标                                                                            |
| 清单、输入输出、视图、effects 与服务契约           | 下表链接的宿主文档与 SDK                                    | 使用与校验工具相同宿主提交的材料                                                                  |
| UI 类型声明                                        | 宿主 `sdk/extension-ui.d.ts` 及其 `generated/protocol.d.ts` | 按[宿主 SDK 说明](https://github.com/YanChao001/serial-workbench/blob/main/sdk/README.md)一并取得 |
| 清单 / ABI / 视图校验、真实 Wasm fixture           | 配套 `extension-tool` 二进制                                | 按[准备宿主校验工具](./development.md#准备宿主校验工具)构建，或使用维护者从同一提交构建的可信工具 |
| 安装、授权、网络、存储与原生窗口                   | 配套原生宿主                                                | 导入生成包，按[验收范围](./testing.md#按改动选择检查)验证实际操作                                 |

单独检出市场后即可编写和编译 Rust 业务，运行原生单测及脚本 / 界面回归；真实 Wasm 验收与完整 `check` 还需上述工具。宿主的 JS / TS Wasm 示例及市场支持范围见[语言与界面](./development.md#rustjavascripttypescript-与界面)。

## 作者需要的公开契约

本页宿主链接指向当前 `main`，现有协议与能力的最低宿主基线为 `0.1.0`。收录与发布时按[固定配套宿主](./publishing.md#固定配套宿主)选定完整 40 位提交 SHA，并使用该提交的文档、SDK 与 `extension-tool`；安装包的可用版本查阅宿主 [Release](https://github.com/YanChao001/serial-workbench/releases)。

| 开发问题                       | 公开契约入口                                                                                                                                                                                                                                                                                                                   | 需要核对的内容                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 如何声明与调用文本 / JSON 命令 | [包与输入契约](https://github.com/YanChao001/serial-workbench/blob/main/docs/extensions.md#%E5%8C%85%E4%B8%8E%E8%BE%93%E5%85%A5%E5%A5%91%E7%BA%A6)                                                                                                                                                                             | 清单字段、导出名、输入 / 结果格式、必需与可选权限、用户主动提交的数据                                            |
| 如何返回标准界面并处理动作     | [应用插件协议](https://github.com/YanChao001/serial-workbench/blob/main/docs/extensions.md#%E5%BC%80%E5%8F%91%E5%B8%A6%E7%95%8C%E9%9D%A2%E7%9A%84%E5%BA%94%E7%94%A8%E6%8F%92%E4%BB%B6)                                                                                                                                         | `version`、`action`、`state`、`fields`、`locale`、视图字段 / 动作 / 块 / 产物、额度和未知状态拒写                |
| 如何请求网络与存储             | [网络、凭据与私有数据](https://github.com/YanChao001/serial-workbench/blob/main/docs/extensions.md#%E7%BD%91%E7%BB%9C%E5%87%AD%E6%8D%AE%E4%B8%8E%E7%A7%81%E6%9C%89%E6%95%B0%E6%8D%AE)                                                                                                                                          | HTTP 来源 / 方法 / 代理授权、凭据引用、storage revision、effect ID、`host-result` 回执与失败保留草稿             |
| 如何编写自定义 HTML            | [界面 SDK](https://github.com/YanChao001/serial-workbench/blob/main/sdk/README.md)、[公共类型](https://github.com/YanChao001/serial-workbench/tree/main/sdk)                                                                                                                                                                   | `starter` 方法、snapshot、主题 / 语言 / active、检查点、失败与取消；运行时由宿主注入，无需复制 JS 或访问原生 IPC |
| 如何使用桌面能力               | [受控桌面服务](https://github.com/YanChao001/serial-workbench/blob/main/docs/extensions.md#%E5%8F%97%E6%8E%A7%E6%A1%8C%E9%9D%A2%E6%9C%8D%E5%8A%A1)                                                                                                                                                                             | `lan`、`wallpaper`、`resources`、`links`、`window` 的操作、请求 / 响应、权限、窗口归属与资源释放                 |
| 执行有什么限制                 | [执行、存储与生命周期](https://github.com/YanChao001/serial-workbench/blob/main/docs/extensions.md#%E6%89%A7%E8%A1%8C%E5%AD%98%E5%82%A8%E4%B8%8E%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F)、[自定义界面](https://github.com/YanChao001/serial-workbench/blob/main/docs/extensions.md#%E8%87%AA%E5%AE%9A%E4%B9%89%E7%95%8C%E9%9D%A2) | 每次新 Wasm 实例、预算 / 队列 / 取消、界面隐藏与卸载、在途副作用和安装代次                                       |
| 如何证明输出符合约定           | 本仓库[真实 Wasm 与手写 fixture](./testing.md#真实-wasm-与手写-fixture)                                                                                                                                                                                                                                                        | 断言格式、逐条显式输入、真实 worker 校验；合成 host 上下文不会执行真实服务                                       |

`lan` / `wallpaper` 的 SDK 类型仍以 `Record<string, unknown>` 接收请求并返回 `unknown`；按同一宿主提交的公开服务说明核对字段、错误码与取消语义。新增操作或权限需先补齐宿主实现与公共契约。

## 界面与宿主保持一致

嵌入页面与独立窗口的普通界面均遵循[宿主共同外观规范](https://github.com/YanChao001/serial-workbench/blob/main/docs/conventions/ui-guidelines.md#%E5%AE%BF%E4%B8%BB%E4%B8%8E%E6%8F%92%E4%BB%B6%E7%9A%84%E5%85%B1%E5%90%8C%E5%A4%96%E8%A7%82)。作者维护业务布局、内容与专用绘制；通用控件直接使用宿主注入的字体、尺寸、圆角、边框、材质与状态。共享样式、主题变化和 Shadow DOM 接入见[SDK 默认外观](https://github.com/YanChao001/serial-workbench/blob/main/sdk/README.md#%E9%BB%98%E8%AE%A4%E5%A4%96%E8%A7%82%E4%B8%8E%E5%8A%A8%E6%95%88)。

游戏、图表或专用操作区采用独立视觉时，在插件 README 说明目的与范围，其余控件沿用宿主规则。例如[贪吃蛇的统一游戏视觉](../plugins/snake/README.md#视觉音效与平台边界)覆盖菜单、HUD、音量与皮肤设置。

按[自定义界面无头回归](./testing.md#自定义界面无头回归)检查实际内容与宿主组件的外观、文字可读性、键盘、主题和减少动效；独立视觉区域也适用这些交互要求。

## 第一个文本插件

以下示例把用户主动提交的文本转换为大写，保留中文字符。它只需 `text:read`；该权限用于真实宿主中的非空文本输入，安装后需授权。

从市场仓库根目录建立 `examples/author-text/src/`，按下面路径保存五个 UTF-8 文件。本地练习使用这个目录，构建输出写入 `target/`，安装包写入 `artifacts/`；准备收录时再按[新增插件](./development.md#新增一个插件)迁入 `plugins/<directory>/` 并登记 `listings.json`。

`examples/author-text/Cargo.toml`：

```toml
[package]
name = "starter-extism-author-text"
version = "1.0.0"
edition = "2024"
license = "Apache-2.0"
publish = false

[lib]
crate-type = ["cdylib"]

[dependencies]
extism-pdk = "=1.4.1"

[profile.release]
opt-level = "s"
lto = true
strip = true
```

`examples/author-text/src/lib.rs`：

```rust
use extism_pdk::*;

#[plugin_fn]
pub fn uppercase(input: String) -> FnResult<String> {
    Ok(input.to_uppercase())
}
```

`examples/author-text/extension.json`：

```json
{
  "formatVersion": 3,
  "apiVersion": 2,
  "minHostVersion": "0.1.0",
  "id": "example.author-text",
  "version": "1.0.0",
  "name": "文本大写",
  "author": "Example author",
  "description": "将用户主动提交的文本转换为大写，保留中文字符。",
  "commands": [
    {
      "id": "uppercase",
      "title": "转换为大写",
      "function": "uppercase",
      "inputFormat": "text",
      "resultFormat": "text",
      "permissions": ["text:read"]
    }
  ],
  "permissions": ["text:read"],
  "optionalPermissions": [],
  "network": []
}
```

`examples/author-text/build.json`：

```json
{ "artifact": "starter_extism_author_text.wasm" }
```

`build.json` 声明收录构建时的 Cargo 产物名，下方练习直接使用同一文件名。

`examples/author-text/smoke.json`：

```json
[
  {
    "command": "uppercase",
    "input": "Hello, plugin!",
    "expectOutput": "HELLO, PLUGIN!"
  },
  {
    "command": "uppercase",
    "input": "你好，Rust!",
    "expectOutput": "你好，RUST!"
  }
]
```

按[环境准备](./development.md#环境与目录)安装工具链与 Wasm 目标，再从**市场仓库根目录**依次执行，前一步成功后再执行下一步：

```sh
cargo generate-lockfile --manifest-path examples/author-text/Cargo.toml
cargo fmt --manifest-path examples/author-text/Cargo.toml -- --check
cargo build --locked --release --target wasm32-unknown-unknown --manifest-path examples/author-text/Cargo.toml --target-dir target/author-text-build
```

保留生成的 `Cargo.lock`，以后使用 `--locked` 构建。编译成功后，按[准备宿主校验工具](./development.md#准备宿主校验工具)设置 `STARTER_EXTENSION_TOOL`，将下面内容保存为 `examples/author-text/check.mjs`，从市场根目录执行 `node examples/author-text/check.mjs`：

```javascript
import { writeFile } from "node:fs/promises";
import { packagePlugin } from "../../scripts/build.mjs";
import { ensureDirectory } from "../../scripts/files.mjs";
import { resolveHostTool, validatePlugin } from "../../scripts/host-tool.mjs";

const checked = await validatePlugin({
  manifestPath: "examples/author-text/extension.json",
  wasmPath:
    "target/author-text-build/wasm32-unknown-unknown/release/starter_extism_author_text.wasm",
  fixturePath: "examples/author-text/smoke.json",
  executable: await resolveHostTool(),
});
const packaged = packagePlugin(
  checked.manifest,
  checked.wasm,
  checked.uiDocuments,
);
await ensureDirectory("artifacts/author-text");
await writeFile(
  "artifacts/author-text/example.author-text-1.0.0.starter-extension.json",
  packaged.content,
  { flag: "wx" },
);
console.log("真实 Wasm 用例通过，已生成本地安装包。");
```

脚本运行真实 Wasm 用例，再将已检查的清单与 Wasm 字节打包到 `artifacts/author-text/`。输出文件已存在时，选择新文件名，或检查并移走旧练习包后重跑。

在配套原生宿主的插件中心导入生成的 `.starter-extension.json`，审阅插件与文本权限后启用，输入中英文并执行“转换为大写”，完成安装、授权与结果展示的交互验收。实际业务插件再按[验收范围](./testing.md#按改动选择检查)补齐规则单测、错误处理与相关服务检查。
