// app/components/dashboard/tax-workspace.js
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';

export function TaxWorkspace({ taxData }) {
  if (!taxData) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-500">No tax data available</p>
    </div>
  );

  const { 
    estimatedTax, 
    federalTax, 
    stateTax, 
    selfEmploymentTax = 0, 
    incomeAnalysis, 
    deductibleExpenses,
    taxRate,
    explanation,
    period,
    state,
    filingStatus
  } = taxData;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  // Prepare data for tax breakdown chart
  const taxBreakdownData = [
    { name: 'Federal Tax', value: federalTax || 0 },
    { name: 'State Tax', value: stateTax || 0 },
  ];
  
  if (selfEmploymentTax > 0) {
    taxBreakdownData.push({ name: 'Self-Employment Tax', value: selfEmploymentTax });
  }

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Estimated Quarterly Tax Payment - {period}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Total tax estimation */}
          <div className="flex justify-center">
            <div className="text-center">
              <p className="text-gray-500">Estimated Payment</p>
              <p className="text-3xl font-bold">{formatCurrency(estimatedTax)}</p>
              <p className="text-sm text-gray-500">
                Effective Tax Rate: {taxRate ? `${taxRate.toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                {state} • {filingStatus}
              </p>
            </div>
          </div>

          {/* Only show breakdown chart if there are taxes */}
          {estimatedTax > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Tax Breakdown</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taxBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {taxBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tax Components</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Federal Tax</span>
                    <span className="font-medium">{formatCurrency(federalTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State Tax</span>
                    <span className="font-medium">{formatCurrency(stateTax)}</span>
                  </div>
                  {selfEmploymentTax > 0 && (
                    <div className="flex justify-between">
                      <span>Self-Employment Tax</span>
                      <span className="font-medium">{formatCurrency(selfEmploymentTax)}</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-bold">{formatCurrency(estimatedTax)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 rounded-lg mt-4">
              <h4 className="font-medium text-blue-700">No Tax Liability</h4>
              <p className="text-sm text-blue-600 mt-1">
                {explanation || 'There is no estimated tax liability for this period.'}
              </p>
            </div>
          )}

          {/* Always show the explanation */}
          <div className="p-4 bg-blue-50 rounded-lg mt-4">
            <h4 className="font-medium text-blue-700">Calculation Method</h4>
            <p className="text-sm text-blue-600 mt-1">
              {explanation}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}