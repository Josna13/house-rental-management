import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Notifications = () => {
    const { user, token } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const prevNotifRef = useRef([]);
    const dropdownRef = useRef(null);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user || !token) return;

        const fetchNotifications = async () => {
            try {
                const res = await fetch('https://house-rental-management.onrender.com/api/notifications', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    
                    // Check if there's a new unread notification
                    const currentUnread = data.filter(n => !n.is_read);
                    const prevUnread = prevNotifRef.current.filter(n => !n.is_read);
                    
                    if (currentUnread.length > prevUnread.length) {
                        const newItems = currentUnread.filter(cu => !prevUnread.find(pu => pu._id === cu._id));
                        newItems.forEach(item => {
                            toast.info(`🔔 ${item.message}`, { position: "top-right", autoClose: 5000 });
                        });
                    }
                    
                    setNotifications(data);
                    prevNotifRef.current = data;
                }
            } catch (error) {
                console.error("Error fetching notifications:", error);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 5000); // Check every 5s for fast feedback
        return () => clearInterval(interval);
    }, [user, token]);

    const markAsRead = async (id, propertyId) => {
        try {
            await fetch(`https://house-rental-management.onrender.com/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n));
            prevNotifRef.current = prevNotifRef.current.map(n => n._id === id ? { ...n, is_read: true } : n);
            
            if (propertyId) {
                setIsOpen(false);
                navigate(`/properties/${propertyId}`);
            }
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 mt-1 mr-2 text-gray-600 hover:text-blue-600 focus:outline-none transition-colors rounded-full hover:bg-gray-100"
                title="Notifications"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform bg-red-500 rounded-full border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl overflow-hidden z-50 border border-gray-100">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{unreadCount} new</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-sm text-center text-gray-500 flex flex-col items-center">
                                <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div 
                                    key={notif._id}
                                    onClick={() => markAsRead(notif._id, notif.property_id)}
                                    className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${!notif.is_read ? 'bg-blue-50/40 hover:bg-blue-50/80' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className={`text-sm ${!notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                            {notif.message}
                                        </p>
                                        {!notif.is_read && (
                                            <span className="w-2 h-2 mt-1.5 ml-3 bg-blue-600 rounded-full flex-shrink-0 shadow-sm"></span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
                                        {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
