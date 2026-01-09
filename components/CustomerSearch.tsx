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

  
  const handleQueryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Clear results when search box is emptied
    if (!newQuery.trim()) {
      setResults([]);
      setHighlightedIndex(-1);
      return;
    }
    
    // Perform real-time search
    setIsSearching(true);
    try {
      const customers = await searchCustomers(newQuery);
      setResults(customers);
      const firstIndex = customers.length > 0 ? 0 : -1;
      setHighlightedIndex(firstIndex); // Auto-highlight first result if any
      
      // Scroll first item into view when results appear
      if (firstIndex === 0) {
        setTimeout(() => {
          const firstElement = document.querySelector(`[data-customer-index="0"]`) as HTMLElement
          if (firstElement) {
            firstElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        }, 0);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setHighlightedIndex(-1);
    } finally {
      setIsSearching(false);
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
          // Scroll the highlighted item into view
          setTimeout(() => {
            const highlightedElement = document.querySelector(`[data-customer-index="${newIndex}"]`) as HTMLElement
            if (highlightedElement) {
              highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
          }, 0)
          return newIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : results.length - 1
          // Scroll the highlighted item into view
          setTimeout(() => {
            const highlightedElement = document.querySelector(`[data-customer-index="${newIndex}"]`) as HTMLElement
            if (highlightedElement) {
              highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
          }, 0)
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
      <div>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder="Search by email, phone, or name"
          className="w-full p-3 border-2 border-white rounded bg-[rgba(17, 24, 39, 0.8)] text-white placeholder-[#9ca3af]"
        />
      </div>
      
      {results.length > 0 && (
        <div className="border border-[rgba(59, 130, 246, 0.3)] rounded p-2 max-h-60 overflow-y-auto bg-[rgba(17, 24, 39, 0.95)] backdrop-blur-[10px]">
          {results.map((customer, index) => (
            <div 
              key={customer.id}
              data-customer-index={index}
              className={`border border-[rgba(59, 130, 246, 0.3)] rounded-lg p-3 cursor-pointer mb-2 transition-all duration-200 ${
                index === highlightedIndex 
                  ? 'ring-2 ring-[rgba(59, 130, 246, 0.6)] shadow-lg' 
                  : 'hover:ring-1 hover:ring-[rgba(59, 130, 246, 0.4)]'
              }`}
              style={{
                background: index === highlightedIndex 
                  ? 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.25) 0%, rgba(26, 26, 26, 0.8) 50%, rgba(10, 10, 10, 0.9) 100%)'
                  : 'radial-gradient(circle at 50% 50%, rgba(26, 26, 26, 0.8) 0%, rgba(10, 10, 10, 0.9) 70%, rgba(0, 0, 0, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                boxShadow: index === highlightedIndex 
                  ? '0 10px 20px rgba(59, 130, 246, 0.25), 0 8px 32px rgba(0, 0, 0, 0.8)'
                  : '0 8px 32px rgba(0, 0, 0, 0.8)'
              }}
              onClick={() => handleSelect(customer)}
            >
              <div className="font-medium text-white text-lg">{customer.name}</div>
              <div className="text-sm text-[#9ca3af]">{customer.email || 'No email'}</div>
              <div className="text-sm text-[#9ca3af]">{customer.phone}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
