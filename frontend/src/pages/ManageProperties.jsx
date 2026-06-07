import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { parseImages } from '../utils/imageUtils';

const ManageProperties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProperties = async () => {
        try {
            const res = await api.get('/properties/owner');
            setProperties(res.data);
        } catch (err) {
            setError('Failed to fetch properties');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this property?')) {
            try {
                await api.delete(`/properties/${id}`);
                setProperties(properties.filter(p => p.id !== id));
            } catch (err) {
                alert('Failed to delete property');
            }
        }
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;
    if (error) return <div className="text-red-500 text-center py-8">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Manage Properties</h1>
                <Link to="/owner/properties/add" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 shadow-lg flex items-center space-x-2 transition-all">
                    <span>Add New Property</span>
                </Link>
            </div>

            {properties.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-lg">You haven't listed any properties yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map(property => (
                        <div key={property.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden flex flex-col">
                            <div className="h-48 bg-gray-200 relative">
                                {(() => {
                                    const imgs = parseImages(property.images);
                                    return imgs.length > 0 ? (
                                        <img src={`https://house-rental-management.onrender.com/${imgs[0]}`} alt={property.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                                    );
                                })()}
                                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${property.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {(property.status || 'unknown').toUpperCase()}
                                </div>
                                {property.trust_score !== undefined && (
                                    <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold shadow-sm bg-white/90 backdrop-blur-md ${property.trust_score > 80 ? 'text-green-600' : property.trust_score > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        Trust: {property.trust_score}
                                    </div>
                                )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">{property.title}</h3>
                                <p className="text-gray-500 text-sm mb-4 flex items-center">{property.location}</p>

                                <div className="flex justify-between items-center mb-6 mt-auto">
                                    <span className="text-2xl font-black text-blue-600">{property.rent}<span className="text-sm text-gray-500 font-normal">/mo</span></span>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">{property.type}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                                    <Link to={`/owner/properties/edit/${property.id}`} className="text-center py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                                        Edit
                                    </Link>
                                    <button onClick={() => handleDelete(property.id)} className="text-center py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageProperties;
