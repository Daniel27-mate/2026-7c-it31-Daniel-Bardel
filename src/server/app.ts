import { Hono } from 'hono'
import { itemInput, itemPatch } from '../shared/schemas'
import type { Store } from './store'

// Die App wird als Funktion gebaut, damit Tests sie mit einem Test-Store starten können.
export function createApp(store: Store) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ status: 'ok' }))

  app.get('/api/items', async (c) => c.json(await store.list()))

  // POST /api/items -> neuen Eintrag anlegen (201), bei ungültiger Eingabe 400
  app.post('/api/items', async (c) => {
    // .catch(() => null): kaputtes oder fehlendes JSON wird zu null -> Zod meldet 400
    const parsed = itemInput.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) {
      return c.json({ error: 'Ungültige Eingabe', details: parsed.error.issues }, 400)
    }
    const item = await store.create(parsed.data)
    return c.json(item, 201)
  })

  // PATCH /api/items/:id -> Eintrag teilweise ändern (200), 400 bei falscher Eingabe, 404 wenn unbekannt
  app.patch('/api/items/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const parsed = itemPatch.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) {
      return c.json({ error: 'Ungültige Eingabe', details: parsed.error.issues }, 400)
    }
    const item = await store.update(id, parsed.data)
    if (!item) return c.json({ error: 'Eintrag nicht gefunden' }, 404)
    return c.json(item)
  })

  // DELETE /api/items/:id -> Eintrag löschen (204 ohne Inhalt), 404 wenn unbekannt
  app.delete('/api/items/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const removed = await store.remove(id)
    if (!removed) return c.json({ error: 'Eintrag nicht gefunden' }, 404)
    return c.body(null, 204)
  })

  return app
}
