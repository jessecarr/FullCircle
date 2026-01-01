import { useState } from 'react';
import { searchCustomers } from '@/lib/api/customers';
import { Customer } from '@/lib/supabase';

type CustomerSearchProps = {
  onSelect: (customer: Customer) => void;
};

export default function CustomerSearch({ onSelect }: CustomerSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const customers = await searchCustomers(query);
      setResults(customers);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Clear results when search box is emptied
    if (!newQuery.trim()) {
      setResults([]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search by email, phone, or name"
          className="flex-1 p-2 border rounded"
        />
        <button 
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {results.length > 0 && (
        <div className="border rounded p-2 max-h-60 overflow-y-auto">
          {results.map((customer) => (
            <div 
              key={customer.id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => onSelect(customer)}
            >
              <div className="font-medium">{customer.name}</div>
              <div className="text-sm text-gray-600">{customer.email}</div>
              <div className="text-sm text-gray-600">{customer.phone}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
