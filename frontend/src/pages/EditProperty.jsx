import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import LocationAutocomplete from '../components/LocationAutocomplete';

const EditProperty = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState(null);
    const [previewImages, setPreviewImages] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        rent: '',
        deposit: '',
        location: '',
        latitude: null,
        longitude: null,
        type: '1RK',
        property_purpose: 'Rent',
        listed_by: 'Owner',
        brokerage_charge: '',
        images: [] // Keep empty for new uploads
    });

    const [compatibilityData, setCompatibilityData] = useState({
        areaType: 'Moderate',
        noiseLevel: 'Medium',
        lifestyleType: 'Peaceful / Family Friendly',
        rules: 'Pets Allowed',
        suitableFor: 'Working Professionals',
        cleanliness: 'Medium',
        hospital: '',
        college: '',
        school: '',
        garden: ''
    });

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const res = await api.get(`/properties/${id}`);
                const data = res.data;
                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    rent: data.rent || '',
                    deposit: data.deposit || '',
                    location: data.location || '',
                    latitude: data.latitude || null,
                    longitude: data.longitude || null,
                    type: data.type || '1RK',
                    property_purpose: data.property_purpose || 'Rent',
                    listed_by: data.listed_by || 'Owner',
                    brokerage_charge: data.brokerage_charge || '',
                    vacancy_count: data.vacancy_count !== undefined ? data.vacancy_count : 1,
                    vacancy_for: data.vacancy_for || 'Anyone',
                    availability_type: data.availability_type || 'Available Now',
                    available_from_date: data.available_from_date ? data.available_from_date.split('T')[0] : '',
                    images: []
                });
                
                if (data.compatibility_metadata) {
                    try {
                        const compData = typeof data.compatibility_metadata === 'string' ? JSON.parse(data.compatibility_metadata) : data.compatibility_metadata;
                        setCompatibilityData(prev => ({ ...prev, ...compData }));
                    } catch(e) {}
                }

                if (data.images) {
                    try {
                        const imgs = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;
                        setPreviewImages(imgs.map(img => `http://localhost:5000/${img}`));
                    } catch(e) {}
                }
            } catch (err) {
                setError('Failed to fetch property details.');
            } finally {
                setFetching(false);
            }
        };
        fetchProperty();
    }, [id]);

    const handleCompatibilityChange = (e) => {
        setCompatibilityData({ ...compatibilityData, [e.target.name]: e.target.value });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 5) {
            alert('You can only upload up to 5 images.');
            return;
        }

        setFormData({ ...formData, images: files });

        // Generate previews
        const previews = files.map(file => URL.createObjectURL(file));
        setPreviewImages(previews);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'images') {
                formData.images.forEach(image => {
                    data.append('images', image);
                });
            } else if (key === 'deposit' && formData.property_purpose === 'Sale') {
                data.append('deposit', '0');
            } else if (formData[key] !== null) {
                data.append(key, formData[key]);
            }
        });

        data.append('compatibility_metadata', JSON.stringify(compatibilityData));

        try {
            await api.put(`/properties/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate('/owner/properties');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update property');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="text-center py-8">Loading property details...</div>;

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Edit Property</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Property Title</label>
                            <input type="text" name="title" required value={formData.title} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="e.g. Beautiful 2BHK Apartment in Downtown" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea name="description" required rows="4" value={formData.description} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="Describe the property, amenities, nearby places..."></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Property Purpose</label>
                            <select name="property_purpose" value={formData.property_purpose} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white">
                                <option value="Rent">For Rent</option>
                                <option value="Sale">For Sale</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {formData.property_purpose === 'Sale' ? 'Selling Price' : 'Rent (per month)'}
                            </label>
                            <input type="number" name="rent" required min="0" value={formData.rent} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder={formData.property_purpose === 'Sale' ? "5000000" : "1500"} />
                        </div>

                        {formData.property_purpose === 'Rent' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deposit</label>
                                <input type="number" name="deposit" required min="0" value={formData.deposit} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="3000" />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                            <LocationAutocomplete 
                                initialLocation={formData.location}
                                onSelect={(data) => setFormData({...formData, location: data.location, latitude: data.latitude, longitude: data.longitude})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white">
                                <option value="1RK">1 RK</option>
                                <option value="1BHK">1 BHK</option>
                                <option value="2BHK">2 BHK</option>
                                <option value="3BHK">3 BHK</option>
                                <option value="Villa">Villa</option>
                                <option value="Studio">Studio</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Listed By</label>
                            <select name="listed_by" value={formData.listed_by} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white">
                                <option value="Owner">Owner</option>
                                <option value="Broker">Broker</option>
                            </select>
                        </div>

                        {formData.listed_by === 'Broker' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Brokerage Charge</label>
                                <input type="number" name="brokerage_charge" value={formData.brokerage_charge} min="0" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="e.g. 5000" />
                            </div>
                        )}
                    </div>

                    {/* Vacancy & Availability Section */}
                    <div className="pt-6 border-t border-gray-100">
                        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 shadow-inner">
                            <h3 className="text-xl font-bold text-purple-900 mb-2 flex items-center">
                                Vacancy & Availability
                            </h3>
                            <p className="text-sm text-purple-700 mb-5">
                                Specify how many rooms/beds are available, who they are for, and when tenants can move in.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy Count</label>
                                    <input type="number" name="vacancy_count" value={formData.vacancy_count} min="0" required onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. 1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy For</label>
                                    <select name="vacancy_for" value={formData.vacancy_for} required onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="Boys">Boys</option>
                                        <option value="Girls">Girls</option>
                                        <option value="Anyone">Anyone</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Availability Type</label>
                                    <select name="availability_type" value={formData.availability_type} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="Available Now">Available Now</option>
                                        <option value="Available Soon">Available Soon</option>
                                    </select>
                                </div>
                                {formData.availability_type === 'Available Soon' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Available From Date</label>
                                        <input type="date" name="available_from_date" value={formData.available_from_date} required onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-inner">
                            <h3 className="text-xl font-bold text-blue-900 mb-2 flex items-center">
                                Target Audience Preferences
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Area Type</label>
                                    <select name="areaType" value={compatibilityData.areaType} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>Quiet Residential</option>
                                        <option>Moderate</option>
                                        <option>Busy / Commercial</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Noise Level</label>
                                    <select name="noiseLevel" value={compatibilityData.noiseLevel} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lifestyle Fit</label>
                                    <select name="lifestyleType" value={compatibilityData.lifestyleType} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>Peaceful / Family Friendly</option>
                                        <option>Student Friendly</option>
                                        <option>Party Friendly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">House Rules</label>
                                    <select name="rules" value={compatibilityData.rules} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>No Parties</option>
                                        <option>No Smoking</option>
                                        <option>Pets Allowed</option>
                                        <option>No Restrictions</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Suitable For</label>
                                    <select name="suitableFor" value={compatibilityData.suitableFor} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>Students</option>
                                        <option>Working Professionals</option>
                                        <option>Families</option>
                                        <option>Anyone</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cleanliness Baseline</label>
                                    <select name="cleanliness" value={compatibilityData.cleanliness} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                        <option>High</option>
                                        <option>Medium</option>
                                        <option>Low</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-inner mt-6">
                            <h3 className="text-xl font-bold text-green-900 mb-2 flex items-center">
                                Nearby Amenities & Places
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearest Hospital</label>
                                    <input type="text" name="hospital" value={compatibilityData.hospital} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearest College</label>
                                    <input type="text" name="college" value={compatibilityData.college} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearest School</label>
                                    <input type="text" name="school" value={compatibilityData.school} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearest Garden / Park</label>
                                    <input type="text" name="garden" value={compatibilityData.garden} onChange={handleCompatibilityChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Update Images (Optional, selecting new will overwrite old)</label>
                        <input type="file" multiple accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />

                        {previewImages.length > 0 && (
                            <div className="mt-4 grid grid-cols-5 gap-4">
                                {previewImages.map((src, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                                        <img src={src} alt="preview" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex justify-end space-x-4">
                        <button type="button" onClick={() => navigate('/owner/properties')} className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className={`px-6 py-2.5 font-medium rounded-xl text-white ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90'} shadow-lg transition-all`}>
                            {loading ? 'Updating...' : 'Update Property'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProperty;
