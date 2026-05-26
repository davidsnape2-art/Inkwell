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
  // Form states for creating NEW entries
  const [keyword, setKeyword] = useState('');
  const [description, setDescription] = useState('');

  // States for handling INLINE editing of existing entries
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editDescription, setEditDescription] = useState('');

  if (!isOpen) return null;

  // --- Create Handler ---
  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !description.trim()) return;

    const newEntry: LoreEntry = {
      id: Date.now().toString(),
      keyword: keyword.trim(),
      description: description.trim(),
    };

    onUpdateLorebook([...lorebook, newEntry]);
    setKeyword('');
    setDescription('');
  };

  // --- Delete Handler ---
  const handleDeleteEntry = (id: string) => {
    onUpdateLorebook(lorebook.filter(entry => entry.id !== id));
    if (editingId === id) cancelEditing();
  };

  // --- Inline Edit Orchestration ---
  const startEditing = (entry: LoreEntry) => {
    setEditingId(entry.id);
    setEditKeyword(entry.keyword);
    setEditDescription(entry.description);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditKeyword('');
    setEditDescription('');
  };

  const handleSaveEdit = (id: string) => {
    if (!editKeyword.trim() || !editDescription.trim()) return;

    const updated = lorebook.map(entry => 
      entry.id === id 
        ? { ...entry, keyword: editKeyword.trim(), description: editDescription.trim() } 
        : entry
    );

    onUpdateLorebook(updated);
    cancelEditing();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '360px',
      height: '100vh',
      backgroundColor: '#FFFFFF',
      boxShadow: '-4px 0 15px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', color: '#FFFFFF' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>🧠 Story Lorebook</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      {/* Creation Entry Form */}
      <form onSubmit={handleAddEntry} style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F8FAFC' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>KEYWORD / NAME</label>
          <input 
            type="text" 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g., Brian"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none', fontSize: '14px' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>CHARACTER DETAILS</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Lead driver, wears red gloves, calm under pressure."
            rows={2}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', boxSizing: 'border-box', resize: 'none', outline: 'none', fontSize: '14px', fontFamily: 'sans-serif' }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          Add to Lorebook
        </button>
      </form>

      {/* Dynamic Cards Display Stream */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Active Character Contexts ({lorebook.length})</h4>
        
        {lorebook.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', marginTop: '20px', lineHeight: '1.5' }}>
            No entries logged. Typing names in your master draft automatically injects these contexts into Gemini's writing memory.
          </p>
        ) : (
          lorebook.map(entry => {
            const isEditing = entry.id === editingId;

            return (
              <div 
                key={entry.id} 
                style={{ 
                  border: isEditing ? '1px solid #6366F1' : '1px solid #E2E8F0', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  backgroundColor: isEditing ? '#F5F3FF' : '#F8FAFC',
                  transition: 'all 0.2s'
                }}
              >
                {isEditing ? (
                  // ─── ACTIVE EDITING CARD STATE ───
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                      value={editKeyword}
                      onChange={(e) => setEditKeyword(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', fontWeight: '600' }}
                    />
                    <textarea 
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', fontFamily: 'sans-serif', resize: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button 
                        onClick={cancelEditing}
                        style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#E2E8F0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleSaveEdit(entry.id)}
                        style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // ─── STATIC DISPLAY CARD STATE ───
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0F172A', marginBottom: '4px', paddingRight: '50px' }}>
                      {entry.keyword}
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.45' }}>
                      {entry.description}
                    </div>
                    
                    {/* Floating Inline Utility Options */}
                    <div style={{ position: 'absolute', top: '-2px', right: '-2px', display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => startEditing(entry)} 
                        title="Edit Entry"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px', opacity: 0.7 }}
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteEntry(entry.id)} 
                        title="Delete Entry"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px', opacity: 0.7 }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
