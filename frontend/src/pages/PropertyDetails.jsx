import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import { calculateAllPersonaScores } from '../utils/professionMatch';
import { parseImages } from '../utils/imageUtils';

const PropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [predictedPrice, setPredictedPrice] = useState(null);
    const [priceUnavailable, setPriceUnavailable] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const [isFavourite, setIsFavourite] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [ratingStats, setRatingStats] = useState({ averageRating: null, totalReviews: 0 });
    const [newRating, setNewRating] = useState({ rating: 5, comment: '' });
    const [reviewLoading, setReviewLoading] = useState(false);
    
    // AI Bot State removed

    // Persona-based recommendation logic
    const [selectedPersona, setSelectedPersona] = useState(() => {
        try { return JSON.parse(localStorage.getItem('hrms_lifestyle'))?.profession || null; } catch(e){ return null; }
    });

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await api.get(`/properties/${id}`);
                const fetchedProperty = res.data;
                setProperty(fetchedProperty);

                // Fetch AI Fair Price Estimate — non-fatal if it fails
                if (fetchedProperty.location && fetchedProperty.type) {
                    try {
                        const aiRes = await api.post('/properties/fair-price', {
                            location: fetchedProperty.location,
                            type: fetchedProperty.type
                        });
                        if (aiRes.data && aiRes.data.predicted_price) {
                            setPredictedPrice(aiRes.data.predicted_price);
                        } else {
                            setPriceUnavailable(true);
                        }
                    } catch (e) {
                        console.warn('AI price prediction not available:', e?.response?.status, e.message);
                        setPriceUnavailable(true);
                    }
                }

                // Fetch reviews
                api.get(`/properties/${id}/reviews`).then(revRes => {
                    setReviews(revRes.data.reviews || []);
                    if(revRes.data.stats) setRatingStats(revRes.data.stats);
                }).catch(e => console.error('Failed to load reviews', e));

                // If user is logged in, track the view and check if it's in favourites
                if (user) {
                    api.post('/interactions', { propertyId: id, actionType: 'view' }).catch(e => console.error('Failed to log view', e));
                    
                    const favsRes = await api.get('/favourites');
                    const isFav = favsRes.data.some(f => f.id === parseInt(id));
                    setIsFavourite(isFav);
                }
            } catch (err) {
                console.error(err);
                setPageError('Failed to load property details. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id, user]);

    const handleBooking = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setBookingLoading(true);
        try {
            await api.post('/bookings', { propertyId: id });
            api.post('/interactions', { propertyId: id, actionType: 'book' }).catch(e => console.error('Failed to log book', e));
            alert('Booking request sent to owner! Check your dashboard for updates.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send booking request');
        } finally {
            setBookingLoading(false);
        }
    };

    const toggleFavourite = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setFavLoading(true);
        try {
            if (isFavourite) {
                await api.delete(`/favourites/${id}`);
                setIsFavourite(false);
            } else {
                await api.post(`/favourites/${id}`);
                api.post('/interactions', { propertyId: id, actionType: 'favorite' }).catch(e => console.error('Failed to log favorite', e));
                setIsFavourite(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFavLoading(false);
        }
    };

    const submitReview = async (e) => {
        e.preventDefault();
        if (!user) { navigate('/login'); return; }
        
        setReviewLoading(true);
        try {
            const res = await api.post(`/properties/${id}/reviews`, newRating);
            setRatingStats(res.data.stats);
            // Re-fetch reviews to update list
            const revRes = await api.get(`/properties/${id}/reviews`);
            setReviews(revRes.data.reviews || []);
            setNewRating({ rating: 5, comment: '' });
            alert('Review submitted successfully!');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setReviewLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (pageError) return <div className="text-center py-20 text-red-500 font-medium">{pageError}</div>;
    if (!property) return <div className="text-center py-20 text-gray-500">Property not found.</div>;

    const images = parseImages(property.images);

    // High Price Detection & Fallback Logic
    const getExpectedPriceRange = (type) => {
        switch (type) {
            case '1RK': return { min: 5000, max: 12000 };
            case '1BHK': return { min: 8000, max: 20000 };
            case '2BHK': return { min: 15000, max: 35000 };
            default: return { min: 5000, max: 35000 };
        }
    };

    const listedPrice = property ? Number(property.rent) : 0;
    const expectedRange = property ? getExpectedPriceRange(property.type) : { min: 0, max: 0 };
    
    // Use predicted if available, else use average of fallback range for a single value
    const exactPredictedPrice = predictedPrice ? Number(predictedPrice) : Math.round((expectedRange.min + expectedRange.max) / 2);
    
    let priceStatus = "Fair Price";
    // 1) Apply Prediction ONLY for Rent
    if (property && property.property_purpose && property.property_purpose !== "Rent") {
        priceStatus = "Normal Price"; // Or hide completely
    } else {
        // 5) Price Validation Logic: Compare owner_price vs predicted_price
        if (listedPrice > exactPredictedPrice * 1.2) {
            priceStatus = "High Price";
        } else if (listedPrice < exactPredictedPrice * 0.8) {
            priceStatus = "Low Price";
        }
    }

    const isHighPrice = priceStatus === "High Price";
    const suggestedPriceText = `${exactPredictedPrice}`;
    
    const requestPriceReduction = () => {
        if (!property.owner_email) {
            alert("Owner email is unavailable until your booking is accepted.");
            return;
        }
        
        const subject = encodeURIComponent("Request to Review Rent Price");
        const body = encodeURIComponent(`Hello,\n\nI am interested in your property, but the listed rent appears higher than the expected price for this area and flat type.\n\nThe system suggests a lower and more reasonable price.\n\nPlease consider reviewing and reducing the rent.\n\nThank you.`);
        
        window.location.href = `mailto:${property.owner_email}?subject=${subject}&body=${body}`;
    };

    // Persona-based recommendation logic moved to top

    // Check if this property is in the recommended list
    const recScores = (() => {
        try {
            const stored = JSON.parse(localStorage.getItem('hrms_rec_scores') || '{}');
            const propId = String(property?.id || property?._id || '');
            return stored[propId] || null;
        } catch(e){ return null; }
    })();
    const isRecommended = recScores !== null;

    // Get the score for the selected persona
    const getPersonaScore = (persona) => {
        if (!persona) return null;
        // Try server scores first
        if (recScores) {
            if (persona === 'Student') return recScores.student_score;
            if (persona === 'Family') return recScores.family_score;
            if (persona === 'Working Professional') return recScores.professional_score;
        }
        // Fallback to client-side
        if (property) {
            const allScores = calculateAllPersonaScores(property);
            if (persona === 'Student') return allScores.student_score;
            if (persona === 'Family') return allScores.family_score;
            if (persona === 'Working Professional') return allScores.professional_score;
        }
        return 0;
    };

    const matchScore = selectedPersona ? Math.round(Number(getPersonaScore(selectedPersona)) || 0) : null;
    const personaLabel = selectedPersona === 'Student' ? 'Students' : selectedPersona === 'Family' ? 'Families' : 'Professionals';
    
    const recommendationChecklist = {
        'Student': [
            "Budget-friendly pricing structure",
            "Near colleges and public transport",
            "Student-friendly environment",
            "Shared accommodation options available"
        ],
        'Family': [
            "Spacious and child-friendly design",
            "Safe neighborhood and near schools",
            "Close to parks and local markets",
            "Pet-friendly options and strict security"
        ],
        'Working Professional': [
            "Prime location near business hubs",
            "Fast internet and quiet environments",
            "Premium modern amenities",
            "Secure and hassle-free living space"
        ]
    };

    const compatData = (() => {
        if (!property.compatibility_metadata) return null;
        if (typeof property.compatibility_metadata === 'object') return property.compatibility_metadata;
        try { return JSON.parse(property.compatibility_metadata); } catch { return null; }
    })();

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-10">
            {/* Header & Main Image */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start gap-8">
                <div className="w-full md:w-1/2 relative rounded-2xl overflow-hidden aspect-video bg-gray-100">
                    {images.length > 0 ? (
                        <img src={`https://house-rental-management.onrender.com/${images[0]}`} alt={property.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image available</div>
                    )}
                    <span className={`absolute top-4 left-4 px-4 py-1.5 rounded-full text-sm font-bold shadow-md backdrop-blur-md ${property.status === 'available' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                        {(property.status || 'unknown').toUpperCase()}
                    </span>

                    {user && (
                        <button
                            onClick={toggleFavourite}
                            disabled={favLoading}
                            className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-sm font-bold shadow-md backdrop-blur-md transition-all ${isFavourite ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-white/90 text-gray-700 hover:text-red-500'}`}
                        >
                            {isFavourite ? 'Favourited' : 'Favourite'}
                        </button>
                    )}
                </div>

                <div className="w-full md:w-1/2 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col gap-2">
                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-sm font-semibold inline-block w-max">{property.type}</span>
                            
                            {/* Vacancy Info Badges */}
                            {property.vacancy_count > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                        Vacancy Available: {property.vacancy_count}
                                    </span>
                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                        For {property.vacancy_for || 'Anyone'}
                                    </span>
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                                        {property.availability_type === 'Available Soon' && property.available_from_date 
                                            ? `From ${new Date(property.available_from_date).toLocaleDateString()}` 
                                            : 'Available Now'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="text-right flex flex-col items-end">
                            {(!property.property_purpose || property.property_purpose === 'Rent') && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold mb-1 shadow-sm border ${priceStatus === 'High Price' ? 'bg-red-100 text-red-700 border-red-200' : priceStatus === 'Low Price' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {priceStatus === 'High Price' ? 'High Price' : priceStatus}
                                </span>
                            )}
                            <h2 className="text-3xl font-black text-gray-900">{property.rent}<span className="text-lg text-gray-500 font-medium">{ property.property_purpose === 'Rent' || !property.property_purpose ? '/mo' : '' }</span></h2>
                            {(!property.property_purpose || property.property_purpose === 'Rent') && (
                                <p className="text-gray-500 text-sm">Deposit: {property.deposit}</p>
                            )}
                        </div>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                    
                    {/* AI Price Prediction Card - ONLY SHOW IF HIGH PRICE */}
                    {isHighPrice && (
                        <div className="mt-3 mb-5 p-4 rounded-xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm animate-fade-in-up bg-red-50 border-red-200">
                            <div className="flex items-center mb-2 md:mb-0">
                                <div>
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Owner Price (High)</p>
                                    <p className="text-lg font-black text-gray-900 line-through decoration-red-500 decoration-2">{listedPrice} <span className="text-[10px] font-bold text-gray-500">{property.property_purpose === 'Rent' || !property.property_purpose ? '/mo' : ''}</span></p>
                                    
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mt-2">Suggested Price</p>
                                    <p className="text-xl font-black text-emerald-700">{suggestedPriceText} <span className="text-[10px] font-bold text-gray-500">{property.property_purpose === 'Rent' || !property.property_purpose ? '/mo' : ''}</span></p>
                                </div>
                            </div>
                            <div className="md:text-right flex flex-col items-start md:items-end gap-2">
                                <span className="px-4 py-1.5 rounded-full text-xs font-black inline-block shadow-sm tracking-wide bg-red-500 text-white">
                                    High Price
                                </span>
                                <button 
                                    onClick={requestPriceReduction}
                                    className="mt-1 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-red-700 transition flex items-center gap-1"
                                >
                                    Request Price Reduction
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Persona Selector + Recommendation Card (only for recommended properties) */}
                    {isRecommended && (
                        <div className="mt-4 mb-5">
                            {/* Persona Toggle Buttons */}
                            <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full mb-4">
                                {['Student', 'Working Professional', 'Family'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setSelectedPersona(selectedPersona === opt ? null : opt);
                                            localStorage.setItem('hrms_lifestyle', JSON.stringify({ profession: opt }));
                                        }}
                                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                                            selectedPersona === opt
                                                ? 'bg-white shadow-md text-purple-700'
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>

                            {/* Recommendation Card — only shown when persona is selected */}
                            {selectedPersona && matchScore !== null && (
                                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg animate-fade-in-up">
                                    <div className="relative z-10">
                                        <div className="flex flex-wrap items-center gap-4 mb-5 border-b border-indigo-400/20 pb-4">
                                            <div className={`font-black px-4 py-2 rounded-xl text-xl flex items-center border shadow-inner ${matchScore >= 80 ? 'bg-green-400/20 text-green-300 border-green-400/30' : matchScore >= 70 ? 'bg-blue-400/20 text-blue-300 border-blue-400/30' : matchScore >= 60 ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30' : 'bg-gray-400/20 text-gray-300 border-gray-400/30'}`}>
                                                {matchScore < 60 ? 'Low Match' : `${matchScore}% Match`}
                                            </div>
                                            <div>
                                                <div className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">RECOMMENDATION OUTPUT</div>
                                                <h3 className="text-xl md:text-2xl font-black">
                                                    {matchScore >= 80 ? 'Excellent' : matchScore >= 70 ? 'Good' : matchScore >= 60 ? 'Moderate' : 'Low'} Match for {personaLabel}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                            <p className="text-indigo-100 text-sm leading-relaxed font-medium">
                                                Score calculated based on location, property type, budget, lifestyle fit, and amenities.
                                            </p>
                                            <div className="bg-indigo-950/60 backdrop-blur-md rounded-xl p-4 border border-indigo-400/20 w-full shadow-inner">
                                                <ul className="space-y-3 text-sm text-indigo-50 font-medium tracking-wide">
                                                    {(recommendationChecklist[selectedPersona] || []).map((reason, idx) => (
                                                        <li key={idx} className="flex items-start">
                                                            <span className="leading-tight opacity-90">- {reason}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Render Average Rating */}
                    {ratingStats && ratingStats.totalReviews > 0 ? (
                        <div className="flex items-center text-yellow-500 mb-4">
                            <span className="font-bold text-gray-800 text-lg">{ratingStats.averageRating}</span>
                            <span className="text-sm text-gray-500 ml-2">({ratingStats.totalReviews} reviews)</span>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400 mb-4">No reviews yet</div>
                    )}

                    {/* Trust Score Section */}
                    {property.trust_score !== undefined && (
                        <div className="mt-4 mb-6 bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm animate-fade-in-up">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                    Trust Score
                                </h3>
                                <span className={`px-3 py-1 bg-white rounded-full text-sm font-black shadow-sm ${property.trust_score > 80 ? 'text-green-600 border-green-200' : property.trust_score > 50 ? 'text-yellow-600 border-yellow-200' : 'text-red-600 border-red-200'} border`}>
                                    {property.trust_score} / 100
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {property.trust_factors && property.trust_factors.map((factor, idx) => (
                                    <span key={idx} className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center ${factor.includes('✔') ? 'bg-green-50 text-green-700 border border-green-100' : factor.includes('⚠') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-100 text-gray-700'}`}>
                                        {factor.replace('✔ ', '').replace('⚠ ', '').replace('➖ ', '')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-gray-600 text-base mb-6 flex items-center">{property.location}</p>

                    <div className="mt-auto">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center space-x-4 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm">
                                {(property.owner_name || '?').charAt(0)}
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{property.listed_by === 'Broker' ? 'Broker' : 'Owner'}</h4>
                                <p className="font-bold text-gray-900">{property.owner_name}</p>
                                {/* Note: Strict logic would hide these until booking is approved, based on requirements. Handled minimally here. */}
                            </div>
                        </div>

                        {(!user || user.role === 'User') && (
                            <button
                                onClick={handleBooking}
                                disabled={property.status === 'booked' || bookingLoading}
                                className={`w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-all flex justify-center items-center ${property.status === 'booked'
                                    ? 'bg-red-50 text-red-400 border border-red-200 cursor-not-allowed'
                                    : loading
                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 hover:translate-y-[-2px]'
                                    }`}
                            >
                                {property.status === 'booked' ? (
                                    <>Property Already Booked</>
                                ) : bookingLoading ? (
                                    <>Sending Request...</>
                                ) : (
                                    <>Request to Book</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content & Gallery */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Description</h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
                    </div>

                    {images.length > 1 && (
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">Property Gallery</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {images.slice(1).map((img, idx) => (
                                    <div key={idx} className="aspect-video rounded-xl overflow-hidden bg-gray-100 group">
                                        <img src={`https://house-rental-management.onrender.com/${img}`} alt={`${property.title} - ${idx + 2}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Insights</h3>
                        <ul className="space-y-4">
                            <li className="flex items-center text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Listed On</p>
                                    <p className="font-semibold">{new Date(property.created_at).toLocaleDateString()}</p>
                                </div>
                            </li>
                            {(!property.property_purpose || property.property_purpose === 'Rent') && (
                                <li className="flex items-center text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Security Deposit</p>
                                        <p className="font-semibold">{property.deposit}</p>
                                    </div>
                                </li>
                            )}
                            <li className="flex items-center text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Listed By</p>
                                    <p className="font-semibold">{property.listed_by || 'Owner'}</p>
                                </div>
                            </li>
                            {property.listed_by === 'Broker' && (
                                <li className="flex items-center text-gray-700 bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Brokerage Fee</p>
                                        <p className="font-semibold text-red-600">{property.brokerage_charge}</p>
                                    </div>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Target Audience Preferences & Amenities */}
            {compatData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Target Audience Preferences</h3>
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Area Type</p>
                                <p className="font-bold text-gray-900">{compatData.areaType || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Noise Level</p>
                                <p className="font-bold text-gray-900">{compatData.noiseLevel || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Lifestyle Fit</p>
                                <p className="font-bold text-gray-900">{compatData.lifestyleType || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">House Rules</p>
                                <p className="font-bold text-gray-900">{compatData.rules || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Suitable For</p>
                                <p className="font-bold text-gray-900">{compatData.suitableFor || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Cleanliness</p>
                                <p className="font-bold text-gray-900">{compatData.cleanliness || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Nearby Amenities</h3>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Nearest Hospital</p>
                                <p className="font-bold text-gray-900">{compatData.hospital || 'Not specified'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Nearest College</p>
                                <p className="font-bold text-gray-900">{compatData.college || 'Not specified'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Nearest School</p>
                                <p className="font-bold text-gray-900">{compatData.school || 'Not specified'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Nearest Garden</p>
                                <p className="font-bold text-gray-900">{compatData.garden || 'Not specified'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Location Map Section */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mt-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        Location Map
                    </h3>
                </div>
                <div className="w-full rounded-2xl overflow-hidden relative shadow-inner">
                    <MapComponent properties={[property]} height="450px" />
                </div>
            </div>

            {/* Ratings and Reviews Section */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">Property Reviews</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Review Form */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <h4 className="text-lg font-bold text-gray-800 mb-4">Write a Review</h4>
                        {(!user || user.id === property.owner_id) ? (
                            <p className="text-gray-500 italic text-sm p-4 bg-white rounded-xl">You must be logged in as a tenant to review this property.</p>
                        ) : (
                            <form onSubmit={submitReview} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button 
                                                type="button" 
                                                key={star}
                                                onClick={() => setNewRating({ ...newRating, rating: star })}
                                                className={`text-2xl transition-transform hover:scale-110 ${newRating.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                                            >
                                                <span>★</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Comment (Optional)</label>
                                    <textarea 
                                        rows="3" 
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                        placeholder="Share your experience with this property..."
                                        value={newRating.comment}
                                        onChange={(e) => setNewRating({ ...newRating, comment: e.target.value })}
                                    ></textarea>
                                </div>
                                <button type="submit" disabled={reviewLoading} className="w-full bg-gray-900 text-white rounded-xl py-3 font-medium hover:bg-black transition-colors disabled:opacity-50">
                                    {reviewLoading ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Review List */}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {reviews.length === 0 ? (
                            <div className="text-center text-gray-400 py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">

                                No reviews have been left yet.<br/>Be the first to review!
                            </div>
                        ) : (
                            reviews.map(review => (
                                <div key={review.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                                {(review.user_name || '?').charAt(0)}
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm">{review.user_name || 'Anonymous'}</span>
                                        </div>
                                        <div className="text-yellow-400 text-sm flex">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                                            ))}
                                        </div>
                                    </div>
                                    {review.comment && <p className="text-gray-600 text-sm leading-relaxed mt-2">{review.comment}</p>}
                                    <p className="text-xs text-gray-400 mt-3">{new Date(review.created_at).toLocaleDateString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>


        </div>
    );
};

export default PropertyDetails;
