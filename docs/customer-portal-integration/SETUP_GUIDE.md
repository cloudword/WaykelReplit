# Waykel Customer Portal - API Integration Guide

This guide will help you connect your customer portal (www.waykel.com) to the Waykel API.

## Step 1: Set Environment Variable

In your customer portal project, add this environment variable:

```
NEXT_PUBLIC_WAYKEL_API_URL=https://waykel-main.replit.app/api
```

Or if using Vite:
```
VITE_WAYKEL_API_URL=https://waykel-main.replit.app/api
```

**Replace `waykel-main.replit.app` with your actual Waykel platform URL.**

## Step 2: Copy Integration Files

Copy these files to your customer portal project:

1. `api-client.ts` → `src/lib/waykel-api.ts`
2. `react-hooks.tsx` → `src/hooks/useWaykel.ts`

## Step 3: Install Dependencies (if not already installed)

```bash
npm install @tanstack/react-query
```

## Step 4: Set Up Query Provider

In your app's root component (e.g., `App.tsx` or `_app.tsx`):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

function App({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## Step 5: Usage Examples

### Check if User is Logged In

```tsx
import { useSession } from '@/hooks/useWaykel';

function AuthCheck() {
  const { data: session, isLoading } = useSession();
  
  if (isLoading) return <div>Loading...</div>;
  
  if (session?.authenticated) {
    return <Dashboard userId={session.user.id} />;
  }
  
  return <LoginPage />;
}
```

### Login Form

```tsx
import { useLogin } from '@/hooks/useWaykel';
import { useState } from 'react';

function LoginForm() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ phone, password });
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      alert(error.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="tel"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={login.isPending}>
        {login.isPending ? 'Logging in...' : 'Login'}
      </button>
      {login.isError && <p className="error">{login.error.message}</p>}
    </form>
  );
}
```

### Registration Form

```tsx
import { useRegister } from '@/hooks/useWaykel';
import { useState } from 'react';

function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const register = useRegister();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync(formData);
      // Redirect to dashboard or login
      window.location.href = '/dashboard';
    } catch (error) {
      alert(error.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Full Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <input
        type="tel"
        placeholder="Phone Number"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        required
      />
      <input
        type="password"
        placeholder="Password (min 8 chars, 1 uppercase, 1 number)"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
        minLength={8}
      />
      <button type="submit" disabled={register.isPending}>
        {register.isPending ? 'Creating Account...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

### Customer Dashboard with Trips

```tsx
import { useSession, useCustomerRides } from '@/hooks/useWaykel';

function Dashboard() {
  const { data: session } = useSession();
  const { data: rides, isLoading } = useCustomerRides(session?.user?.id);
  
  if (isLoading) return <div>Loading your trips...</div>;
  
  const upcomingRides = rides?.filter(r => ['pending', 'scheduled', 'bid_placed'].includes(r.status));
  const activeRides = rides?.filter(r => r.status === 'active');
  const completedRides = rides?.filter(r => r.status === 'completed');
  
  return (
    <div>
      <h1>My Dashboard</h1>
      
      <section>
        <h2>Active Trips ({activeRides?.length || 0})</h2>
        {activeRides?.map(ride => (
          <TripCard key={ride.id} ride={ride} />
        ))}
      </section>
      
      <section>
        <h2>Upcoming Trips ({upcomingRides?.length || 0})</h2>
        {upcomingRides?.map(ride => (
          <TripCard key={ride.id} ride={ride} />
        ))}
      </section>
      
      <section>
        <h2>Completed Trips ({completedRides?.length || 0})</h2>
        {completedRides?.map(ride => (
          <TripCard key={ride.id} ride={ride} />
        ))}
      </section>
    </div>
  );
}
```

### Book a Trip Form

```tsx
import { useSession, useCreateRide } from '@/hooks/useWaykel';
import { useState } from 'react';

function BookTripForm() {
  const { data: session } = useSession();
  const createRide = useCreateRide();
  
  const [formData, setFormData] = useState({
    pickupLocation: '',
    dropLocation: '',
    pickupTime: '',
    date: '',
    cargoType: 'General Goods',
    weight: '',
    distance: '',
    price: '',
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRide.mutateAsync({
        ...formData,
        createdById: session?.user?.id,
        customerName: session?.user?.name,
      });
      alert('Trip booked successfully! Transporters will start bidding soon.');
    } catch (error) {
      alert(error.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Book a Trip</h2>
      
      <div>
        <label>Pickup Location (with Pincode)</label>
        <input
          type="text"
          placeholder="123 Main Street, Mumbai, Maharashtra 400001"
          value={formData.pickupLocation}
          onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Drop Location (with Pincode)</label>
        <input
          type="text"
          placeholder="456 Park Avenue, Pune, Maharashtra 411001"
          value={formData.dropLocation}
          onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Pickup Time</label>
        <input
          type="time"
          value={formData.pickupTime}
          onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Cargo Type</label>
        <select
          value={formData.cargoType}
          onChange={(e) => setFormData({ ...formData, cargoType: e.target.value })}
        >
          <option>General Goods</option>
          <option>Electronics</option>
          <option>Furniture</option>
          <option>Construction Materials</option>
          <option>Agricultural Products</option>
          <option>Perishable Goods</option>
          <option>Fragile Items</option>
        </select>
      </div>
      
      <div>
        <label>Weight</label>
        <input
          type="text"
          placeholder="500 kg"
          value={formData.weight}
          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Estimated Distance</label>
        <input
          type="text"
          placeholder="150 km"
          value={formData.distance}
          onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Your Budget (₹)</label>
        <input
          type="number"
          placeholder="5000"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
        />
      </div>
      
      <button type="submit" disabled={createRide.isPending}>
        {createRide.isPending ? 'Booking...' : 'Book Trip'}
      </button>
    </form>
  );
}
```

### View and Accept Bids

```tsx
import { useRideBids, useAcceptBid } from '@/hooks/useWaykel';

function BidsList({ rideId }: { rideId: string }) {
  const { data: bids, isLoading } = useRideBids(rideId);
  const acceptBid = useAcceptBid();
  
  if (isLoading) return <div>Loading bids...</div>;
  
  if (!bids?.length) {
    return <p>No bids yet. Transporters will start bidding soon!</p>;
  }
  
  const handleAccept = async (bidId: string) => {
    if (confirm('Accept this bid? The transporter will be assigned to your trip.')) {
      await acceptBid.mutateAsync(bidId);
      alert('Bid accepted! Your trip is now scheduled.');
    }
  };
  
  return (
    <div>
      <h3>Bids Received ({bids.length})</h3>
      {bids.map(bid => (
        <div key={bid.id} className="bid-card">
          <p>Amount: ₹{bid.amount}</p>
          <p>Status: {bid.status}</p>
          {bid.status === 'pending' && (
            <button onClick={() => handleAccept(bid.id)}>
              Accept Bid
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Troubleshooting

### CORS Errors
If you see CORS errors, make sure:
1. Your customer portal domain is correctly added to the Waykel API
2. You're using `credentials: 'include'` in all fetch requests
3. The API URL doesn't have a trailing slash

### Session Not Persisting
If login works but session doesn't persist:
1. Check that cookies are enabled in the browser
2. Verify both sites use HTTPS in production
3. Check that `sameSite` cookie setting is compatible

### API Returns 401
This means the session expired or user is not logged in:
1. Redirect to login page
2. Clear local state and prompt re-authentication

## Vehicle Types Reference

| Type | Typical Capacity |
|------|------------------|
| Mini Truck | 1-2 tons |
| Pickup | 500 kg - 1 ton |
| Tata Ace | 750 kg |
| Eicher | 5-10 tons |
| Container | 10-20 tons |
| Trailer | 20+ tons |
| Refrigerated | Varies |
| Tanker | Varies |
