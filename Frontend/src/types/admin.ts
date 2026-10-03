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