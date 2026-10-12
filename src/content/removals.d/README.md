# src/content/removals.d: per-lane declaration files

`tools/text-parity.mjs` reads `src/content/removals.json` (the base file) and then every `*.json` file in this
directory, in file-name order. All of them use one schema and one validation. Each lane writes only its own file, so
lanes never edit the same declaration file at once.

## Owners

| file | owner |
|---|---|
| `theme-chrome.json` | T1a |
| `theme-home.json` | T1b |
| `theme-interior.json` | T2a |
| `theme-shop.json` | T2b |
| `imagery.json` | IMG |
| `integrator.json` | INTEGRATOR |
| `../removals.json` (the base file) | T0 during the skeleton phase, then the INTEGRATOR |

Need an entry in a file you do not own? Append the request to `tmp/<owner-lane>/INBOX.md`.

## Schema (the same as `src/content/removals.json`)

```json
{
  "schema": "ccc-reforge/removals@1",
  "removals": [],
  "allowedAdded": [
    { "id": "unique-id", "text": "The exact string", "reason": "Why it is added (BUILD-CONTRACT 4.x)", "pages": "*" }
  ]
}
```

- `removals[]` declares source sentences deliberately not shown. `allowedAdded[]` declares strings the rebuild adds:
  UI microcopy only, never a claim, a fact or marketing copy (BUILD-CONTRACT 4.16.2).
- Every entry needs `id`, `reason`, and `text` or `pattern` (a regular expression; optional `flags`). `contains: true`
  matches `text` anywhere in a sentence.
- Optional `pages`: `"*"` or an array of output paths (`"/specials/"`, or `"#chrome"` for the header, footer and
  dialogs). Optional `kinds`: an array drawn from `text`, `alt`, `aria-label`, `placeholder` and `value`.
- `schema` may be left out. When present it must be `ccc-reforge/removals@1`.
- An `id` is unique within its list, and it may not appear in any other declaration file.
- The first matching entry wins: the base file first, then these files in name order.

## What fails

`text-parity` exits 2 and names the file and the entry when a file:

- is not valid JSON (an empty file included) or not a JSON object;
- has a `removals` or `allowedAdded` that is not an array;
- has an entry without `id`, `reason`, or `text`/`pattern`;
- has a bad `pattern` or `kinds`;
- has a wrong `schema`;
- reuses an `id` within a list or across files.

The report names the file behind every matched entry (`totals.declaredByFile`, `totals.addedDeclaredByFile`) and lists
every file it read (`declarationFiles`).
