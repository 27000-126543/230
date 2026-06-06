import { Request, Response, NextFunction } from 'express';
import TravelApplicationService from '../services/TravelApplicationService';
import BookingService from '../services/BookingService';
import { BookingType } from '../models';
import { AppError } from '../middleware/errorHandler';

export const createApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const application = await TravelApplicationService.createApplication(req.body);
    res.status(201).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const submitApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { submitterId } = req.body;
    const application = await TravelApplicationService.submitApplication(id, submitterId);
    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const approveApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { approverId, comments } = req.body;
    const application = await TravelApplicationService.approveApplication(id, approverId, comments);
    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { approverId, rejectionReason } = req.body;
    const application = await TravelApplicationService.rejectApplication(id, approverId, rejectionReason);
    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const getApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const application = await TravelApplicationService.getApplicationById(id);
    if (!application) {
      throw new AppError('差旅申请不存在', 404);
    }
    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyApplications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await TravelApplicationService.getMyApplications(employeeId, page, pageSize);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingApprovals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { approverId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await TravelApplicationService.getPendingApprovals(approverId, page, pageSize);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const startTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const application = await TravelApplicationService.startTrip(id);
    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const completeTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const application = await TravelApplicationService.completeTrip(id);
    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const recommendations = await BookingService.generateRecommendations(applicationId);
    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

export const createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { bookingType, option, employeeId } = req.body;
    const booking = await BookingService.createBooking(
      applicationId,
      bookingType as BookingType,
      option,
      employeeId
    );
    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const bookings = await BookingService.getBookingsByApplication(applicationId);
    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { operatorId } = req.body;
    const booking = await BookingService.cancelBooking(id, operatorId);
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};
