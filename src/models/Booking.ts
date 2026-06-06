import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database';

export enum BookingType {
  FLIGHT = 'flight',
  HOTEL = 'hotel',
  CAR_RENTAL = 'car_rental',
}

export enum BookingStatus {
  RECOMMENDED = 'recommended',
  CONFIRMED = 'confirmed',
  BOOKED = 'booked',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

interface BookingAttributes {
  id: string;
  applicationId: string;
  bookingType: BookingType;
  status: BookingStatus;
  supplier: string;
  referenceNo?: string;
  details: Record<string, unknown>;
  price: number;
  currency: string;
  isLocked: boolean;
  lockedUntil?: Date;
  calendarEventId?: string;
  confirmedById?: string;
  confirmedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface BookingCreationAttributes extends Optional<BookingAttributes, 'id' | 'status' | 'isLocked' | 'currency'> {}

class Booking extends Model<BookingAttributes, BookingCreationAttributes> implements BookingAttributes {
  public id!: string;
  public applicationId!: string;
  public bookingType!: BookingType;
  public status!: BookingStatus;
  public supplier!: string;
  public referenceNo?: string;
  public details!: Record<string, unknown>;
  public price!: number;
  public currency!: string;
  public isLocked!: boolean;
  public lockedUntil?: Date;
  public calendarEventId?: string;
  public confirmedById?: string;
  public confirmedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

Booking.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    applicationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'application_id',
    },
    bookingType: {
      type: DataTypes.ENUM(...Object.values(BookingType)),
      allowNull: false,
      field: 'booking_type',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BookingStatus)),
      defaultValue: BookingStatus.RECOMMENDED,
      allowNull: false,
    },
    supplier: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    referenceNo: {
      type: DataTypes.STRING(100),
      field: 'reference_no',
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      get() {
        return parseFloat(this.getDataValue('price') as unknown as string);
      },
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'CNY',
      allowNull: false,
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_locked',
    },
    lockedUntil: {
      type: DataTypes.DATE,
      field: 'locked_until',
    },
    calendarEventId: {
      type: DataTypes.STRING(255),
      field: 'calendar_event_id',
    },
    confirmedById: {
      type: DataTypes.UUID,
      field: 'confirmed_by_id',
    },
    confirmedAt: {
      type: DataTypes.DATE,
      field: 'confirmed_at',
    },
  },
  {
    sequelize,
    modelName: 'Booking',
    tableName: 'bookings',
    indexes: [
      { fields: ['application_id'] },
      { fields: ['booking_type'] },
      { fields: ['status'] },
      { fields: ['is_locked', 'locked_until'] },
    ],
  }
);

export default Booking;
