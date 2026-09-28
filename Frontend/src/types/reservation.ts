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

export interface ReservationDto {
    reservationId: number;
    guestId: number;
    guestName: string;
    guestEmail: string;
    roomId: number;
    roomNumber: string;
    roomTypeName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    totalPrice: number;
    additionalServices: string[];
}

export interface UpdateReservationStatusDto {
    status: string;
}

export interface PaymentDto {
    paymentId?: number;
    amount: number;
    paymentDate?: string;
    method: string;
    status: string;
}

export interface InvoiceDto {
    invoiceId: number;
    invoiceNumber: string;
    issueDate: string;
    grossAmount: number;
}

export interface ReviewDto {
    reviewId?: number;
    guestName?: string;
    reservationId: number;
    roomTypeName?: string;
    rating: number;
    comment: string;
    date?: string;
}

export interface ReservationDetailsDto extends ReservationDto {
    paidAmount: number;
    payments: PaymentDto[];
    invoice: InvoiceDto | null;
    review: ReviewDto | null;
}

// Statusy rezerwacji zgodne ze słownikiem danych (pending / confirmed / cancelled / completed / no-show)
export const reservationStatusLabels: Record<string, string> = {
    'pending': 'Oczekująca',
    'confirmed': 'Potwierdzona',
    'cancelled': 'Anulowana',
    'completed': 'Zrealizowana',
    'no-show': 'Niestawienie się'
};

export const reservationStatusStyles: Record<string, string> = {
    'pending': 'bg-amber-100 text-amber-700',
    'confirmed': 'bg-emerald-100 text-emerald-700',
    'cancelled': 'bg-red-100 text-red-700',
    'completed': 'bg-sky-100 text-sky-700',
    'no-show': 'bg-slate-200 text-slate-700'
};

export const paymentMethodLabels: Record<string, string> = {
    'card': 'Karta',
    'transfer': 'Przelew',
    'cash': 'Gotówka',
    'BLIK': 'BLIK'
};

export const paymentStatusLabels: Record<string, string> = {
    'pending': 'Oczekująca',
    'completed': 'Zaksięgowana',
    'failed': 'Nieudana',
    'refunded': 'Zwrot'
};