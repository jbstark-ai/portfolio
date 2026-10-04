export interface Account { id: number; name: string; balanceCents: number; hue: number }
export interface Transaction { id: number; accountId: number; payee: string; memo: string; amountCents: number; at: string }

export interface BankRepo {
  accounts(): Account[]
  account(id: number): Account | undefined
  transactions(accountId: number): Transaction[]
  /** Debits the account and records the transaction. */
  debit(accountId: number, payee: string, memo: string, amountCents: number): Transaction
  /** Credits the account and records the transaction (for incoming transfers). */
  credit(accountId: number, payee: string, memo: string, amountCents: number): Transaction
}

export interface PlaidItem {
  id: string
  accessToken: string
  institutionName: string
  linkedDate: string
  accounts: Array<{ id: string; name: string; type: string }>
}

export interface LinkedTransaction {
  id: string
  accountId: string
  payee: string
  memo: string
  amountCents: number
  category: string
  at: string
}

export interface LinkedInstitution {
  id: string
  name: string
  linkedDate: string
  accounts: Array<{ id: string; name: string; type: string }>
}

export interface PlaidClient {
  createLinkToken(userId: string): Promise<{ link_token: string }>
  exchangeToken(publicToken: string): Promise<{ access_token: string; item_id: string; accounts: Array<{ id: string; name: string; type: string }> }>
  getAccounts(accessToken: string): Promise<Array<{ id: string; name: string; type: string; balances: { current: number } }>>
  getTransactions(accessToken: string): Promise<Array<{ id: string; account_id: string; name: string; amount: number; category: string[] }>>
  removeItem(accessToken: string): Promise<void>
}

export interface OpenBankingRepo {
  items(): PlaidItem[]
  item(itemId: string): PlaidItem | undefined
  addItem(item: PlaidItem): void
  removeItem(itemId: string): void
  linkedAccounts(): Array<PlaidItem & { balances: Record<string, number> }>
  allTransactions(): LinkedTransaction[]
  overrideBalance(itemId: string, accountId: string, balanceCents: number): void
  getBalance(itemId: string, accountId: string): number | undefined
}
