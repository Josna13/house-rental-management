import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import { calculateAllPersonaScores } from '../utils/professionMatch';
import { parseImages } from '../utils/imageUtils';

const Home = () => {
    const { user } = useContext(AuthContext);
    const [recommended, setRecommended] = useState([]);
    const [isFallback, setIsFallback] = useState(false);
    const [recLoading, setRecLoading] = useState(true);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ location: '', type: '', maxRent: '', purpose: 'Rent', vacancyOnly: false, gender: '', availability: '' });
    const [viewMode, setViewMode] = useState('list');
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
    const [subscribeStatus, setSubscribeStatus] = useState(null); // null | 'loading' | 'success' | 'error'

    // Profession Recommendation State
    let initialLifestyle = null;
    try { initialLifestyle = JSON.parse(localStorage.getItem('hrms_lifestyle')); } catch(e){}
    const [lifestyle, setLifestyle] = useState(initialLifestyle);
    const [selectedPersona, setSelectedPersona] = useState(initialLifestyle?.profession || null);

    const fetchProperties = async () => {
        setLoading(true);
        try {
            // Fetch ALL properties once for instant client-side filtration
            const res = await api.get(`/properties`);
            setProperties(res.data);
        } catch (err) {
            console.error('Failed to fetch properties', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecommendations = async (currentFilters) => {
        if (!user) return;
        setRecLoading(true);
        try {
            // Build a clean interaction object — only include non-empty values
            const interactionsData = {};
            if (currentFilters?.location?.trim()) interactionsData.location = currentFilters.location.trim();
            if (currentFilters?.type) interactionsData.type = currentFilters.type;
            if (currentFilters?.maxRent) interactionsData.maxRent = currentFilters.maxRent;

            // Always include profession if user has selected one
            const currentLifestyle = (() => { try { return JSON.parse(localStorage.getItem('hrms_lifestyle')); } catch(e){ return null; } })();
            if (currentLifestyle?.profession) interactionsData.profession = currentLifestyle.profession;

            const payload = { interactions: [interactionsData] };

            const res = await api.post('/properties/recommendations', payload);
            console.log("Recommendations:", res.data);

            if (res.data && res.data.recommendations) {
                setRecommended(res.data.recommendations);
                setIsFallback(res.data.is_fallback || false);
                // Store recommended IDs + scores in localStorage for PropertyDetails
                try {
                    const recMap = {};
                    res.data.recommendations.forEach(r => {
                        recMap[r.id] = { student_score: r.student_score, family_score: r.family_score, professional_score: r.professional_score };
                    });
                    localStorage.setItem('hrms_rec_scores', JSON.stringify(recMap));
                } catch(e){}
            } else {
                setRecommended(res.data || []);
                setIsFallback(false);
            }
        } catch (err) {
            console.error('Failed to fetch recommendations', err);
        } finally {
            setRecLoading(false);
        }
    };

    // Effect 1: Load properties INSTANTLY (blocking), fire recommendations in background (non-blocking).
    useEffect(() => {
        // Properties load immediately and unblock the UI
        fetchProperties();

        // Recommendations fire in background — UI does not wait for this
        if (user) {
            // Use setTimeout 0 to push AI call after paint, so properties appear first
            setTimeout(() => fetchRecommendations(filters), 0);
        } else {
            setRecLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Deliberately removed Effect 2 (listening to filters.purpose) to prevent network requests
    // Frontend filtering handles tab switching instantly now.

    const handleFilterChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        const newFilters = { ...filters, [e.target.name]: value };
        
        // 4) Apply Conditional Logic: If user selects type -> filter by type + Rent
        if (e.target.name === 'type' && value) {
            newFilters.purpose = 'Rent';
        }
        
        setFilters(newFilters);
    };

    const handleSubscribe = async () => {
        if (!user) {
            setSubscribeStatus('error');
            setTimeout(() => setSubscribeStatus(null), 3000);
            return;
        }
        setSubscribeStatus('loading');
        try {
            await api.post('/subscriptions', {
                location: filters.location || null,
                property_type: filters.type || null,
                gender_preference: filters.gender || null,
                max_budget: filters.maxRent || null
            });
            setSubscribeStatus('success');
            setTimeout(() => setSubscribeStatus(null), 4000);
        } catch (e) {
            console.error('Subscription failed', e);
            setSubscribeStatus('error');
            setTimeout(() => setSubscribeStatus(null), 3000);
        }
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        // No need to fetch properties here, frontend filtering handles it instantly.
        if (!user) return; // Only fetch recommendations for logged-in users

        // Build a clean payload — only send fields Python understands
        const cleanInteraction = {};
        if (filters.location?.trim()) cleanInteraction.location = filters.location.trim();
        if (filters.type) cleanInteraction.type = filters.type;
        if (filters.maxRent) cleanInteraction.maxRent = filters.maxRent;
        if (lifestyle?.profession) cleanInteraction.profession = lifestyle.profession;

        fetch("http://localhost:5000/api/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user.id,
                interactions: [cleanInteraction]
            })
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data && data.recommendations) {
                setRecommended(data.recommendations);
                setIsFallback(data.is_fallback || false);
                try {
                    const recMap = {};
                    data.recommendations.forEach(r => {
                        recMap[r.id] = { student_score: r.student_score, family_score: r.family_score, professional_score: r.professional_score };
                    });
                    localStorage.setItem('hrms_rec_scores', JSON.stringify(recMap));
                } catch(e){}
            } else {
                setRecommended([]);
                setIsFallback(false);
            }
        })
        .catch(err => {
            console.error("Error fetching recommendations:", err);
        });

        // Background logging
        if (user) {
            api.post('/interactions', { actionType: 'search', metadata: cleanInteraction }).catch(e => console.error('Failed to log search', e));
        }
    };

    const normalize = val => val?.toLowerCase().replace(/\s/g, "");

    const filteredProperties = properties.filter(p => {
        // Status toggle
        if (showOnlyAvailable && p.status !== 'available') return false;

        // Apply ALL filters strictly
        const matchType = !filters.type || normalize(p.type) === normalize(filters.type);
        const matchPurpose = !filters.purpose || p.property_purpose === filters.purpose;
        const matchLocation = !filters.location || p.location?.toLowerCase().includes(filters.location.toLowerCase());
        const matchVacancy = !filters.vacancyOnly || p.vacancy_count > 0;
        const matchGender = !filters.gender || (
            p.vacancy_count > 0 && 
            p.vacancy_for?.toLowerCase() === filters.gender.toLowerCase()
        );
        const matchMaxRent = !filters.maxRent || p.rent <= Number(filters.maxRent);
        const matchAvailability = !filters.availability || p.availability_type === filters.availability;

        return matchType && matchPurpose && matchLocation && matchVacancy && matchGender && matchMaxRent && matchAvailability;
    });

    // The FastAPI recommendation service doesn't apply these hard filters, so we must filter recommendations here
    const filteredRecommended = (recommended || []).filter(p => {
        if (filters.vacancyOnly && p.vacancy_count <= 0) return false;
        if (filters.gender) {
            // Case-insensitive gender match + require vacancy > 0 + exclude null
            if (!p.vacancy_for) return false;
            if (p.vacancy_for.toLowerCase() !== filters.gender.toLowerCase()) return false;
            if (p.vacancy_count <= 0) return false;
        }
        if (filters.availability && p.availability_type !== filters.availability) return false;
        return true;
    });

    if (loading && properties.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <h2 className="text-2xl font-bold text-gray-700">Loading properties...</h2>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Hero & Search Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">Find Your Perfect <br /> <span className="text-yellow-300">{filters.purpose === 'Rent' ? 'Rental Home' : 'Dream Home'}</span></h1>
                    <p className="text-blue-100 text-lg mb-8">Discover top-rated apartments, villas, and houses with complete verified details.</p>
                </div>

                <div className="relative z-10 flex gap-2 mb-6 bg-white/20 p-1.5 rounded-2xl w-max backdrop-blur-md shadow-inner">
                    <button 
                        onClick={() => setFilters({...filters, purpose: 'Rent'})}
                        className={`px-8 py-2.5 rounded-xl font-bold transition-all ${filters.purpose === 'Rent' ? 'bg-white text-blue-700 shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}
                    >
                        For Rent
                    </button>
                    <button 
                        onClick={() => setFilters({...filters, purpose: 'Sale', type: ''})}
                        className={`px-8 py-2.5 rounded-xl font-bold transition-all ${filters.purpose === 'Sale' ? 'bg-white text-blue-700 shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}
                    >
                        For Sale
                    </button>
                </div>

                <form onSubmit={handleSearch} className="relative z-10 bg-white p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-center max-w-4xl">
                    <div className="w-full md:w-1/3 flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 placeholder-gray-400 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">

                        <input type="text" name="location" placeholder="City or Location" value={filters.location} onChange={handleFilterChange} className="bg-transparent w-full focus:outline-none text-gray-800" />
                    </div>
                    <div className="w-full md:w-1/4 flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">

                        <select name="type" value={filters.type} onChange={handleFilterChange} className="bg-transparent w-full focus:outline-none text-gray-800 appearance-none">
                            <option value="">Any Type</option>
                            <option value="1RK">1 RK</option>
                            <option value="1BHK">1 BHK</option>
                            <option value="2BHK">2 BHK</option>
                            <option value="3BHK">3 BHK</option>
                            <option value="Villa">Villa</option>
                            <option value="Studio">Studio</option>
                        </select>
                    </div>
                    <div className="w-full md:w-1/4 flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                        <input type="number" name="maxRent" placeholder={filters.purpose === 'Rent' ? "Max Rent" : "Max Price"} value={filters.maxRent} onChange={handleFilterChange} className="bg-transparent w-full focus:outline-none text-gray-800" />
                    </div>
                    <button type="submit" className="w-full md:w-auto bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-medium shadow-md transition-colors flex items-center justify-center">
                        Search
                    </button>
                </form>

                {/* Advanced Filters */}
                <div className="relative z-10 flex flex-wrap gap-4 mt-4 items-center">
                    <label className="flex items-center text-white gap-2 font-medium cursor-pointer">
                        <input type="checkbox" name="vacancyOnly" checked={filters.vacancyOnly} onChange={handleFilterChange} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                        Show Only Vacant
                    </label>
                    <select name="gender" value={filters.gender} onChange={handleFilterChange} className="bg-white/20 text-white placeholder-white border border-white/30 rounded-xl px-4 py-2 focus:outline-none">
                        <option value="" className="text-gray-800">Any Gender</option>
                        <option value="Boys" className="text-gray-800">Boys</option>
                        <option value="Girls" className="text-gray-800">Girls</option>
                    </select>
                    <select name="availability" value={filters.availability} onChange={handleFilterChange} className="bg-white/20 text-white placeholder-white border border-white/30 rounded-xl px-4 py-2 focus:outline-none">
                        <option value="" className="text-gray-800">Any Availability</option>
                        <option value="Available Now" className="text-gray-800">Available Now</option>
                        <option value="Available Soon" className="text-gray-800">Available Soon</option>
                    </select>
                    <button 
                        onClick={handleSubscribe} 
                        disabled={subscribeStatus === 'loading'}
                        className={`px-4 py-2 rounded-xl font-bold shadow-md transition-all ${
                            subscribeStatus === 'success' ? 'bg-green-500 text-white' :
                            subscribeStatus === 'error' ? 'bg-red-500 text-white' :
                            subscribeStatus === 'loading' ? 'bg-gray-300 text-gray-500 cursor-wait' :
                            'bg-white text-blue-700 hover:scale-105'
                        }`}
                    >
                        {subscribeStatus === 'success' ? 'Subscribed! We will notify you' :
                         subscribeStatus === 'error' ? (user ? 'Failed. Try again' : 'Login required') :
                         subscribeStatus === 'loading' ? 'Saving...' :
                         'Notify me when vacancy is available'}
                    </button>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-40 -mb-20 w-64 h-64 bg-purple-400 opacity-20 rounded-full blur-2xl"></div>
            </div>

            {/* Profession Recommendation Selector */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 mb-8 animate-fade-in-up">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold flex items-center mb-1">
                            Select your Profession
                        </h3>
                        <p className="text-gray-500 text-sm">Choose your profile to instantly prioritize properties with the highest Match % for you.</p>
                    </div>
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
                        {['Student', 'Working Professional', 'Family'].map(opt => (
                            <button
                                key={opt}
                                onClick={() => {
                                    const newLifestyle = { profession: opt };
                                    setLifestyle(newLifestyle);
                                    setSelectedPersona(opt);
                                    localStorage.setItem('hrms_lifestyle', JSON.stringify(newLifestyle));
                                }}
                                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center ${
                                    selectedPersona === opt 
                                        ? 'bg-white shadow-md text-purple-700' 
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                            >
                                <span>{opt}</span>
                            </button>
                        ))}
                        {selectedPersona && (
                            <button 
                                onClick={() => { setSelectedPersona(null); setLifestyle(null); localStorage.removeItem('hrms_lifestyle'); }}
                                className="ml-2 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                                title="Clear Selection"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Recommendations Section */}
            {user && (
                <div className="mb-12">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                            Recommended For You
                        </h2>
                        {isFallback && !recLoading && recommended.length > 0 && (
                            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center border border-orange-200 shadow-sm animate-fade-in-up">
                                No strong matches found, showing closest options
                            </div>
                        )}
                    </div>
                    
                    {recLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse bg-white rounded-2xl p-4 shadow-sm h-64 border border-purple-100">
                                    <div className="bg-purple-50 h-32 rounded-xl mb-4"></div>
                                    <div className="bg-purple-100 h-6 w-3/4 rounded mb-2"></div>
                                    <div className="bg-purple-100 h-4 w-1/2 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : (!filteredRecommended || filteredRecommended.length === 0) ? (
                        <div className="text-center py-10 bg-gradient-to-r from-purple-50 to-blue-50 rounded-3xl border border-purple-100 shadow-sm">
                            <p className="text-purple-800 font-medium">Keep exploring properties to get smarter recommendations!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredRecommended.map((property, index) => (
                                <div key={property.id} className={`bg-gradient-to-b from-purple-50 to-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border ${index === 0 && !isFallback ? 'border-purple-400 border-2' : 'border-purple-100'} group flex flex-col overflow-hidden relative`}>
                                    {index === 0 && !isFallback && (
                                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-xl z-20 shadow-sm flex items-center">
                                            Best Match
                                        </div>
                                    )}
                                    {isFallback && (
                                        <div className="absolute top-0 right-0 bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-bl-xl z-20 shadow-sm flex items-center">
                                            Closest Match
                                        </div>
                                    )}
                                    <div className="relative h-48 overflow-hidden">
                                        {(() => {
                                            // Get persona-specific score — only show when a persona is selected
                                            let matchScore = null;
                                            let personaLabel = '';
                                            if (selectedPersona) {
                                                if (selectedPersona === 'Student') {
                                                    matchScore = property.student_score;
                                                    personaLabel = 'Students';
                                                } else if (selectedPersona === 'Family') {
                                                    matchScore = property.family_score;
                                                    personaLabel = 'Families';
                                                } else if (selectedPersona === 'Working Professional') {
                                                    matchScore = property.professional_score;
                                                    personaLabel = 'Professionals';
                                                }
                                                // Fallback to client-side calculation if server scores missing
                                                if (matchScore === undefined || matchScore === null) {
                                                    const allScores = calculateAllPersonaScores(property);
                                                    if (selectedPersona === 'Student') matchScore = allScores.student_score;
                                                    else if (selectedPersona === 'Family') matchScore = allScores.family_score;
                                                    else matchScore = allScores.professional_score;
                                                }
                                                matchScore = Math.round(Number(matchScore) || 0);
                                            }
                                                
                                            return (
                                                <>
                                                    {parseImages(property.images).length > 0 ? (
                                                        <img src={`http://localhost:5000/${parseImages(property.images)[0]}`} alt={property.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">No Image</div>
                                                    )}
                                                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                                                        <span className="px-2 py-1 bg-white/90 backdrop-blur-md rounded border border-gray-100 text-xs font-bold text-gray-800 shadow-sm self-start">
                                                            {property.type}
                                                        </span>
                                                        {matchScore !== null && (
                                                            <span className={`px-2 py-1 bg-white/90 backdrop-blur-md rounded border text-xs font-bold shadow-sm self-start ${matchScore >= 80 ? 'border-green-400 text-green-700' : matchScore >= 70 ? 'border-blue-400 text-blue-700' : matchScore >= 60 ? 'border-yellow-400 text-yellow-700' : 'border-gray-400 text-gray-600'}`}>
                                                                {matchScore < 60 ? 'Low Match' : `${matchScore}% Match for ${personaLabel}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                        {property.trust_score !== undefined && (
                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <span className={`px-2 py-1 bg-white/90 backdrop-blur-md rounded border border-gray-100 text-xs font-bold shadow-sm ${property.trust_score > 80 ? 'text-green-600' : property.trust_score > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    Trust: {property.trust_score}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-purple-700 transition-colors flex-1 pr-2">{property.title}</h3>
                                            <p className="font-bold text-purple-700">{property.rent}<span className="text-xs text-gray-500 font-normal">{property.property_purpose === 'Rent' || !property.property_purpose ? '/mo' : ''}</span></p>
                                        </div>
                                        
                                        {/* Star Rating */}
                                        {property.total_reviews > 0 ? (
                                            <div className="flex items-center text-yellow-500 font-bold mb-2 text-xs">
                                                <span className="text-gray-800 mr-1">{parseFloat(property.average_rating).toFixed(1)}</span>
                                                <span className="text-gray-400 ml-1">({property.total_reviews} reviews)</span>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-gray-400 mb-2">No reviews yet</div>
                                        )}

                                        <p className="text-gray-500 text-xs mb-2">{property.location}</p>
                                        
                                        {property.matched_attributes && property.matched_attributes.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {property.matched_attributes.map((attr, idx) => (
                                                    <span key={idx} className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center">
                                                        {attr}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {property.reason && (
                                            <div className="mb-4 bg-purple-50 p-2 rounded-lg border border-purple-100 text-[10px] text-purple-800 flex gap-2 items-start">
                                                <span className="leading-tight font-medium">{property.reason}</span>
                                            </div>
                                        )}

                                        {property.vacancy_count > 0 && (
                                            <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] font-medium text-gray-700">
                                                <div className="bg-gray-50 px-2 py-1 rounded">
                                                    Vacancy Available: {property.vacancy_count}
                                                </div>
                                                <div className="bg-gray-50 px-2 py-1 rounded text-center">
                                                    For {property.vacancy_for || 'Anyone'}
                                                </div>
                                                <div className="bg-gray-50 px-2 py-1 rounded col-span-2 text-center text-blue-700 bg-blue-50">
                                                    {property.availability_type === 'Available Soon' && property.available_from_date 
                                                        ? `Available from ${new Date(property.available_from_date).toLocaleDateString()}` 
                                                        : 'Available Now'}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-auto pt-3 border-t border-purple-100 flex items-center justify-between">
                                            <Link 
                                                to={`/properties/${property.id}`} 
                                                onClick={() => {
                                                    const currentUserId = user ? user.id : "user123";
                                                    fetch("http://localhost:5000/api/recommend", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ user_id: currentUserId, interactions: [{ type: property.type, location: property.location, maxRent: property.rent }] })
                                                    }).catch(e => {});
                                                }}
                                                className="w-full text-center bg-purple-100 hover:bg-purple-200 text-purple-700 py-2 rounded-lg font-medium text-sm transition-colors"
                                            >
                                                View Recommendation
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        All Properties
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        {/* Availability Toggle */}
                        <button 
                            type="button"
                            onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center transition-all duration-200 shadow-sm border ${showOnlyAvailable ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                        >
                            <div className={`w-10 h-5 rounded-full mr-3 flex items-center p-0.5 transition-colors ${showOnlyAvailable ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${showOnlyAvailable ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                            {showOnlyAvailable ? 'Available Only' : 'Show All Types'}
                        </button>

                        {/* View Mode Toggle */}
                        <div className="bg-gray-100 p-1 rounded-xl flex items-center shadow-inner self-start md:self-auto border border-gray-200">
                            <button 
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                Grid view
                            </button>
                            <button 
                                type="button"
                                onClick={() => setViewMode('map')}
                                className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center transition-all duration-200 ${viewMode === 'map' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                Map view
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="animate-pulse bg-white rounded-2xl p-4 shadow-sm h-80">
                                <div className="bg-gray-200 h-48 rounded-xl mb-4"></div>
                                <div className="bg-gray-200 h-6 w-3/4 rounded mb-2"></div>
                                <div className="bg-gray-200 h-4 w-1/2 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredProperties.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-50">
                        
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No properties found</h3>
                        <p className="text-gray-500">Try adjusting your filters to find what you're looking for.</p>
                        <button onClick={() => { setFilters({ location: '', type: '', maxRent: '' }); setTimeout(fetchProperties, 0); }} className="mt-6 text-blue-600 font-medium hover:underline">Clear all filters</button>
                    </div>
                ) : viewMode === 'map' ? (
                    <div className="animate-fade-in-up">
                        <MapComponent 
                            properties={filteredProperties} 
                            recommendedIds={recommended ? recommended.map(r => r.id) : []} 
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProperties.map(property => (
                            <div key={property.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group flex flex-col overflow-hidden">
                                <div className="relative h-56 overflow-hidden">
                                    {parseImages(property.images).length > 0 ? (
                                        <img src={`http://localhost:5000/${parseImages(property.images)[0]}`} alt={property.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">No Image provided</div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

                                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${property.status === 'available' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                                {(property.status || 'unknown').toUpperCase()}
                                            </span>
                                            <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-gray-800 shadow-sm">
                                                {property.type}
                                            </span>
                                        </div>
                                    </div>
                                    {property.trust_score !== undefined && (
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <span className={`px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold shadow-sm ${property.trust_score > 80 ? 'text-green-600' : property.trust_score > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                Trust: {property.trust_score}
                                            </span>
                                        </div>
                                    )}

                                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                        <div>
                                            <p className="text-white font-bold text-2xl flex items-center shadow-sm">
                                                {property.rent}<span className="text-sm font-normal text-white/80 ml-1">{property.property_purpose === 'Rent' || !property.property_purpose ? '/mo' : ''}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">{property.title}</h3>
                                    
                                    {/* Star Rating */}
                                    {property.total_reviews > 0 ? (
                                        <div className="flex items-center text-yellow-500 font-bold mb-3 text-sm">
                                            <span className="text-gray-800 mr-1">{parseFloat(property.average_rating).toFixed(1)}</span>
                                            <span className="text-gray-400 ml-1">({property.total_reviews} reviews)</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 mb-3">No reviews yet</div>
                                    )}

                                    <p className="text-gray-500 text-sm mb-4">{property.location}</p>

                                    {property.vacancy_count > 0 && (
                                        <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-medium text-gray-700">
                                            <div className="bg-gray-50 px-2 py-1.5 rounded flex items-center justify-center border border-gray-100">
                                                Vacancy Available: {property.vacancy_count}
                                            </div>
                                            <div className="bg-gray-50 px-2 py-1.5 rounded flex items-center justify-center border border-gray-100">
                                                For {property.vacancy_for || 'Anyone'}
                                            </div>
                                            <div className="bg-blue-50 px-2 py-1.5 rounded col-span-2 text-center text-blue-700 border border-blue-100">
                                                {property.availability_type === 'Available Soon' && property.available_from_date 
                                                    ? `Available from ${new Date(property.available_from_date).toLocaleDateString()}` 
                                                    : 'Available Now'}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center text-blue-800 font-bold border border-white shadow-sm">
                                                {(property.owner_name || '?').charAt(0)}
                                            </div>
                                            <span className="truncate max-w-[120px]">{property.owner_name || 'Owner'}</span>
                                        </div>
                                        <Link 
                                            to={`/properties/${property.id}`} 
                                            onClick={() => {
                                                const currentUserId = user ? user.id : "user123";
                                                fetch("http://localhost:5000/api/recommend", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ user_id: currentUserId, interactions: [{ type: property.type, location: property.location, maxRent: property.rent }] })
                                                }).catch(e => {});
                                            }}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center group-hover:translate-x-1 transition-transform"
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>


        </div>
    );
};

export default Home;
