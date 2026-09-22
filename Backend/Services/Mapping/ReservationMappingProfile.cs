using AutoMapper;
using Model;
using Services.DTO;

namespace Services.Mapping;

public class ReservationMappingProfile : Profile
{
    public ReservationMappingProfile()
    {
        CreateMap<CreateReservationDto, Reservation>()
            .ForMember(d => d.Status, o => o.MapFrom(s => "pending"))
            .ForMember(d => d.ReservationServices, o => o.Ignore())
            .ForMember(d => d.TotalPrice, o => o.Ignore())
            .ForMember(d => d.RoomId, o => o.Ignore());
    }
}