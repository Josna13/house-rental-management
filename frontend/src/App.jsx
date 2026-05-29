import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import PropertyDetails from './pages/PropertyDetails';
import UserDashboard from './pages/UserDashboard';
import Favourites from './pages/Favourites';
import OwnerDashboard from './pages/OwnerDashboard';
import ManageProperties from './pages/ManageProperties';
import AddProperty from './pages/AddProperty';
import EditProperty from './pages/EditProperty';
import ManageBookings from './pages/ManageBookings';

// Auth Wrapper for Route logic
const AuthWrapper = ({ children, hideIfAuth = false }) => {
  // If the logical route component shouldn't be accessed by an authenticated user (like login)
  // We could handle that here, but simpler to do in the components.
  return children;
};

// Simple Component for 404
const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
    <h1 className="text-9xl font-black text-gray-200">404</h1>
    <h2 className="text-3xl font-bold text-gray-800 mt-4">Page Not Found</h2>
    <p className="text-gray-500 mt-2 mb-8">The page you're looking for doesn't exist or has been moved.</p>
    <a href="/" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:bg-blue-700 transition">Go Back Home</a>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <ErrorBoundary>
          <MainLayout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/properties/:id" element={<PropertyDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* User Protected Routes */}
            <Route path="/my-bookings" element={
              <ProtectedRoute allowedRoles={['User']}>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/favourites" element={
              <ProtectedRoute allowedRoles={['User', 'Owner']}>
                <Favourites />
              </ProtectedRoute>
            } />

            {/* Owner Protected Routes */}
            <Route path="/owner/dashboard" element={
              <ProtectedRoute allowedRoles={['Owner']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/owner/properties" element={
              <ProtectedRoute allowedRoles={['Owner']}>
                <ManageProperties />
              </ProtectedRoute>
            } />
            <Route path="/owner/properties/add" element={
              <ProtectedRoute allowedRoles={['Owner']}>
                <AddProperty />
              </ProtectedRoute>
            } />
            <Route path="/owner/properties/edit/:id" element={
              <ProtectedRoute allowedRoles={['Owner']}>
                <EditProperty />
              </ProtectedRoute>
            } />
            <Route path="/owner/bookings" element={
              <ProtectedRoute allowedRoles={['Owner']}>
                <ManageBookings />
              </ProtectedRoute>
            } />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </MainLayout>
        </ErrorBoundary>
      </Router>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </AuthProvider>
  );
}

export default App;

