import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from './Chip';
import { Pictogram } from '../Pictogram/Pictogram';

const meta: Meta<typeof Chip> = {
  title: 'Atoms/Chip',
  component: Chip,
  parameters: {
    docs: {
      description: {
        component:
          'Pill-shaped status indicator. Mono uppercase label, optional leading dot or icon. Tones map to plant care states: **due** (copper), **overdue** (rust), **healthy** (sage), **dormant** (mustard), **neutral** (surface).',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'inline-radio' },
      options: ['neutral', 'due', 'overdue', 'healthy', 'dormant'],
    },
    dot: { control: 'boolean' },
  },
  args: {
    children: 'due today',
    tone: 'due',
  },
};
export default meta;

type Story = StoryObj<typeof Chip>;

export const Default: Story = {};

export const Tones: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
      <Chip tone="due">due today</Chip>
      <Chip tone="overdue">overdue 2d</Chip>
      <Chip tone="healthy">healthy</Chip>
      <Chip tone="dormant">dormant</Chip>
      <Chip tone="neutral">archived</Chip>
      <Chip tone="neutral">cycle 4 of 5</Chip>
      <Chip tone="neutral">east window</Chip>
    </div>
  ),
};

export const WithIcons: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
      <Chip tone="due" iconLeading={<Pictogram name="drop" size={12} />}>
        water due
      </Chip>
      <Chip tone="dormant" iconLeading={<Pictogram name="cal" size={12} />}>
        winter rest
      </Chip>
      <Chip tone="neutral" iconLeading={<Pictogram name="house" size={12} />}>
        living room
      </Chip>
    </div>
  ),
};

export const InCardChrome: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-2)',
        padding: 'var(--sp-6)',
        maxWidth: 360,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          margin: '0 0 4px',
        }}
      >
        Monstera
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'var(--ink-2)',
          margin: '0 0 var(--sp-4)',
        }}
      >
        Monstera deliciosa
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        <Chip tone="due">due today</Chip>
        <Chip tone="neutral">cycle 4 of ~5</Chip>
        <Chip tone="neutral">east window</Chip>
      </div>
    </div>
  ),
};

export const ToggleableFilter: Story = {
  parameters: {
    controls: { hideNoControlsWarning: true },
    docs: {
      description: {
        story:
          'When `toggleable` is true, the chip becomes a rectangular filter selector. Sans uppercase 10px tracked, 0.5px border, ink-on-paper inverts to paper-on-ink when `active`. Renders as a `<button>` with `aria-pressed`. Used by **FilterRail**.',
      },
    },
  },
  render: () => {
    const ToggleDemo = () => {
      const [filter, setFilter] = useState('all');
      const opts: Array<[string, string]> = [
        ['all', 'All'],
        ['due', 'Due'],
        ['calibrating', 'Calibrating'],
        ['dialed', 'Dialed in'],
      ];
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          {opts.map(([k, l]) => (
            <Chip
              key={k}
              toggleable
              active={filter === k}
              onClick={() => setFilter(k)}
            >
              {l}
            </Chip>
          ))}
        </div>
      );
    };
    return <ToggleDemo />;
  },
};
