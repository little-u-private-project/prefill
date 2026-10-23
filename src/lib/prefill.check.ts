// Self-check for the preset logic: `npm run check` (Node runs the TypeScript directly).
import { strict as assert } from 'node:assert'
import type { FormSchema } from './api'
import { NOW, OTHER, TODAY, buildPrefillUrl, presetIssues } from './prefill.ts'

const schema: FormSchema = {
  formId: 'F',
  title: 't',
  fields: [
    { entryId: '1', title: 'Dept', type: 'dropdown', required: true, choices: ['A', 'B'], hasOther: true },
    { entryId: '2', title: 'Day', type: 'date', required: false, choices: [], hasOther: false },
    { entryId: '3', title: 'At', type: 'time', required: false, choices: [], hasOther: false },
  ],
}

// Live tokens resolve to the current local date/time when the link is built.
const url = new URL(buildPrefillUrl(schema, {
  '2': { auto: true, value: TODAY },
  '3': { auto: true, value: NOW },
}))
const now = new Date()
assert.equal(url.searchParams.get('entry.2_year'), String(now.getFullYear()))
assert.equal(url.searchParams.get('entry.2_day'), String(now.getDate()))
assert.equal(url.searchParams.get('entry.3_hour'), String(now.getHours()))

// A preset that still matches has no issues; manual and blank answers are never flagged.
assert.deepEqual(presetIssues(schema, {
  '1': { auto: true, value: 'A' },
  '9': { auto: false, value: 'gone but manual' },
  '2': { auto: true, value: '' },
}), [])
assert.deepEqual(presetIssues(schema, { '1': { auto: true, value: OTHER, other: 'x' } }), [])

// A renamed choice and a removed question are both reported.
assert.equal(presetIssues(schema, {
  '1': { auto: true, value: 'Old dept' },
  '9': { auto: true, value: 'x' },
}).length, 2)

console.log('prefill.check ok')
