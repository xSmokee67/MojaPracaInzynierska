using AutoMapper;
using Model;
using Services.Constants;
using Services.DTO;

namespace Services.Mapping;

public class ReservationMappingProfile : Profile
{
    public ReservationMappingProfile()
    {
        CreateMap<CreateReservationDto, Reservation>()
            .ForMember(d => d.Status, o => o.MapFrom(s => ReservationStatus.Pending))
            .ForMember(d => d.ReservationServices, o => o.Ignore())
            .ForMember(d => d.TotalPrice, o => o.Ignore())
            .ForMember(d => d.RoomId, o => o.Ignore());

        CreateMap<Reservation, ReservationDto>()
            .ForMember(d => d.GuestName, o => o.MapFrom(s => s.Guest.FirstName + " " + s.Guest.LastName))
            .ForMember(d => d.GuestEmail, o => o.MapFrom(s => s.Guest.Email ?? string.Empty))
            .ForMember(d => d.RoomNumber, o => o.MapFrom(s => s.Room.RoomNumber))
            .ForMember(d => d.RoomTypeName, o => o.MapFrom(s => s.Room.RoomType.Name))
            // Usługa naliczona kilka razy z liczbą naliczeń, np. "Śniadanie × 8" (4 osoby × 2 noce)
            .ForMember(d => d.AdditionalServices, o => o.MapFrom(s => s.ReservationServices.Select(rs => rs.Quantity > 1 ? rs.AdditionalService.Name + " × " + rs.Quantity : rs.AdditionalService.Name)));

        CreateMap<Payment, PaymentDto>();
        CreateMap<Invoice, InvoiceDto>();

        CreateMap<Review, ReviewDto>()
            .ForMember(d => d.GuestName, o => o.MapFrom(s => s.Guest.FirstName + " " + s.Guest.LastName))
            .ForMember(d => d.RoomTypeName, o => o.MapFrom(s => s.Reservation.Room.RoomType.Name));

        CreateMap<Reservation, ReservationDetailsDto>()
            .IncludeBase<Reservation, ReservationDto>()
            .ForMember(d => d.PaidAmount, o => o.MapFrom(s => s.Payments.Where(p => p.Status == PaymentStatus.Completed).Sum(p => p.Amount)));
    }
}