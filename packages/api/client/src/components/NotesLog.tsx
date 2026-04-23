import { useState, useEffect, useRef } from 'react';

interface Note {
  id: number;
  plant_id: number;
  body: string;
  created_at: string;
  updated_at: string | null;
}

interface NotesLogProps {
  plantId: number;
  showToast: (msg: string) => void;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotesLog({ plantId, showToast }: NotesLogProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/plants/${plantId}/notes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        setNotes(Array.isArray(data) ? (data as Note[]) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [plantId]);

  async function handleCreate() {
    const body = draft.trim();
    if (!body) return;
    try {
      const res = await fetch(`/api/plants/${plantId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error('create failed');
      const note = (await res.json()) as Note;
      setNotes((prev) => [note, ...prev]);
      setDraft('');
      setComposing(false);
      showToast('Note added');
    } catch {
      showToast('Failed to add note');
    }
  }

  async function handleUpdate(noteId: number) {
    const body = editDraft.trim();
    if (!body) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/plants/${plantId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error('update failed');
      const updated = (await res.json()) as Note;
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingId(null);
      showToast('Note updated');
    } catch {
      showToast('Failed to update note');
    }
  }

  async function handleDelete(noteId: number) {
    try {
      const res = await fetch(`/api/plants/${plantId}/notes/${noteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('delete failed');
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setConfirmDeleteId(null);
      showToast('Note deleted');
    } catch {
      showToast('Failed to delete note');
    }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Notes</h2>
        {!composing && (
          <button
            onClick={() => {
              setComposing(true);
              setTimeout(() => composeRef.current?.focus(), 50);
            }}
            style={{
              background: 'transparent',
              color: 'var(--accent)',
              fontSize: 13,
              padding: '4px 8px',
            }}
          >
            + Add note
          </button>
        )}
      </div>

      {composing && (
        <div style={{ marginBottom: 16 }}>
          <textarea
            ref={composeRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="What did you notice?"
            style={{
              width: '100%',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 12,
              fontSize: 14,
              resize: 'vertical',
              fontFamily: 'inherit',
              marginBottom: 8,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={!draft.trim()}
              style={{ flex: 1, fontSize: 14, padding: '10px 16px', opacity: draft.trim() ? 1 : 0.5 }}
            >
              Save
            </button>
            <button
              onClick={() => {
                setComposing(false);
                setDraft('');
              }}
              style={{
                flex: 1,
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: 14,
                padding: '10px 16px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading…</p>
      ) : notes.length === 0 && !composing ? (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          No notes yet. Add one to start tracking observations.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map((n) => (
            <li
              key={n.id}
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: 12,
              }}
            >
              {editingId === n.id ? (
                <>
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={3}
                    autoFocus
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: 12,
                      fontSize: 14,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleUpdate(n.id)}
                      disabled={!editDraft.trim()}
                      style={{ fontSize: 13, padding: '6px 12px' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        fontSize: 13,
                        padding: '6px 12px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      marginBottom: 6,
                    }}
                  >
                    {n.body}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>
                      {formatStamp(n.created_at)}
                      {n.updated_at && <span> · edited {formatStamp(n.updated_at)}</span>}
                    </span>
                    <span style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setEditingId(n.id);
                          setEditDraft(n.body);
                        }}
                        style={{
                          background: 'transparent',
                          color: 'var(--accent)',
                          fontSize: 12,
                          padding: '2px 6px',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(n.id)}
                        style={{
                          background: 'transparent',
                          color: 'var(--danger)',
                          fontSize: 12,
                          padding: '2px 6px',
                        }}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                  {confirmDeleteId === n.id && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 8,
                        marginTop: 8,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>Delete this note?</span>
                      <button
                        onClick={() => handleDelete(n.id)}
                        style={{
                          background: 'var(--danger)',
                          color: 'white',
                          fontSize: 13,
                          padding: '4px 10px',
                        }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: 13,
                          padding: '4px 10px',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
