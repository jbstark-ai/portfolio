import { buildApp } from './app.js'
import { createSqliteRepo } from './sqliteRepo.js'

const port = Number(process.env.PORT ?? 3002)
buildApp(createSqliteRepo(process.env.DB_FILE)).listen({ port, host: '0.0.0.0' }).then(() => console.log(`API on :${port}`))
