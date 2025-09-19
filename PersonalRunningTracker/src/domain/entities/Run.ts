// Run entity - core business entity
export interface Run {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  distance: number; // meters
  averagePace: number; // seconds per km
  route: GPSPoint[];
  name: string;
  notes?: string;
  createdAt: Date;
}

export interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number | undefined;
  timestamp: Date;
  accuracy?: number | undefined;
}