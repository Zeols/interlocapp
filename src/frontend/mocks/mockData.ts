import { Seat, SeatStatus, Trip } from "@/frontend/types";

export const OCCUPIED_IDS = [2, 5, 8, 13, 16];
export const UNAVAILABLE_IDS = [11, 20];

export function initSeats(): Seat[] {
  return Array.from({ length: 20 }, (_, i) => {
    const id = i + 1;
    const status: SeatStatus = OCCUPIED_IDS.includes(id)
      ? "occupied"
      : UNAVAILABLE_IDS.includes(id)
      ? "unavailable"
      : "available";
    return { id, status };
  });
}

export const SEAT_ROWS = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];

export const ALL_TRIPS: Trip[] = [
  {
    id: 1,
    origin: "Managua",
    destination: "León",
    departure: "06:00 AM",
    arrival: "08:30 AM",
    duration: "2h 30min",
    cooperative: "TransNica",
    price: 85,
    schedule: "mañana",
    type: "Directo",
  },
  {
    id: 2,
    origin: "Managua",
    destination: "Granada",
    departure: "12:30 PM",
    arrival: "01:45 PM",
    duration: "1h 15min",
    cooperative: "El Expreso",
    price: 65,
    schedule: "tarde",
    type: "Directo",
  },
  {
    id: 3,
    origin: "Managua",
    destination: "Estelí",
    departure: "07:00 PM",
    arrival: "09:30 PM",
    duration: "2h 30min",
    cooperative: "Tica Bus",
    price: 90,
    schedule: "noche",
    type: "Semi-directo",
  },
];

export const SCHEDULE_STYLE: Record<Trip["schedule"], { label: string; pill: string }> = {
  mañana: { label: "Mañana", pill: "bg-amber-50 text-amber-600 border border-amber-200" },
  tarde:  { label: "Tarde",  pill: "bg-sky-50   text-sky-600   border border-sky-200"   },
  noche:  { label: "Noche",  pill: "bg-violet-50 text-violet-600 border border-violet-200" },
};
