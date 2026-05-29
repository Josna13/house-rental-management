import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ManageBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings/owner');
            setBookings(res.data);
        } catch (err) {
            setError('Failed to fetch booking requests.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleAction = async (id, status) => {
        if (window.confirm(`Are you sure you want to ${status} this request?`)) {
            try {
                await api.put(`/bookings/${id}/status`, { status });
                // Update local state instead of refetching for better UX
                setBookings(bookings.map(book => book.id === id ? { ...book, status } : book));
            } catch (err) {
                alert(`Failed to ${status} booking`);
            }
        }
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;
    if (error) return <div className="text-red-500 text-center py-8">{error}</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Booking Requests</h1>

            {bookings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-lg">No booking requests found.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                                    <th className="p-4 font-semibold">Property</th>
                                    <th className="p-4 font-semibold">Tenant Detials</th>
                                    <th className="p-4 font-semibold">Date Requested</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{booking.property_title}</div>
                                            <div className="text-sm text-gray-500 flex items-center mt-1">
                                                ID: {booking.property_id}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            <div className="font-medium text-gray-900">{booking.user_name}</div>
                                            <div className="mt-1">{booking.user_email}</div>
                                            <div className="mt-1">{booking.user_phone}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(booking.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                                {(booking.status || 'pending').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {booking.status === 'pending' && (
                                                <div className="flex justify-end space-x-2">
                                                    <button onClick={() => handleAction(booking.id, 'approved')} className="text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-green-200">
                                                        Approve
                                                    </button>
                                                    <button onClick={() => handleAction(booking.id, 'rejected')} className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-red-200">
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                            {booking.status !== 'pending' && (
                                                <span className="text-gray-400 text-sm italic">Action taken</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageBookings;
