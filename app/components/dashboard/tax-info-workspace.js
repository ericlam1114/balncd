// app/components/dashboard/tax-info-workspace.js
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TaxInfoWorkspace({ data }) {
  if (!data) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-500">No tax information available</p>
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{data.title || 'Tax Information'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-blue-700 font-medium">
            {/* Render visualizations based on data */}
            {/* This could include calendars for deadlines, infographics, etc. */}
            {data.content}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}