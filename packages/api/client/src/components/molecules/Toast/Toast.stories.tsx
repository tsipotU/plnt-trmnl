import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from './Toast';
import { Button } from '../../atoms/Button/Button';

const meta: Meta<typeof Toast> = {
  title: 'Molecules/Toast',
  component: Toast,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Bottom-centered toast — ink-on-paper inverted. Parent controls `open`; `durationMs` triggers an automatic `onDismiss` (default 1800ms; 0 disables auto-dismiss for sticky toasts with undo).',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Toast>;

export const SimpleConfirm: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ minHeight: 400, padding: 'var(--sp-6)' }}>
        <Button onClick={() => setOpen(true)}>Trigger toast</Button>
        <Toast
          open={open}
          message="✓ Watered Mona"
          durationMs={1800}
          onDismiss={() => setOpen(false)}
        />
      </div>
    );
  },
};

export const WithUndo: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sticky for 5 seconds when an action is offered. Tapping Undo dismisses the toast and runs the undo handler.',
      },
    },
  },
  render: () => {
    const [open, setOpen] = useState(false);
    const [undone, setUndone] = useState(false);
    return (
      <div style={{ minHeight: 400, padding: 'var(--sp-6)' }}>
        <Button onClick={() => { setOpen(true); setUndone(false); }}>Trigger sticky toast</Button>
        {undone && (
          <p style={{ marginTop: 'var(--sp-3)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
            Undo handler fired.
          </p>
        )}
        <Toast
          open={open}
          message="✓ Watered 5 plants"
          durationMs={5000}
          onDismiss={() => setOpen(false)}
          action={
            <button
              type="button"
              onClick={() => { setUndone(true); setOpen(false); }}
            >
              Undo
            </button>
          }
        />
      </div>
    );
  },
};

export const StickyNoTimer: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'When `durationMs={0}` the toast does not auto-dismiss. The parent must call onDismiss explicitly.',
      },
    },
  },
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ minHeight: 400, padding: 'var(--sp-6)' }}>
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={open}>
          Reopen
        </Button>
        <Toast
          open={open}
          message="Renderer offline · check container"
          durationMs={0}
          onDismiss={() => setOpen(false)}
          action={
            <button type="button" onClick={() => setOpen(false)}>
              Dismiss
            </button>
          }
        />
      </div>
    );
  },
};
