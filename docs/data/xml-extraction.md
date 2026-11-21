# Offline XML relationship spike

Ticket: [XML extraction](https://trello.com/c/tYtT1wli).
This tool emits a development evidence graph, not the normalized production
Dataset or a compatibility verdict. Automated tests use authored synthetic
fragments. Optional historical-source syntax checks stay local and do not validate
game semantics. No installed PC game is required for development.

## Input adapters

Both adapters end at the same manifest and local UTF-8 XML files, under
`data/raw/<snapshot>/`. Retrieval and archive unpacking are operator steps;
this tool neither downloads nor opens archives.

- **Installed archive:** copy the user's lawfully obtained
  `preload/paks/client/initial.pak` outside the installation, hash the archive,
  and extract a separate research copy. Record storefront, platform, build,
  mod/DLC state and archive hash in the source version/locator. Never modify
  the installed archive. Select actual truck, template and referenced class
  files from that snapshot.
- **Public XML:** obtain files only where access and applicable terms permit
  local research. Record the canonical URL, pinned revision and retrieval
  timestamp. A public mirror alone does not establish reuse permission.
  The historical mirror in the [audit](ank-mk38-source-audit.md) is historical
  evidence, not the current stock game. Do not combine branches or versions.
- **Synthetic:** author small fragments, with invented identifiers and no
  copied game values. The colocated `xml.test.ts` provides executable examples.

## Manifest and execution

Run from repository root:

```sh
pnpm import:xml -- data/raw/<snapshot>/manifest.json
```

Manifest shape (replace placeholders, calculate each exact XML file's SHA-256):

```json
{
  "version": 1,
  "source": {
    "locator": "synthetic:example",
    "version": "authored-v1",
    "retrievedAt": "2026-11-13T00:00:00Z",
    "usageRights": "Authored synthetic example",
    "adapter": "synthetic"
  },
  "entry": "truck.xml",
  "files": [{ "path": "truck.xml", "sha256": "sha256:<64 lowercase hex>" }],
  "links": {}
}
```

`adapter` also accepts `installed-archive` and `public-xml`. All file paths
are relative to the manifest directory; the CLI rejects escaping paths and
symlinks that escape it. `links` maps exact XML reference names to listed file
paths, including `_templates Include`, `_parent File`, component family names
and defaults. The operator explicitly chooses snapshot paths rather than the
resolver guessing DLC precedence. Every supplied file is hash-verified and
parsed, even if unreachable. Source metadata is operator evidence, not an
independent rights or game-version verification.

Outputs are fixed to ignored `data/normalized/xml-development.json` and
`data/reports/xml-evidence.json`. Existing files are never overwritten; move
previous output aside before another run. Terminal output contains no XML or
source paths. Do not commit, publish, bundle or attach generated output to CI.

## Resolution and limits

The parser accepts multiple XML roots (game-style fragments), attributes and
comments, with bounded size, depth and node count. Malformed XML, DTDs,
custom entities and non-whitespace text fail closed. Numeric attributes stay
strings: the spike makes no unit or stat interpretations.

The resolver follows transitive library includes, parent references and
`Type`, `Types`, `Default`, `Addon` attributes using explicit links. It
expands uniquely named templates by element type, recursively inheriting
attributes; local attributes override inherited values. Repeated declarations
remain ambiguous. It records engine, gearbox, suspension, winch, wheel and
addon definitions/references, socket attributes, defaults and restrictions.
Missing family files or default links remain report issues; missing references
never establish incompatibility. An addon file alone proves no installability,
removability or cargo capacity.

Template child merging, parent merging, `_replace` and other directives are
not interpreted. Parent files are traversed for evidence, but their entries
are not declared inherited facts. These operations produce explicit issues.
DLC precedence, localization, suspension/wheel feasibility and stock fixed-bed
behavior require further evidence and resolver work. The graph preserves raw
relationship attributes and source file/line locators; the report includes
visited hashes, template definition attributes/locators, cycles, unresolved
links and unsupported directives. `complete` is always false: an empty issue
list does not certify a dataset. Template definitions form a traversal-scoped
library; duplicate names across libraries are conservatively ambiguous.

Results are deterministic for identical ordered manifests and bytes. Complete
ANK MK38 relationship normalization has not been validated. Production publication
remains gated on rights, source-version verification, complete dependency
resolution, normalized entity validation and review. The production catalog
stays empty.

## Scoped semantic resolver

`resolveXmlDocument` and `xmlReferenceKey` are public importer exports for local
normalization tools. Optional subtree omissions isolate compatibility fields from
visual XML; opt-in identity keys allow source adapters to match repeated children
where their identities are established. Missing identity keys are reported.
They accept supplied XML documents and explicit per-file
include/parent mappings. They resolve scoped attribute templates, transitive
includes and unambiguous child hierarchies, retain file/line origins, and detect
cycles and bounded expansion. They support `_noinherit` resets and `_inheritRemove` removals when the
inherited match is unambiguous. They report duplicate templates, ambiguous
repeated children/removals, missing references and unsupported directives. Callers must preserve
these issues as unresolved evidence rather than treating the projection as the
game loader's authoritative result. This additional resolver does not change the
spike CLI's output or its deliberately incomplete status.

Behavior follows the official [template override](https://expeditions-guides.saber.games/truck_modding/general_info/xml_structure/templates/overrides_for_attribute_values/),
[hierarchy extension](https://expeditions-guides.saber.games/truck_modding/general_info/xml_structure/templates/extension_of_hierarchy/)
and [inheritance](https://expeditions-guides.saber.games/truck_modding/general_info/xml_structure/inheritance/)
documentation only where the match is unambiguous. Reset/removal behavior follows the official
[removal documentation](https://expeditions-guides.saber.games/truck_modding/general_info/xml_structure/templates/removal_of_inherited_attributes_and_tags/)
for unambiguous matches; other directives remain unresolved. Synthetic resolver tests require no raw files.

## Integration evidence adapter

`extractResolvedXml` exposes the scoped resolver's flattened evidence and origins
for the reviewed development integration workflow. It verifies manifest hashes
before resolution, retains the raw spike's issues separately, and preserves scoped
resolution issues as blockers to projection admission. See
[development catalog integration](development-catalog.md) for the configuration,
review contract, output boundaries and current limitations.
