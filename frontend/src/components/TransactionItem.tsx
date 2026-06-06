import { Transaction } from '../types';

interface Props { tx: Transaction; onClick?: () => void; }

const typeIcon: Record<string, string> = {
  TRANSFER:   '💸', DEPOSIT:  '➕', WITHDRAWAL: '➖',
  MARKET_BUY: '📈', MARKET_SELL: '📉',
};
const statusColor: Record<string, string> = {
  SUCCESS: 'text-emerald-600', FAILED: 'text-red-500',
  PENDING: 'text-amber-500', PROCESSING: 'text-blue-500', CANCELLED: 'text-gray-400',
};

export default function TransactionItem({ tx, onClick }: Props) {
  const isPositive = tx.direction === 'RECEIVED' || tx.type === 'DEPOSIT';
  const isFailed = tx.status === 'FAILED';
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-xl transition-colors text-left">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
        {typeIcon[tx.type] || '💳'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{tx.concept}</p>
        <p className="text-xs text-gray-500 truncate">
          {tx.direction === 'SENT' ? `→ ${tx.receiverAlias}` : `← ${tx.senderAlias}`}
          {' · '}{new Date(tx.createdAt).toLocaleDateString('es-AR')}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${isFailed ? 'line-through text-gray-400' : isPositive ? 'text-emerald-600' : 'text-gray-900'}`}>
          {isPositive ? '+' : '-'}${tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
        <p className={`text-xs ${statusColor[tx.status]}`}>{tx.status}</p>
      </div>
    </button>
  );
}
