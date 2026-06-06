import { Request, Response, NextFunction } from 'express';
import ReportService from '../services/ReportService';
import ScheduledTaskService from '../services/ScheduledTaskService';
import LogAlertService from '../services/LogAlertService';
import { AppError } from '../middleware/errorHandler';
import path from 'path';

export const generateMonthlyReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.params;
    const report = await ReportService.generateMonthlyReport(parseInt(year), parseInt(month));
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const exportReportPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.params;
    const report = await ReportService.generateMonthlyReport(parseInt(year), parseInt(month));
    const filePath = await ReportService.exportToPDF(report);

    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};

export const exportReportExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.params;
    const report = await ReportService.generateMonthlyReport(parseInt(year), parseInt(month));
    const filePath = await ReportService.exportToExcel(report);

    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};

export const generateManualReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.params;
    const result = await ScheduledTaskService.generateMonthlyReportManual(parseInt(year), parseInt(month));
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOperationLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { resourceType, resourceId, operatorId, operationType, level, startDate, endDate, page, pageSize } = req.query;

    const result = await LogAlertService.getOperationLogs(
      {
        resourceType: resourceType as any,
        resourceId: resourceId as string | undefined,
        operatorId: operatorId as string | undefined,
        operationType: operationType as any,
        level: level as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      },
      parseInt(page as string) || 1,
      parseInt(pageSize as string) || 50
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingAlerts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const alerts = await LogAlertService.getPendingAlerts();
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};

export const acknowledgeAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { operatorId } = req.body;
    const alert = await LogAlertService.acknowledgeAlert(id, operatorId);
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

export const resolveAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { operatorId, resolutionNote } = req.body;
    const alert = await LogAlertService.resolveAlert(id, operatorId, resolutionNote);
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

export const getHealth = (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
};
