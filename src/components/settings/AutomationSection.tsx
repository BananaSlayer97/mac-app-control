import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";

export default function AutomationSection() {
    const { config, addScript, removeScript, updateScript, runScript } = useAppStore();

    const [newName, setNewName] = useState("");
    const [newCmd, setNewCmd] = useState("");
    const [newCwd, setNewCwd] = useState("");

    const [editingScript, setEditingScript] = useState<{
        originalName: string;
        name: string;
        command: string;
        cwd: string;
    } | null>(null);

    const handleAdd = async () => {
        if (!newName.trim() || !newCmd.trim()) return;
        await addScript(newName, newCmd, newCwd);
        setNewName("");
        setNewCmd("");
        setNewCwd("");
    };

    if (!config) return null;

    return (
        <section className="settings-group">
            <h3 className="group-title">Automation & Scripts</h3>
            <div className="group-card">
                <div className="setting-item column bg-subtle">
                    <div className="add-script-row" style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Name"
                            style={{ width: "120px" }}
                        />
                        <input
                            type="text"
                            value={newCmd}
                            onChange={(e) => setNewCmd(e.target.value)}
                            placeholder="Shell Command"
                            style={{ flex: 1 }}
                        />
                        <input
                            type="text"
                            value={newCwd}
                            onChange={(e) => setNewCwd(e.target.value)}
                            placeholder="Directory"
                            style={{ width: "100px" }}
                        />
                        <button className="small-btn primary" onClick={handleAdd}>
                            Add
                        </button>
                    </div>
                </div>

                <div className="scripts-list" style={{ marginTop: '16px' }}>
                    {config.scripts.map((s) => (
                        <div key={s.name} className="script-row">
                            <div className="script-icon-badge">{">_"}</div>
                            <div className="script-info">
                                {editingScript?.originalName === s.name ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                        <input
                                            type="text"
                                            value={editingScript.name}
                                            onChange={(e) => setEditingScript({ ...editingScript, name: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            value={editingScript.command}
                                            onChange={(e) => setEditingScript({ ...editingScript, command: e.target.value })}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <span className="name">{s.name}</span>
                                        <span className="cmd">{s.command}</span>
                                    </>
                                )}
                            </div>
                            <div className="script-actions" style={{ display: 'flex', gap: '4px' }}>
                                {editingScript?.originalName === s.name ? (
                                    <>
                                        <button className="small-btn primary" onClick={async () => {
                                            await updateScript(editingScript.originalName, editingScript.name, editingScript.command, editingScript.cwd);
                                            setEditingScript(null);
                                        }}>Save</button>
                                        <button className="small-btn" onClick={() => setEditingScript(null)}>Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <button className="small-btn" onClick={() => runScript(s.command, s.cwd)}>Run</button>
                                        <button className="small-btn" onClick={() => setEditingScript({ originalName: s.name, name: s.name, command: s.command, cwd: s.cwd || "" })}>Edit</button>
                                        <button className="delete-btn" onClick={() => removeScript(s.name)}>Delete</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
