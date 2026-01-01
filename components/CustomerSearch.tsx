import { useState, useEffect, useRef } from 'react';
import { searchCustomers } from '@/lib/api/customers';
import { Customer } from '@/lib/supabase';

type CustomerSearchProps = {
  onSelect: (customer: Customer) => void;
};

export default function CustomerSearch({ onSelect }: CustomerSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const customers = await searchCustomers(query);
      setResults(customers);
      setHighlightedIndex(-1); // Reset highlighted index when new results arrive
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
    setHighlightedIndex(-1); // Reset highlighted index when typing
    
    // Clear results when search box is emptied
    if (!newQuery.trim()) {
      setResults([]);
    }
  };

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setQuery(''); // Clear the search field
    setResults([]);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const newIndex = prev < results.length - 1 ? prev + 1 : 0
          return newIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : results.length - 1
          return newIndex
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setResults([])
        setHighlightedIndex(-1)
        break
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
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
          {results.map((customer, index) => (
            <div 
              key={customer.id}
              className={`p-2 cursor-pointer ${
                index === highlightedIndex 
                  ? 'bg-blue-100 border border-blue-200' 
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => handleSelect(customer)}
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
