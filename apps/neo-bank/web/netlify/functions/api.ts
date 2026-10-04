import type { Config } from '@netlify/functions'
import { buildApp } from '../../server/app.js'
import { createMemoryRepo } from '../../server/memoryRepo.js'
import { createOpenBankingRepo } from '../../server/openBankingRepo.js'
import { isPlaidConfigured, createPlaidClient, createNullPlaidClient } from '../../server/plaid.js'

export default buildApp(
  createMemoryRepo(),
  createOpenBankingRepo(),
  isPlaidConfigured() ? createPlaidClient() : createNullPlaidClient()
)

export const config: Config = { path: '/api/*' }
