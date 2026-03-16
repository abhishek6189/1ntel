export interface Car {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  location: string;
  bodyType: string;
  transmission: string;
  fuelType: string;
  vin: string;
  description: string;
  images: string[];
  inspectionStatus: 'none' | 'pending' | 'passed' | 'passed_with_issues' | 'failed';
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
  createdAt: string;
}

export const mockCars: Car[] = [
  {
    id: '1',
    title: '2022 Honda Civic EX',
    make: 'Honda',
    model: 'Civic',
    year: 2022,
    price: 28500,
    mileage: 32000,
    location: 'Toronto, ON',
    bodyType: 'Sedan',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    vin: '2HGFC2F79NH123456',
    description: 'Well-maintained Honda Civic with low mileage. Single owner, no accidents. Comes with winter tires.',
    images: [],
    inspectionStatus: 'passed',
    sellerId: 's1',
    sellerName: 'James W.',
    sellerPhone: '+14165551234',
    createdAt: '2024-03-01',
  },
  {
    id: '2',
    title: '2021 Toyota RAV4 LE AWD',
    make: 'Toyota',
    model: 'RAV4',
    year: 2021,
    price: 34900,
    mileage: 45000,
    location: 'Vancouver, BC',
    bodyType: 'SUV',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    vin: '2T3P1RFV5MC123456',
    description: 'Reliable RAV4 with AWD. Perfect for Canadian winters. Regular maintenance at Toyota dealership.',
    images: [],
    inspectionStatus: 'none',
    sellerId: 's2',
    sellerName: 'Sarah M.',
    createdAt: '2024-02-15',
  },
  {
    id: '3',
    title: '2023 Tesla Model 3 Long Range',
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    price: 49900,
    mileage: 15000,
    location: 'Calgary, AB',
    bodyType: 'Sedan',
    transmission: 'Automatic',
    fuelType: 'Electric',
    vin: '5YJ3E1EA3PF123456',
    description: 'Like-new Tesla Model 3 Long Range. Full self-driving capability. White interior, premium connectivity.',
    images: [],
    inspectionStatus: 'pending',
    sellerId: 's3',
    sellerName: 'Mike R.',
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    title: '2020 Ford F-150 XLT',
    make: 'Ford',
    model: 'F-150',
    year: 2020,
    price: 42000,
    mileage: 58000,
    location: 'Edmonton, AB',
    bodyType: 'Truck',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    vin: '1FTEW1EP1LFA12345',
    description: 'Powerful F-150 XLT with towing package. 4x4, crew cab. Excellent condition.',
    images: [],
    inspectionStatus: 'passed_with_issues',
    sellerId: 's4',
    sellerName: 'David K.',
    sellerPhone: '+17805559876',
    createdAt: '2024-01-20',
  },
  {
    id: '5',
    title: '2023 BMW X5 xDrive40i',
    make: 'BMW',
    model: 'X5',
    year: 2023,
    price: 72500,
    mileage: 12000,
    location: 'Montreal, QC',
    bodyType: 'SUV',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    vin: '5UXCR6C03P9S12345',
    description: 'Premium BMW X5 with M Sport package. Panoramic roof, heated seats, heads-up display.',
    images: [],
    inspectionStatus: 'none',
    sellerId: 's5',
    sellerName: 'Lisa T.',
    createdAt: '2024-03-05',
  },
  {
    id: '6',
    title: '2019 Mazda CX-5 GT',
    make: 'Mazda',
    model: 'CX-5',
    year: 2019,
    price: 26800,
    mileage: 67000,
    location: 'Ottawa, ON',
    bodyType: 'SUV',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    vin: 'JM3KFBDM5K0123456',
    description: 'Top-trim CX-5 GT with Bose audio, leather seats, and sunroof. Well maintained.',
    images: [],
    inspectionStatus: 'failed',
    sellerId: 's6',
    sellerName: 'Chris B.',
    createdAt: '2024-02-28',
  },
];

export const makes = ['Honda', 'Toyota', 'Tesla', 'Ford', 'BMW', 'Mazda', 'Hyundai', 'Kia', 'Chevrolet', 'Nissan'];
export const bodyTypes = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Hatchback', 'Van', 'Wagon'];
export const transmissions = ['Automatic', 'Manual'];
export const fuelTypes = ['Gasoline', 'Electric', 'Hybrid', 'Diesel'];
