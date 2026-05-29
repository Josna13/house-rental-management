import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await api.post('/auth/login', formData);
            login(res.data.user, res.data.token);

            // Redirect based on role
            if (res.data.user.role === 'Owner') {
                navigate('/owner/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in to your account
                    </p>
                </div>
                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm text-center">
                        {error}
                    </div>
                )}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your email"
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your password"
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all`}
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
                <div className="text-center text-sm text-gray-600 mt-4">
                    Don't have an account? <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">Register here</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
