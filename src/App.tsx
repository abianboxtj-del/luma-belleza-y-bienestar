import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Home from './pages/Home';
import Admin from './pages/Admin';
import AdminServices from './pages/AdminServices';
import AdminAppointments from './pages/AdminAppointments';
import AdminPromotions from './pages/AdminPromotions';
import AdminCategories from './pages/AdminCategories';
import AdminProfessionals from './pages/AdminProfessionals';
import AdminSchedule from './pages/AdminSchedule';
import AdminUsers from './pages/AdminUsers';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function ProtectedRoute({ children, requireOwner = false }: { children: React.ReactNode, requireOwner?: boolean }) {
  const { session, isOwner, isAdmin, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-water-50/30">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-water-200 mb-4 shadow-inner"></div>
        <div className="h-4 w-24 bg-water-200 rounded"></div>
      </div>
    </div>
  );

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireOwner && !isOwner) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/appointments" 
                  element={
                    <ProtectedRoute>
                      <AdminAppointments />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/admin/schedule"
                  element={
                    <ProtectedRoute>
                      <AdminSchedule />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/services"
                  element={
                    <ProtectedRoute requireOwner>
                      <AdminServices />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/promotions" 
                  element={
                    <ProtectedRoute requireOwner>
                      <AdminPromotions />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/categories" 
                  element={
                    <ProtectedRoute requireOwner>
                      <AdminCategories />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/professionals" 
                  element={
                    <ProtectedRoute requireOwner>
                      <AdminProfessionals />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/users" 
                  element={
                    <ProtectedRoute requireOwner>
                      <AdminUsers />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster position="bottom-right" />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}