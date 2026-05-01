import type { Meta, StoryObj } from '@storybook/react-vite';
import { FieldLabel } from './FieldLabel';

const meta: Meta<typeof FieldLabel> = {
  title: 'Atoms/FieldLabel',
  component: FieldLabel,
  parameters: {
    docs: {
      description: {
        component:
          'Label for form fields. Mono uppercase tracked text, with optional required marker (copper dot) and an inline sans hint underneath. Use the `htmlFor` prop to associate with the input.',
      },
    },
  },
  args: {
    children: 'Plant name',
    htmlFor: 'plant-name',
  },
};
export default meta;

type Story = StoryObj<typeof FieldLabel>;

export const Default: Story = {};

export const Required: Story = {
  args: { required: true, children: 'Latin name' },
};

export const WithHint: Story = {
  args: {
    children: 'Pot size',
    hint: 'Diameter at the rim, in centimetres.',
  },
};

export const RequiredWithHint: Story = {
  args: {
    children: 'Watering interval',
    required: true,
    hint: 'Days between watering. The system will refine this from your calibration answers.',
  },
};

export const FormStack: Story = {
  render: () => (
    <form
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-5)',
        maxWidth: 360,
        padding: 'var(--sp-6)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-2)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div>
        <FieldLabel htmlFor="f1" required>
          Plant name
        </FieldLabel>
        <input
          id="f1"
          placeholder="Ferdinand"
          style={{
            marginTop: 6,
            width: '100%',
            padding: '10px 12px',
            background: 'var(--bg)',
            color: 'var(--ink)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-2)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-body)',
          }}
        />
      </div>
      <div>
        <FieldLabel htmlFor="f2" hint="Where this plant lives — used in scheduling.">
          Location
        </FieldLabel>
        <input
          id="f2"
          placeholder="Living room — east window"
          style={{
            marginTop: 6,
            width: '100%',
            padding: '10px 12px',
            background: 'var(--bg)',
            color: 'var(--ink)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-2)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-body)',
          }}
        />
      </div>
    </form>
  ),
};
