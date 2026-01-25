import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authService } from './auth/authService';
import { setUser } from './store/authSlice';
import Login from './pages/Login';
import Callback from './pages/Callback';
import ProtectedRoute from './components/ProtectedRoute';

// Örnek bir ana sayfa bileşeni
const Home: React.FC = () => {
    const { user } = useSelector((state: any) => state.auth);
    const dispatch = useDispatch();

    const handleLogout = async () => {
        try {
            await authService.logout();
            dispatch(setUser(null));
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Welcome to Shopping App</h1>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Logout
                </button>
            </div>
            <div>
                <p>Logged in as: {user?.profile?.name}</p>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const checkUser = async () => {
            try {
                const user = await authService.getUser();
                dispatch(setUser(user));
            } catch (error) {
                console.error('Error checking user:', error);
            }
        };

        checkUser();
    }, [dispatch]);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/callback" element={<Callback />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Home />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App; 