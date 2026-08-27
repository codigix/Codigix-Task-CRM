import { render, screen } from '@testing-library/react';
import App from './App';

test('renders deals dashboard heading', () => {
  render(<App />);
  const dashboardHeadings = screen.getAllByText(/Deals Dashboard/i);
  expect(dashboardHeadings.length).toBeGreaterThan(0);
});
