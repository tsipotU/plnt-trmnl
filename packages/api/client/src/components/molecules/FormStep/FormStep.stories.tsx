import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormStep } from './FormStep';
import { FieldLabel } from '../../atoms/FieldLabel/FieldLabel';

const meta: Meta<typeof FormStep> = {
  title: 'Molecules/FormStep',
  component: FormStep,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Numbered step block for multi-step forms. Mono step-num + display title + form-fields body, with a hairline below. Stack vertically inside a scrollable form container (Add Plant, FeedbackNew).',
      },
    },
  },
  args: {
    num: '01 · Name',
    title: "What's it called?",
  },
};
export default meta;

type Story = StoryObj<typeof FormStep>;

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg-elevated)',
  color: 'var(--ink)',
  border: '0.5px solid var(--ink)',
  borderRadius: 'var(--r-0)',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
};

export const SingleStep: Story = {
  args: {
    children: (
      <>
        <div>
          <FieldLabel htmlFor="nick">Nickname</FieldLabel>
          <input id="nick" placeholder="Mona, Big Frank, …" style={inputStyle} />
        </div>
        <div>
          <FieldLabel htmlFor="ident" hint="Differentiates duplicates of the same species.">
            Identifier (optional)
          </FieldLabel>
          <input id="ident" placeholder="blue pot, kitchen tile…" style={inputStyle} />
        </div>
      </>
    ),
  },
};

export const MultiStepForm: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)', background: 'var(--bg)' }}>
      <FormStep num="01 · Name" title="What's it called?">
        <div>
          <FieldLabel htmlFor="f-nick">Nickname</FieldLabel>
          <input id="f-nick" placeholder="Mona" style={inputStyle} />
        </div>
        <div>
          <FieldLabel htmlFor="f-id">Identifier (optional)</FieldLabel>
          <input id="f-id" placeholder="kitchen tile" style={inputStyle} />
        </div>
      </FormStep>

      <FormStep num="02 · Species" title="Species">
        <div>
          <FieldLabel htmlFor="f-spec">Latin or common name</FieldLabel>
          <input id="f-spec" placeholder="Monstera deliciosa, snake plant…" style={inputStyle} />
        </div>
      </FormStep>

      <FormStep num="03 · Home" title="Where does it live?">
        <div>
          <FieldLabel htmlFor="f-room">Room</FieldLabel>
          <select id="f-room" style={inputStyle}>
            <option>Living room</option>
            <option>Bedroom</option>
            <option>Bathroom</option>
            <option>Kitchen</option>
          </select>
        </div>
      </FormStep>
    </div>
  ),
};
