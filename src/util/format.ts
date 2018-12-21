import { Transaction } from "../models/Transaction";

export function formatMoney(amount: number): string {
    return "$" + amount.toFixed(2);
}

export function formatAndSortTransactions(transactions: Transaction[]): string[] {
    return transactions
        .sort((a, b) => a.price - b.price)
        .map(transaction => `${transaction.description}: ${formatMoney(transaction.price)}`);
}
