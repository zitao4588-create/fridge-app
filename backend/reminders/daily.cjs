const { openStore } = require('../sqlite-store.cjs')
const { sendReminders } = require('./sender.cjs')

async function main() {
  if (!process.env.FRIDGE_DB) throw new Error('FRIDGE_DB is required')
  const store = openStore(process.env.FRIDGE_DB)
  try {
    const result = await sendReminders({ store, env: process.env, event: { miniprogramState: 'formal' } })
    if (result.ok === false || result.failed || result.sentUnrecorded || result.recordWriteFailures) {
      process.exitCode = 1
    }
  } finally {
    store.close()
  }
}

main().catch(() => {
  console.error('expiry_reminder_job_failed')
  process.exitCode = 1
})
