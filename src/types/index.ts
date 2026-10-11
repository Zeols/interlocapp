export type Screen = "landing" | "login" | "forgot" | "signup" | "home" | "trips" | "purchase";
export type SeatStatus = "available" | "occupied" | "selected" | "unavailable";

export interface Seat {
  id: number;
  status: SeatStatus;
}

export interface Trip {
  id: number;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  cooperative: string;
  price: number;
  schedule: "mañana" | "tarde" | "noche";
  type: string;
}
