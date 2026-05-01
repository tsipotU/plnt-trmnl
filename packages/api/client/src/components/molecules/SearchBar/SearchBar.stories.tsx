import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchBar } from './SearchBar';
import { Pictogram } from '../../atoms/Pictogram/Pictogram';

const meta: Meta<typeof SearchBar> = {
  title: 'Molecules/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-width search row with hairline below and a 0.5px ink-bordered input. Square corners; accent outline on focus. Optional leading icon and a clear (×) button (auto-shown when value is non-empty).',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
  render: () => {
    const [q, setQ] = useState('');
    return (
      <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search by name, species, room…"
        />
      </div>
    );
  },
};

export const WithLeadingIcon: Story = {
  render: () => {
    const [q, setQ] = useState('');
    return (
      <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search by name, species, room…"
          iconLeading={<Pictogram name="search" size={16} />}
        />
      </div>
    );
  },
};

export const WithValue: Story = {
  render: () => {
    const [q, setQ] = useState('Calathea');
    return (
      <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search by name, species, room…"
          iconLeading={<Pictogram name="search" size={16} />}
        />
      </div>
    );
  },
};

export const NotClearable: Story = {
  render: () => {
    const [q, setQ] = useState('hello');
    return (
      <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search…"
          clearable={false}
        />
      </div>
    );
  },
};
