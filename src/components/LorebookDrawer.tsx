import React, { useState } from 'react';

interface LoreEntry {
  id: string;
  keyword: string;
  description: string;
}

interface LorebookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lorebook: LoreEntry[];
  onUpdateLorebook: (updated: LoreEntry[]) => void;
}

export const LorebookDrawer: React.FC<LorebookDrawerProps> = ({ isOpen, onClose, lorebook, onUpdateLorebook }) => {
  const [keyword, setKeyword] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !description.trim()) return;

    const newEntry: LoreEntry = {
      id: Date.now().toString(),
      keyword: keyword.trim(),
      description: description.trim(),
    };

    const updated = [...lorebook, newEntry];
    onUpdateLorebook(updated);
    
    // Clear the form fields
    setKeyword('');
    setDescription('');
  };

  const handleDeleteEntry = (id: string) => {
    const updated = lorebook.filter(entry => entry.id !== id);
    onUpdateLorebook(updated);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '350px',
      height: '100vh',
      backgroundColor: '#FFFFFF',
      boxShadow: '-4px 0 15px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      {/* Drawer Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', color: '#FFFFFF' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>🧠 Story Lorebook</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' }}>×</button>
      </div>

      {/* Entry Input Form */}
      <form onSubmit={handleAddEntry} style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F8FAFC' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>KEYWORD / NAME</label>
          <input 
            type="text" 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g., Brian"
            style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>CHARACTER DETAILS</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Lead driver, wears red gloves, calm under pressure."
            rows={3}
            style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px', boxSizing: 'border-box', resize: 'none', outline: 'none', fontFamily: 'sans-serif' }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          Add to Lorebook
        </button>
      </form>

      {/* Active Cards Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748B' }}>Active Character Memory Cards ({lorebook.length})</h4>
        {lorebook.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>No lore entries logged yet. Mentioning keywords in your text triggers context injection.</p>
        ) : (
          lorebook.map(entry => (
            <div key={entry.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', backgroundColor: '#F8FAFC', position: 'relative' }}>
              <button 
                onClick={() => handleDeleteEntry(entry.id)} 
                style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '14px' }}
              >
                🗑️
              </button>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0F172A', marginBottom: '4px' }}>{entry.keyword}</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>{entry.description}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
