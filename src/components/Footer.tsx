import React from 'react';
import { Instagram, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-white/70 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex flex-col mb-6">
              <span className="text-2xl font-serif tracking-widest text-white leading-none">LUMÁ</span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-water-400 mt-1">Belleza y Bienestar</span>
            </div>
            <p className="max-w-xs mb-8 italic text-white/80">
              “Un espacio pensado para que te regales un momento para vos”
            </p>
            <div className="flex space-x-6">
              <a href="https://instagram.com/luma.bariloche" target="_blank" rel="noreferrer" className="hover:text-water-300 transition-colors text-white">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="https://wa.me/5492944142689" target="_blank" rel="noreferrer" className="hover:text-water-300 transition-colors text-white">
                <Phone className="w-6 h-6" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-serif text-lg mb-6">Navegación</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#inicio" className="hover:text-white transition-colors">Inicio</a></li>
              <li><a href="#servicios" className="hover:text-white transition-colors">Servicios</a></li>
              <li><a href="#turnos" className="hover:text-white transition-colors">Turnos</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-serif text-lg mb-6">Contacto</h4>
            <ul className="space-y-4 text-sm text-white/80 mb-6">
              <li className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-water-400" />
                <span>Av. Las Victorias 1131, Bariloche</span>
              </li>
              <li className="flex items-start space-x-3">
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 text-water-400" />
                <span>+54 9 294 414 2689</span>
              </li>
            </ul>
            <div className="rounded-2xl overflow-hidden h-48 w-full border border-white/10">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3005.444444444444!2d-71.26666666666667!3d-41.13333333333333!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x961a7b7b7b7b7b7b%3A0x7b7b7b7b7b7b7b7b!2sAv.%20Las%20Victorias%201131%2C%20San%20Carlos%20de%20Bariloche%2C%20R%C3%ADo%20Negro!5e0!3m2!1ses-419!2sar!4v1713123456789!5m2!1ses-419!2sar" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-white/10 text-center text-xs text-white/40">
          <p>© {new Date().getFullYear()} Lumá | Belleza y Bienestar. Todos los derechos reservados.</p>
          <p>Created with ❤️ by <a href="https://www.instagram.com/cuyenstudio/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">CuyenStudio</a></p>
        </div>
      </div>
    </footer>
  );
}