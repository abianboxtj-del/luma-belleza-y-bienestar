import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, User, LogOut, Settings } from 'lucide-react';

export default function Navbar() {
  const { session, isAdmin, signOut } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  const LOGO_URL = "/logo-luma.png";

  const navLinks = [
    { name: 'Inicio', href: '/#inicio' },
    { name: 'Sobre Lumá', href: '/#sobre' },
    { name: 'Servicios', href: '/#servicios' },
    { name: 'Turnos', href: '/#turnos' },
  ];

  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-water-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-water-100 bg-white shadow-sm">
              <img src={LOGO_URL} alt="Lumá Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-serif tracking-widest text-water-900 leading-none">LUMÁ</span>
              <span className="text-[8px] uppercase tracking-[0.3em] text-water-500 mt-0.5">Belleza y Bienestar</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {!isAdminPath && navLinks.map((link) => (
              <a key={link.name} href={link.href} className="text-sm font-medium text-water-700 hover:text-water-900 transition-colors">
                {link.name}
              </a>
            ))}

            {isAdmin && (
              <Link to="/admin" className="flex items-center space-x-2 text-sm font-medium text-water-700 hover:text-water-900">
                <Settings className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}

            {session ? (
              <button onClick={signOut} className="flex items-center space-x-2 text-sm font-medium text-water-700 hover:text-water-900">
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            ) : (
              <Link to="/login" className="flex items-center space-x-2 text-sm font-medium text-water-700 hover:text-water-900">
                <User className="w-4 h-4" />
                <span>Ingresar</span>
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-water-700">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}