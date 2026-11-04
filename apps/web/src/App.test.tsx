import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { App } from './App';

it('renders the workspace packages together and discloses the empty data state', () => {
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain('SnowRunner');
  expect(html).toContain('0 trucks imported');
  expect(html).toContain('not available yet');
  expect(html).toContain('Truck Finder');
  expect(html).toContain('2D Garage');
});
