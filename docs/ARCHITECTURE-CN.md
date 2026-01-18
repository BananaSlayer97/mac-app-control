# 架构与代码导读

## 总览
- 前端：Vite + React + TypeScript，负责 UI、交互与状态组合。
- 后端：Tauri v2（Rust），负责扫描应用、提取图标、持久化配置、注册全局快捷键与执行脚本。

## 关键入口
- 前端入口：`src/main.tsx` 挂载 `<App />`。
- 后端入口：`src-tauri/src/main.rs` 调 `tauri_app_lib::run()`；Tauri Builder 与命令注册在 `src-tauri/src/lib.rs`。

## 前后端命令链路
- 前端统一在 `src/api/tauri.ts` 封装 `invoke(...)`。
- 后端统一在 `src-tauri/src/lib.rs` 的 `invoke_handler(...)` 注册 `#[tauri::command]`。
- 新增/修改命令时，建议保持：命令名、参数结构、返回值与错误策略在前后端一致。

## 数据与持久化
- 配置文件：`~/Library/Application Support/MacAppControl/config.json`
- 图标缓存：`~/Library/Application Support/MacAppControl/icons/`
- 配置读写：`src-tauri/src/config.rs`

## 主要模块职责（前端）
- `src/App.tsx`：应用级状态与页面组合（网格 / 设置页）、焦点事件、右键菜单、QuickLook、通知条等。
- `src/hooks/`：过滤与键盘导航（网格/侧边栏切换、Enter 启动、Space 预览等）。
- `src/components/`：网格、图标、侧边栏、设置面板等 UI 组件。
- `src/lib/`：小型、可复用的纯逻辑（脚本合并、壁纸 URL 解析、右键菜单 items 构造）。
- `src/types/`：前端类型定义。

## 主要模块职责（后端）
- `apps.rs`：使用 `mdfind` 扫描应用、`open` 启动、Reveal in Finder。
- `icons.rs`：提取应用图标并落盘缓存。
- `shortcuts.rs`：解析快捷键字符串并注册/更新全局快捷键。
- `scripts.rs`：把脚本写入临时 `.command` 文件并用 `open` 打开 Terminal 执行。

## 代码评审注意点（不改变功能前提下）
- 避免把“脚本条目”与“真实应用”用字符串拼接混在同一字段中；更稳妥的是判别联合类型。
- 快捷键：前端录制与后端解析规则需要一致，否则会出现“UI 显示可用但后端不生效”的灰区。
- `App.tsx` 易膨胀：建议持续把纯逻辑与可复用构造提取到 `src/lib/`，降低回归风险。

