import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Shiori } from '../../domain/entities/Shiori';
import { ShioriView } from './ShioriView';

const base: Shiori = {
  title: '箱根1泊2日しおり',
  destination: '箱根',
  startDateTime: '2026-03-20T09:00',
  endDateTime: '2026-03-21T18:00',
  days: [
    {
      date: '2026-03-20',
      label: 'DAY 1',
      items: [
        {
          time: '09:00',
          title: '新宿駅集合',
          description: 'ロマンスカーで移動',
          place: '新宿駅'
        }
      ]
    }
  ]
};

describe('ShioriView', () => {
  it('defaults to timeline preset when design is missing', () => {
    render(<ShioriView data={base} expiresAt={null} layoutMode="mobile" locale="ja-JP" />);

    const root = screen.getByTestId('shiori-view');
    expect(root.getAttribute('data-preset')).toBe('timeline');
    expect(screen.getByText('箱根1泊2日しおり')).toBeInTheDocument();
    expect(screen.getByText('DAY 1')).toBeInTheDocument();
  });

  it('renders ticket layout when preset is ticket', () => {
    render(
      <ShioriView
        data={{
          ...base,
          design: { v: 1, layout: { preset: 'ticket' } }
        }}
        expiresAt={null}
        layoutMode="desktop"
        locale="ja-JP"
      />
    );

    expect(screen.getByTestId('shiori-view').getAttribute('data-preset')).toBe('ticket');
    expect(screen.getByTestId('shiori-layout-ticket')).toBeInTheDocument();
  });

  it('renders metro layout when preset is metro', () => {
    render(
      <ShioriView
        data={{
          ...base,
          design: { v: 1, layout: { preset: 'metro' } }
        }}
        expiresAt={null}
        layoutMode="desktop"
        locale="ja-JP"
      />
    );

    expect(screen.getByTestId('shiori-view').getAttribute('data-preset')).toBe('metro');
    expect(screen.getByTestId('shiori-layout-metro')).toBeInTheDocument();
  });

  it('renders cards layout when preset is cards', () => {
    render(
      <ShioriView
        data={{
          ...base,
          design: { v: 1, layout: { preset: 'cards' } }
        }}
        expiresAt={null}
        layoutMode="desktop"
        locale="ja-JP"
      />
    );

    expect(screen.getByTestId('shiori-view').getAttribute('data-preset')).toBe('cards');
    expect(screen.getByTestId('shiori-layout-cards')).toBeInTheDocument();
  });
});

