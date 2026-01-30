import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";

export default function OrganizationSection() {
    const { config, addCategory, removeCategory } = useAppStore();
    const [newCategory, setNewCategory] = useState("");
    const defaultCategories = ["Frequent", "Scripts", "Development", "Social", "Design", "Productivity", "User Apps", "System"];

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        await addCategory(newCategory.trim());
        setNewCategory("");
    };

    if (!config) return null;

    return (
        <section className="settings-group">
            <h3 className="group-title">Organization</h3>
            <div className="group-card">
                <div className="setting-item column">
                    <div className="setting-label">
                        <span>Manage Categories</span>
                    </div>
                    <div className="tags-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {config.user_categories
                            .filter((c) => !defaultCategories.includes(c))
                            .map((c) => (
                                <span key={c} className="tag-chip">
                                    {c}
                                    <button onClick={() => removeCategory(c)}>×</button>
                                </span>
                            ))}
                    </div>
                    <div className="add-row">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="New Category..."
                        />
                        <button className="small-btn" onClick={handleAdd}>
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
