'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CreditCard, PieChart, Settings, PlusCircle } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Transactions',
      href: '/transactions',
      icon: CreditCard,
    },
    {
      name: 'Insights',
      href: '/insights',
      icon: PieChart,
    },
    {
      name: 'Connect Account',
      href: '/connect-accounts',
      icon: PlusCircle,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-white border-r hidden md:block">
      <nav className="p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className={`mr-2 h-4 w-4 ${
                    isActive ? 'text-blue-700' : 'text-gray-500'
                  }`} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}