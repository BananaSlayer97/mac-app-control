# 🖥️ Mac App Control (Mac 应用控制中心)

[![English](https://img.shields.io/badge/README-English-blue.svg)](README.md)

这是一个使用 **Tauri v2** 和 **React** 构建的强大、原生的 macOS 应用程序管理器。旨在通过更快、更有条理和高度可定制的界面，替代标准的 macOS 应用程序启动体验。

![Platform](https://img.shields.io/badge/platform-macOS-blue)
![Framework](https://img.shields.io/badge/framework-Tauri%20v2-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ 核心特性

### 🚀 高性能应用发现
- **极速扫描**: 利用 `mdfind` 快速扫描标准的 macOS 应用程序目录（`/Applications`, `/System/Applications`, `~/Applications`）。
- **智能筛选**: 自动忽略系统内部组件、框架和后台工具，只专注于可启动的应用程序。
- **一键启动**: 瞬间启动任何应用程序或切换到已运行的应用。

### 📁 动态分类管理
- **预设分类**: 包含“全部”、“常用”（基于使用频率）、“用户应用”和“系统应用”。
- **自定义分类**: 通过设置菜单创建和删除你自己的分类。
- **持久化存储**: 分类设置基于应用路径保存，重启后您的工作区依然井井有条。

### ⚙️ 全方位定制
- **全局唤醒快捷键**: 使用自定义快捷键从任何地方唤醒应用（默认 `Alt+Space`）。支持 `Cmd+Space`、`Ctrl+Alt+K` 等组合（修饰键 + A–Z/Space）。
- **设置中心**: 专属的模态界面，用于管理您的分类和系统级偏好设置。
- **侧边栏导航**: 精致的垂直侧边栏，用于快速切换分类。

### 🖼️ 壁纸与毛玻璃
- **远程/本地壁纸**: 支持图片 URL（`https://...`）或本地路径（`/Users/...` 或 `file:///Users/...`）。
- **磨砂强度**: 0 = 原图（不磨砂/无遮罩），可逐步增强磨砂。
- **显示方式与对齐**: `cover/contain` + `top/center/bottom/...`，避免只看到中间、上下被裁切。

### 🎨 极致美学
- **毛玻璃设计**: 现代化的暗色主题 UI，带有磨砂玻璃效果和细腻的微阴影。
- **原生图标**: 提取并本地缓存高质量的 macOS 应用程序图标，实现瞬间加载。
- **性能优先**: 优化的 Rust 后端确保搜索和过滤时几乎零延迟。

### 🧠 极致用户体验
- **自动隐藏**: 当您点击其他地方（失去焦点）时，应用会自动隐藏。
- **智能重置**: 每次打开应用时，搜索栏都会自动清空并聚焦，随时准备接受新的输入。
- **快速预览**: 在任何应用上按 `空格键` 即可即时预览其详细信息（路径、使用次数、修改时间）。
- **关键失败提示**: 仅在扫描/启动/配置写入等关键失败时显示提示条，并做去重避免刷屏。

### 🛠️ 脚本动作 (高级用户功能)
- **自定义 Shell 脚本**: 在设置中定义您自己的终端命令（例如 `npm run dev`, `python3 main.py`）。
- **上下文感知**: 为每个脚本指定 **工作目录**，确保在正确的项目文件夹中运行。
- **可视化执行**: 脚本在新终端窗口中运行，您可以监控进度并将输出尽收眼底。
- **测试与编辑**: 支持在保存前 Test 运行命令，并可编辑已保存脚本。
- **统一搜索**: 像搜索应用一样搜索您的脚本！它们会带有独特的终端图标显示在列表中。

---

## 📦 安装指南

### 先决条件
- macOS 12.0 (Monterey) 或更高版本
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install)
- [pnpm](https://pnpm.io/) 或 npm

### 开发环境搭建

```bash
# 克隆仓库
git clone https://github.com/yourusername/mac-app-control.git
cd mac-app-control

# 安装前端依赖
npm install

# 运行开发模式
npm run tauri dev
```

### 构建生产版本

```bash
npm run tauri build
```

---

## 🏗️ 项目结构

```
mac-app-control/
├── src/                    # React 前端
│   ├── App.tsx             # 主容器：状态管理 + 组合 UI
│   ├── App.css             # 毛玻璃样式和主题变量
│   ├── api/                # 前端 ↔ Tauri 命令桥（invoke）
│   ├── components/         # UI 组件（栅格/侧边栏/设置等）
│   ├── hooks/              # 过滤 + 键盘导航
│   ├── lib/                # 小型工具函数（壁纸/右键菜单/脚本合并等）
│   └── types/              # TS 类型（应用/配置/右键菜单）
│   └── main.tsx            # React 入口文件
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── lib.rs          # Tauri Builder、插件、托盘、命令注册
│   │   ├── apps.rs         # mdfind 扫描 + 启动/在 Finder 中显示
│   │   ├── config.rs       # config.json 读写 + 分类/脚本/快捷键配置
│   │   ├── icons.rs        # 图标提取 + 磁盘缓存
│   │   ├── scripts.rs      # 在 Terminal 中执行脚本
│   │   └── shortcuts.rs    # 全局快捷键解析/注册/更新
│   ├── Cargo.toml          # Rust 依赖
│   └── tauri.conf.json     # 应用配置
└── package.json            # Node.js 依赖
```

---

## 📚 开发者文档

- 架构与代码导读：[docs/ARCHITECTURE-CN.md](docs/ARCHITECTURE-CN.md)

---

## 🔧 技术内幕

### 应用发现与过滤
应用使用限定范围的 Spotlight 查询以获得最大性能：
```rust
mdfind -onlyin /Applications -onlyin /System/Applications ... 
```
这确保了我们能在几秒钟内找到应用，而无需扫描整个文件系统。

### 全局快捷键注册
快捷键使用 `tauri-plugin-global-shortcut` 动态解析和注册。当您在 UI 中更新偏好设置时，应用会自动注销旧的快捷键并绑定新的快捷键。

### 本地缓存
为了避免每次启动时都解压图标，转换后的 `PNG` 文件存储在：
`~/Library/Application Support/MacAppControl/icons/`

用户偏好（使用次数、分类、自定义标签）存储在：
`~/Library/Application Support/MacAppControl/config.json`

### 本地壁纸安全范围（Tauri）
本地壁纸通过 Tauri 的 asset protocol 加载，并默认限制在 `$HOME/**` 范围内以保证安全。如需允许其他路径，请修改 `src-tauri/tauri.conf.json` 中的 `security.assetProtocol.scope`。

---

## 📄 许可证

[MIT License](LICENSE) - 随意使用此项目，没有任何限制。

---

## 🙏 致谢

- [Tauri](https://tauri.app/) - 高性能桌面应用框架。
- [React](https://react.dev/) - 现代化的组件化 UI 库。
- [Vite](https://vitejs.dev/) - 极速的前端构建工具。
