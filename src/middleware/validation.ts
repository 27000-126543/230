import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate({
      body: req.body,
      query: req.query,
      params: req.params,
    }, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      next(new AppError(`请求参数验证失败: ${JSON.stringify(errors)}`, 400));
      return;
    }

    if (value.body) req.body = value.body;
    if (value.query) req.query = value.query;
    if (value.params) req.params = value.params;

    next();
  };
};

export const schemas = {
  createApplication: Joi.object({
    body: Joi.object({
      employeeId: Joi.string().uuid().required(),
      travelType: Joi.string().valid('domestic', 'international').required(),
      purpose: Joi.string().min(5).max(1000).required(),
      destination: Joi.string().min(1).max(200).required(),
      departureCity: Joi.string().min(1).max(100).required(),
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
      notes: Joi.string().max(2000).optional(),
    }),
  }),

  submitApplication: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      submitterId: Joi.string().uuid().required(),
    }),
  }),

  approveApplication: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      approverId: Joi.string().uuid().required(),
      comments: Joi.string().max(1000).optional(),
    }),
  }),

  rejectApplication: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      approverId: Joi.string().uuid().required(),
      rejectionReason: Joi.string().min(5).max(2000).required(),
    }),
  }),

  createBooking: Joi.object({
    params: Joi.object({
      applicationId: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      bookingType: Joi.string().valid('flight', 'hotel', 'car_rental').required(),
      option: Joi.object().required(),
      employeeId: Joi.string().uuid().required(),
    }),
  }),

  createExpense: Joi.object({
    body: Joi.object({
      applicationId: Joi.string().uuid().required(),
      employeeId: Joi.string().uuid().required(),
      category: Joi.string()
        .valid('transportation', 'accommodation', 'meals', 'communication', 'entertainment', 'other')
        .required(),
      amount: Joi.number().positive().required(),
      expenseDate: Joi.date().iso().required(),
      merchant: Joi.string().max(200).optional(),
      location: Joi.string().max(200).optional(),
    }),
  }),

  provideExplanation: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
      explanation: Joi.string().min(5).max(2000).required(),
    }),
  }),

  queryExpenses: Joi.object({
    query: Joi.object({
      employeeId: Joi.string().uuid().optional(),
      departmentId: Joi.string().uuid().optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      category: Joi.string().optional(),
      status: Joi.string().optional(),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  }),

  generateReport: Joi.object({
    params: Joi.object({
      year: Joi.number().integer().min(2000).max(2100).required(),
      month: Joi.number().integer().min(1).max(12).required(),
    }),
  }),

  idParam: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),
};
