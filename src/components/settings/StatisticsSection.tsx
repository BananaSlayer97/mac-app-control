import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";

export default function StatisticsSection() {
    const { config, apps } = useAppStore();

    const topApps = useMemo(() => {
        if (!config || !config.usage_counts) return [];
        return Object.entries(config.usage_counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([path, count]) => {
                const app = apps.find((a) => a.path === path);
                return {
                    name: app?.name || path.split("/").pop() || path,
                    count,
                    icon: app?.icon_data
                };
            });
    }, [config, apps]);

    const maxUsage = topApps.length > 0 ? topApps[0].count : 1;

    return (
        <section className="settings-group">
            <h3 className="group-title">Statistics</h3>
            <div className="group-card" style={{ padding: "16px" }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Top 5 Most Used
                </h4>
                <div className="stats-list">
                    {topApps.map((app, i) => (
                        <div key={i} className="stat-row">
                            <span className="stat-name">{app.name}</span>
                            <div className="stat-bar-container">
                                <div
                                    className="stat-bar"
                                    style={{ width: `${(app.count / maxUsage) * 100}%` }}
                                />
                            </div>
                            <span className="stat-count">{app.count}</span>
                        </div>
                    ))}
                    {topApps.length === 0 && <div className="empty-state-text">No usage data yet</div>}
                </div>
            </div>
        </section>
    );
}
