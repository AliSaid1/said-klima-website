export const products = [
  {
    id: '1',
    name: 'Daikin Sensira',
    type: 'Wandgerät',
    brand: 'Daikin',
    price: 899,
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
    features: ['A++ Kühlen', 'Flüsterleise', 'Online-Controller'],
    description: 'Das Daikin Sensira Wandgerät bietet hervorragendes Preis-Leistungs-Verhältnis und zuverlässige Kühlung mit minimalem Energieverbrauch.',
    energyEfficiency: 'A++',
    roomSize: 'bis 30m²',
    noiseLevel: '21 dB(A)',
    availability: 'Auf Lager',
    technicalData: {
      coolingCapacity: '2.5 kW',
      heatingCapacity: '2.8 kW',
      dimensions: '286 x 770 x 225 mm',
      weight: '9 kg',
      refrigerant: 'R-32'
    },
    reviews: [
      { author: 'Max M.', rating: 5, text: 'Super leise und kühlt sehr schnell. Absolute Empfehlung!' },
      { author: 'Julia S.', rating: 4, text: 'Gutes Gerät, Installation war unkompliziert.' }
    ],
    faqs: [
      { question: 'Ist das Gerät WLAN-fähig?', answer: 'Ja, mit dem optionalen Online-Controller.' },
      { question: 'Wie oft muss der Filter gewechselt werden?', answer: 'Wir empfehlen eine Reinigung alle 2 Wochen und einen Wechsel alle 6 Monate.' }
    ]
  },
  {
    id: '2',
    name: 'Daikin Perfera',
    type: 'Wandgerät',
    brand: 'Daikin',
    price: 1199,
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
    features: ['A+++ Kühlen', 'Flash Streamer', '3D-Luftstrom'],
    description: 'Perfera sorgt für erstklassige Luftqualität und optimalen Komfort dank 3D-Luftstrom und fortschrittlicher Luftreinigung.',
    energyEfficiency: 'A+++',
    roomSize: 'bis 40m²',
    noiseLevel: '19 dB(A)',
    availability: 'Auf Lager',
    technicalData: {
      coolingCapacity: '3.5 kW',
      heatingCapacity: '4.0 kW',
      dimensions: '295 x 778 x 272 mm',
      weight: '10 kg',
      refrigerant: 'R-32'
    },
    reviews: [
      { author: 'Thomas B.', rating: 5, text: 'Die Luftreinigung ist ein echter Gamechanger für Allergiker.' }
    ],
    faqs: [
      { question: 'Was macht der Flash Streamer?', answer: 'Er zersetzt Allergene und beseitigt störende Gerüche.' }
    ]
  },
  {
    id: '3',
    name: 'Daikin Stylish',
    type: 'Wandgerät',
    brand: 'Daikin',
    price: 1499,
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
    features: ['Preisgekröntes Design', 'Coanda-Effekt', 'Grid-Eye-Sensor'],
    description: 'Kompaktes und funktionales Design, das sich in jedes Interieur einfügt. Höchste Effizienz und intelligenter Komfort.',
    energyEfficiency: 'A+++',
    roomSize: 'bis 50m²',
    noiseLevel: '19 dB(A)',
    availability: 'Lieferung in 3-5 Tagen',
    technicalData: {
      coolingCapacity: '4.2 kW',
      heatingCapacity: '5.0 kW',
      dimensions: '295 x 798 x 189 mm',
      weight: '12 kg',
      refrigerant: 'R-32'
    },
    reviews: [],
    faqs: []
  },
  {
    id: '4',
    name: 'Daikin Emura',
    type: 'Wandgerät',
    brand: 'Daikin',
    price: 1799,
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
    features: ['Ikonisches Design', 'Intelligenter Sensor', 'Luftreinigung'],
    description: 'Das ultimative Klimagerät in Sachen Design und Technologie. Emura vereint Ästhetik mit herausragender Leistung.',
    energyEfficiency: 'A+++',
    roomSize: 'bis 60m²',
    noiseLevel: '19 dB(A)',
    availability: 'Auf Lager',
    technicalData: {
      coolingCapacity: '5.0 kW',
      heatingCapacity: '5.8 kW',
      dimensions: '305 x 900 x 214 mm',
      weight: '12 kg',
      refrigerant: 'R-32'
    },
    reviews: [],
    faqs: []
  },
  {
    id: '5',
    name: 'Mitsubishi Heavy Premium',
    type: 'Wandgerät',
    brand: 'Mitsubishi',
    price: 1299,
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
    features: ['A+++', 'Allergen-Filter', '3D Auto'],
    description: 'Premium-Wandgerät mit höchster Energieeffizienz und fortschrittlichem Allergen-Filter.',
    energyEfficiency: 'A+++',
    roomSize: 'bis 40m²',
    noiseLevel: '19 dB(A)',
    availability: 'Auf Lager',
    technicalData: {
      coolingCapacity: '3.5 kW',
      heatingCapacity: '4.3 kW',
      dimensions: '290 x 870 x 230 mm',
      weight: '9.5 kg',
      refrigerant: 'R-32'
    },
    reviews: [],
    faqs: []
  },
  {
    id: '6',
    name: 'Daikin Truhengerät',
    type: 'Truhengerät',
    brand: 'Daikin',
    price: 1299,
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
    features: ['Bodennahe Montage', 'Dualer Luftstrom', 'Kompakt'],
    description: 'Ideal für die Installation unter Fenstern. Sorgt für eine optimale Wärmeverteilung im Raum.',
    energyEfficiency: 'A++',
    roomSize: 'bis 35m²',
    noiseLevel: '23 dB(A)',
    availability: 'Lieferung in 1-2 Wochen',
    technicalData: {
      coolingCapacity: '3.5 kW',
      heatingCapacity: '4.5 kW',
      dimensions: '600 x 700 x 210 mm',
      weight: '14 kg',
      refrigerant: 'R-32'
    },
    reviews: [],
    faqs: []
  },
  {
    id: '7',
    name: 'Daikin Deckenkassette',
    type: 'Kassettengerät',
    brand: 'Daikin',
    price: 1899,
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
    features: ['360° Luftstrom', 'Unsichtbare Montage', 'Selbstreinigend'],
    description: 'Perfekt für abgehängte Decken in gewerblichen Räumen. Bietet eine gleichmäßige Luftverteilung ohne Zugluft.',
    energyEfficiency: 'A++',
    roomSize: 'bis 80m²',
    noiseLevel: '27 dB(A)',
    availability: 'Auf Anfrage',
    technicalData: {
      coolingCapacity: '6.8 kW',
      heatingCapacity: '7.5 kW',
      dimensions: '256 x 840 x 840 mm',
      weight: '22 kg',
      refrigerant: 'R-32'
    },
    reviews: [],
    faqs: []
  },
  {
    id: '8',
    name: 'Mitsubishi Compact',
    type: 'Kompaktgerät',
    brand: 'Mitsubishi',
    price: 799,
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
    features: ['Kompakt', 'Günstig', 'Zuverlässig'],
    description: 'Kompaktes Einstiegsmodell für kleinere Räume mit solider Leistung.',
    energyEfficiency: 'A+',
    roomSize: 'bis 20m²',
    noiseLevel: '22 dB(A)',
    availability: 'Auf Lager',
    technicalData: {
      coolingCapacity: '2.0 kW',
      heatingCapacity: '2.5 kW',
      dimensions: '280 x 780 x 215 mm',
      weight: '8 kg',
      refrigerant: 'R-32'
    },
    reviews: [],
    faqs: []
  }
];
