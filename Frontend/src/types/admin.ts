export interface RoomTypeDto {
    roomTypeId?: number;
    name: string;
    basePrice: number;
    maxOccupancy: number;
}

export interface RoomDto {
    roomId?: number;
    roomTypeId: number;
    roomTypeName?: string;
    roomNumber: string;
    status: string;
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