// Kept for backward compat — use TransactionItem instead
import { Transaction } from '../types';
interface Props { transactions: Transaction[] }
export default function TransactionTable({ transactions }: Props) {
  return (
    <div className="divide-y divide-gray-100">
      {transactions.map(tx => (
        <div key={tx.id} className="flex justify-between p-3 text-sm">
          <span>{tx.concept}</span>
          <span>${tx.amount}</span>
        </div>
      ))}
    </div>
  );
}
