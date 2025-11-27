import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Truck } from "lucide-react";
import { Ride } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";

interface CalendarViewProps {
  rides: Ride[];
  view?: "driver" | "admin";
}

export function CalendarView({ rides, view = "driver" }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 27)); // Nov 27, 2025

  // Simple grid generation for Nov 2025
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  
  const getRidesForDate = (day: number) => {
    const dateStr = `2025-11-${day.toString().padStart(2, '0')}`;
    return rides.filter(r => r.date === dateStr);
  };

  return (
    <Card className="border-none shadow-sm">
      <div className="p-4 flex items-center justify-between border-b">
        <h2 className="font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          November 2025
        </h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-400 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {/* Offset for start of month (Sat Nov 1st) */}
          {Array.from({ length: 6 }).map((_, i) => <div key={`empty-${i}`} />)}
          
          {days.map(day => {
            const dayRides = getRidesForDate(day);
            const isToday = day === 27;
            
            return (
              <div 
                key={day} 
                className={`
                  aspect-square rounded-lg border flex flex-col items-center justify-start pt-1 relative
                  ${isToday ? 'bg-blue-50 border-primary text-primary font-bold' : 'bg-white border-gray-100'}
                  ${dayRides.length > 0 ? 'cursor-pointer hover:border-blue-300' : ''}
                `}
              >
                <span className="text-xs">{day}</span>
                
                {dayRides.length > 0 && (
                  <div className="mt-1 flex flex-col gap-0.5 w-full px-1">
                    {dayRides.map(ride => (
                      <div 
                        key={ride.id} 
                        className={`h-1.5 rounded-full w-full ${ride.status === 'completed' ? 'bg-green-400' : 'bg-blue-400'}`} 
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Date Details */}
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-500">Scheduled for Nov {currentDate.getDate()}</h3>
          {getRidesForDate(currentDate.getDate()).length > 0 ? (
            getRidesForDate(currentDate.getDate()).map(ride => (
              <div key={ride.id} className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-full border flex items-center justify-center text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-semibold text-sm">{ride.pickupLocation}</p>
                    <Badge variant="outline" className="text-[10px] h-5">{ride.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">{ride.pickupTime}</p>
                  {view === 'admin' && (
                     <p className="text-xs text-blue-600 mt-1">Vehicle: MH 12 DE 1432</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">No bookings for this date.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
