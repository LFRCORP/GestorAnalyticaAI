
import React from 'react';

const Spinner: React.FC<{ size?: string }> = ({ size = '8' }) => {
  const sizeMap: Record<string, string> = {
    '4': 'h-4 w-4',
    '5': 'h-5 w-5',
    '8': 'h-8 w-8',
    '12': 'h-12 w-12',
  };

  const sizeClass = sizeMap[size] || 'h-8 w-8';

  return (
    <div className={`animate-spin rounded-full ${sizeClass} border-b-2 border-cyan-400`}></div>
  );
};

export default Spinner;
