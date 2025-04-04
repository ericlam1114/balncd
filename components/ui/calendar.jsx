'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';

const Calendar = React.forwardRef((
  { 
    className,
    mode = "single",
    selected,
    onSelect,
    initialFocus = true,
    ...props
  }, 
  ref
) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  
  // Navigate to previous month
  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Generate days for the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Handle day selection
  const handleDayClick = (day) => {
    onSelect?.(day);
  };
  
  return (
    <div
      ref={ref}
      className={cn(
        "p-3",
        className
      )}
      {...props}
    >
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={previousMonth}
          className="p-2 rounded-md hover:bg-gray-100"
          aria-label="Previous month"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        <button
          onClick={nextMonth}
          className="p-2 rounded-md hover:bg-gray-100"
          aria-label="Next month"
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = selected && isSameDay(day, selected);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          
          return (
            <button
              key={day.toString()}
              type="button"
              className={cn(
                "h-9 w-9 rounded-md flex items-center justify-center text-sm",
                !isCurrentMonth && "text-gray-300",
                isSelected && "bg-blue-600 text-white",
                !isSelected && isTodayDate && "border border-blue-600",
                !isSelected && isCurrentMonth && !isTodayDate && "hover:bg-gray-100"
              )}
              onClick={() => handleDayClick(day)}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
});

Calendar.displayName = "Calendar";

export { Calendar };