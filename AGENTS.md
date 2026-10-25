# Working on Legislação Automotiva

This is a static, buildless browser application. Keep the existing stack unless a
change actually requires more. Preserve the vehicle illustration coordinates and
stable URLs. `src/core` owns navigation and canonical requirement helpers;
`src/regulations` owns the store, catalog adapters and states; `src/views` owns
screens. Classic scripts load in dependency order in `index.html`. Root vehicle
and flow modules expose CommonJS exports for model tests.

## Commands

- Install: `npm ci` and `python -m pip install -r requirements-dev.txt`.
- Browser: `python -m playwright install --with-deps chromium`.
- Generate: `npm run build:data` (must be deterministic).
- Validate: `npm run check`, `npm test`, `npm run format:check`.
- Browser, accessibility and visual: `npm run test:browser`, `npm run test:a11y`,
  `npm run test:visual`. Tests own their server; optional `VEHICLE_TEST_URL` points
  at an existing one. `BROWSER_EXECUTABLE` is only an explicit local override.
- Build: `npm run build`. Publish only the allowlisted `dist`, never raw research.

## Regulatory integrity

Use `.agents/skills/revisao-normativa/SKILL.md` for normative edits. Publication,
legal indication, review depth and vehicle applicability are independent. An
official FAQ is guidance, not proof of integral validity or a fully reviewed act.
The 18 Inmetro references have NOT had their full texts reviewed. Keep partial
revocation warnings. Unknown review depth stays null. Do not infer NBR editions,
limits, required tests or vehicle applicability from titles or ASA part codes.

`data/*/reviewed-map.json`, `data/markings/reviewed.json`, the publication policy
and the historical source inventory are editorial inputs. Preserve the 55
user-excluded CONTRAN acts and the historical inventory. Exclusion does not prove
a specific revoking act. Never modify them merely to make a test pass.

Active JSON/CSV, `data/site/**` and `data/requirements/catalog.json` are generated.
`knowledge/**`, `data/process/knowledge-index.json`, `regulatory-coverage.json`
and `regulatory-revision.json` are also generated. Edit their cited editorial
inputs, then run `npm run build:data`; never rewrite a generated law card to
change a legal state. For AI consultation use
`.agents/skills/consulta-regulatoria/SKILL.md`. Monitoring observations and
HTTP/hash changes do not update legal review dates or applicability. Keep
candidate references separate from published acts and preserve old process
evidence when a changed rules/evidence snapshot requires revalidation.
Edit sources, retain requirement IDs, regenerate and review diffs. Requirement
context joins mean that an activity/system consults an act, not that every
requirement applies. Method/evidence plans remain explicitly unstructured until
reviewed. Preserve L8/P8 separation and documented gaps.

## Interface and delivery

Image hotspots and textual alternatives share one relationship. Keep keyboard
controls, visible focus, mobile navigation, reduced motion and zoom alignment.
Visual baselines change only deliberately using `UPDATE_VISUAL_BASELINES=1` after
review; CI never updates them. Do not hide accessibility findings.

Keep the existing site audience and publishing target. Do not expose credentials,
copy ASA authentication or change sharing. Do not merge a branch automatically.
Run required checks and record limitations honestly in the PR.
