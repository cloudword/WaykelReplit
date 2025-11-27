
export interface Ride {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  pickupTime: string;
  dropTime?: string;
  status: "pending" | "active" | "completed" | "cancelled" | "scheduled";
  price: number;
  distance: string;
  cargoType: string;
  weight: string;
  customerName?: string;
  customerPhone?: string;
  incentive?: number;
}

export interface Vehicle {
  id: string;
  type: string;
  plateNumber: string;
  model: string;
  capacity: string;
  status: "active" | "inactive" | "maintenance";
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: "driver" | "admin";
  isOnline: boolean;
  rating: number;
  totalTrips: number;
  earningsToday: number;
  vehicles: Vehicle[];
}

export const MOCK_USER: User = {
  id: "u1",
  name: "Rajesh Kumar",
  phone: "+91 98765 43210",
  role: "driver",
  isOnline: false,
  rating: 4.8,
  totalTrips: 142,
  earningsToday: 2450,
  vehicles: [
    {
      id: "v1",
      type: "Tata Ace",
      plateNumber: "MH 12 DE 1432",
      model: "2022 Gold",
      capacity: "750 kg",
      status: "active"
    },
    {
      id: "v2",
      type: "Ashok Leyland Dost",
      plateNumber: "MH 14 AB 9988",
      model: "2021 LS",
      capacity: "1250 kg",
      status: "active"
    }
  ]
};

export const MOCK_RIDES: Ride[] = [
  {
    id: "r1",
    pickupLocation: "Bhiwandi Warehouse Zone 5",
    dropLocation: "Andheri East, MIDC",
    pickupTime: "Today, 2:30 PM",
    status: "pending",
    price: 1200,
    distance: "24 km",
    cargoType: "Electronics",
    weight: "500 kg",
    customerName: "Amit Sharma",
    customerPhone: "+91 98765 43210"
  },
  {
    id: "r2",
    pickupLocation: "Navi Mumbai Port",
    dropLocation: "Pune IT Park",
    pickupTime: "Tomorrow, 8:00 AM",
    status: "scheduled",
    price: 4500,
    distance: "140 km",
    cargoType: "Furniture",
    weight: "900 kg",
    customerName: "Sneha Patel",
    customerPhone: "+91 98123 45678"
  },
  {
    id: "r3",
    pickupLocation: "Thane West",
    dropLocation: "Dadar Market",
    pickupTime: "Yesterday, 4:15 PM",
    dropTime: "Yesterday, 6:30 PM",
    status: "completed",
    price: 850,
    distance: "32 km",
    cargoType: "Textiles",
    weight: "300 kg"
  }
];

export const EARNINGS_DATA = [
  { name: "Mon", amount: 1200 },
  { name: "Tue", amount: 2100 },
  { name: "Wed", amount: 1800 },
  { name: "Thu", amount: 2400 },
  { name: "Fri", amount: 1500 },
  { name: "Sat", amount: 3200 },
  { name: "Sun", amount: 1900 },
];
