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