import { useState } from "react";
import { documentationData } from "../../data/docs";

export default function AboutSection() {
    const [lang, setLang] = useState<"zh" | "en">("zh");
    const data = documentationData[lang];

    return (
        <section className="settings-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="group-title" style={{ margin: 0 }}>{data.title}</h3>
                <div className="tab-switcher" style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px' }}>
                    <button
                        className={`small-btn ${lang === 'zh' ? 'active' : ''}`}
                        onClick={() => setLang('zh')}
                        style={{ padding: '2px 8px', fontSize: '10px' }}
                    >
                        中文
                    </button>
                    <button
                        className={`small-btn ${lang === 'en' ? 'active' : ''}`}
                        onClick={() => setLang('en')}
                        style={{ padding: '2px 8px', fontSize: '10px' }}
                    >
                        EN
                    </button>
                </div>
            </div>

            <div className="group-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
                {data.sections.map((section) => (
                    <div key={section.id} className="doc-section">
                        <h4 style={{
                            fontSize: '14px',
                            color: 'var(--accent-color)',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ width: '4px', height: '14px', background: 'var(--accent-color)', borderRadius: '2px' }}></span>
                            {section.title}
                        </h4>
                        <div style={{
                            fontSize: '13px',
                            lineHeight: '1.6',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            {section.content.map((item, idx) => {
                                // simple markdown-like bold handling
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
                    marginTop: '10px',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--glass-border)',
                    textAlign: 'center',
                    fontSize: '11px',
                    color: 'var(--text-tertiary)'
                }}>
                    Mac App Control v1.0.0 • Local-First Architecture • Built with Rust & React
                </div>
            </div>
        </section>
    );
}
