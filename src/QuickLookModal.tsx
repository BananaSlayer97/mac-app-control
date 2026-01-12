import React from 'react';
import './App.css';

interface QuickLookProps {
    app: {
        name: string;
        path: string;
        icon_data?: string;
        usage_count: number;
        category?: string;
        is_system: boolean;
        date_modified: number;
    } | null;
    onClose: () => void;
}

const QuickLookModal: React.FC<QuickLookProps> = ({ app, onClose }) => {
    if (!app) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="quick-look-content" onClick={e => e.stopPropagation()}>
                <div className="quick-look-header">
                    {app.icon_data ? (
                        <img src={app.icon_data} alt={app.name} className="quick-look-icon" />
                    ) : (
                        <div className="quick-look-placeholder">
                            {app.name[0]}
                        </div>
                    )}
                    <div className="quick-look-info">
                        <h2>{app.name}</h2>
                        <span className="quick-look-tag">{app.is_system ? 'System App' : 'User App'}</span>
                        {app.category && <span className="quick-look-tag category">{app.category}</span>}
                    </div>
                </div>

                <div className="quick-look-stats">
                    <div className="stat-item">
                        <span className="stat-label">Path</span>
                        <span className="stat-value path" title={app.path}>{app.path}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Usage Count</span>
                        <span className="stat-value">{app.usage_count}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Last Modified</span>
                        <span className="stat-value">
                            {new Date(app.date_modified * 1000).toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="quick-look-footer">
                    Press Space to close
                </div>
            </div>
        </div>
    );
};

export default QuickLookModal;
