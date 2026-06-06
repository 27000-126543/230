import { Transaction } from 'sequelize';
import icalGenerator from 'ical-generator';
import {
  Booking,
  BookingType,
  BookingStatus,
  TravelApplication,
  Employee,
  TravelApplicationStatus,
} from '../models';
import logger from '../utils/logger';
import sequelize from '../database';

export interface FlightOption {
  airline: string;
  flightNo: string;
  departureTime: Date;
  arrivalTime: Date;
  departureAirport: string;
  arrivalAirport: string;
  cabinClass: string;
  price: number;
  duration: number;
  stops: number;
}

export interface HotelOption {
  name: string;
  address: string;
  starRating: number;
  checkIn: Date;
  checkOut: Date;
  roomType: string;
  pricePerNight: number;
  totalPrice: number;
  amenities: string[];
  distanceFromDestination: number;
}

export interface CarRentalOption {
  company: string;
  carType: string;
  pickUpLocation: string;
  dropOffLocation: string;
  pickUpTime: Date;
  dropOffTime: Date;
  pricePerDay: number;
  totalPrice: number;
  features: string[];
}

export interface RecommendationResult {
  flights: FlightOption[];
  hotels: HotelOption[];
  carRentals: CarRentalOption[];
}

class BookingService {
  async generateRecommendations(applicationId: string): Promise<RecommendationResult> {
    const application = await TravelApplication.findByPk(applicationId, {
      include: [{ model: Employee, as: 'employee' }],
    });

    if (!application) {
      throw new Error('差旅申请不存在');
    }

    if (application.status !== TravelApplicationStatus.APPROVED) {
      throw new Error('只有已审批通过的申请才能生成推荐');
    }

    const employee = application.employee;
    const preference = employee?.travelPreference || 'economy';

    const flights = await this.recommendFlights(
      application.departureCity,
      application.destination,
      application.startDate,
      application.endDate,
      preference
    );

    const hotels = await this.recommendHotels(
      application.destination,
      application.startDate,
      application.endDate,
      preference
    );

    const carRentals = await this.recommendCarRentals(
      application.destination,
      application.startDate,
      application.endDate
    );

    logger.info(`生成推荐 - 申请号: ${application.applicationNo}, 航班: ${flights.length}, 酒店: ${hotels.length}`);

    return { flights, hotels, carRentals };
  }

  async recommendFlights(
    departure: string,
    destination: string,
    startDate: Date,
    endDate: Date,
    preference: string
  ): Promise<FlightOption[]> {
    const airlines = ['国航', '东航', '南航', '海航'];
    const cabins = preference === 'economy' 
      ? ['经济舱'] 
      : preference === 'business' 
        ? ['商务舱', '经济舱'] 
        : ['头等舱', '商务舱', '经济舱'];

    const flights: FlightOption[] = [];

    for (let i = 0; i < 3; i++) {
      const airline = airlines[i % airlines.length];
      const cabin = cabins[Math.min(i, cabins.length - 1)];
      const basePrice = preference === 'economy' ? 800 : preference === 'business' ? 1800 : 3500;
      const priceVariation = (Math.random() - 0.5) * 200;

      const departureHour = 8 + i * 3;
      const depTime = new Date(startDate);
      depTime.setHours(departureHour, 0, 0, 0);

      const arrTime = new Date(depTime);
      arrTime.setHours(depTime.getHours() + 2 + Math.floor(Math.random() * 3));

      flights.push({
        airline,
        flightNo: `${airline.substring(0, 2).toUpperCase()}${1000 + Math.floor(Math.random() * 9000)}`,
        departureTime: depTime,
        arrivalTime: arrTime,
        departureAirport: `${departure}国际机场`,
        arrivalAirport: `${destination}国际机场`,
        cabinClass: cabin,
        price: Math.round(basePrice + priceVariation),
        duration: Math.round((arrTime.getTime() - depTime.getTime()) / (1000 * 60)),
        stops: 0,
      });
    }

    return flights.sort((a, b) => a.price - b.price);
  }

  async recommendHotels(
    destination: string,
    checkIn: Date,
    checkOut: Date,
    preference: string
  ): Promise<HotelOption[]> {
    const hotelChains = ['希尔顿', '万豪', '洲际', '香格里拉', '如家精选'];
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const hotels: HotelOption[] = [];

    for (let i = 0; i < 4; i++) {
      const starRating = preference === 'economy' ? 3 + (i % 2) : preference === 'business' ? 4 + (i % 2) : 5;
      const pricePerNightBase = starRating * 150;
      const pricePerNight = Math.round(pricePerNightBase + (Math.random() - 0.5) * 100);

      hotels.push({
        name: `${destination}${hotelChains[i % hotelChains.length]}酒店`,
        address: `${destination}市XX区XX路${100 + i * 50}号`,
        starRating,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        roomType: starRating >= 4 ? '豪华大床房' : '标准大床房',
        pricePerNight,
        totalPrice: pricePerNight * nights,
        amenities: ['WiFi', '早餐', '健身房'].slice(0, starRating - 1),
        distanceFromDestination: Math.round(1 + Math.random() * 10 * 10) / 10,
      });
    }

    return hotels.sort((a, b) => a.totalPrice - b.totalPrice);
  }

