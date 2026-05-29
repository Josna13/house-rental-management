import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Notifications from './Notifications';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                            HouseRent
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <Notifications />
                                <span className="text-gray-700">Hello, {user.name}</span>
                                <button
                                    onClick={handleLogout}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Login
                                </Link>
                                <Link to="/register" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
