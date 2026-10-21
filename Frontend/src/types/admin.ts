export interface RoomTypeDto {
    roomTypeId?: number;
    name: string;
    description: string;
    basePrice: number;
    maxOccupancy: number;
    mainPhotoUrl?: string | null;
    photoCount?: number;
    averageRating?: number | null;
    reviewCount?: number;
    amenities?: string[];
}

export interface RoomDto {
    roomId?: number;
    roomTypeId: number;
    roomTypeName?: string;
    roomNumber: string;
    status: string;
    amenityIds: number[];
    amenityNames?: string[];
}

export interface AdditionalServiceDto{
    serviceId?: number;
    name: string;
    price: number;
}

export interface PriceListEntryDto {
    priceListEntryId?: number;
    roomTypeId: number;
    roomTypeName?: string;
    startDate: string;
    endDate: string;
    pricePerNight: number;
}

export interface AmenityDto {
    amenityId?: number;
    name: string;
}

export interface RoomBlockDto {
    roomBlockId?: number;
    roomId: number;
    roomNumber?: string;
    ownerName?: string;
    startDate: string;
    endDate: string;
    reason: string;
}

// Kalendarz dostępności (panel właściciela): pokój i jego kolejne noce
// status nocy: free / booked / blocked; przy rezerwacji jej numer, status i gość, przy blokadzie powód
export interface AvailabilityDayDto {
    date: string;
    status: string;
    reservationId: number | null;
    reservationStatus: string | null;
    guestName: string | null;
    blockReason: string | null;
}

export interface RoomAvailabilityDto {
    roomId: number;
    roomNumber: string;
    roomTypeName: string;
    roomStatus: string;
    days: AvailabilityDayDto[];
}

// Statusy pokoju zgodne ze słownikiem danych (available / cleaning / maintenance / disabled)
export const roomStatusLabels: Record<string, string> = {
    'available': 'Dostępny',
    'cleaning': 'Sprzątanie',
    'maintenance': 'W remoncie',
    'disabled': 'Wyłączony'
};

export const roomStatusStyles: Record<string, string> = {
    'available': 'bg-emerald-100 text-emerald-700',
    'cleaning': 'bg-sky-100 text-sky-700',
    'maintenance': 'bg-amber-100 text-amber-700',
    'disabled': 'bg-slate-200 text-slate-600'
};