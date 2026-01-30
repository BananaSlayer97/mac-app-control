export const documentationData = {
    zh: {
        title: "用户手册 & 系统关于",
        sections: [
            {
                id: "quick-start",
                title: "快速入门",
                content: [
                    "1. **搜索与启动**：点击搜索框或使用全局快捷键唤起，输入应用名称即可快速定位并启动。",
                    "2. **应用分类**：在侧边栏切换分类，或右键应用卡片将其归类到特定分组。",
                    "3. **自动化脚本**：在设置中添加自定义 Shell 脚本，通过菜单栏或设置面板一键运行。",
                    "4. **壁纸美化**：进入外观设置，粘贴图片 URL 或选择本地文件自定义应用背景。"
                ]
            },
            {
                id: "architecture",
                title: "技术架构 (Pixel-Level)",
                content: [
                    "**核心引擎**：基于 Tauri v2 框架，使用 Rust 构建高性能后端，WebView 层采用 React + Vite + TypeScript。",
                    "**状态管理**：使用 Zustand 进行集中式状态管理，确保复杂组件间的数据流实时同步且无冗余渲染。",
                    "**性能优化**：",
                    "- **后端缓存**：Rust 层实现 `CONFIG_CACHE`（RwLock），大幅降低磁盘 I/O 频率。",
                    "- **原子写入**：配置文件采用 Tmp-Rename 策略，确保系统崩溃时数据不损坏。",
                    "- **索引算法**：应用检索基于系统级 `mdfind` 命令，实现秒级全量应用索引。"
                ]
            },
            {
                id: "privacy",
                title: "数据治理与隐私",
                content: [
                    "**全本地运行**：程序不含任何外部遥测或数据采集逻辑，所有操作均在本地执行。",
                    "**存储路径**：配置文件存储于 `~/Library/Application Support/MacAppControl/config.json`。",
                    "**透明度**：所有自动化脚本均由用户显式定义，系统不执行任何预设的隐蔽逻辑。"
                ]
            },
            {
                id: "algorithms",
                title: "核心算法细节",
                content: [
                    "**应用匹配**：采用加权模糊匹配算法，优先显示使用频率（Usage Count）较高的应用。",
                    "**热键响应**：基于 `tauri-plugin-global-shortcut` 实现系统级低延迟热键监听。",
                    "**壁纸处理**：通过 CSS 滤镜实现实时的高斯模糊与遮罩叠加，确保 UI 文字的可读性。"
                ]
            }
        ]
    },
    en: {
        title: "User Manual & About System",
        sections: [
            {
                id: "quick-start",
                title: "Quick Start",
                content: [
                    "1. **Search & Launch**: Click the search bar or use the global shortcut to summon the app, then type to launch.",
                    "2. **Categorization**: Switch categories in the sidebar or right-click an app card to organize.",
                    "3. **Automation**: Add custom Shell scripts in settings and run them via the Menubar or Settings panel.",
                    "4. **Visuals**: Paste an image URL or pick a local file in Appearance settings to customize your workspace."
                ]
            },
            {
                id: "architecture",
                title: "Technical Architecture",
                content: [
                    "**Core Engine**: Built on Tauri v2 framework with a Rust backend. Frontend powered by React, Vite, and TypeScript.",
                    "**State Management**: Centralized logic using Zustand, ensuring high-performance data flow and minimal re-renders.",
                    "**Optimization**: ",
                    "- **Memory Caching**: Rust-level `CONFIG_CACHE` (RwLock) reduces disk I/O significantly.",
                    "- **Atomic Writes**: Config files use a Tmp-Rename strategy to prevent corruption during crashes.",
                    "- **Indexing**: Application discovery utilizes system-level `mdfind` for sub-second full-indexing."
                ]
            },
            {
                id: "privacy",
                title: "Data Governance & Privacy",
                content: [
                    "**Local First**: No external telemetry or tracking. All data remains strictly on your device.",
                    "**Storage Path**: Configuration resides in `~/Library/Application Support/MacAppControl/config.json`.",
                    "**Transparency**: All automation is user-defined; the system performs no hidden background actions."
                ]
            },
            {
                id: "algorithms",
                title: "Core Algorithms",
                content: [
                    "**Matching**: Weighted fuzzy-search prioritizing apps with higher Usage Counts.",
                    "**Hotkeys**: Low-latency global shortcut listening via `tauri-plugin-global-shortcut`.",
                    "**Visuals**: Real-time Gaussian blur and overlay filters ensure UI legibility over any wallpaper."
                ]
            }
        ]
    }
};
