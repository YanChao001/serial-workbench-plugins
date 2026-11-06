# 贪吃蛇 / Slither

将 [littensy/slither](https://github.com/littensy/slither) 从 Roblox 移植到隔离 HTML / Canvas 的离线竞技贪吃蛇。围绕自由转向、冲刺、吃食物成长和撞蛇对抗重新实现游戏循环，保留原作的 Catppuccin Mocha 配色、渐变手写标题、皮肤卡片、圆形小地图及游戏音效。固定来源、实际复用资源和完整许可见 [第三方归属与许可](./THIRD_PARTY_NOTICES.md)。

玩家与 12 条本地 AI 在圆形竞技场游玩，游戏、观战与资源加载均离线运行。独立窗口默认 1180 × 820，宿主记忆用户调整并限制在显示器工作区内。游戏配色独立于宿主主题，界面支持中英文、键鼠、触控与手柄，字体随包内嵌。窗口与最低宿主要求见[清单](./extension.json)，配套版本见[发布指南](../../docs/publishing.md#固定配套宿主)。

## 玩法与操作

- 鼠标指向目标方向，蛇会连续转弯；方向键 / WASD 可组合斜向，松键或手柄摇杆回中后保持最后方向。触控摇杆和冲刺可由两根手指独立操作，按触点分别释放。手柄左摇杆控制方向，A 键 / 扳机控制冲刺；Gamepad API 不可用或被策略拒绝时，键鼠与触控仍可使用。移动始终连续进行，长蛇的转弯速度会随长度增加而降低。
- 按住鼠标左键、空格、Shift 或触控冲刺按钮加速。冲刺消耗长度并沿尾部掉落食物；长度降到初始值后停止加速，放开按钮恢复常速。
- 吃普通食物或其他蛇死亡后留下的食物成长。头部撞到其他蛇的身体或圆形边界会死亡；可以经过自己的身体。头对头相撞时长度较低的一方死亡，同长度时双方死亡。AI 死亡后会重新进入竞技场。
- 菜单可选择三档难度、15 种免费皮肤和最多 24 个 Unicode 字符的昵称，支持完整 emoji，并在输入法提交后更新。昵称以保持水平的标签显示在玩家蛇头旁，空昵称显示“你”；观战目标和其他 AI 也显示名字。难度影响 AI 冲刺频率和避让距离；皮肤只改变视觉，不改变碰撞和长度。每局种子随进度保留，相同种子、难度与输入历史能重现同一局。
- `P` 或暂停按钮暂停，`Esc` 暂停并回菜单，`M` 切换静音。失焦、文档隐藏或宿主操作时暂停，返回后手动继续；恢复时不追赶离开期间的游戏时间。
- 菜单底栏的眼睛图标与“观战”文字进入 AI 观战，可切换观察目标，退出后保留玩家自己的对局。观战暂停后，顶部按钮、面板按钮与 `P` 均继续同一场比赛和目标；虚拟玩家死亡不重置仍在进行的 AI 比赛，完整回合到达上限后才续新场。游戏显示当前长度、最高长度、击败数和排名，圆形小地图标记自己与其他蛇的位置。暂停与结算面板均提供“返回主菜单”，保留本局进度和成绩；结算页只保留一个新局入口。
- 每局按固定 20 Hz 步进，最多 12000 个逻辑步，即 10 分钟有效游戏时间；暂停不计时。死亡或达到回合上限后进入结算，可保存纪录并新开一局。输入日志达到安全上限时暂停并提示新开局，保留本局以供保存或导出。

菜单、皮肤、排行榜、暂停和结算共用游戏视觉。短窗口的面板可滚动，画布按尺寸等比绘制，空间不足时收起地图与领先榜，保留成绩和控制按钮。弹层约束键盘焦点；调整模式或重新开始前保留已有进度。

## 进度、纪录与权限

[`ui/main.html`](./ui/main.html) 负责游戏与输入，[`src/arena.rs`](./src/arena.rs) 在 Wasm 中独立重放规则。检查点保存 schema、非零种子、难度、皮肤、昵称、声音设置与压缩的角度 / 冲刺历史；分数、蛇身、食物和 AI 状态由重放计算。恢复后先暂停，等待用户继续。日志、JSON、蛇身与食物的精确上限见引擎校验。

检查点与会话使用 **schema 3**，私有纪录使用 **schema 4**。旧格子蛇 schema 1 / 2、未知 / 未来版本、损坏数据和非法历史保留原件并拒写，旧格子蛇成绩不参与新排行。不兼容会话导入后，由用户明确新开局再登记进度；私有纪录不受支持时，仍可离线游玩和导出会话。

已知 schema 3 自由转向纪录经校验后在内存中升级，下次主动保存时按当前 revision CAS 写回。旧八位哈希 ID 保留为历史项，新局以八位十六进制种子加一位难度码组成九位 ID；旧局再次保存时，历史项与新身份项可能并存。旧待确认保存状态和旧 schema 回执仍按原预期值核对：恢复这类会话后，先恢复对局检查点、刷新纪录，再决定是否保存。

运行期间合并登记宿主 checkpoint，忙碌时延后，失败时暂停并允许重试。临时对局可随时离页，长期保留请通过宿主会话工具导出。

`storage` 是唯一可选权限，用于主动保存纪录；游玩、观战和会话导出可直接使用。Wasm 重放后，按**本局最高长度**更新三档难度的最佳成绩及本机 Top 10。同一种子与难度保留较高成绩，外观和声音设置沿用同一纪录身份；菜单中尚未开始的对局不计入排名。

纪录保存到 `snake-records` 私有键，使用 revision CAS；回执匹配 effect ID、预期 revision 与完整 schema 4 值后更新显示。冲突、取消、失败或回执缺失时保留当前局，由用户刷新纪录后决定是否重存；取消等待时原生写入可能已完成。完整对局通过 checkpoint / 会话保留，私有纪录在卸载后保留。

## 视觉、音效与平台边界

界面采用原版 **Catppuccin Mocha** 色板与手写 Slither 标题，按钮、皮肤、HUD、蛇身及食物延续渐变和光晕。Inter 变量字体以 WOFF2 离线内嵌，中文由系统字体补齐。资源、界面代码与许可共用宿主单文档 **512 KiB** 预算。

游戏使用 10 个原版 Ogg 音效，来自 Kenney Interface Sounds，按 CC0 1.0 分发。用户手势解锁声音，菜单底栏提供静音与音量；`Esc`、关闭按钮或点击外部收起面板。暂停、隐藏与卸载时挂起或清理音频，声音不可用时仍可游玩。减少动效关闭装饰动画，保留规则与模拟速度。

本地移植以 AI 单机竞技承接原作玩法，昵称仅本地显示，15 种皮肤离线免费可用，包含 14 种 Mocha 强调色与彩虹。原版音乐仅提供 Roblox 资源 ID，缺少可独立分发的文件，因此包内只保留上述音效。原项目与素材作者的署名、独立许可随包保留，详见[第三方归属与许可](./THIRD_PARTY_NOTICES.md)。

## 适配取舍与影响

连续运动的圆形竞技场替代旧版四方向棋盘、穿墙与固定障碍，恢复按[数据版本规则](#进度纪录与权限)处理。游戏使用宿主隔离 UI、生命周期与消息桥，命令选择 `compute` 档位进行有界整局重放，受超时、取消与内存预算约束。

延续原作的 20 Hz 节拍与长度驱动增长 / 转向规则，浏览器与 Rust 共用整数模拟、固定轨迹点和有种子随机数。360°输入量化为 256 个角度，约 1.4°一档，按转向速度平滑追踪；浏览器绘制，Wasm 独立重放核验。

为控制单文件资源、主线程负载与 Wasm 重放成本，本地竞技场采用 12 条 AI，初始食物 540 颗、全部食物最多 700 颗，蛇身最多 160 个轨迹点。AI 支持寻食、避边界、避蛇与冲刺，并有三档难度；死亡掉落采用有界近似。

规则变更核对浏览器与 Rust 的同种子摘要及边界；状态变更检查非法历史与 checkpoint / CAS 失败后的数据保留。界面变更按涉及场景运行无头回归；窗口、WebView 音频和平台生命周期按[测试规范](../../docs/testing.md#界面与安装验收)另行验收。

## 构建与验收

先按 [开发指南](../../docs/development.md#准备宿主校验工具) 准备宿主 `extension-tool`。从**市场仓库根目录**验证规则、界面回归并构建 Wasm：

```sh
cargo test --locked --manifest-path plugins/snake/Cargo.toml --target-dir target/snake-native
node --test plugins/snake/ui/arena.test.mjs plugins/snake/ui/main.test.mjs
cargo build --locked --release --target wasm32-unknown-unknown --manifest-path plugins/snake/Cargo.toml --target-dir target/snake
```

从**宿主仓库根目录**对真实模块与 HTML 快照执行 fixture：

```sh
pnpm extension:test --manifest marketplace/plugins/snake/extension.json --wasm marketplace/target/snake/wasm32-unknown-unknown/release/market_snake.wasm --ui-dir marketplace/plugins/snake/ui --fixture marketplace/plugins/snake/smoke.json
pnpm extension:test --manifest marketplace/plugins/snake/extension.json --wasm marketplace/target/snake/wasm32-unknown-unknown/release/market_snake.wasm --ui-dir marketplace/plugins/snake/ui --fixture marketplace/plugins/snake/smoke-records.json
```

[`smoke.json`](./smoke.json) 覆盖双语启动、非轴向输入重放、分数核验、存储请求及成功 / 冲突 / 取消 / 响应省略回执；[`smoke-records.json`](./smoke-records.json) 覆盖已知纪录升级、哈希碰撞种子的独立保存、精确身份重复保存和非法身份 / 旧回执拒绝。原生测试覆盖数据版本、边界校验、峰值纪录与 CAS；界面回归覆盖输入、检查点合并、恢复和保存。完整市场检查、包验证与分层边界见 [测试规范](../../docs/testing.md)。