  async recommendCarRentals(
    destination: string,
    pickUpTime: Date,
    dropOffTime: Date
  ): Promise<CarRentalOption[]> {
    const companies = ['神州租车', '一嗨租车', '携程租车'];
    const carTypes = ['经济型', '舒适型', 'SUV'];
    const days = Math.ceil((dropOffTime.getTime() - pickUpTime.getTime()) / (1000 * 60 * 60 * 24));

    const rentals: CarRentalOption[] = [];

    for (let i = 0; i < 3; i++) {
      const pricePerDayBase = [150, 250, 400][i];
      const pricePerDay = Math.round(pricePerDayBase + (Math.random() - 0.5) * 30);

      rentals.push({
        company: companies[i],
        carType: carTypes[i],
        pickUpLocation: `${destination}机场T2航站楼`,
        dropOffLocation: `${destination}机场T2航站楼`,
        pickUpTime: new Date(pickUpTime),
        dropOffTime: new Date(dropOffTime),
        pricePerDay,
        totalPrice: pricePerDay * days,
        features: ['保险', 'GPS', '蓝牙'].slice(0, i + 1),
      });
    }

    return rentals.sort((a, b) => a.totalPrice - b.totalPrice);
  }

  async createBooking(
    applicationId: string,
    bookingType: BookingType,
    option: Record<string, unknown>,
    employeeId: string
  ): Promise<Booking> {
    const t = await sequelize.transaction();

    try {
      const application = await TravelApplication.findByPk(applicationId, { transaction: t });
      if (!application) {
        throw new Error('差旅申请不存在');
      }

      if (application.status !== TravelApplicationStatus.APPROVED && application.status !== TravelApplicationStatus.IN_PROGRESS) {
        throw new Error('只有已审批或进行中的申请才能预订');
      }

      const supplier = option.supplier || option.airline || option.name || option.company || '未知供应商';
      const price = option.price || option.totalPrice || 0;

      const booking = await Booking.create(
        {
          applicationId,
          bookingType,
          status: BookingStatus.CONFIRMED,
          supplier: String(supplier),
          details: option,
          price: Number(price),
          isLocked: true,
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
          confirmedById: employeeId,
          confirmedAt: new Date(),
        },
        { transaction: t }
      );

      await booking.reload({ transaction: t });

      booking.referenceNo = `BK${booking.id.substring(0, 8).toUpperCase()}`;
      booking.status = BookingStatus.BOOKED;
      await booking.save({ transaction: t });

      const calendarEvent = await this.generateCalendarEvent(application, booking);
      booking.calendarEventId = calendarEvent.uid();
      await booking.save({ transaction: t });

      await t.commit();
      logger.info(`创建预订 - 类型: ${bookingType}, 申请: ${applicationId}, 预订ID: ${booking.id}`);

      return booking.reload();
    } catch (error) {
      await t.rollback();
      logger.error('创建预订失败:', error);
      throw error;
    }
  }

  generateCalendarEvent(application: TravelApplication, booking: Booking): icalGenerator.ICalEvent {
    const cal = icalGenerator({});
    const event = cal.createEvent({
      start: application.startDate,
      end: application.endDate,
      summary: `出差 - ${application.destination}`,
      description: `差旅申请号: ${application.applicationNo}\n目的: ${application.purpose}\n预订类型: ${booking.bookingType}`,
      location: application.destination,
    });

    return event;
  }

  async cancelBooking(bookingId: string, operatorId: string): Promise<Booking> {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new Error('预订不存在');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('预订已取消');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.isLocked = false;
    booking.lockedUntil = null;
    await booking.save();

    logger.info(`取消预订 - 预订ID: ${bookingId}, 操作人: ${operatorId}`);
    return booking.reload();
  }

  async getBookingsByApplication(applicationId: string): Promise<Booking[]> {
    return Booking.findAll({
      where: { applicationId },
      order: [['createdAt', 'DESC']],
    });
  }

  async getBookingById(id: string): Promise<Booking | null> {
    return Booking.findByPk(id, {
      include: [{ model: TravelApplication, as: 'application' }],
    });
  }

  async lockInventory(bookingId: string, durationMinutes: number = 30): Promise<Booking> {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new Error('预订不存在');
    }

    booking.isLocked = true;
    booking.lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    await booking.save();

    logger.info(`锁定库存 - 预订ID: ${bookingId}, 锁定至: ${booking.lockedUntil}`);
    return booking;
  }

  async unlockExpiredLocks(): Promise<number> {
    const now = new Date();
    const [affectedCount] = await Booking.update(
      { isLocked: false, lockedUntil: null },
      {
        where: {
          isLocked: true,
          lockedUntil: { [require('sequelize').Op.lt]: now },
          status: { [require('sequelize').Op.ne]: BookingStatus.BOOKED },
        },
      }
    );

    if (affectedCount > 0) {
      logger.info(`释放过期锁定 - 数量: ${affectedCount}`);
    }

    return affectedCount;
  }
}

export default new BookingService();
