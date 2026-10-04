export interface Account { id: number; name: string; balanceCents: number; hue: number }
export interface Transaction { id: number; accountId: number; payee: string; memo: string; amountCents: number; at: string }

export interface BankRepo {
  accounts(): Account[]
  account(id: number): Account | undefined
  transactions(accountId: number): Transaction[]
  /** Debits the account and records the transaction. */
  debit(accountId: number, payee: string, memo: string, amountCents: number): Transaction
}
