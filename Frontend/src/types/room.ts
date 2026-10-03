import type { PriceListEntryDto } from './admin';
import type { ReviewDto } from './reservation';

export interface RoomTypePhotoDto {
    roomTypePhotoId: number;
    photoUrl: string;
    sortOrder: number;
}

export interface RoomTypeDetailsDto {
    roomTypeId: number;
    name: string;
    description: string;
    basePrice: number;
    maxOccupancy: number;
    roomCount: number;
    photos: RoomTypePhotoDto[];
    amenities: string[];
    seasonalPrices: PriceListEntryDto[];
    averageRating: number | null;
    reviewCount: number;
    latestReviews: ReviewDto[];
}

// Kryteria wyszukiwarki ze strony głównej (daty w formacie yyyy-MM-dd)
export interface SearchCriteria {
    checkIn: string;
    checkOut: string;
    guests: number;
}

export interface RoomTypeAvailabilityDto {
    roomTypeId: number;
    fitsGuests: boolean;
    isAvailable: boolean;
    availableRooms: number;
    nights: number;
    totalPrice: number;
}