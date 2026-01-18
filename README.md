# 🖥️ Mac App Control

[![简体中文](https://img.shields.io/badge/README-简体中文-blue.svg)](README-CN.md)

A powerful, native macOS application manager built with **Tauri v2** and **React**. Designed to replace the standard macOS application launching experience with a faster, more organized, and customizable interface.

![Platform](https://img.shields.io/badge/platform-macOS-blue)
![Framework](https://img.shields.io/badge/framework-Tauri%20v2-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### 🚀 High-Performance App Discovery
- **Scoping**: Rapidly scans standard macOS Application directories (`/Applications`, `/System/Applications`, `~/Applications`) using `mdfind`.
- **Clean Results**: Automatically ignores internal system components, frameworks, and background tools to focus only on launchable applications.
- **One-Click Launch**: Instantly launch any application or switch to a running one.

### 📁 Dynamic Categorization
- **Predefined Categories**: Includes "All", "Frequent" (usage-based), "User Apps", and "System".
- **User-Defined Categories**: Create and delete your own categories via the Settings menu.
- **Persistence**: Categorization is saved per-app path, so your workspace stays organized across restarts.

### ⚙️ Full Customization
- **Global Toggle Shortcut**: Wake the app from anywhere with a customizable shortcut (default `Alt+Space`). Supports combinations like `Cmd+Space` or `Ctrl+Alt+K` (modifiers + A–Z/Space).
- **Settings Menu**: A dedicated modal interface to manage your categories and system-wide preferences.
- **Side-by-Side Sidebar**: A polished vertical sidebar for quick category switching.

### 🖼️ Wallpaper & Glass
- **Remote or Local Wallpaper**: Set a background via an image URL (`https://...`) or local path (`/Users/...` or `file:///Users/...`).
- **Frost Control**: Adjust blur strength from **0 (original image)** to strong glass blur.
- **Fit & Position**: Choose `cover/contain` and align `top/center/bottom/...` to avoid important parts being cropped.

### 🎨 Premium Aesthetics
- **Glassmorphism Design**: Modern, dark-themed UI with frosted glass effects and subtle micro-shadows.
- **Native Icons**: High-quality macOS application icons extracted and cached locally for instantaneous loading.
- **Performance First**: Optimized Rust backend ensures virtually zero lag during searching and filtering.

### 🧠 UX Mastery
- **Auto-Hide**: The app automatically hides itself when you click away (lose focus).
- **Smart Reset**: Every time you open the app, the search bar is cleared and focused, ready for new input.
- **Quick Look**: Press `Spacebar` on any app to preview its details (Path, Usage Count, Last Modified).
- **Focused Errors Only**: A lightweight notice bar appears only on critical failures (scan/launch/config write), with de-duplication to avoid spam.

### 🛠️ Script Actions (Power User)
- **Custom Shell Scripts**: Define your own terminal commands in Settings (e.g., `npm run dev`, `python3 main.py`).
- **Context Aware**: Specify a **Working Directory** for each script to run it in the correct project folder.
- **Visible Execution**: Scripts run in a new Terminal window so you can monitor progress and see output.
- **Test & Edit**: Test-run commands before saving, and edit saved scripts later.
- **Unified Search**: Search for your scripts just like apps! They appear with a distinctive terminal icon.

---

## 📦 Installation

### Prerequisites
- macOS 12.0 (Monterey) or later
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install)
- [pnpm](https://pnpm.io/) or npm

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/mac-app-control.git
cd mac-app-control

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

---

## 🏗️ Project Structure

```
mac-app-control/
├── src/                    # React Frontend
│   ├── App.tsx             # Application logic, Settings modal, Filtering
│   ├── App.css             # Glassmorphism styling and theme tokens
│   └── main.tsx            # React entry point
├── src-tauri/              # Rust Backend
│   ├── src/
│   │   └── lib.rs          # System commands, persistence, shortcut registration
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # App configuration
└── package.json            # Node.js dependencies
```

---

## 🔧 Under the Hood

### App Discovery & Filtering
The app uses a scoped Spotlight query for maximum performance:
```rust
mdfind -onlyin /Applications -onlyin /System/Applications ... 
```
This ensures we find apps in seconds without scanning the entire file system.

### Global Shortcut Registration
Shortcuts are parsed and registered dynamically using `tauri-plugin-global-shortcut`. When you update your preference in the UI, the app automatically unregisters the old shortcut and binds the new one.

### Local Caching
To avoid extracting icons on every startup, converted `PNG` files are stored in:
`~/Library/Application Support/MacAppControl/icons/`

User preferences (usage counts, categories, custom labels) are stored in:
`~/Library/Application Support/MacAppControl/config.json`

### Local Wallpaper Security (Tauri)
Local wallpapers are loaded via Tauri’s asset protocol and are scoped for safety. By default, this project allows local images under `$HOME/**`. If you need other paths, adjust `security.assetProtocol.scope` in `src-tauri/tauri.conf.json`.

---

## 📄 License

MIT License. See [LICENSE](LICENSE).

---

## 🙏 Credits

- [Tauri](https://tauri.app/) - High-performance desktop framework.
- [React](https://react.dev/) - Modern component-based UI.
- [Vite](https://vitejs.dev/) - Blazing fast frontend build tool.
