import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'User'
    });
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
            const res = await api.post('/auth/register', formData);
            login(res.data.user, res.data.token);

            // Redirect based on role
            if (res.data.user.role === 'Owner') {
                navigate('/owner/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            const apiError = err.response?.data?.errors
                ? err.response.data.errors.map(e => e.msg).join(', ')
                : err.response?.data?.message;
            setError(apiError || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create an Account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Join us to rent or list a property
                    </p>
                </div>
                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm text-center">
                        {error}
                    </div>
                )}
                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            name="name"
                            type="text"
                            required
                            className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="John Doe"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                        <input
                            name="email"
                            type="email"
                            required
                            className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="john@example.com"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                            name="phone"
                            type="tel"
                            required
                            className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="+1234567890"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Min 6 characters"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                        >
                            <option value="User">User (Tenant)</option>
                            <option value="Owner">Owner (Landlord)</option>
                        </select>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all`}
                        >
                            {loading ? 'Creating...' : 'Register'}
                        </button>
                    </div>
                </form>
                <div className="text-center text-sm text-gray-600">
                    Already have an account? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in here</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
