'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const Popover = ({ children }) => {
  return <div className="relative">{children}</div>;
};

const PopoverTrigger = React.forwardRef(({ asChild, children, ...props }, ref) => {
  return React.cloneElement(
    asChild ? children : <button {...props} />,
    {
      ref,
      ...props,
    }
  );
});
PopoverTrigger.displayName = 'PopoverTrigger';

const PopoverContent = React.forwardRef(
  ({ className, align = "center", children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const triggerRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
          if (triggerRef.current && !triggerRef.current.contains(event.target)) {
            setIsOpen(false);
          }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }, []);
  
      return (
        <div
          ref={ref}
          className={cn(
            "z-50 rounded-md border bg-white p-4 shadow-md outline-none animate-in",
            "data-[side=bottom]:slide-in-from-top-2",
            "data-[side=top]:slide-in-from-bottom-2",
            "absolute mt-1",
            {
              "left-0": align === "start",
              "left-1/2 -translate-x-1/2": align === "center",
              "right-0": align === "end",
            },
            className
          )}
          {...props}
        >
          {children}
        </div>
      );
    }
  );
  PopoverContent.displayName = 'PopoverContent';
  
  export { Popover, PopoverTrigger, PopoverContent };