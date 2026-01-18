import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './App.css';

interface ContextMenuProps {
    x: number;
    y: number;
    visible: boolean;
    onClose: () => void;
    items: ContextMenuItem[];
}

type ContextMenuItem =
    | { type: "divider" }
    | { type: "header"; label: string }
    | { type: "item"; label: string; onClick: () => void; danger?: boolean; disabled?: boolean; shortcut?: string; checked?: boolean };

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, visible, onClose, items }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: y, left: x });

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

    useLayoutEffect(() => {
        if (visible && menuRef.current) {
            const { offsetWidth, offsetHeight } = menuRef.current;
            let newTop = y;
            let newLeft = x;

            // Check vertical overflow
            if (y + offsetHeight > window.innerHeight) {
                // Try to position above the click point
                newTop = Math.max(0, y - offsetHeight);
            }

            // Check horizontal overflow
            if (x + offsetWidth > window.innerWidth) {
                newLeft = Math.max(0, x - offsetWidth);
            }

            setPosition({ top: newTop, left: newLeft });
        }
    }, [x, y, visible]);

    if (!visible) return null;

    return (
        <div
            className="context-menu"
            style={{ top: position.top, left: position.left }}
            ref={menuRef}
            onContextMenu={(e) => e.preventDefault()}
        >
            {items.map((item, index) => {
                if (item.type === "divider") {
                    return <div key={index} className="context-menu-divider" />;
                }
                if (item.type === "header") {
                    return (
                        <div key={index} className="context-menu-item header">
                            {item.label}
                        </div>
                    );
                }
                const disabled = !!item.disabled;
                return (
                    <div
                        key={index}
                        className={`context-menu-item ${item.danger ? 'danger' : ''} ${disabled ? 'disabled' : ''}`}
                        onClick={() => {
                            if (disabled) return;
                            item.onClick();
                            onClose();
                        }}
                    >
                        <div className="context-menu-left">
                            {item.checked ? <span className="context-menu-check">✓</span> : <span className="context-menu-check-placeholder" />}
                            <span>{item.label}</span>
                        </div>
                        {item.shortcut ? <div className="context-menu-shortcut">{item.shortcut}</div> : null}
                    </div>
                );
            })}
        </div>
    );
};

export default ContextMenu;
