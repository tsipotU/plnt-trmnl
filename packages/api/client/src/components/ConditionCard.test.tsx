import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConditionCard } from './ConditionCard';

const baseCondition = {
  name: 'Variegation loss in low light',
  severity: 'warning' as const,
  symptoms: 'New leaves are pure green',
  remedy: 'Move closer to a bright window',
  prevention: 'Keep in bright indirect light year-round',
  tags: ['COMMON', 'species-specific'],
};

describe('ConditionCard', () => {
  it('renders headline + severity icon collapsed by default', () => {
    render(<ConditionCard condition={baseCondition} />);
    expect(screen.getByText(baseCondition.name)).toBeInTheDocument();
    expect(screen.getByLabelText('warning')).toBeInTheDocument();
    expect(screen.queryByText(/Move closer/)).not.toBeInTheDocument();
  });

  it('expands on click and shows Remedy + Prevention', async () => {
    const user = userEvent.setup();
    render(<ConditionCard condition={baseCondition} />);
    await user.click(screen.getByRole('button', { name: /Variegation loss/ }));
    expect(screen.getByText(/Move closer to a bright window/)).toBeInTheDocument();
    expect(screen.getByText(/Keep in bright indirect light/)).toBeInTheDocument();
  });

  it('toggles via Space key when focused', async () => {
    const user = userEvent.setup();
    render(<ConditionCard condition={baseCondition} />);
    const btn = screen.getByRole('button', { name: /Variegation loss/ });
    btn.focus();
    await user.keyboard(' ');
    expect(screen.getByText(/Move closer/)).toBeInTheDocument();
  });

  it('reflects state via aria-expanded', async () => {
    const user = userEvent.setup();
    render(<ConditionCard condition={baseCondition} />);
    const btn = screen.getByRole('button', { name: /Variegation loss/ });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders info severity with the info icon', () => {
    render(
      <ConditionCard
        condition={{ ...baseCondition, name: 'Fast-growing aerial roots', severity: 'info' }}
      />,
    );
    expect(screen.getByLabelText('info')).toBeInTheDocument();
  });

  it('renders tag chips', () => {
    render(<ConditionCard condition={baseCondition} />);
    expect(screen.getByText('COMMON')).toBeInTheDocument();
  });
});
