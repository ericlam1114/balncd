'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export function CashFlowChart() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const monthlyFlows = [];

        // Get data for the last 6 months
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(today, i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const startDateStr = format(monthStart, 'yyyy-MM-dd');
          const endDateStr = format(monthEnd, 'yyyy-MM-dd');
          const monthLabel = format(monthDate, 'MMM');

          // Query transactions for this month
          const transactionsQuery = query(
            collection(db, 'transactions'),
            where('userId', '==', user.uid),
            where('date', '>=', startDateStr),
            where('date', '<=', endDateStr)
          );
          
          const querySnapshot = await getDocs(transactionsQuery);
          
          let income = 0;
          let expenses = 0;
          
          querySnapshot.forEach((doc) => {
            const transaction = doc.data();
            if (transaction.amount < 0) {
              // Negative amounts are credits/income in Plaid
              income += Math.abs(transaction.amount);
            } else {
              expenses += transaction.amount;
            }
          });

          monthlyFlows.push({
            month: monthLabel,
            income: parseFloat(income.toFixed(2)),
            expenses: parseFloat(expenses.toFixed(2))
          });
        }

        setMonthlyData(monthlyFlows);
      } catch (error) {
        console.error('Error fetching cash flow data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-md border shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-green-600">
            Income: ${payload[0].value.toLocaleString()}
          </p>
          <p className="text-sm text-rose-600">
            Expenses: ${payload[1].value.toLocaleString()}
          </p>
          <p className="text-sm font-medium">
            Net: ${(payload[0].value - payload[1].value).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Monthly Cash Flow</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 w-full px-2">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ bottom: 0 }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}