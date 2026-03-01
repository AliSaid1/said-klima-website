import Image from 'next/image';
import { Shield, Users, Award, Clock } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
      
      {/* Hero Section */}
      <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
        <div>
          <h1 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-6 leading-tight">
            Ihr Experte für perfektes Klima seit über 15 Jahren
          </h1>
          <p className="text-lg text-slate-600 mb-6 leading-relaxed">
            Said Kälte- und Klimatechnik steht für höchste Qualität, Zuverlässigkeit und exzellenten Kundenservice. Wir sind Ihr regionaler Partner für moderne, energieeffiziente Klimalösungen in Privathaushalten und Gewerbebetrieben.
          </p>
          <p className="text-lg text-slate-600 leading-relaxed">
            Unser Team aus zertifizierten Kälteanlagenbauern bildet sich ständig weiter, um Ihnen stets die innovativsten und umweltfreundlichsten Technologien anbieten zu können.
          </p>
        </div>
        <div className="relative h-[400px] sm:h-[500px] rounded-3xl overflow-hidden shadow-2xl">
          <Image
            src="/images/installation.avif"
            alt="Techniker bei der Arbeit"
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* Values */}
      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-outfit text-slate-900 mb-4">Unsere Werte</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Darauf können Sie sich bei jedem Auftrag verlassen.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Qualität</h3>
            <p className="text-sm text-slate-600">Wir verwenden nur hochwertige Markenprodukte und Materialien.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Kundennähe</h3>
            <p className="text-sm text-slate-600">Persönliche Beratung und individuelle Lösungen für jeden Kunden.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Award className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Zertifiziert</h3>
            <p className="text-sm text-slate-600">Unser Team besteht aus ausgebildeten und zertifizierten Fachkräften.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Zuverlässig</h3>
            <p className="text-sm text-slate-600">Pünktliche Termine und schnelle Hilfe im Notfall.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
