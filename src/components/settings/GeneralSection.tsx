import { useAppStore } from "../../store/useAppStore";

export default function GeneralSection() {
    const { config, updateShortcut } = useAppStore();

    const handleRecordShortcut = (e: React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const key = e.key.toUpperCase();
        const code = e.code;

        if (["CONTROL", "ALT", "SHIFT", "META"].includes(key)) return;

        let modifiers = [];
        if (e.altKey) modifiers.push("Alt");
        if (e.ctrlKey) modifiers.push("Ctrl");
        if (e.shiftKey) modifiers.push("Shift");
        if (e.metaKey) modifiers.push("Cmd");

        let finalKey = key;
        if (code === "Space") finalKey = "Space";
        else if (key.length === 1) finalKey = key;
        else if (code.startsWith("Key")) finalKey = code.replace("Key", "");
        else if (code.startsWith("Digit")) finalKey = code.replace("Digit", "");

        if (modifiers.length > 0) {
            updateShortcut(`${modifiers.join("+")}+${finalKey}`);
        } else {
            updateShortcut(finalKey);
        }
    };

    if (!config) return null;

    return (
        <section className="settings-group">
            <h3 className="group-title">General</h3>
            <div className="group-card">
                <div className="setting-item">
                    <div className="setting-label">
                        <span>Global Shortcut</span>
                        <small>Wake app from anywhere</small>
                        <small>Cmd+Space / Ctrl+Alt+K</small>
                    </div>
                    <div className="setting-control">
                        <input
                            type="text"
                            value={config.shortcut}
                            readOnly
                            placeholder="Press keys..."
                            className="shortcut-input"
                            onKeyDown={handleRecordShortcut}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
