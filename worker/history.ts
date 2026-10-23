const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const str = (v: unknown) => (v == null ? '' : String(v))

/**
 * Presets and fill history, straight against D1. The action names and response
 * shapes are the contract `src/lib/api.ts` already speaks — the client cannot
 * tell this from the old Sheet proxy.
 */
export default async (req: Request, db: D1Database) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let b: any
  try {
    b = await req.json()
  } catch {
    return json({ error: 'body ต้องเป็น JSON' }, 400)
  }

  try {
    switch (b?.action) {
      case 'listPresets': {
        const { results } = await db
          .prepare('SELECT name, form_id, form_title, answers, updated FROM presets ORDER BY rowid')
          .all<Record<string, string>>()
        return json({
          rows: results.map((r) => ({
            name: r.name,
            formId: r.form_id,
            formTitle: r.form_title,
            answers: JSON.parse(r.answers),
            updated: r.updated,
          })),
        })
      }

      case 'savePreset': {
        const name = str(b.name).trim()
        if (!name) return json({ error: 'preset needs a name' }, 400)
        await db
          .prepare(
            `INSERT INTO presets (name, form_id, form_title, answers, updated) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(name) DO UPDATE SET form_id = excluded.form_id, form_title = excluded.form_title,
               answers = excluded.answers, updated = excluded.updated`,
          )
          .bind(name, str(b.formId), str(b.formTitle), JSON.stringify(b.answers ?? {}), new Date().toISOString())
          .run()
        return json({ ok: true })
      }

      case 'deletePreset': {
        const { meta } = await db.prepare('DELETE FROM presets WHERE name = ?1').bind(str(b.name)).run()
        return meta.changes ? json({ ok: true }) : json({ error: `no preset named ${b.name}` }, 404)
      }

      case 'listHistory': {
        // ponytail: newest 1000 only, to keep each page load well inside D1's free
        // daily row-read budget. Add paging if history ever outgrows it.
        const { results } = await db
          .prepare('SELECT at, form_id, form_title, preset, vals, url FROM history ORDER BY id DESC LIMIT 1000')
          .all<Record<string, string>>()
        return json({
          rows: results.map((r) => ({
            at: r.at,
            formId: r.form_id,
            formTitle: r.form_title,
            preset: r.preset,
            values: JSON.parse(r.vals),
            url: r.url,
          })),
        })
      }

      case 'logFill':
        await db
          .prepare('INSERT INTO history (at, form_id, form_title, preset, vals, url) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
          .bind(new Date().toISOString(), str(b.formId), str(b.formTitle), str(b.preset), JSON.stringify(b.values ?? {}), str(b.url))
          .run()
        return json({ ok: true })

      default:
        return json({ error: `action ไม่รู้จัก: ${b?.action}` }, 400)
    }
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
}
