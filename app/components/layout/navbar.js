'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.displayName) return 'U';
    
    const nameParts = user.displayName.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <header className="bg-white border-b fixed top-0 left-0 right-0 z-30 h-16">
      <div className="container mx-auto h-full px-4 md:px-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center">
          <span className="text-2xl font-bold">
            <span className="text-blue-600">Ba</span>
            <span className="text-gray-400">ln</span>
            <span className="text-blue-600">cd</span>
          </span>
        </Link>
        
        <div className="md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
        
        <nav className="hidden md:flex items-center space-x-1">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/transactions">Transactions</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/settings">Settings</Link>
          </Button>
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full w-10 h-10 p-0">
                  <Avatar>
                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <div className="flex flex-col">
                    <span>{user.displayName}</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/connect-accounts">Connect Account</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={logout}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-white border-b z-20">
          <div className="flex flex-col p-4 space-y-2">
            <Button variant="ghost" asChild className="justify-start">
              <Link href="/dashboard" onClick={toggleMobileMenu}>Dashboard</Link>
            </Button>
            <Button variant="ghost" asChild className="justify-start">
              <Link href="/transactions" onClick={toggleMobileMenu}>Transactions</Link>
            </Button>
            <Button variant="ghost" asChild className="justify-start">
              <Link href="/connect-accounts" onClick={toggleMobileMenu}>Connect Account</Link>
            </Button>
            <Button variant="ghost" asChild className="justify-start">
              <Link href="/settings" onClick={toggleMobileMenu}>Settings</Link>
            </Button>
            <Button variant="ghost" asChild className="justify-start">
              <Link href="/profile" onClick={toggleMobileMenu}>Profile</Link>
            </Button>
            <Button 
              variant="ghost" 
              className="justify-start text-red-600"
              onClick={() => {
                logout();
                toggleMobileMenu();
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}