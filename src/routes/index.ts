import { Router } from 'express';
import multer from 'multer';
import { validateRequest, schemas } from '../middleware/validation';
import * as travelController from '../controllers/travelController';
import * as expenseController from '../controllers/expenseController';
import * as reportController from '../controllers/reportController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.get('/health', reportController.getHealth);
router.get('/departments', reportController.getDepartments);
router.get('/employees', reportController.getEmployees);
router.get('/employees/roles', reportController.getEmployeeRoles);
router.get('/dashboard/stats', reportController.getDashboardStats);
router.get('/dashboard/recent-applications', reportController.getRecentApplications);
router.get('/dashboard/todos', reportController.getTodoList);

router.post(
  '/travel/applications',
  validateRequest(schemas.createApplication),
  travelController.createApplication
);

router.post(
  '/travel/applications/:id/submit',
  validateRequest(schemas.submitApplication),
  travelController.submitApplication
);

router.post(
  '/travel/applications/:id/approve',
  validateRequest(schemas.approveApplication),
  travelController.approveApplication
);

router.post(
  '/travel/applications/:id/reject',
  validateRequest(schemas.rejectApplication),
  travelController.rejectApplication
);

router.get(
  '/travel/applications/:id',
  validateRequest(schemas.idParam),
  travelController.getApplication
);

router.get('/travel/employees/:employeeId/applications', travelController.getMyApplications);
router.get('/travel/approvers/:approverId/pending', travelController.getPendingApprovals);

router.post(
  '/travel/applications/:id/start',
  validateRequest(schemas.idParam),
  travelController.startTrip
);

router.post(
  '/travel/applications/:id/complete',
  validateRequest(schemas.idParam),
  travelController.completeTrip
);

router.get(
  '/travel/applications/:applicationId/recommendations',
  travelController.getRecommendations
);

router.post(
  '/travel/applications/:applicationId/bookings',
  validateRequest(schemas.createBooking),
  travelController.createBooking
);

router.get(
  '/travel/applications/:applicationId/bookings',
  travelController.getBookings
);

router.post(
  '/travel/bookings/:id/cancel',
  validateRequest(schemas.idParam),
  travelController.cancelBooking
);

router.get('/travel/bookings', travelController.getAllBookings);

router.post(
  '/expenses',
  validateRequest(schemas.createExpense),
  expenseController.createExpense
);

router.post(
  '/expenses/upload',
  upload.single('receipt'),
  expenseController.uploadReceipt
);

router.post(
  '/expenses/:id/explain',
  validateRequest(schemas.provideExplanation),
  expenseController.provideExplanation
);

router.post(
  '/expenses/:id/approve',
  validateRequest(schemas.idParam),
  expenseController.approveExpense
);

router.get(
  '/expenses/:id',
  validateRequest(schemas.idParam),
  expenseController.getExpense
);

router.get(
  '/expenses/application/:applicationId',
  expenseController.getExpensesByApplication
);

router.get('/expenses/anomaly', expenseController.getAnomalyExpenses);

router.get(
  '/expenses',
  validateRequest(schemas.queryExpenses),
  expenseController.queryExpenses
);

router.post('/expenses/export', expenseController.batchExportExpenses);

router.get('/budgets/departments/:departmentId', expenseController.getDepartmentBudget);
router.get('/budgets/departments', expenseController.getAllBudgets);

router.get(
  '/reports/monthly/:year/:month',
  validateRequest(schemas.generateReport),
  reportController.generateMonthlyReport
);

router.get(
  '/reports/monthly/:year/:month/pdf',
  validateRequest(schemas.generateReport),
  reportController.exportReportPDF
);

router.get(
  '/reports/monthly/:year/:month/excel',
  validateRequest(schemas.generateReport),
  reportController.exportReportExcel
);

router.post(
  '/reports/monthly/:year/:month/generate',
  validateRequest(schemas.generateReport),
  reportController.generateManualReport
);

router.get('/logs', reportController.getOperationLogs);

router.get('/alerts/pending', reportController.getPendingAlerts);
router.post('/alerts/:id/acknowledge', reportController.acknowledgeAlert);
router.post('/alerts/:id/resolve', reportController.resolveAlert);

export default router;
