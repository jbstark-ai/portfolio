import type { Config } from '@netlify/functions'
import { buildApp } from '../../server/app.js'
import { createMemoryRepo } from '../../server/memoryRepo.js'

export default buildApp(createMemoryRepo())

export const config: Config = { path: '/api/*' }
