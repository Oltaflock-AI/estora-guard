import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HealthBar from '@/components/HealthBar';

describe('HealthBar', () => {
  it('renders null score as placeholder', () => {
    render(<HealthBar score={null} status={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders compact null score as gray dot', () => {
    const { container } = render(<HealthBar score={null} status={null} compact />);
    const dot = container.querySelector('.bg-gray-300');
    expect(dot).toBeInTheDocument();
  });

  it('displays score number in full mode', () => {
    render(<HealthBar score={78} status="green" />);
    expect(screen.getByText('78')).toBeInTheDocument();
  });

  it('displays compact score with dot', () => {
    render(<HealthBar score={55} status="yellow" compact />);
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('displays overdue/dueSoon/onTrack stats', () => {
    render(
      <HealthBar
        score={55}
        status="yellow"
        overdue={2}
        dueSoon={1}
        onTrack={4}
      />
    );
    expect(screen.getByText('2 overdue')).toBeInTheDocument();
    expect(screen.getByText('1 due soon')).toBeInTheDocument();
    expect(screen.getByText('4 on track')).toBeInTheDocument();
  });

  it('hides zero overdue/dueSoon counts', () => {
    render(
      <HealthBar
        score={90}
        status="green"
        overdue={0}
        dueSoon={0}
        onTrack={5}
      />
    );
    expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();
    expect(screen.queryByText(/due soon/)).not.toBeInTheDocument();
    expect(screen.getByText('5 on track')).toBeInTheDocument();
  });

  it('clamps fill height between 0 and 100', () => {
    const { container } = render(<HealthBar score={120} status="green" />);
    const fill = container.querySelector('.health-bar-fill');
    expect(fill).toHaveStyle({ height: '100%' });
  });
});
