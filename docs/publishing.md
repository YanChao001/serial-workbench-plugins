# 市场发布与维护

本页说明从已审核源码到客户端市场的分发流程。开发与验收见 [开发指南](./development.md) 和 [测试规范](./testing.md)，信任边界见 [安全规范](./security.md)。命令从市场仓库根目录执行。

当前收录清单为空，生产公钥未配置，宿主与市场的 GitHub Actions 均停用。源码按 [贡献流程](../CONTRIBUTING.md#分支提交与-pr) 合入 `main`；完成宿主、签名和发布权限配置并恢复 Actions 后，以下工作流才会执行。

## 发布的五个阶段

| 阶段                              | 产生的结果                               | 是否更新客户端市场 |
| --------------------------------- | ---------------------------------------- | ------------------ |
| 本地提交                          | 可审阅的源码和提交 SHA                   | 否                 |
| 推送分支、创建 PR                 | 远端可检出的代码与检查结果               | 否                 |
| 审核合并 `main`                   | 已审核的发布来源；自动化启用后按范围触发 | 待后续阶段成功     |
| 构建、离线验收                    | 全部包与未签名目录，临时密钥验证结果     | 否                 |
| 生产签名、完整上传并发布为 latest | 受信任 `catalog.json` 和对应包的 Release | 是                 |

宿主读取配置仓库的 `releases/latest/download/catalog.json`。客户端市场随公开 latest 更新，核对方法见 [发布后核对](#发布后核对)。

## 固定配套宿主

市场工具调用配套宿主的 `extension-tool` 检查清单、Wasm ABI、命令输出和视图。包与协议由 [宿主扩展契约](https://github.com/YanChao001/serial-workbench/blob/main/docs/extensions.md#%E5%8C%85%E4%B8%8E%E8%BE%93%E5%85%A5%E5%A5%91%E7%BA%A6) 定义，最低宿主以各插件的 `extension.json` 为准。

开发阶段按选定宿主提交验证。发布时使用该 SHA 对应的文档、SDK 与工具，并核对实际安装包 Release；默认分支链接用于定位当前文档。作者公开材料的固定基线见 [作者入口](./plugin-authoring.md#作者需要的公开契约)。

LAN 两端须使用相同配套线协议，按 [宿主 LAN 契约](https://github.com/YanChao001/serial-workbench/blob/main/docs/extensions.md#%E5%B1%80%E5%9F%9F%E7%BD%91%E9%80%9A%E4%BF%A1) 验收端点和原生服务。客户端兼容错误见 [排障手册](./troubleshooting.md#客户端错误)。

正式发布新能力时提高宿主版本，并让插件声明准确的 `minHostVersion`。修改已分发插件的最低版本、HTML 或其他包内容时，提高插件版本并同步 Cargo 清单与锁文件，再重建签名。存档保护见 [兼容与演进](./architecture.md#兼容与演进)。

独立 CI 启用后，宿主来自 [.github/actions/host-tool/action.yml](../.github/actions/host-tool/action.yml)，与本机子模块旁的宿主代码无关：

- [PR / main 检查](../.github/workflows/ci.yml) 使用仓库变量 `STARTER_HOST_REF`，未设置时使用 `repository.config.json` 的 `host.defaultRef`；宿主仓库与默认值按 [仓库来源配置](./development.md#仓库来源与平台入口) 同步。
- [发布工作流](../.github/workflows/publish.yml) 自动触发时使用 `STARTER_HOST_REF`，手动触发时可用本次 `host_ref` 覆盖；必须为已推送并审核的完整 40 位提交 SHA。
- `host_ref` 只覆盖这一次发布，不会修复 PR CI 的默认宿主选择。

跨仓库修改先推送并审核宿主提交，再将 `STARTER_HOST_REF` 固定为其完整 SHA，完成市场检查并核对摘要中的实际宿主提交。验证入口见 [测试规范](./testing.md)。

## 发布前验收

维护者按 [收录要求](../CONTRIBUTING.md#收录或修改插件) 审核源码、许可证、依赖、权限与行为。每次发布形成 [listings.json](../listings.json) 全部收录项的完整目录。

1. 通过 PR 审核源码和锁文件，为各命令及受影响业务、非法输入、授权与效果回执准备手写断言。
2. 用配套宿主准备 `extension-tool`，按 [测试规范](./testing.md#按改动选择检查) 验收规则、界面与宿主交互；新增权限和服务先确认宿主已有实现。
3. 从已审核的 `main` 提交检查全部收录项，记录市场 SHA、宿主 SHA、环境、结果及未验证范围。LAN 变更记录两端协议、跨设备验证和数据影响。
4. 确认生产公钥 [public-key.txt](../public-key.txt) 与目标宿主配置相符，且生产私钥只存在于受控 Secret 或仓库外的受保护文件。
5. 选择严格递增的目录修订号，检查完整包、模块和 UI 文档哈希，确认拟发布标签未被其他提交占用，再执行下面的生产流程。

## Actions 生产发布

恢复 Actions 和生产配置后，发布范围内的改动经 PR 合入 `main`，将触发“发布市场”。范围包括插件、市场脚本、清单、仓库配置、工具链、公钥、许可文件及相关 Actions；纯 Markdown 不触发，精确路径见 [publish.yml](../.github/workflows/publish.yml)。

工作流只允许 `main` 执行构建 job，`workflow_dispatch` 用于手动发布和续签。`revision` 留空时使用当前 Unix 秒，也可指定十进制正 `u32`；前导零会规范化，空白、科学计数、十六进制和越界输入会拒绝。续签、下架和推荐调整也需要新的目录修订号。

发布优先复用 [相同市场 tree 与完整宿主 SHA 的成功 CI 产物](./testing.md#ci-与交付证据)，仅调整未签名目录的修订、时间和标签，再核对包哈希；未命中时完整构建。手动 `force_checks` 可强制重新检查。生产签名、源码对照、包完整性、标签来源和发布后核对每次执行。

工作流分为两个独立 job：

| Job       | 处理内容                                                                                                               | 生产签名权限                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `build`   | 优先复用同市场 tree / 宿主 SHA 的已验收包；无记录时运行脚本、原生检查、宿主工具构建、Wasm 与离线验签，上传本次修订产物 | 不注入生产私钥，仅仓库读取权限                                     |
| `publish` | 下载上一 job 产物，重新对照已审核清单、完整包哈希签名并验签，上传和发布                                                | `MARKET_SIGNING_PRIVATE_KEY` Secret 与发布所需的 `contents: write` |

签名 job 在构建成功后核对清单、Wasm、UI、规范包字节与目录预览。收录信息及 HTML 摘要须匹配审核过的 checkout：打包时追加项目许可全文，源码对照采用同一逻辑，第三方声明保留原文。`catalog.json` 以新文件创建，重签使用新修订目录。密钥隔离见 [安全规范](./security.md#密钥与构建隔离)。

发布脚本验证签名目录与全部包，将核验字节写入新建的系统临时目录，仅上传该快照，结束后清理。它分页读取完整 Release 历史，要求修订高于所有非草稿 `market-*` Release；读取失败或响应异常时停止。维护者还须结合客户端已见修订和发布记录保持递增。

来源检查通过后，以市场源码 `GITHUB_SHA` 为草稿 Release 的 target，上传 `catalog.json`、全部目录所列包和从审核 checkout 复制到快照的 `LICENSE`、`NOTICE`。无界面 Wasm 包也随这两份许可文件分发。全部上传后才公开草稿并设为 latest。

脚本在创建草稿前和公开 latest 前核对标签最终 commit，错配或无法确定时停止；`--target` 不会移动既有标签。发布顺序见 [publish.mjs](../scripts/publish.mjs)，GitHub 操作见 [平台适配器](../scripts/hosting/github.mjs)。

仓库和标签写权限由受控维护者持有，配合仓库保护规则使用。

上传失败保留草稿。维护者核对附件和日志后处理已有草稿，再重试；脚本不覆盖同标签附件或自动恢复草稿。已公开的问题按 [下架或修复流程](#下架回退与公钥轮换) 发布更高修订。

### Release 说明格式

发布说明从已验签目录和 Git 历史生成，包含发布信息、破坏性变更、更新内容、插件版本、使用与验证及完整变更。它列出修订、有效期、插件版本与最低宿主，链接指向确切市场源码 SHA。

基线为最高修订的已公开、非预发布 `market-*` Release；首次发布读取全部历史。普通提交按 Conventional Commits 分类，合并提交去重，未识别项进入“其他变更”。破坏性变更单列，升级步骤写在提交正文；无新提交的续签如实说明。

发布 job 和本地发布均需完整 Git 历史与标签；缺失标签、历史断裂或说明超限会在创建 Release 前停止。实现见 [release-notes.mjs](../scripts/release-notes.mjs)。维护者公开前审阅升级影响和最低宿主，真实环境验证范围记录在 PR。

## 本地受控发布

本地发布使用已审核并推送的完整市场提交、仓库外私钥文件和具有目标仓库发布权限的 `gh` 会话。以下 PowerShell 示例中的路径和修订号替换为实际值：

```powershell
$env:STARTER_EXTENSION_TOOL = "E:\tools\extension-tool.exe"
$env:MARKET_REVISION = "<高于已发布目录的正整数>"
$env:MARKET_SOURCE_SHA = (git rev-parse HEAD).Trim()
node scripts/build.mjs
$env:MARKET_KEY_FILE = "E:\protected-market-keys\release.pem"
node scripts/sign-release.mjs "artifacts/market-$env:MARKET_REVISION"
node scripts/verify.mjs "artifacts/market-$env:MARKET_REVISION"
node scripts/publish.mjs "artifacts/market-$env:MARKET_REVISION"
```

每步成功后再执行下一步。`STARTER_EXTENSION_TOOL` 使用绝对路径，`MARKET_SOURCE_SHA` 使用市场源码的完整 40 位 SHA。环境中的 `GITHUB_SHA` 优先，执行前核对两者，确保指向本次审核提交。

使用新的 `artifacts/market-<revision>`，保留上一发布目录作核对。私钥只通过受保护文件提供，仓库、产物、日志和命令行字面量中均不得包含私钥；结束后清除会话中不再需要的发布变量。

## 有效期与续签

签名时以当前 UTC Unix 秒重写 `issuedAt` / `expiresAt`，默认有效期为 7 天。宿主拒绝超过 30 天的签名窗口、超过当前时间 5 分钟的未来签发时间，以及已经到期的目录。具体定义见 [protocol.mjs](../scripts/protocol.mjs) 与配套宿主实现。

启用市场后，在到期前以**更高修订号**验收、签名并发布完整目录，包未变化时可按上文复用已验收产物。Actions 可在 `main` 手动运行 `workflow_dispatch`；当前没有定时续签任务，维护者需安排续签与提醒。

宿主按“仓库 + 原始公钥指纹”记录最高修订号和 payload 摘要。相同修订号只能对应完全相同的已签名 payload；更低修订号和同号替换都会被拒绝。短期缓存不延长签名有效期，过期目录不能用于下载或安装。

## 下架、回退与公钥轮换

- **下架**：从 `listings.json` 移除项目，发布更高修订号的完整目录。客户端刷新后不再提供新下载；已安装插件和用户数据保留，没有远程卸载机制。仅删除 Release 或包附件可能造成下载失败，不能代替下架目录。
- **修复或回退分发内容**：使用更高目录修订号重新发布经过审核的包，说明用户操作和数据影响。不要把旧 Release 重新设为 latest 来降低目录修订号。宿主的“回退上一安装包”是用户显式的本地操作，与目录防回退分别执行；市场发布不会自动降级用户现有安装。
- **公钥轮换**：在受控位置生成新密钥，将新公钥提交到 `public-key.txt` 并同步宿主受信配置，经审阅和配套发布后才切换签名 Secret。当前单公钥配置没有双签过渡；旧宿主不信任新钥，新宿主也不接受旧钥签名目录，必须明确支持窗口与升级要求。

轮换时保持修订递增，保留来源和发布记录；怀疑泄露时按 [安全规范](./security.md#漏洞与密钥事件) 处理。

## 发布后核对

核对公开 latest 的标签、target commit、签名目录、有效期和全部附件；再由受信宿主刷新目录，检查下载、权限确认及安装后运行。使用隔离数据和测试设备，记录实际完成的线上与目标平台验证范围。
