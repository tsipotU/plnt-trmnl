import type { Meta, StoryObj } from '@storybook/react-vite';
import { FeedbackRow } from './FeedbackRow';

const meta: Meta<typeof FeedbackRow> = {
  title: 'Molecules/FeedbackRow',
  component: FeedbackRow,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Feedback list entry. Type pill + status + date + title + snippet. Three type tones map to semantic tokens: **bug** (rust soft), **idea** (slate soft), **praise** (sage soft). Whole row is a button.',
      },
    },
  },
  argTypes: {
    feedbackType: { control: { type: 'inline-radio' }, options: ['bug', 'idea', 'praise'] },
  },
  args: {
    feedbackType: 'bug',
    status: 'fixed',
    date: '2026-04-29',
    title: 'Calibration modal flickers on submit',
    snippet: 'Tapping "Soil felt damp" sometimes makes the modal vanish then reappear. Happens on iOS Safari maybe 1 in 5 times.',
    onClick: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof FeedbackRow>;

export const Bug: Story = {};

export const Idea: Story = {
  args: {
    feedbackType: 'idea',
    status: 'planned',
    title: 'Group watering by room',
    snippet: 'When I do my Sunday round I water by location, not by interval. Could "Today" optionally group by room?',
  },
};

export const Praise: Story = {
  args: {
    feedbackType: 'praise',
    status: 'open',
    title: 'The "Dialed in" badge feels great',
    snippet: 'Watching plants graduate from calibrating to dialed in is genuinely satisfying.',
  },
};

export const FeedbackList: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <FeedbackRow
        feedbackType="bug"
        status="fixed"
        date="2026-04-29"
        title="Calibration modal flickers on submit"
        snippet="Tapping 'Soil felt damp' sometimes makes the modal vanish then reappear. Happens on iOS Safari maybe 1 in 5 times."
      />
      <FeedbackRow
        feedbackType="idea"
        status="planned"
        date="2026-04-22"
        title="Group watering by room"
        snippet="When I do my Sunday round I water by location, not by interval. Could 'Today' optionally group by room?"
      />
      <FeedbackRow
        feedbackType="praise"
        status="open"
        date="2026-04-26"
        title="The 'Dialed in' badge feels great"
        snippet="Watching plants graduate from calibrating to dialed in is genuinely satisfying."
      />
      <FeedbackRow
        feedbackType="idea"
        status="next"
        date="2026-05-03"
        title="Photo comparison slider"
        snippet="I have 6 months of Mona photos. Would love a side-by-side or before/after slider on the plant detail page."
      />
    </div>
  ),
};
