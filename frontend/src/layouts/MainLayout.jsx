import React, { useContext } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';

const MainLayout = ({ children }) => {
    const { user } = useContext(AuthContext);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {user && <Sidebar />}

            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
