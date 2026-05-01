import { useState, useEffect } from 'react';
import { Button } from './atoms/Button/Button.js';
import { EmptyState } from './molecules/EmptyState/EmptyState.js';
import './NotesLog.css';

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
  /** Bumped by the page after the NoteSheet saves a note → re-fetch the list. */
  refreshKey?: number;
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

/* Notes timeline. As of the Phase-3 PlantDetail rebuild, note creation
   moved to a Sheet-based NoteSheet (composed at the page level); this
   component handles list rendering, edit-in-place, and delete-confirm.
   The `refreshKey` prop bumps when the page wants to re-fetch (e.g. after
   the Sheet saves a new note). */
export function NotesLog({ plantId, showToast, refreshKey = 0 }: NotesLogProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/plants/${plantId}/notes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        setNotes(Array.isArray(data) ? (data as Note[]) : []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plantId, refreshKey]);

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

  if (loading) {
    return <EmptyState align="left">Loading notes…</EmptyState>;
  }

  if (notes.length === 0) {
    return <EmptyState align="left">No notes yet. Tap the Note quick-action to add one.</EmptyState>;
  }

  return (
    <ul className="p7l-noteslog">
      {notes.map((n) => (
        <li key={n.id} className="p7l-noteslog__item">
          {editingId === n.id ? (
            <>
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={3}
                autoFocus
                aria-label="Edit note"
                className="p7l-noteslog__edit"
              />
              <div className="p7l-noteslog__edit-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleUpdate(n.id)}
                  disabled={!editDraft.trim()}
                >
                  Save
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="p7l-noteslog__body">{n.body}</p>
              <div className="p7l-noteslog__meta">
                <span>
                  {formatStamp(n.created_at)}
                  {n.updated_at && <span> · edited {formatStamp(n.updated_at)}</span>}
                </span>
                <span className="p7l-noteslog__actions">
                  <button
                    type="button"
                    className="p7l-noteslog__btn"
                    onClick={() => {
                      setEditingId(n.id);
                      setEditDraft(n.body);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="p7l-noteslog__btn p7l-noteslog__btn--danger"
                    onClick={() => setConfirmDeleteId(n.id)}
                  >
                    Delete
                  </button>
                </span>
              </div>
              {confirmDeleteId === n.id && (
                <div className="p7l-noteslog__confirm">
                  <span>Delete this note?</span>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(n.id)}>
                    Delete
                  </Button>
                </div>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
