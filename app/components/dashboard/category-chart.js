'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../providers/auth-provider';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { format, subMonths } from 'date-fns';

export function CategoryChart() {
  const { user } = useAuth();
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category colors
  const CATEGORY_COLORS = {
    'Food and Drink': '#3b82f6',
    'Shopping': '#10b981',
    'Travel': '#f59e0b',
    'Transportation': '#8b5cf6',
    'Housing': '#ec4899',
    'Entertainment': '#f43f5e',
    'Health': '#14b8a6',
    'Personal Care': '#d946ef',
    'Education': '#6366f1',
    'Bills and Utilities': '#64748b',
    'Income': '#22c55e',
    'Transfer': '#94a3b8',
    'Subscription': '#0ea5e9',
    'Other': '#9ca3af',
    'Uncategorized': '#e5e5e5',
  };

  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const startDate = format(subMonths(today, 1), 'yyyy-MM-dd');
        const endDate = format(today, 'yyyy-MM-dd');

        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          where('amount', '>', 0) // Only expenses (Plaid uses negative for income)
        );
        
        const querySnapshot = await getDocs(transactionsQuery);
        
        // Group by category
        const categories = {};
        
        querySnapshot.forEach((doc) => {
          const transaction = doc.data();
          const category = transaction.category || 'Uncategorized';
          
          if (!categories[category]) {
            categories[category] = { totalAmount: 0, count: 0 };
          }
          
          categories[category].totalAmount += transaction.amount;
          categories[category].count += 1;
        });
        
        // Convert to array for chart
        // Convert to array for chart
        const categoryArray = Object.entries(categories).map(([category, data]) => ({
            name: category,
            value: parseFloat(data.totalAmount.toFixed(2)),
            count: data.count,
            color: CATEGORY_COLORS[category] || '#e5e5e5',
          }));
          
          // Sort by amount (descending)
          categoryArray.sort((a, b) => b.value - a.value);
          
          // Limit to top 6 categories for readability, group the rest as "Other"
          if (categoryArray.length > 6) {
            const topCategories = categoryArray.slice(0, 5);
            const otherCategories = categoryArray.slice(5);
            
            const otherTotal = otherCategories.reduce(
              (sum, category) => sum + category.value, 
              0
            );
            
            const otherCount = otherCategories.reduce(
              (sum, category) => sum + category.count,
              0
            );
            
            topCategories.push({
              name: 'Other',
              value: parseFloat(otherTotal.toFixed(2)),
              count: otherCount,
              color: CATEGORY_COLORS['Other'],
            });
            
            setCategoryData(topCategories);
          } else {
            setCategoryData(categoryArray);
          }
          
        } catch (error) {
          console.error('Error fetching category data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
    }, [user]);
  
    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-white p-3 rounded-md border shadow-sm">
            <p className="font-medium">{data.name}</p>
            <p className="text-sm">
              Amount: ${data.value.toLocaleString()}
            </p>
            <p className="text-sm">
              Transactions: {data.count}
            </p>
            <p className="text-sm">
              Avg: ${(data.value / data.count).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </p>
          </div>
        );
      }
      return null;
    };
  
    // Custom legend
    const renderLegend = (props) => {
      const { payload } = props;
      
      return (
        <ul className="flex flex-wrap justify-center gap-2 text-xs mt-2">
          {payload.map((entry, index) => (
            <li key={`legend-${index}`} className="flex items-center space-x-1">
              <span 
                className="inline-block w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700">{entry.value}</span>
            </li>
          ))}
        </ul>
      );
    };
  
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-80 w-full px-2">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            ) : categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">No spending data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    outerRadius={80}
                    innerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }