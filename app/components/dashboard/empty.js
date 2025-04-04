'use client';

import { motion } from 'framer-motion';

export function Empty({ title, description, action, icon }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-10 mt-10 rounded-lg border border-dashed bg-white text-center"
    >
      {icon && (
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
          {icon}
        </div>
      )}
      <h2 className="text-2xl font-medium mb-2">{title}</h2>
      <p className="text-gray-500 mb-6 text-center max-w-md">
        {description}
      </p>
      {action && (
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}