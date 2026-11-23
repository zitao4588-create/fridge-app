const { DatabaseSync } = require('node:sqlite')
const { randomUUID } = require('node:crypto')

function openStore(filename) {
  const db = new DatabaseSync(filename)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS documents (
      collection TEXT NOT NULL, id TEXT NOT NULL,
      body TEXT NOT NULL CHECK (json_valid(body)),
      PRIMARY KEY (collection, id)
    ) WITHOUT ROWID;
  `)
  const get = db.prepare('SELECT body FROM documents WHERE collection = ? AND id = ?')
  const select = db.prepare('SELECT body FROM documents WHERE collection = ? ORDER BY id')
  const insert = db.prepare(`
    INSERT INTO documents (collection, id, body) VALUES (?, ?, ?)
    ON CONFLICT (collection, id) DO UPDATE SET body=excluded.body
  `)
  const remove = db.prepare('DELETE FROM documents WHERE collection = ? AND id = ?')
  const symbol = Symbol('operation')
  const filter = (predicate) => ({
    [symbol]: 'filter',
    matches: predicate,
    and: (other) => filter((value) => predicate(value) && other.matches(value)),
  })
  const command = {
    in: (values) => filter((value) => values.includes(value)),
    gte: (minimum) => filter((value) => typeof value === typeof minimum && value >= minimum),
    lte: (maximum) => filter((value) => typeof value === typeof maximum && value <= maximum),
    inc: (amount) => ({ [symbol]: 'inc', amount }),
  }
  let sequence = 0
  let pending = Promise.resolve()

  function fetchDocument(collection, id) {
    if (typeof id !== 'string' || !id) return null
    const row = get.get(collection, id)
    return row ? JSON.parse(row.body) : null
  }

  function patchDocument(collection, id, data) {
    const previous = fetchDocument(collection, id)
    if (!previous) return 0
    const updated = { ...previous }
    for (const [name, value] of Object.entries(data)) {
      if (value === undefined) continue
      updated[name] = value?.[symbol] === 'inc'
        ? (updated[name] ?? 0) + value.amount : value
    }
    insert.run(collection, id, JSON.stringify({ ...updated, _id: id }))
    return 1
  }

  function query(name, criteria = {}, offset = 0, limit = Infinity) {
    const collect = () => select.all(name).map((row) => JSON.parse(row.body))
      .filter((doc) => Object.entries(criteria).every(([key, value]) =>
        value?.[symbol] === 'filter' ? value.matches(doc[key]) : value === doc[key]))
      .slice(offset, offset + limit)
    return {
      where: (value) => query(name, value, offset, limit),
      skip: (value) => query(name, criteria, value, limit),
      limit: (value) => query(name, criteria, offset, value),
      get: () => ({ data: collect() }),
      update: ({ data }) => ({ stats: {
        updated: collect().reduce((hits, doc) => hits + patchDocument(name, doc._id, data), 0),
      } }),
      remove: () => ({ stats: {
        removed: collect().reduce((hits, doc) => hits + remove.run(name, doc._id).changes, 0),
      } }),
    }
  }

  function collection(name) {
    const ref = query(name)
    ref.add = ({ data }) => {
      const id = randomUUID()
      insert.run(name, id, JSON.stringify({ ...data, _id: id }))
      return { _id: id }
    }
    ref.doc = (id) => ({
      get: () => ({ data: fetchDocument(name, id) }),
      set: ({ data }) => {
        if (typeof id !== 'string' || !id) throw new TypeError('Missing document ID')
        insert.run(name, id, JSON.stringify({ ...data, _id: id }))
        return { _id: id }
      },
      update: ({ data }) => ({ stats: { updated: patchDocument(name, id, data) } }),
      remove: () => ({ stats: {
        removed: typeof id === 'string' ? remove.run(name, id).changes : 0,
      } }),
    })
    return ref
  }

  async function runTransaction(callback) {
    const savepoint = 'operation_' + ++sequence
    db.exec('SAVEPOINT ' + savepoint)
    try {
      const result = await callback(store)
      db.exec('RELEASE ' + savepoint)
      return result
    } catch (error) {
      db.exec('ROLLBACK TO ' + savepoint)
      db.exec('RELEASE ' + savepoint)
      throw error
    }
  }

  function runRequest(handler) {
    const next = pending.then(async () => {
      db.exec('BEGIN IMMEDIATE')
      try {
        const result = await handler()
        db.exec(result?.ok === false ? 'ROLLBACK' : 'COMMIT')
        return result
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    })
    pending = next.catch(() => {})
    return next
  }

  const store = { collection, command, runTransaction, runRequest, close: () => db.close() }
  return store
}

module.exports = { openStore }
