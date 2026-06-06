# 企业级差旅管理系统

企业级自动化员工差旅申请、预订、费用报销与预算控制的完整解决方案。

## 功能特性

### ✅ 差旅申请与多级审批
- 自动校验出差必要性（检测视频会议等替代方案）
- 基于历史数据的智能费用预估
- 部门月度预算实时比对
- 多级审批（超20%需总监、超50%需CFO）

### ✅ 智能预订
- 基于目的地、时间、员工偏好的航班/酒店/租车推荐
- 自动生成预订工单
- 库存锁定机制（30分钟）
- 日历事件同步

### ✅ 费用报销
- 小票拍照上传，OCR自动识别金额、日期、类别
- 与预订行程自动匹配（时间、地点、类别）
- 异常消费检测与标记
- 异常费用说明功能

### ✅ 预算控制
- 部门月度预算管理
- 实时预算占用与扣减
- 超额部分自动从下月预算扣减
- 预算超支预警

### ✅ 报表分析
- 每月1号自动生成月度报表
- 各部门差旅总花费、人均费用、预算超支次数
- 平均审批时长统计
- 近6个月趋势对比图表
- 支持PDF和Excel导出

### ✅ 多维度查询
- 按员工、部门、时间段、费用类型组合查询
- 费用明细批量导出

### ✅ 日志与预警
- 所有操作详细日志记录
- 实时异常预警推送企业群
- 预算超支、异常费用、审批超时等多重预警

### ✅ 高并发支持
- PostgreSQL连接池（20连接）
- Redis缓存热点数据
- Bull异步消息队列（OCR、报表、通知）
- 分布式锁防并发
- API限流保护

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 运行环境 | Node.js | ≥ 18.0 |
| 语言 | TypeScript | 5.x |
| Web框架 | Express | 4.x |
| 数据库 | PostgreSQL | 14+ |
| ORM | Sequelize | 6.x |
| 缓存 | Redis | 6+ |
| 消息队列 | Bull (Redis) | 4.x |
| OCR | Tesseract.js | 5.x |
| PDF导出 | PDFKit | 0.14.x |
| Excel导出 | ExcelJS | 4.x |
| 参数校验 | Joi | 17.x |
| 日志 | Winston | 3.x |
| 定时任务 | node-cron | 3.x |

---

## 快速开始

### 前置条件
- Node.js ≥ 18.0
- PostgreSQL ≥ 14
- Redis ≥ 6

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
```
编辑 `.env` 文件，配置数据库、Redis等连接信息。

### 3. 初始化数据库
```bash
# 创建数据库表结构
npm run migrate

# 初始化示例数据（推荐开发环境）
npm run seed
```

### 4. 启动服务
```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm start
```

### 5. 验证
访问 `http://localhost:3000/api/v1/health` 查看服务状态。

---

## 示例账号

运行 `npm run seed` 后创建以下测试账号：

| 邮箱 | 密码 | 角色 | 说明 |
|------|------|------|------|
| zhaoliu@company.com | password123 | 普通员工 | 技术研发部 |
| wangwu@company.com | password123 | 部门经理 | 研发经理（一级审批） |
| lisi@company.com | password123 | 总监 | 技术总监（二级审批） |
| zhangsan@company.com | password123 | CFO | 首席财务官（三级审批） |

---

## 项目结构

```
src/
├── config/              # 配置文件
│   └── index.ts
├── controllers/         # API控制器
│   ├── travelController.ts
│   ├── expenseController.ts
│   └── reportController.ts
├── database/            # 数据库相关
│   ├── index.ts         # 连接配置
│   ├── migrate.ts       # 迁移脚本
│   └── seed.ts          # 种子数据
├── middleware/          # 中间件
│   ├── errorHandler.ts  # 错误处理
│   └── validation.ts    # 参数校验
├── models/              # 数据模型
│   ├── Department.ts
│   ├── Employee.ts
│   ├── Budget.ts
│   ├── TravelApplication.ts
│   ├── ApprovalRecord.ts
│   ├── Booking.ts
│   ├── Expense.ts
│   ├── OperationLog.ts
│   ├── Alert.ts
│   └── index.ts         # 模型关联
├── routes/              # 路由
│   └── index.ts
├── services/            # 业务逻辑
│   ├── BudgetService.ts
│   ├── TravelApplicationService.ts
│   ├── BookingService.ts
│   ├── ExpenseService.ts
│   ├── ReportService.ts
│   ├── LogAlertService.ts
│   ├── ScheduledTaskService.ts
│   └── QueueService.ts
├── utils/               # 工具类
│   ├── logger.ts
│   └── redis.ts         # Redis缓存
└── app.ts               # 应用入口
```

---

## API 文档

详细API文档请参考 [API_DOCS.md](./API_DOCS.md)

---

## 核心业务流程

### 差旅申请流程
```
员工创建申请
    ↓
系统自动校验
  ├─ 必要性检查（替代方案建议）
  ├─ 费用预估（历史数据）
  └─ 预算比对（实时计算超支比例）
    ↓
员工提交申请
    ↓
预算预扣（预留金额）
    ↓
多级审批
  ├─ 超支<20%: 经理审批
  ├─ 超支20%~50%: 经理→总监
  └─ 超支≥50%: 经理→总监→CFO
    ↓
审批通过
    ↓
智能推荐（航班/酒店/租车）
    ↓
员工确认 → 锁定库存 → 生成预订 → 日历同步
    ↓
出差开始
```

### 费用报销流程
```
员工拍照上传小票
    ↓
OCR识别（金额/日期/类别）
    ↓
自动匹配
  ├─ 日期是否在出差期间
  ├─ 类别是否与预订匹配
  └─ 金额是否超预算
    ↓
  ├─ 匹配成功 → 正常入账
  └─ 匹配失败 → 标记异常
    ↓
异常费用 → 员工填写说明 → 重新审核
    ↓
出差结束 → 自动汇总 → 生成差额报告
    ↓
推送部门负责人
    ↓
超额部分从下月预算扣减
```

---

## 高并发优化方案

### 1. 数据库层
- **连接池**: 最大20个连接，最小5个空闲
- **索引优化**: 所有查询字段建立适当索引
- **事务隔离**: 预算操作用事务保证原子性
- **读写分离**: 可配置主从复制（生产环境）

### 2. 缓存层
- **Redis缓存**: 热点数据（预算、员工信息）缓存5分钟
- **分布式锁**: 预算扣减、库存锁定用Redis锁防并发
- **计数器**: API限流用Redis滑动窗口

### 3. 异步处理
- **OCR识别**: 放入队列异步处理，不阻塞请求
- **报表生成**: 大报表异步生成，完成后通知
- **预警通知**: 推送企业群异步处理
- **邮件通知**: 异步发送，失败自动重试

### 4. 应用层
- **Gzip压缩**: 响应体压缩减少带宽
- **API限流**: 单IP 15分钟最多1000次请求
- **内存优化**: 大数据量查询分页处理
- **优雅停机**: 接收信号后完成当前请求再退出

---

## 扩展建议

### 生产环境部署
1. 使用PM2或Docker容器化部署
2. 配置Nginx反向代理 + SSL
3. PostgreSQL配置主从复制
4. Redis配置集群模式
5. 接入真实的航班/酒店预订API
6. 接入企业微信/钉钉机器人推送

### 功能扩展
1. 移动端H5/小程序
2. 电子发票对接
3. 银行支付系统对接
4. 差旅政策规则引擎
5. 更多OCR服务商接入
6. 数据大屏可视化

---

## 许可证

MIT
