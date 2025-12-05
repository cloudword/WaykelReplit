/**
 * React Hooks for Waykel API Integration
 * 
 * Copy this file to your customer portal project
 * Requires: @tanstack/react-query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { waykelApi, User, Ride, Bid, CreateRideData, RegisterData } from './api-client';

// Auth Hooks
export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: waykelApi.auth.getSession,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ phone, password }: { phone: string; password: string }) =>
      waykelApi.auth.login(phone, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: RegisterData) => waykelApi.auth.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: waykelApi.auth.logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.clear();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      waykelApi.auth.changePassword(currentPassword, newPassword),
  });
}

// Rides Hooks
export function useCustomerRides(customerId: string | undefined) {
  return useQuery({
    queryKey: ['rides', 'customer', customerId],
    queryFn: () => waykelApi.rides.getCustomerRides(customerId!),
    enabled: !!customerId,
  });
}

export function useRide(rideId: string | undefined) {
  return useQuery({
    queryKey: ['ride', rideId],
    queryFn: () => waykelApi.rides.getById(rideId!),
    enabled: !!rideId,
  });
}

export function useCreateRide() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateRideData) => waykelApi.rides.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
  });
}

export function useCancelRide() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (rideId: string) => waykelApi.rides.cancel(rideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
  });
}

// Bids Hooks
export function useRideBids(rideId: string | undefined) {
  return useQuery({
    queryKey: ['bids', rideId],
    queryFn: () => waykelApi.bids.getForRide(rideId!),
    enabled: !!rideId,
    refetchInterval: 30000, // Refresh every 30 seconds to show new bids
  });
}

export function useAcceptBid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bidId: string) => waykelApi.bids.accept(bidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
  });
}

export function useRejectBid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bidId: string) => waykelApi.bids.reject(bidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
  });
}

// Health Check Hook
export function useApiHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: waykelApi.health,
    refetchInterval: 60000, // Check every minute
    retry: 3,
  });
}
