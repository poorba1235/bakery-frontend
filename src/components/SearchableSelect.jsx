import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const SearchableSelect = ({ options, value, onChange, placeholder = "Search..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    const selectedOption = options.find(o => String(o.value) === String(value));

    const filteredOptions = options.filter(o => 
        (o.search || o.label).toLowerCase().includes(search.toLowerCase()) ||
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-white dark:bg-[#1e293b] border ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300 dark:border-[#334155]'} rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white cursor-pointer flex justify-between items-center transition-all shadow-sm`}
            >
                <span className={selectedOption ? 'text-slate-800 dark:text-white font-medium' : 'text-slate-400'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center">
                        <Search className="w-3.5 h-3.5 text-slate-400 ml-2" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Type to filter..."
                            className="w-full bg-transparent border-none py-2 px-3 text-xs outline-none text-slate-800 dark:text-white"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                <X className="w-3 h-3 text-slate-400" />
                            </button>
                        )}
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-600/10 transition-colors flex items-center justify-between ${String(value) === String(opt.value) ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    <span>{opt.label}</span>
                                    {String(value) === String(opt.value) && <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-xs text-slate-400 italic">No matches found for "{search}"</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
