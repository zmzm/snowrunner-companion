import { catalogStatus } from '@snowrunner/game-data';
import { Panel } from '@snowrunner/ui';

export function App() {
  return (
    <main>
      <header>
        <span className="eyebrow">
          Independent fan project · Foundation preview
        </span>
        <h1>
          SnowRunner
          <br />
          <span>Companion</span>
        </h1>
        <p>
          Your next build starts here. A truck reference, task finder and 2D
          garage, starting with the ANK MK38.
        </p>
      </header>
      <aside className="status" aria-label="Data status">
        <strong>Repository ready. Garage ahead.</strong>
        <p>
          {catalogStatus.truckIds.length} trucks imported. Game data,
          compatibility rules and saved builds are not available yet.
        </p>
      </aside>
      <div className="grid">
        <Panel title="Truck Finder">
          <p>
            Planned: match cargo, terrain and equipment needs with explainable
            results, then open a suggested build in Garage.
          </p>
        </Panel>
        <Panel title="Truck Catalog">
          <p>
            Planned: quick specifications and comparisons without entering the
            Garage.
          </p>
        </Panel>
        <Panel title="2D Garage">
          <p>
            Planned: configure the ANK MK38 with validated parts and
            source-attributed stats.
          </p>
        </Panel>
        <Panel title="My Builds">
          <p>
            Planned: save owned trucks and experimental builds locally on your
            device.
          </p>
        </Panel>
      </div>
      <footer>
        First milestone: ANK MK38 · No game data or truck imagery bundled.
      </footer>
    </main>
  );
}
