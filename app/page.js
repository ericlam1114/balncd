// Update your app/page.js with this code:

"use client";

import { useToast } from "../hooks/use-toast.js";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const { toast } = useToast();
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  useEffect(() => {
    // Only show welcome toast once
    if (!hasShownWelcome) {
      toast({
        title: "Welcome to Balncd",
        description: "Your financial dashboard is ready",
        variant: "info",
      });
      setHasShownWelcome(true);
    }
  }, [hasShownWelcome, toast]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="z-10 w-full max-w-2xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">Balncd - Financial Zen</h1>
        <p className="text-xl text-gray-700 mb-8">A calm, minimal personal finance dashboard</p>
        
        {/* Navigation Links */}
        <div className="flex justify-center gap-4 mb-8">
          <Link href="/login" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors duration-300">
            Login
          </Link>
          <Link href="/register" className="px-6 py-3 bg-white hover:bg-gray-100 text-blue-600 font-medium rounded-lg shadow-md border border-blue-200 transition-colors duration-300">
            Create Account
          </Link>
        </div>
        
        {/* Toast Demo Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => {
              toast({
                title: "Success",
                description: "Your action was completed successfully",
                variant: "success",
              });
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md transition-colors duration-300"
          >
            Success Toast
          </button>
          
          <button
            onClick={() => {
              toast({
                title: "Warning",
                description: "Please check your inputs before continuing",
                variant: "warning",
              });
            }}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg shadow-md transition-colors duration-300"
          >
            Warning Toast
          </button>
          
          <button
            onClick={() => {
              toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
              });
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-md transition-colors duration-300"
          >
            Error Toast
          </button>
          
          <button
            onClick={() => {
              toast({
                title: "Information",
                description: "Your account has been synced with the cloud",
                variant: "info",
              });
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors duration-300"
          >
            Info Toast
          </button>
        </div>
      </div>
    </main>
  );
}