import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sheet } from './Sheet';
import { Button } from '../../atoms/Button/Button';

const meta: Meta<typeof Sheet> = {
  title: 'Molecules/Sheet',
  component: Sheet,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Bottom-sheet modal scaffolding. Base for the five Phase-2 modals (Calibration, Conditions, Note, Photo, Archive) and any other "swipe-up" content. Closes on backdrop click and Escape. Accepts an optional footer slot for sticky actions.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ minHeight: 480, padding: 'var(--sp-6)', background: 'var(--bg-sunken)' }}>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          title="How was the soil?"
          footer={
            <>
              <Button variant="ghost" fullWidth onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" fullWidth onClick={() => setOpen(false)}>Confirm</Button>
            </>
          }
        >
          <div style={{ padding: '0 18px', fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Sheet body — typical content includes RadioRow lists, instructions, or
            the body of a Calibration / Conditions / Archive modal.
          </div>
        </Sheet>
      </div>
    );
  },
};

export const ShortSheet: Story = {
  parameters: {
    docs: { description: { story: 'Use `maxHeight` for short content like a single text field (NoteModal pattern).' } },
  },
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ minHeight: 480, padding: 'var(--sp-6)', background: 'var(--bg-sunken)' }}>
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={open}>Reopen</Button>
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          title="Note · Mona"
          maxHeight="60%"
          footer={
            <>
              <Button variant="ghost" fullWidth onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" fullWidth>Save note</Button>
            </>
          }
        >
          <div style={{ padding: 18 }}>
            <textarea
              autoFocus
              rows={6}
              placeholder="What did you notice?"
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--ink)',
                padding: 12,
                fontFamily: 'var(--font-serif)',
                fontSize: 14,
                resize: 'vertical',
                color: 'var(--ink)',
              }}
            />
          </div>
        </Sheet>
      </div>
    );
  },
};

export const NoFooter: Story = {
  parameters: {
    docs: { description: { story: 'When the sheet body is itself a list of selectable rows (ConditionsModal pattern), tapping a row dismisses the sheet — no footer needed.' } },
  },
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ minHeight: 480, padding: 'var(--sp-6)', background: 'var(--bg-sunken)' }}>
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={open}>Reopen</Button>
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          title="Add condition"
        >
          <div style={{ padding: '0 18px', fontFamily: 'var(--font-serif)', color: 'var(--ink-2)', fontSize: 14 }}>
            (Tabs + condition list go here — each row dismisses the sheet on tap.)
          </div>
        </Sheet>
      </div>
    );
  },
};
