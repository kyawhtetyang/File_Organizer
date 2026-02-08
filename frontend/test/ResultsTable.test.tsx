import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ResultsTable } from '../components/ResultsTable';

describe('ResultsTable', () => {
  it('renders settings table layout (snapshot)', () => {
    const { container } = render(
      <ResultsTable
        files={[]}
        isDark={true}
        status="idle"
        settings={[
          {
            description: 'Prefix',
            label: 'Timeline Mode',
            key: 'timeline_mode',
            value: 'timeline_plus',
            options: [
              { value: 'off', label: 'Off' },
              { value: 'timeline_only', label: 'Time' },
              { value: 'timeline_plus', label: 'Both' }
            ]
          },
          {
            description: 'Bodyname',
            label: 'Replace Name',
            key: 'replace_bodyname',
            value: ''
          }
        ]}
      />
    );

    expect(container).toMatchSnapshot();
  });
});


