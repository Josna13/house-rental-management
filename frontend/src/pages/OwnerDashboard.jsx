import React, { useState, useEffect } from 'react';
import api from '../services/api';

const OwnerDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/reports/dashboard');
                setStats(res.data);
            } catch (err) {
                setError('Failed to load dashboard statistics.');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="text-center py-10">Loading dashboard...</div>;
    if (error) return <div className="text-red-500 text-center py-10">{error}</div>;
    if (!stats) return null;

    const statCards = [
        { title: 'Total Properties', value: stats.totalProperties, color: 'from-blue-500 to-blue-600' },
        { title: 'Booking Requests', value: stats.totalBookingRequests, color: 'from-purple-500 to-purple-600' },
        { title: 'Approved Bookings', value: stats.totalApprovedBookings, color: 'from-green-500 to-green-600' },
        { title: 'Monthly Income', value: `${stats.monthlyIncome}`, color: 'from-yellow-400 to-yellow-500' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Owner Dashboard</h1>
                <button className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 shadow">
                    <span>Export PDF</span>
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-xl hover:scale-105 transition-transform duration-300`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-white/80 text-sm font-medium mb-1">{stat.title}</p>
                                <h3 className="text-3xl font-bold">{stat.value}</h3>
                            </div>
                            <div className="bg-white/20 p-3 rounded-xl hidden">
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Additional Sections (e.g. Charts or Property Status) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Property Status Overview</h2>
                    <div className="flex items-center justify-around py-4">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-green-500">{stats.propertyStatus.available}</div>
                            <div className="text-gray-500 mt-2 text-sm">Available</div>
                        </div>
                        <div className="h-16 w-px bg-gray-200"></div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-red-500">{stats.propertyStatus.booked}</div>
                            <div className="text-gray-500 mt-2 text-sm">Booked</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center flex-col">
                    <p className="text-gray-500 text-center mt-4">Charts module can be integrated here for detailed analytics.</p>
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
