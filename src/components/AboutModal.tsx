import { useState } from "react";
import { documentationData } from "../data/docs";

export default function AboutModal({ onClose }: { onClose: () => void }) {
    const [lang, setLang] = useState<"zh" | "en">("zh");
    const data = documentationData[lang];

    return (
        <div className="modal-overlay glass-overlay active" onClick={onClose} style={{ zIndex: 2000 }}>
            <div
                className="modal-content glass-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '600px',
                    width: '90%',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    padding: '30px',
                    position: 'relative',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <button
                    className="modal-close-btn"
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '25px',
                        fontSize: '24px',
                        opacity: 0.6
                    }}
                >
                    &times;
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>{data.title}</h2>
                    <div className="tab-switcher" style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                        <button
                            className={`small-btn ${lang === 'zh' ? 'active' : ''}`}
                            onClick={() => setLang('zh')}
                            style={{ padding: '4px 12px' }}
                        >
                            中文
                        </button>
                        <button
                            className={`small-btn ${lang === 'en' ? 'active' : ''}`}
                            onClick={() => setLang('en')}
                            style={{ padding: '4px 12px' }}
                        >
                            English
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {data.sections.map((section) => (
                        <div key={section.id} className="doc-section">
                            <h4 style={{
                                fontSize: '15px',
                                color: 'var(--accent-color)',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ width: '4px', height: '14px', background: 'var(--accent-color)', borderRadius: '2px' }}></span>
                                {section.title}
                            </h4>
                            <div style={{
                                fontSize: '14px',
                                lineHeight: '1.7',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                {section.content.map((item, idx) => {
                                    const parts = item.split('**');
                                    return (
                                        <p key={idx} style={{ margin: 0 }}>
                                            {parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-primary)' }}>{part}</strong> : part)}
                                        </p>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div style={{
                        marginTop: '20px',
                        paddingTop: '20px',
                        borderTop: '1px solid var(--glass-border)',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--text-tertiary)'
                    }}>
                        Mac App Control v1.0.0 • Local-First Architecture • Built with Rust & React
                    </div>
                </div>
            </div>
        </div>
    );
}
