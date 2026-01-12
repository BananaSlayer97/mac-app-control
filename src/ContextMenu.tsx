import React, { useEffect, useRef } from 'react';
import './App.css'; // Reuse existing styles or add new ones

interface ContextMenuProps {
    x: number;
    y: number;
    visible: boolean;
    onClose: () => void;
    actions: {
        label: string;
        onClick: () => void;
        danger?: boolean;
    }[];
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, visible, onClose, actions }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (visible) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    // Adjust position to keep menu within viewport
    const style = {
        top: y,
        left: x,
    };

    // Simple bounds checking logic could go here if needed, 
    // but CSS transform can also help if it goes off screen bottom.

    return (
        <div
            className="context-menu"
            style={style}
            ref={menuRef}
            onContextMenu={(e) => e.preventDefault()}
        >
            {actions.map((action, index) => (
                <div
                    key={index}
                    className={`context-menu-item ${action.danger ? 'danger' : ''}`}
                    onClick={() => {
                        action.onClick();
                        onClose();
                    }}
                >
                    {action.label}
                </div>
            ))}
        </div>
    );
};

export default ContextMenu;
