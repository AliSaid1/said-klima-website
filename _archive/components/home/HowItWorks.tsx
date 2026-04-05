'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
    title: 'Termin vereinbaren',
    description: 'Sie nehmen Kontakt auf – wir kümmern uns um den Rest und finden den schnellsten verfügbaren Termin für Sie.',
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
                  <motion.div
                      key={step.id}
                      layout
                      onClick={() => setActiveStep(index)}
                      className={`relative overflow-hidden rounded-3xl cursor-pointer flex flex-col transition-colors duration-300 ${
                          isHighlighted
                              ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 flex-grow basis-auto h-[280px] lg:h-auto lg:w-auto'
                              : 'bg-slate-50 text-slate-900 border border-slate-100 hover:bg-slate-100 flex-none basis-[80px] h-[80px] lg:h-auto lg:w-[100px]'
                      }`}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    <div className="p-6 lg:p-8 flex flex-col h-full">
                      <div className={`flex items-center justify-between transition-all duration-300 ${isHighlighted ? 'mb-auto' : 'lg:flex-col lg:justify-center lg:h-full lg:gap-4'}`}>
                    <span className={`text-sm font-bold tracking-wider ${isHighlighted ? 'text-blue-200' : 'text-slate-400'}`}>
                      {step.id}.
                    </span>
                        <Icon className={`w-8 h-8 ${isHighlighted ? 'text-white' : 'text-blue-600'}`} />
                      </div>

                      <AnimatePresence>
                        {isHighlighted && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                                className="mt-auto"
                            >
                              <h3 className="text-2xl font-bold mb-2 lg:mb-3 font-outfit whitespace-nowrap">
                                {step.title}
                              </h3>
                              <p className="leading-relaxed text-blue-100 text-sm lg:text-base line-clamp-2 lg:line-clamp-none">
                                {step.description}
                              </p>
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
              );
            })}
          </div>

        </div>
      </section>
  );
}
