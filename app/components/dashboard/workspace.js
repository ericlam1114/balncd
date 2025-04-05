"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../src/components/ui/card";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../src/components/ui/tabs";
import { format, subDays } from "date-fns";
import { TaxWorkspace } from "./tax-workspace";
import { TaxInfoWorkspace } from "./tax-info-workspace";
// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function Workspace({ content }) {
  const [activeContent, setActiveContent] = useState(null);

  useEffect(() => {
    if (content) {
      setActiveContent(content);
    }
  }, [content]);

  if (!activeContent) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-gray-50/50">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-xl font-medium mb-3">Your Financial Workspace</h3>
          <p className="text-gray-500 mb-6">
            Ask questions in the chat to analyze your finances. Financial data
            and visualizations will appear here.
          </p>
          <div className="text-sm text-left bg-blue-50/70 p-5 rounded-lg border border-blue-100">
            <p className="font-medium text-blue-700 mb-3">
              Try asking questions like:
            </p>
            <ul className="space-y-2 text-blue-700 list-disc pl-5">
              <li>How much did I spend on dining last month?</li>
              <li>What are my biggest expense categories?</li>
              <li>Help me prepare for quarterly taxes</li>
              <li>Show me my income trends</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Render different workspace content based on type
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">{renderWorkspaceContent(activeContent)}</div>
    </div>
  );
}

function renderWorkspaceContent(content) {
  // Create a container with consistent styling for all content types
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-medium mb-5 text-gray-800">
        {content.title || "Analysis"}
      </h2>
      
      <div className="space-y-6">
        {(() => {
          switch (content.type) {
            case "chart":
              return <DiningExpensesChart data={content.data} />;
            case "taxes":
              return <TaxWorkspace taxData={content.data} />;
            case "taxInfo":
              return <TaxInfoWorkspace data={content.data} />;
            case "expenseBreakdown":
              return <ExpenseBreakdown data={content.data} />;
            case "incomeTrend":
              return <IncomeTrend data={content.data} />;
            case "budget":
              return <BudgetOptimization data={content.data} />;
            case "taxPreparation":
              return <TaxPreparation data={content.data} />;
            default:
              return (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <p>No visualization available for this query.</p>
                </div>
              );
          }
        })()}
      </div>
    </div>
  );
}

