export interface CreateReservationDto {
    guestId: number;
    roomTypeId: number;
    checkInDate: string;
    checkOutDate: string;
    additionalServiceIds: number[];
}

export interface AvailabilityResponse{
    isAvailable: boolean;
    message: string;
}

export interface PriceResponse{
    totalPrice: number;
}