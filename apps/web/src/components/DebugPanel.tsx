'use client';

import type { SearchFilters } from '@indietix/search';

interface DebugPanelProps {
  debug: {
    appliedFilters: SearchFilters;
    queryTime: number;
    embeddingsUsed: boolean;
  };
}

export function DebugPanel({ debug }: DebugPanelProps) {
  return (
    <div className="mt-8 p-4 bg-gray-800 text-gray-100 rounded-lg font-mono text-sm">
      <h3 className="text-lg font-bold mb-4 text-yellow-400">Debug Info</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-green-400 mb-1">Applied Filters:</h4>
          <pre className="bg-gray-900 p-2 rounded overflow-x-auto">
            {JSON.stringify(debug.appliedFilters, null, 2)}
          </pre>
        </div>
        
        <div className="flex gap-8">
          <div>
            <span className="text-green-400">Query Time:</span>{' '}
            <span className="text-white">{debug.queryTime}ms</span>
          </div>
          
          <div>
            <span className="text-green-400">Embeddings:</span>{' '}
            <span className={debug.embeddingsUsed ? 'text-green-300' : 'text-red-300'}>
              {debug.embeddingsUsed ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
