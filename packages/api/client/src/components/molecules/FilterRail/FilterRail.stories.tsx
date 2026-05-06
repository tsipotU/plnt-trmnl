import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FilterRail } from './FilterRail';
import { Chip } from '../../atoms/Chip/Chip';

const meta: Meta<typeof FilterRail> = {
  title: 'Molecules/FilterRail',
  component: FilterRail,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Horizontal-scrollable rail of toggleable Chip atoms. The rail handles overflow + chrome; the Chips handle selection. Stack two rails (top bordered, bottom compact) for multi-axis filters like PlantsList state + category.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof FilterRail>;

export const SingleAxis: Story = {
  render: () => {
    const [filter, setFilter] = useState('all');
    const opts: Array<[string, string]> = [
      ['all', 'All'],
      ['due', 'Due'],
      ['calibrating', 'Calibrating'],
      ['dialed', 'Dialed in'],
    ];
    return (
      <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
        <FilterRail>
          {opts.map(([k, l]) => (
            <Chip key={k} toggleable active={filter === k} onClick={() => setFilter(k)}>
              {l}
            </Chip>
          ))}
        </FilterRail>
      </div>
    );
  },
};

export const StackedRails: Story = {
  parameters: {
    docs: { description: { story: 'Two rails: state filter (bordered, primary) + category filter (compact, no top padding).' } },
  },
  render: () => {
    const [state, setState] = useState('all');
    const [cat, setCat] = useState('all');
    const states: Array<[string, string]> = [
      ['all', 'All'], ['due', 'Due'], ['calibrating', 'Calibrating'], ['dialed', 'Dialed in'],
    ];
    const cats: Array<[string, string]> = [
      ['all', 'All cats'], ['foliage', 'Foliage'], ['succulents', 'Succulents'],
      ['cacti', 'Cacti'], ['indoor_trees', 'Trees'], ['ferns', 'Ferns'],
      ['orchids', 'Orchids'], ['air_plants', 'Air'],
    ];
    return (
      <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
        <FilterRail>
          {states.map(([k, l]) => (
            <Chip key={k} toggleable active={state === k} onClick={() => setState(k)}>
              {l}
            </Chip>
          ))}
        </FilterRail>
        <FilterRail compact>
          {cats.map(([k, l]) => (
            <Chip key={k} toggleable active={cat === k} onClick={() => setCat(k)}>
              {l}
            </Chip>
          ))}
        </FilterRail>
      </div>
    );
  },
};

export const Overflowing: Story = {
  parameters: {
    docs: { description: { story: 'When the rail content exceeds viewport width, it scrolls horizontally with no scrollbar visible (touch-friendly).' } },
  },
  render: () => {
    const [active, setActive] = useState('a');
    return (
      <div style={{ maxWidth: 320, margin: '0 auto', border: '1px solid var(--border)' }}>
        <FilterRail>
          {Array.from({ length: 12 }).map((_, i) => {
            const k = String.fromCharCode(97 + i);
            return (
              <Chip key={k} toggleable active={active === k} onClick={() => setActive(k)}>
                Filter · {k}
              </Chip>
            );
          })}
        </FilterRail>
      </div>
    );
  },
};
