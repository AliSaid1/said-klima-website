'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const services = [
  {
    id: 'diagnostics',
    title: 'Diagnose & Reparaturen',
    description: 'Schnelle und präzise Fehleranalyse. Wir finden das Problem und beheben es direkt vor Ort, damit Sie nicht lange schwitzen müssen.',
    image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'installation',
    title: 'Installation & Austausch',
    description: 'Wir helfen Ihnen bei der Auswahl der richtigen Klimaanlage und installieren sie sauber, sicher und nach den neuesten Standards.',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'maintenance',
    title: 'Saisonale Wartung',
    description: 'Verhindert Ausfälle, senkt die Energiekosten und hält Ihr System bereit für den Sommer. Regelmäßige Pflege zahlt sich aus.',
    image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1000&auto=format&fit=crop'
  }
];

export default function Services() {
  const [activeService, setActiveService] = useState(services[1].id);

  const currentService = services.find(s => s.id === activeService) || services[0];

  return (
    <section id="services" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Image */}
          <div className="relative h-[600px] rounded-3xl overflow-hidden bg-slate-200 shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentService.id}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <Image
                  src={currentService.image}
                  alt={currentService.title}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: Content */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <span className="text-sm font-bold tracking-wider text-slate-500 uppercase">UNSERE SERVICES</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-6 leading-tight">
              Alles, was Ihre Klimaanlage jemals brauchen könnte
            </h2>
            <p className="text-lg text-slate-600 mb-12 max-w-lg">
              Von plötzlichen Ausfällen bis hin zu saisonalen Checks – wir kümmern uns darum. Entdecken Sie unsere Experten-Services, die dafür sorgen, dass Sie einen kühlen Kopf bewahren.
            </p>

            <div className="space-y-4">
              {services.map((service) => {
                const isActive = activeService === service.id;
                return (
                  <div 
                    key={service.id}
                    onClick={() => setActiveService(service.id)}
                    className={`group cursor-pointer rounded-2xl p-6 transition-all duration-300 border-l-4 ${
                      isActive 
                        ? 'bg-white shadow-lg border-blue-600' 
                        : 'bg-transparent border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className={`text-xl font-semibold transition-colors ${isActive ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                        {service.title}
                      </h3>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200 group-hover:border-slate-300'
                      }`}>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="text-slate-600 leading-relaxed">
                            {service.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
