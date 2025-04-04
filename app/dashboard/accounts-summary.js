'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export function AccountsSummary({ accounts, totalBalance }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get account type icon
  const getAccountIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'checking':
        return '🏦';
      case 'savings':
        return '💰';
      case 'credit':
        return '💳';
      case 'investment':
        return '📈';
      case 'loan':
        return '🏠';
      default:
        return '💵';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md">
            <span className="font-medium">Total Balance</span>
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-lg font-bold"
            >
              {formatCurrency(totalBalance)}
            </motion.span>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {accounts.map((account) => (
              <motion.div 
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-center p-3 rounded-md border bg-white"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                    <span role="img" aria-label={account.type}>
                      {getAccountIcon(account.type)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{account.name}</p>
                    <p className="text-xs text-gray-500">
                      {account.type} {account.mask ? `••${account.mask}` : ''}
                    </p>
                  </div>
                </div>
                <span className="font-medium text-sm">
                  {formatCurrency(account.balance.current)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}