# 企业级差旅管理系统 API 文档

## 基础信息
- **Base URL**: `http://localhost:3000/api/v1`
- **Content-Type**: `application/json`

---

## 1. 健康检查

### GET /health
检查服务运行状态

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-15T10:00:00.000Z",
    "uptime": 123.45
  }
}
```

---

## 2. 差旅申请管理

### 2.1 创建差旅申请
**POST** `/travel/applications`

**请求体**:
```json
{
  "employeeId": "uuid",
  "travelType": "domestic | international",
  "purpose": "出差目的描述",
  "destination": "北京",
  "departureCity": "上海",
  "startDate": "2024-02-01T00:00:00.000Z",
  "endDate": "2024-02-05T00:00:00.000Z",
  "notes": "备注信息（可选）"
}
```

**说明**: 系统自动执行：
- 必要性校验（检测替代方案）
- 历史数据费用预估
- 部门预算实时比对
- 计算超支比例

### 2.2 提交差旅申请
**POST** `/travel/applications/:id/submit`

**请求体**:
```json
{
  "submitterId": "uuid"
}
```

**说明**: 
- 只能提交自己的申请
- 自动预留预算金额
- 自动根据超支比例确定审批级别

### 2.3 审批差旅申请
**POST** `/travel/applications/:id/approve`

**请求体**:
```json
{
  "approverId": "uuid",
  "comments": "审批意见（可选）"
}
```

**多级审批规则**:
- 超支 < 20%: 部门经理审批即可
- 超支 20% ~ 50%: 部门经理 → 总监
- 超支 ≥ 50%: 部门经理 → 总监 → CFO

### 2.4 拒绝差旅申请
**POST** `/travel/applications/:id/reject`

**请求体**:
```json
{
  "approverId": "uuid",
  "rejectionReason": "拒绝原因"
}
```

### 2.5 获取申请详情
**GET** `/travel/applications/:id`

### 2.6 获取我的申请列表
**GET** `/travel/employees/:employeeId/applications?page=1&pageSize=20`

### 2.7 获取待我审批的申请
**GET** `/travel/approvers/:approverId/pending?page=1&pageSize=20`

### 2.8 开始行程
**POST** `/travel/applications/:id/start`

### 2.9 结束行程
**POST** `/travel/applications/:id/complete`

---

## 3. 智能预订管理

### 3.1 获取预订推荐
**GET** `/travel/applications/:applicationId/recommendations`

**响应**:
```json
{
  "success": true,
  "data": {
    "flights": [
      {
        "airline": "国航",
        "flightNo": "CA1234",
        "departureTime": "2024-02-01T08:00:00.000Z",
        "arrivalTime": "2024-02-01T10:30:00.000Z",
        "departureAirport": "上海虹桥国际机场",
        "arrivalAirport": "北京首都国际机场",
        "cabinClass": "经济舱",
        "price": 980,
        "duration": 150,
        "stops": 0
      }
    ],
    "hotels": [...],
    "carRentals": [...]
  }
}
```

**说明**: 推荐算法基于：
- 员工出行偏好（经济舱/商务舱/头等舱）
- 目的地历史价格
- 出行时间段
- 评分排序

### 3.2 创建预订
**POST** `/travel/applications/:applicationId/bookings`

**请求体**:
```json
{
  "bookingType": "flight | hotel | car_rental",
  "option": { ... },
  "employeeId": "uuid"
}
```

**说明**:
- 自动锁定库存30分钟
- 生成预订工单号
- 同步日历事件

### 3.3 获取申请的预订列表
**GET** `/travel/applications/:applicationId/bookings`

### 3.4 取消预订
**POST** `/travel/bookings/:id/cancel`

**请求体**:
```json
{
  "operatorId": "uuid"
}
```

---

## 4. 费用报销管理

### 4.1 手动录入费用
**POST** `/expenses`

**请求体**:
```json
{
  "applicationId": "uuid",
  "employeeId": "uuid",
  "category": "transportation | accommodation | meals | communication | entertainment | other",
  "amount": 299.50,
  "expenseDate": "2024-02-02T12:30:00.000Z",
  "merchant": "商户名称（可选）",
  "location": "消费地点（可选）"
}
```

### 4.2 拍照上传小票（OCR自动识别）
**POST** `/expenses/upload`

**Content-Type**: `multipart/form-data`

**表单字段**:
- `receipt`: 小票图片文件
- `applicationId`: 差旅申请ID
- `employeeId`: 员工ID

**OCR识别内容**:
- 消费金额
- 消费日期
- 商户名称
- 自动分类

**自动匹配规则**:
- 消费日期在出差时间范围内 ✓
- 住宿费用与预订匹配 ✓
- 餐饮费用不超预算 ✓
- 异常标记 + 原因说明 ⚠️

### 4.3 异常费用说明
**POST** `/expenses/:id/explain`

**请求体**:
```json
{
  "explanation": "异常原因详细说明"
}
```

### 4.4 审批费用
**POST** `/expenses/:id/approve`

### 4.5 获取费用详情
**GET** `/expenses/:id`

### 4.6 获取某申请的所有费用
**GET** `/expenses/application/:applicationId`

**响应包含汇总**:
```json
{
  "success": true,
  "data": {
    "expenses": [...],
    "summary": {
      "total": 5680.50,
      "byCategory": {
        "transportation": 2000,
        "accommodation": 2500,
        "meals": 1180.50
      },
      "anomalyCount": 1,
      "approvedCount": 5,
      "pendingCount": 1
    }
  }
}
```

### 4.7 获取异常费用列表
**GET** `/expenses/anomaly?employeeId=uuid（可选）`

---

## 5. 多维度查询与批量导出

### 5.1 组合查询费用明细
**GET** `/expenses?employeeId=&departmentId=&startDate=&endDate=&category=&status=&page=1&pageSize=20`

**查询参数**:
- `employeeId`: 按员工筛选
- `departmentId`: 按部门筛选
- `startDate` / `endDate`: 按日期范围
- `category`: 按费用类别
- `status`: 按状态

### 5.2 批量导出费用
**POST** `/expenses/export`

**请求体**: 同上查询参数
**响应**: Excel文件下载路径

---

## 6. 预算管理

### 6.1 获取部门月度预算
**GET** `/budgets/departments/:departmentId?year=2024&month=2`

**响应**:
```json
{
  "success": true,
  "data": {
    "total": 100000,
    "used": 15000,
    "reserved": 5000,
    "available": 80000
  }
}
```

### 6.2 获取所有部门预算
**GET** `/budgets/departments?year=2024&month=2`

---

## 7. 报表分析

### 7.1 生成月度报表
**GET** `/reports/monthly/:year/:month`

**报表内容**:
- 总体支出汇总
- 各部门明细（总花费、预算、使用率、超支、出差次数、人均费用、平均审批时长）
- 近6个月趋势对比

### 7.2 导出PDF报表
**GET** `/reports/monthly/:year/:month/pdf`

### 7.3 导出Excel报表
**GET** `/reports/monthly/:year/:month/excel`

### 7.4 手动触发报表生成
**POST** `/reports/monthly/:year/:month/generate`

---

## 8. 系统日志与预警

### 8.1 查询操作日志
**GET** `/logs?resourceType=&resourceId=&operatorId=&operationType=&level=&startDate=&endDate=&page=1&pageSize=50`

### 8.2 获取待处理预警
**GET** `/alerts/pending`

### 8.3 确认预警
**POST** `/alerts/:id/acknowledge`

**请求体**:
```json
{
  "operatorId": "uuid"
}
```

### 8.4 标记预警已解决
**POST** `/alerts/:id/resolve`

**请求体**:
```json
{
  "operatorId": "uuid",
  "resolutionNote": "解决说明"
}
```

---

## 自动定时任务

系统自动执行以下定时任务：

| 任务 | 频率 | 说明 |
|------|------|------|
| 释放过期预订锁定 | 每5分钟 | 释放30分钟未确认的库存锁定 |
| 检查审批超时 | 每小时 | 超过24小时未审批发送提醒 |
| 生成月度报表 | 每月1号 02:00 | 自动生成上月报表（PDF+Excel） |
| 超额扣减处理 | 每月1号 03:00 | 上月超支部分从下月预算扣减 |

---

## 预警类型

| 类型 | 级别 | 触发条件 |
|------|------|----------|
| 预算超支 | HIGH/CRITICAL | 部门预算超支20%+/50%+ |
| 异常费用 | MEDIUM | 消费日期不符、金额超标等 |
| 审批超时 | MEDIUM | 申请等待审批超过24小时 |
| 预订失败 | HIGH | 预订接口调用失败 |
| 系统错误 | HIGH/CRITICAL | 系统ERROR/CRITICAL级日志 |

---

## 数据模型关系

```
Department (1) ── (N) Employee
     │                 │
     │                 │
     └── (N) Budget    └── (N) TravelApplication
                           │           │
                           │           ├── (N) ApprovalRecord
                           │           ├── (N) Booking
                           │           └── (N) Expense
                           │
                           └───────────┘
```