function DiningExpensesChart({ data }) {
  // Generate sample daily data
  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const day = format(subDays(new Date(), 30 - i), "MMM d");
    return {
      day,
      amount: Math.random() * 25 + 5, // Random amount between $5 and $30
    };
  });

  // Make sure the total matches the passed amount
  const totalGenerated = dailyData.reduce((sum, item) => sum + item.amount, 0);
  const scale = data.amount / totalGenerated;
  dailyData.forEach((item) => {
    item.amount = parseFloat((item.amount * scale).toFixed(2));
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.category} Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Monthly Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Spent:</span>
                <span className="font-medium">${data.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Percent of Monthly Expenses:</span>
                <span className="font-medium">{data.percentOfTotal}%</span>
              </div>
              <div className="flex justify-between">
                <span>Average per Day:</span>
                <span className="font-medium">
                  ${(data.amount / 30).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Daily Breakdown</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis
                    dataKey="day"
                    tickFormatter={(value) => value.split(" ")[1]}
                  />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Bar dataKey="amount" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpenseBreakdown({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Categories Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  dataKey="percentage"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {data.categories.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Category Breakdown</h3>
            <div className="space-y-3">
              {data.categories.map((category, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span>{category.name}</span>
                      <span className="font-medium">
                        {category.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 mt-1 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${category.percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IncomeTrend({ data }) {
  if (data.noData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Income Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="text-4xl font-bold text-gray-300 mb-4">$0</div>
            <p className="text-gray-500 mb-6">
              No income transactions found for the selected period.
            </p>
            <p className="text-sm text-gray-400">
              Connect your accounts with income transactions to see your income analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate sample monthly data for a year
  const monthlySummary = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const month = new Date(now);
    month.setMonth(month.getMonth() - i);
    
    // For the last 3 months use the actual average, for others use a variation
    let amount = data.averageMonthly;
    if (i > 2) {
      // Add some random variation for older months
      const variation = Math.random() * 0.2 - 0.1; // -10% to +10%
      amount = amount * (1 + variation);
    }
    
    monthlySummary.push({
      month: format(month, 'MMM'),
      amount: Math.round(amount),
    });
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{data.title || "Income Trends"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center">
            <div className="text-xs text-gray-500 uppercase">
              Average Monthly Income
            </div>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(data.averageMonthly)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Based on {data.period || "recent history"}
            </div>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySummary} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(value) =>
                    new Intl.NumberFormat('en-US', {
                      notation: 'compact',
                      compactDisplay: 'short',
                      currency: 'USD',
                      style: 'currency',
                    }).format(value)
                  }
                />
                <Tooltip
                  formatter={(value) =>
                    new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(value)
                  }
                />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Income Breakdown</h4>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.sources}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="percentage"
                    nameKey="name"
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                  >
                    {data.sources.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value}%`,
                      props.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetOptimization({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Optimization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <div>
              <span className="text-sm text-gray-500">
                Current Monthly Savings
              </span>
              <div className="text-lg font-medium">${data.currentSavings}</div>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">
                Potential Monthly Savings
              </span>
              <div className="text-lg font-medium text-green-600">
                ${data.potentialSavings}
              </div>
            </div>
          </div>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                  Current
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                  Potential +${data.potentialSavings - data.currentSavings}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div
                style={{
                  width: `${
                    (data.currentSavings / data.potentialSavings) * 100
                  }%`,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
              ></div>
              <div
                style={{
                  width: `${
                    ((data.potentialSavings - data.currentSavings) /
                      data.potentialSavings) *
                    100
                  }%`,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
              ></div>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-medium mb-3">Suggested Adjustments</h3>
        <div className="space-y-4">
          {data.adjustments.map((item, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <div className="font-medium">{item.category}</div>
                <div className="text-green-600 font-medium">
                  Save ${item.current - item.suggested}
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <div>Current: ${item.current}</div>
                <div>Suggested: ${item.suggested}</div>
              </div>
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div
                    style={{
                      width: `${(item.suggested / item.current) * 100}%`,
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                  ></div>
                  <div
                    style={{
                      width: `${
                        ((item.current - item.suggested) / item.current) * 100
                      }%`,
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-300"
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-700">Action Plan</h4>
          <p className="text-sm text-green-600 mt-1">
            Following these recommendations could increase your monthly savings
            by ${data.potentialSavings - data.currentSavings}, which is a{" "}
            {((data.potentialSavings / data.currentSavings - 1) * 100).toFixed(
              0
            )}
            % improvement!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TaxPreparation({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quarterly Tax Preparation</CardTitle>
      </CardHeader>
      <CardContent>
        {data.step === "gathering-info" && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Information Needed</h3>
              <div className="space-y-2">
                <div className="flex items-center p-2 border rounded-md">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>
                  </div>
                  <div>Location (State/Country)</div>
                </div>
                <div className="flex items-center p-2 border rounded-md">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>
                  </div>
                  <div>Employment Type (W-2, 1099, Business Owner)</div>
                </div>
                <div className="flex items-center p-2 border rounded-md">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>
                  </div>
                  <div>Income Sources</div>
                </div>
                <div className="flex items-center p-2 border rounded-md">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>
                  </div>
                  <div>Deductible Expenses</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-700 mb-2">
                Tax Preparation Process
              </h4>
              <ol className="text-sm text-blue-600 space-y-2 ml-5 list-decimal">
                <li>Gather all income and expense information</li>
                <li>Categorize expenses according to tax deduction rules</li>
                <li>Calculate quarterly estimated tax payment</li>
                <li>Generate tax forms and payment instructions</li>
                <li>Set up reminders for future tax deadlines</li>
              </ol>
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-lg">
              <h4 className="font-medium text-amber-700">Important Dates</h4>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <div className="font-medium text-amber-800">Q1 Deadline</div>
                  <div className="text-amber-600">April 15th</div>
                </div>
                <div>
                  <div className="font-medium text-amber-800">Q2 Deadline</div>
                  <div className="text-amber-600">June 15th</div>
                </div>
                <div>
                  <div className="font-medium text-amber-800">Q3 Deadline</div>
                  <div className="text-amber-600">September 15th</div>
                </div>
                <div>
                  <div className="font-medium text-amber-800">Q4 Deadline</div>
                  <div className="text-amber-600">January 15th</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
