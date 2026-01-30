import { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import {
    deleteWallpaper,
    getWallpapersDir,
    importWallpaper,
    listWallpapers,
    revealInFinder
} from "../../api/tauri";
import { resolveWallpaperUrl } from "../../lib/wallpaper";
import type { WallpaperFile } from "../../types/app";

export default function AppearanceSection() {
    const themes = ["Midnight", "Dawn", "Nebula", "Forest"];
    const {
        config,
        updateTheme,
        updateWallpaper,
        updateWallpaperBlur,
        updateWallpaperFit,
        updateWallpaperPosition
    } = useAppStore();

    const [savedWallpapers, setSavedWallpapers] = useState<WallpaperFile[]>([]);
    const [wallpaperLoading, setWallpaperLoading] = useState(false);
    const [wallpaperError, setWallpaperError] = useState<string | null>(null);
    const [wallpaperBusy, setWallpaperBusy] = useState(false);

    const toErrorMessage = (e: unknown) => {
        if (typeof e === "string") return e;
        const anyErr = e as any;
        if (anyErr?.message) return String(anyErr.message);
        return "未知错误";
    };

    const loadSavedWallpapers = async () => {
        setWallpaperLoading(true);
        setWallpaperError(null);
        try {
            const items = await listWallpapers();
            setSavedWallpapers(items);
        } catch {
            setWallpaperError("读取已保存壁纸失败");
        } finally {
            setWallpaperLoading(false);
        }
    };

    useEffect(() => {
        loadSavedWallpapers();
    }, []);

    if (!config) return null;

    return (
        <section className="settings-group">
            <h3 className="group-title">Appearance</h3>
            <div className="group-card">
                {/* Theme Selector */}
                <div className="setting-item column">
                    <div className="setting-label">
                        <span>Theme</span>
                    </div>
                    <div className="theme-selector">
                        {themes.map((theme) => (
                            <button
                                key={theme}
                                className={`theme-btn ${config.theme === theme ? "active" : ""}`}
                                onClick={() => updateTheme(theme)}
                                data-theme={theme}
                            >
                                {theme}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Wallpaper Input */}
                <div className="setting-item column">
                    <div className="setting-label">
                        <span>Custom Wallpaper</span>
                        <small>支持：PNG/JPG/JPEG/WebP/GIF｜远程：https://...｜本地路径</small>
                    </div>
                    <div className="setting-control" style={{ width: '100%' }}>
                        <input
                            type="text"
                            value={config.wallpaper || ""}
                            onChange={(e) => updateWallpaper(e.target.value)}
                            placeholder="https://source.unsplash.com/random/1920x1080"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'white'
                            }}
                        />
                    </div>
                    <div className="setting-control" style={{ justifyContent: "flex-start", gap: "8px", marginTop: "10px" }}>
                        <button
                            className="small-btn"
                            disabled={wallpaperBusy}
                            onClick={async () => {
                                const raw = (config.wallpaper || "").trim();
                                if (!raw) {
                                    setWallpaperError("请输入本地图片路径后再保存");
                                    return;
                                }
                                setWallpaperBusy(true);
                                try {
                                    const savedPath = await importWallpaper(raw);
                                    updateWallpaper(savedPath);
                                    await loadSavedWallpapers();
                                } catch (e) {
                                    setWallpaperError(toErrorMessage(e));
                                } finally {
                                    setWallpaperBusy(false);
                                }
                            }}
                        >
                            保存本地
                        </button>
                        <button className="small-btn" onClick={() => updateWallpaper("")}>
                            清除壁纸
                        </button>
                        <button
                            className="small-btn"
                            onClick={async () => {
                                const dir = await getWallpapersDir();
                                await revealInFinder(dir);
                            }}
                        >
                            打开壁纸文件夹
                        </button>
                    </div>

                    {/* Saved Wallpapers Grid */}
                    <div style={{ marginTop: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>已保存的壁纸</div>
                            <button className="small-btn" onClick={loadSavedWallpapers} disabled={wallpaperLoading}>
                                刷新
                            </button>
                        </div>
                        {wallpaperError && <div className="empty-state-text">{wallpaperError}</div>}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                            {savedWallpapers.map((w) => {
                                const previewUrl = resolveWallpaperUrl(w.path);
                                const isCurrent = config.wallpaper === w.path;
                                return (
                                    <div key={w.path} className="wallpaper-card-mini">
                                        <div
                                            style={{
                                                height: "82px",
                                                backgroundImage: previewUrl ? `url("${previewUrl}")` : undefined,
                                                backgroundSize: "cover",
                                                backgroundPosition: "center",
                                                borderBottom: "1px solid var(--glass-border)",
                                            }}
                                        />
                                        <div style={{ padding: "10px" }}>
                                            <div className="wallpaper-info-row">
                                                <div className="wallpaper-name">{w.filename}</div>
                                                {isCurrent && <div className="current-badge">当前</div>}
                                            </div>
                                            <div className="wallpaper-actions">
                                                <button className={`small-btn ${isCurrent ? "active" : ""}`} onClick={() => updateWallpaper(w.path)}>
                                                    使用
                                                </button>
                                                <button className="delete-btn" onClick={async () => {
                                                    await deleteWallpaper(w.path);
                                                    loadSavedWallpapers();
                                                }}>
                                                    删除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Wallpaper Scaling/Blur */}
                <div className="setting-item column">
                    <div className="setting-label">
                        <span>Wallpaper Tuning</span>
                    </div>
                    <div className="wallpaper-tuning-row">
                        <div className="wallpaper-tuning-item">
                            <span>Frost: {config.wallpaper_blur}px</span>
                            <input
                                type="range" min={0} max={20} step={1}
                                value={config.wallpaper_blur}
                                onChange={(e) => updateWallpaperBlur(Number(e.target.value))}
                            />
                        </div>
                        <div className="wallpaper-tuning-item">
                            <span>Fit</span>
                            <select value={config.wallpaper_fit} onChange={(e) => updateWallpaperFit(e.target.value)}>
                                <option value="cover">Cover</option>
                                <option value="contain">Contain</option>
                            </select>
                        </div>
                        <div className="wallpaper-tuning-item">
                            <span>Position</span>
                            <select value={config.wallpaper_position} onChange={(e) => updateWallpaperPosition(e.target.value)}>
                                <option value="center">Center</option>
                                <option value="top">Top</option>
                                <option value="bottom">Bottom</option>
                                <option value="left">Left</option>
                                <option value="right">Right</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
