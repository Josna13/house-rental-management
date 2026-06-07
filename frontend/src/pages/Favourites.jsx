import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { parseImages } from '../utils/imageUtils';

const Favourites = () => {
    const [favourites, setFavourites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFavourites = async () => {
            try {
                const res = await api.get('/favourites');
                setFavourites(res.data);
            } catch (err) {
                console.error('Failed to fetch favourites');
            } finally {
                setLoading(false);
            }
        };
        fetchFavourites();
    }, []);

    const removeFavourite = async (propertyId, favId) => {
        try {
            await api.delete(`/favourites/${propertyId}`);
            setFavourites(favourites.filter(f => f.favourite_id !== favId));
        } catch (err) {
            alert('Failed to remove favourite');
        }
    };

    if (loading) return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                My Saved Properties
            </h1>

            {favourites.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100">
                    
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No favourites yet</h3>
                    <p className="text-gray-500 mb-6">Explore properties and save the ones you love.</p>
                    <Link to="/" className="text-blue-600 font-medium hover:underline">Explore Properties</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {favourites.map(property => (
                        <div key={property.favourite_id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-gray-100 flex flex-col overflow-hidden relative group">
                            <button
                                onClick={() => removeFavourite(property.id, property.favourite_id)}
                                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                                title="Remove from Favourites"
                            >
                                Remove
                            </button>

                            <Link to={`/properties/${property.id}`} className="block h-56 relative overflow-hidden bg-gray-100">
                                {(() => {
                                    const imgs = parseImages(property.images);
                                    return imgs.length > 0 ? (
                                        <img src={`https://house-rental-management.onrender.com/${imgs[0]}`} alt={property.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                                    );
                                })()}
                                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
                                    <span className="text-blue-600 font-bold text-lg">${property.rent}</span>
                                    <span className="text-xs text-gray-500 font-medium ml-1">/mo</span>
                                </div>
                                {property.trust_score !== undefined && (
                                    <div className={`absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold ${property.trust_score > 80 ? 'text-green-600' : property.trust_score > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        Trust Score: {property.trust_score}
                                    </div>
                                )}
                            </Link>

                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                                    <Link to={`/properties/${property.id}`} className="hover:text-blue-600 transition-colors">
                                        {property.title}
                                    </Link>
                                </h3>
                                <p className="text-gray-500 text-sm mb-4 truncate">{property.location}</p>

                                <div className="mt-auto flex justify-between items-center text-sm border-t border-gray-100 pt-4">
                                    <span className={`px-2 py-1 rounded-md font-medium text-xs ${property.status === 'available' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {(property.status || 'unknown').toUpperCase()}
                                    </span>
                                    <span className="text-gray-500">{property.type}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Favourites;
