import { buildApp } from './app.js'
import { createSqliteRepo } from './sqliteRepo.js'

const app = buildApp(createSqliteRepo(process.env.DB_FILE))
const port = Number(process.env.PORT ?? 3001)
app.listen({ port, host: '0.0.0.0' }).then(() => console.log(`API on :${port}`))
