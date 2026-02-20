'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { PhoneCall, CalendarDays, Wrench, ShieldCheck, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    id: '01',
    title: 'Kontaktieren Sie uns',
    description: 'Rufen Sie uns an oder nutzen Sie unser Online-Formular für eine schnelle Anfrage.',
    icon: PhoneCall,
  },
  {
    id: '02',
    title: 'Zeit wählen',
    description: 'Wählen Sie einen passenden Termin. Wir bieten oft Termine am selben Tag an.',
    icon: CalendarDays,
  },
  {
    id: '03',
    title: 'Service erhalten',
    description: 'Unsere zertifizierten Experten reparieren oder installieren Ihre Anlage fachgerecht.',
    icon: Wrench,
  },
  {
    id: '04',
    title: 'Sicher bezahlen',
    description: 'Transparente Preise ohne versteckte Kosten. Bequem und sicher bezahlen.',
    icon: ShieldCheck,
  },
  {
    id: '05',
    title: 'Fertig!',
    description: 'Lehnen Sie sich zurück und genießen Sie Ihr perfektes Raumklima.',
    icon: CheckCircle2,
  }
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(1); // Default to second step

  return (
    <section id="how-it-works" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <span className="text-sm font-bold tracking-wider text-slate-500 uppercase">SO FUNKTIONIERT&apos;S</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 max-w-xl leading-tight">
              Vom Anruf zur Abkühlung in 5 Schritten
            </h2>
          </div>
          <p className="text-lg text-slate-600 max-w-md">
            Ihre Klimaanlage wieder in Gang zu bringen ist einfacher als Sie denken – nur fünf einfache Schritte und der Komfort kehrt zurück.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="flex flex-col lg:flex-row gap-4 lg:h-[400px]">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isHighlighted = activeStep === index;

            return (
              <div
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`relative overflow-hidden rounded-3xl transition-all duration-500 ease-in-out cursor-pointer flex flex-col ${
                  isHighlighted 
                    ? 'bg-blue-600 text-white flex-grow shadow-xl shadow-blue-600/20 h-[280px] lg:h-auto' 
                    : 'bg-slate-50 text-slate-900 border border-slate-100 hover:bg-slate-100 flex-none h-[80px] lg:h-auto lg:w-[100px]'
                }`}
              >
                {/* Inactive Content */}
                <div className={`absolute inset-0 flex lg:flex-col items-center justify-between p-6 lg:py-8 transition-opacity duration-300 ${isHighlighted ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <span className="text-sm font-bold tracking-wider text-slate-400">
                    {step.id}.
                  </span>
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>

                {/* Active Content */}
                <div className={`absolute inset-0 flex flex-col p-6 lg:p-8 transition-opacity duration-300 delay-100 ${isHighlighted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="flex items-center justify-between mb-auto">
                    <span className="text-sm font-bold tracking-wider text-blue-200">
                      {step.id}.
                    </span>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="mt-auto">
                    <h3 className="text-2xl font-bold mb-2 lg:mb-3 font-outfit whitespace-nowrap">
                      {step.title}
                    </h3>
                    <p className="leading-relaxed text-blue-100 text-sm lg:text-base line-clamp-2 lg:line-clamp-none">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
