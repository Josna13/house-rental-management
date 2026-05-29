import React, { useState, useEffect, useRef } from 'react';

const LocationAutocomplete = ({ initialLocation, onSelect }) => {
    const [query, setQuery] = useState(initialLocation || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setQuery(initialLocation || '');
    }, [initialLocation]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchLocations = async () => {
            if (!query || query.length < 3) {
                setSuggestions([]);
                return;
            }

            setLoading(true);
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`);
                const data = await response.json();
                
                // Prioritize displaying the full precise display_name
                setSuggestions(data);
                setIsOpen(true);
            } catch (err) {
                console.error("Error fetching locations:", err);
            } finally {
                setLoading(false);
            }
        };

        const timerId = setTimeout(() => {
            // Only fetch if the user is typing and not just selecting
            if (isOpen || document.activeElement === wrapperRef.current?.querySelector('input')) {
                fetchLocations();
            }
        }, 500);

        return () => clearTimeout(timerId);
    }, [query]);

    const handleSelect = (suggestion) => {
        setQuery(suggestion.display_name);
        setSuggestions([]);
        setIsOpen(false);
        onSelect({
            location: suggestion.display_name,
            latitude: parseFloat(suggestion.lat),
            longitude: parseFloat(suggestion.lon)
        });
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (suggestions.length > 0) setIsOpen(true);
                    }}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    placeholder="Search society, street, or area... (e.g., Chintamani Nagar Bibwewadi)"
                    required
                    autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    {loading ? <span className="text-sm">...</span> : null}
                </div>
            </div>

            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100">
                    {suggestions.map((s, index) => (
                        <li 
                            key={index} 
                            onClick={() => handleSelect(s)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors flex items-start gap-3"
                        >
                            
                            <div>
                                <p className="text-sm font-semibold text-gray-800 leading-tight mb-1">
                                    {s.name || s.display_name.split(',')[0]}
                                </p>
                                <p className="text-xs text-gray-500 leading-tight">
                                    {s.display_name}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationAutocomplete;
