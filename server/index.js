const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const useMockData = (process.env.USE_MOCK_DATA || 'false').toLowerCase() === 'true';
const dbAuthType = (process.env.DB_AUTH_TYPE || 'windows').toLowerCase();
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}
if (useMockData && !process.env.MOCK_ADMIN_PASSWORD) {
  throw new Error('MOCK_ADMIN_PASSWORD is required when USE_MOCK_DATA=true.');
}
if (!['windows', 'sql'].includes(dbAuthType)) {
  throw new Error('DB_AUTH_TYPE must be either "windows" or "sql".');
}
if (dbPort !== undefined && (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535)) {
  throw new Error('DB_PORT must be an integer between 1 and 65535.');
}
const useWindowsAuth = dbAuthType === 'windows';
if (!useMockData && !process.env.DB_SERVER) {
  throw new Error('DB_SERVER must be configured when USE_MOCK_DATA=false.');
}
if (!useMockData && !useWindowsAuth && (!process.env.DB_USER || !process.env.DB_PASSWORD)) {
  throw new Error('DB_USER and DB_PASSWORD must be configured when using SQL authentication.');
}
const sql = useWindowsAuth ? require('mssql/msnodesqlv8') : require('mssql');
const mockAdminPasswordHash = process.env.MOCK_ADMIN_PASSWORD
  ? bcrypt.hashSync(process.env.MOCK_ADMIN_PASSWORD, 10)
  : '';
const mockBranchAdminPasswordHash = process.env.MOCK_BRANCH_ADMIN_PASSWORD
  ? bcrypt.hashSync(process.env.MOCK_BRANCH_ADMIN_PASSWORD, 10)
  : '';

const dbConfig = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || 'HairWigHouseDb',
  ...(useWindowsAuth
    ? {
      driver: process.env.DB_DRIVER || 'ODBC Driver 17 for SQL Server',
      options: {
        trustedConnection: true,
        trustServerCertificate: true,
      },
    }
    : {
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || '',
      port: dbPort || 1433,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
    }),
};

const mockData = {
  branches: [
    { BranchId: 'b1', BranchCode: 'HO', BranchName: 'Head Office', Address: '1 Main Road', City: 'Delhi', State: 'Delhi', Pincode: '110001', Phone: '9999999999', Email: 'admin@hairwighouse.com', GSTNumber: '07ABCDE1234F1Z2', PANNumber: 'ABCDE1234F', InvoicePrefix: 'HO', IsActive: true, Terms: [{ TermText: 'All payments must be cleared before delivery.', DisplayOrder: 1 }] },
    { BranchId: 'b2', BranchCode: 'ND', BranchName: 'New Delhi Branch', Address: '22 Sector Road', City: 'New Delhi', State: 'Delhi', Pincode: '110045', Phone: '9898989898', Email: 'nd@hairwighouse.com', GSTNumber: '09ABCDE1234F1Z2', PANNumber: 'ABCDF1234F', InvoicePrefix: 'ND', IsActive: true, Terms: [{ TermText: 'Returns accepted within 7 days in original condition.', DisplayOrder: 1 }] },
  ],
  roles: [
    { RoleId: 'r1', RoleCode: 'SUPER_ADMIN', RoleName: 'SuperAdmin', Description: 'Full system access across all branches', IsSystem: true, IsActive: true },
    { RoleId: 'r2', RoleCode: 'BRANCH_ADMIN', RoleName: 'BranchAdmin', Description: 'Manage assigned branch operations', IsSystem: true, IsActive: true },
    { RoleId: 'r3', RoleCode: 'USER', RoleName: 'User', Description: 'Limited user access', IsSystem: true, IsActive: true },
  ],
  permissions: {
    SuperAdmin: [
      { module: 'dashboard', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'branches', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'clients', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'brands', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'units', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'groups', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'treatments', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'items', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'users', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'roles', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'bills', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'payments', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'reports', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
    ],
    BranchAdmin: [
      { module: 'dashboard', canView: true, canAdd: true, canEdit: false, canDelete: false, canExport: true },
      { module: 'branches', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: true },
      { module: 'clients', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'brands', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'units', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'groups', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'treatments', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'items', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'users', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'roles', canView: false, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'bills', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'payments', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'reports', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: true },
    ],
    User: [
      { module: 'dashboard', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'branches', canView: false, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'clients', canView: false, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'brands', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'units', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'groups', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'treatments', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'items', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'users', canView: false, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'roles', canView: false, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'bills', canView: true, canAdd: true, canEdit: false, canDelete: false, canExport: false },
      { module: 'payments', canView: true, canAdd: true, canEdit: false, canDelete: false, canExport: false },
      { module: 'reports', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: false },
    ],
  },
  users: [
    {
      UserId: 'u1',
      Username: 'Admin',
      PasswordHash: mockAdminPasswordHash,
      FullName: 'System Administrator',
      Email: 'admin@hairwighouse.com',
      Mobile: '9876543210',
      RoleId: 'r1',
      RoleCode: 'SUPER_ADMIN',
      RoleName: 'SuperAdmin',
      BranchId: 'b1',
      BranchName: 'Head Office',
      IsActive: true,
      MustChangePassword: false,
    },
    {
      UserId: 'u2',
      Username: 'branchadmin',
      PasswordHash: mockBranchAdminPasswordHash,
      FullName: 'Branch Manager',
      Email: 'branchadmin@hairwighouse.com',
      Mobile: '9123456789',
      RoleId: 'r2',
      RoleCode: 'BRANCH_ADMIN',
      RoleName: 'BranchAdmin',
      BranchId: 'b2',
      BranchName: 'New Delhi Branch',
      IsActive: true,
      MustChangePassword: false,
    },
  ],
  bills: [
    { SaleBillId: 's1', BillNumber: 'HO-1001', BranchId: 'b1', BranchName: 'Head Office', CustomerName: 'Anand Kumar', BillDate: '2026-11-01', TotalAmount: 12500, DiscountAmount: 500, GSTAmount: 950, NetAmount: 12950 },
    { SaleBillId: 's2', BillNumber: 'ND-2001', BranchId: 'b2', BranchName: 'New Delhi Branch', CustomerName: 'Rohit Sharma', BillDate: '2026-11-05', TotalAmount: 14300, DiscountAmount: 250, GSTAmount: 1200, NetAmount: 15250 },
  ],
  payments: [
    { PaymentId: 'p1', SaleBillId: 's1', BranchId: 'b1', BranchName: 'Head Office', PaymentDate: '2026-11-01', PaymentMode: 'Cash', Amount: 12950, ReferenceNumber: 'CASH-001', Notes: 'Paid in full' },
    { PaymentId: 'p2', SaleBillId: 's2', BranchId: 'b2', BranchName: 'New Delhi Branch', PaymentDate: '2026-11-05', PaymentMode: 'UPI', Amount: 15250, ReferenceNumber: 'UPI-456', Notes: 'Online payment' },
  ],
  clients: [],
  brands: [],
  units: [],
  groups: [],
  treatments: [],
  items: [],
};

const ROLE_MODULE_KEYS = mockData.permissions.SuperAdmin.map((permission) => permission.module);

let sqlPool = null;

async function connectDatabase() {
  if (useMockData) {
    return null;
  }

  if (!sqlPool) {
    sqlPool = await sql.connect(dbConfig);
  }
  return sqlPool;
}

async function getSqlRolePermissionsMap(roleId, roleName) {
  const result = await (await connectDatabase()).request()
    .input('RoleId', sql.UniqueIdentifier, roleId)
    .query('SELECT ModuleKey, CanAccess FROM dbo.RolePermissions WHERE RoleId = @RoleId');
  if (!result.recordset.length) {
    return getRolePermissionsMap(roleName);
  }

  return result.recordset.reduce((permissions, row) => {
    const canAccessModule = Boolean(row.CanAccess);
    permissions[row.ModuleKey] = {
      canView: canAccessModule,
      canAdd: canAccessModule,
      canEdit: canAccessModule,
      canDelete: canAccessModule,
      canExport: canAccessModule,
    };
    return permissions;
  }, {});
}

function getRolePermissionsMap(roleName) {
  const normalizedRole = String(roleName || '').replace(/[^a-z]/gi, '').toLowerCase();
  const builtInRole = {
    superadmin: 'SuperAdmin',
    branchadmin: 'BranchAdmin',
    user: 'User',
  }[normalizedRole];
  const permissionRole = builtInRole || Object.keys(mockData.permissions)
    .find((name) => name.replace(/[^a-z]/gi, '').toLowerCase() === normalizedRole);

  return (mockData.permissions[permissionRole] || []).reduce((acc, permission) => {
    acc[permission.module] = permission;
    return acc;
  }, {});
}

function getRoleCode(roleName) {
  const normalizedRole = String(roleName || '').replace(/[^a-z]/gi, '').toLowerCase();
  const builtInRoleCode = {
    superadmin: 'SUPER_ADMIN',
    branchadmin: 'BRANCH_ADMIN',
    user: 'USER',
  }[normalizedRole];
  if (builtInRoleCode) return builtInRoleCode;

  const customRoleCode = String(roleName || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return customRoleCode || null;
}

function isProtectedRole(role) {
  return Boolean(role.IsSystem)
    || ['SUPER_ADMIN', 'BRANCH_ADMIN', 'USER'].includes(role.RoleCode || getRoleCode(role.RoleName));
}

function isSuperAdmin(req) {
  return (req.user.roleCode || getRoleCode(req.user.role)) === 'SUPER_ADMIN';
}

function isBranchAdmin(req) {
  return (req.user.roleCode || getRoleCode(req.user.role)) === 'BRANCH_ADMIN';
}

function normalizeContactNo(value) {
  return String(value || '').replace(/\D/g, '');
}

function getMockClientOutstanding(clientId) {
  const clientBills = mockData.bills.filter((bill) => bill.ClientId === clientId && bill.Status !== 'VOID');
  const getBillBalance = (bill) => {
    const billId = bill.SaleBillId || bill.BillId;
    const paid = mockData.payments
      .filter((payment) => (payment.SaleBillId || payment.BillId) === billId)
      .reduce((total, payment) => total + Number(payment.Amount || 0), 0);
    return Math.max(0, Number(bill.NetAmount ?? bill.GrandTotal ?? 0) - paid);
  };
  const latestBill = clientBills[0];
  if (latestBill && Number(latestBill.PreviousBalance || 0) > 0) return getBillBalance(latestBill);
  return clientBills.reduce((total, bill) => total + getBillBalance(bill), 0);
}

function syncMockBillClient({ customerName, customerMobile, customerAddress, customerEmail }) {
  const contactNo = normalizeContactNo(customerMobile);
  if (!contactNo) throw new Error('A valid client contact number is required to save the client.');
  let client = mockData.clients.find((item) => normalizeContactNo(item.ContactNo) === contactNo);
  if (!client) {
    client = { ClientId: `c${Date.now()}`, IsActive: true };
    mockData.clients.unshift(client);
  }
  Object.assign(client, {
    ClientName: customerName,
    Address: customerAddress,
    ContactNo: contactNo,
    Email: customerEmail,
    IsActive: true,
  });
  return client.ClientId;
}

async function syncBillClient(transaction, { customerName, customerMobile, customerAddress, customerEmail }) {
  const contactNo = normalizeContactNo(customerMobile);
  if (!contactNo) throw new Error('A valid client contact number is required to save the client.');
  const normalizedStoredContact = `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(ContactNo)), N' ', N''), N'-', N''), N'+', N''), N'(', N''), N')', N''), N'.', N''), N'/', N'')`;
  const found = await transaction.request()
    .input('ContactNo', sql.NVarChar(30), contactNo)
    .query(`SELECT TOP (1) ClientId FROM dbo.Clients WITH (UPDLOCK, HOLDLOCK) WHERE ${normalizedStoredContact} = @ContactNo ORDER BY IsActive DESC, CreatedAt DESC`);
  const clientId = found.recordset[0]?.ClientId;
  if (clientId) {
    await transaction.request()
      .input('ClientId', sql.UniqueIdentifier, clientId)
      .input('ClientName', sql.NVarChar(180), customerName)
      .input('Address', sql.NVarChar(500), customerAddress)
      .input('ContactNo', sql.NVarChar(30), contactNo)
      .input('Email', sql.NVarChar(254), customerEmail)
      .query(`UPDATE dbo.Clients SET ClientName = @ClientName, Address = @Address, ContactNo = @ContactNo, Email = @Email, IsActive = 1, ModifiedAt = SYSUTCDATETIME() WHERE ClientId = @ClientId`);
    return clientId;
  } else {
    const inserted = await transaction.request()
      .input('ClientName', sql.NVarChar(180), customerName)
      .input('Address', sql.NVarChar(500), customerAddress)
      .input('ContactNo', sql.NVarChar(30), contactNo)
      .input('Email', sql.NVarChar(254), customerEmail)
      .query(`INSERT INTO dbo.Clients (ClientId, ClientName, Address, ContactNo, Email, ClientPan, ClientCst, IsActive, CreatedAt, ModifiedAt) OUTPUT inserted.ClientId VALUES (NEWID(), @ClientName, @Address, @ContactNo, @Email, N'', N'', 1, SYSUTCDATETIME(), SYSUTCDATETIME())`);
    return inserted.recordset[0].ClientId;
  }
}

function isCurrentMonthUser(req) {
  return (req.user.roleCode || getRoleCode(req.user.role)) === 'USER';
}

function getCurrentMonthRange(date = new Date()) {
  return {
    monthStart: new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)),
    nextMonthStart: new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 1)),
    monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
  };
}

function isCurrentMonthDate(value, monthKey = getCurrentMonthRange().monthKey) {
  const dateValue = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value || '').slice(0, 10);
  return isValidBillDate(dateValue) && dateValue.slice(0, 7) === monthKey;
}

function filterBranchRecords(req, records, dateField) {
  const { monthKey } = getCurrentMonthRange();
  return records.filter((record) => (
    (isSuperAdmin(req) || (
      req.user.branchId
      && String(record.BranchId || '').toLowerCase() === String(req.user.branchId).toLowerCase()
    ))
    && (!isCurrentMonthUser(req) || isCurrentMonthDate(record[dateField], monthKey))
  ));
}

const BILL_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getBillNumberPrefix(branchCode, billDate) {
  const monthIndex = Number(billDate.slice(5, 7)) - 1;
  return `${String(branchCode).trim().toUpperCase()}-${BILL_MONTH_NAMES[monthIndex]}`;
}

function formatBillNumber(branchCode, billDate, sequence) {
  return `${getBillNumberPrefix(branchCode, billDate)}-${String(sequence).padStart(3, '0')}`;
}

function isValidBillDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function getNextMockBillSequence(branchCode, billDate) {
  const prefix = `${getBillNumberPrefix(branchCode, billDate)}-`;
  return mockData.bills
    // BillNumber has a global unique constraint, so include every existing
    // number with this prefix (including voided bills and other branches).
    .filter((bill) => String(bill.BillNumber || '').startsWith(prefix))
    .reduce((latest, bill) => {
      const sequence = Number(String(bill.BillNumber).slice(prefix.length));
      return Number.isSafeInteger(sequence) ? Math.max(latest, sequence) : latest;
    }, 0) + 1;
}

function buildToken(user, permissions = getRolePermissionsMap(user.RoleName || user.role)) {
  return jwt.sign(
    {
      userId: user.UserId || user.userId,
      username: user.Username || user.username,
      role: user.RoleName || user.role,
      roleCode: user.RoleCode || user.roleCode || getRoleCode(user.RoleName || user.role),
      branchId: user.BranchId || user.branchId,
      branchName: user.BranchName || user.branchName,
      email: user.Email || user.email,
      permissions,
    },
    JWT_SECRET,
    { expiresIn: '8h' },
  );
}

function getAuthUserFromToken(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function authRequired(req, res, next) {
  const user = getAuthUserFromToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = user;
  req.permissions = user.permissions || getRolePermissionsMap(user.role || 'User');
  next();
}

function canAccess(req, moduleName, action) {
  if (isBranchAdmin(req) && moduleName === 'users' && ['canView', 'canAdd'].includes(action)) {
    return true;
  }
  const permissions = req.permissions || {};
  const modulePermission = permissions[moduleName] || {};
  return Boolean(modulePermission[action]);
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const masterDefinitions = [
  {
    resource: 'clients',
    module: 'clients',
    table: 'Clients',
    idColumn: 'ClientId',
    collection: 'clients',
    nameColumn: 'ClientName',
    fields: [
      { name: 'ClientName', type: sql.NVarChar(180), required: true, maxLength: 180 },
      { name: 'Address', type: sql.NVarChar(500), required: true, maxLength: 500 },
      { name: 'ContactNo', type: sql.NVarChar(30), required: true, maxLength: 30 },
      { name: 'Email', type: sql.NVarChar(254), maxLength: 254 },
      { name: 'ClientPan', type: sql.NVarChar(20), maxLength: 20 },
      { name: 'ClientCst', type: sql.NVarChar(30), maxLength: 30 },
    ],
  },
  {
    resource: 'brands',
    module: 'brands',
    table: 'Brands',
    idColumn: 'BrandId',
    collection: 'brands',
    nameColumn: 'BrandName',
    fields: [
      { name: 'BrandName', type: sql.NVarChar(120), required: true, maxLength: 120 },
    ],
  },
  {
    resource: 'units',
    module: 'units',
    table: 'Units',
    idColumn: 'UnitId',
    collection: 'units',
    nameColumn: 'UnitName',
    fields: [
      { name: 'UnitName', type: sql.NVarChar(30), required: true, maxLength: 30 },
    ],
  },
  {
    resource: 'groups',
    module: 'groups',
    table: 'ItemGroups',
    idColumn: 'GroupId',
    collection: 'groups',
    nameColumn: 'GroupName',
    fields: [
      { name: 'GroupName', type: sql.NVarChar(120), required: true, maxLength: 120 },
    ],
  },
  {
    resource: 'treatments',
    module: 'treatments',
    table: 'Treatments',
    idColumn: 'TreatmentId',
    collection: 'treatments',
    nameColumn: 'TreatmentName',
    fields: [
      { name: 'TreatmentName', type: sql.NVarChar(180), required: true, maxLength: 180 },
      { name: 'AliasName', type: sql.NVarChar(180), required: true, maxLength: 180 },
      { name: 'TaxRate', type: sql.Decimal(5, 2), required: true, numeric: true, max: 100 },
      { name: 'TotalPrice', type: sql.Decimal(18, 2), required: true, numeric: true },
      { name: 'TreatmentType', type: sql.NVarChar(80), required: true, maxLength: 80 },
      { name: 'ProductType', type: sql.NVarChar(80), required: true, maxLength: 80 },
    ],
  },
  {
    resource: 'items',
    module: 'items',
    table: 'Items',
    idColumn: 'ItemId',
    collection: 'items',
    nameColumn: 'ItemName',
    fields: [
      { name: 'ItemName', type: sql.NVarChar(180), required: true, maxLength: 180 },
      { name: 'Brand', type: sql.NVarChar(120), required: true, maxLength: 120 },
      { name: 'GroupName', type: sql.NVarChar(120), required: true, maxLength: 120 },
      { name: 'Unit', type: sql.NVarChar(30), required: true, maxLength: 30 },
      { name: 'TotalPrice', type: sql.Decimal(18, 2), required: true, numeric: true },
      { name: 'OpeningStock', type: sql.Decimal(18, 3), required: true, numeric: true },
      { name: 'TaxRate', type: sql.Decimal(5, 2), required: true, numeric: true, max: 100 },
    ],
  },
];

function validateMasterInput(definition, body) {
  const values = {};
  for (const field of definition.fields) {
    const rawValue = body?.[field.name];
    if (field.numeric) {
      const value = Number(rawValue);
      if (rawValue === '' || rawValue === null || rawValue === undefined || !Number.isFinite(value) || value < 0
          || (field.max !== undefined && value > field.max)) {
        return { error: `${field.name} must be a valid non-negative number${field.max ? ` no greater than ${field.max}` : ''}.` };
      }
      values[field.name] = value;
      continue;
    }

    const value = String(rawValue ?? '').trim();
    if (field.required && !value) {
      return { error: `${field.name} is required.` };
    }
    if (value.length > field.maxLength) {
      return { error: `${field.name} exceeds the allowed length.` };
    }
    values[field.name] = value;
  }
  return { values };
}

function sendMasterDatabaseError(error, res, operation, label) {
  if (error.number === 2601 || error.number === 2627) {
    return res.status(409).json({ message: `${label} already exists.` });
  }
  console.error(`Failed ${operation} ${label.toLowerCase()} in SQL Server:`, error.message);
  return res.status(500).json({ message: `Could not ${operation} ${label.toLowerCase()}.` });
}

function registerMasterRoutes(definition) {
  const route = `/api/${definition.resource}`;
  const columns = definition.fields.map((field) => `[${field.name}]`).join(', ');
  const parameters = definition.fields.map((field) => `@${field.name}`).join(', ');
  const updates = definition.fields.map((field) => `[${field.name}] = @${field.name}`).join(', ');

  app.get(route, authRequired, async (req, res) => {
    const canUseInBillForm = ['items', 'treatments'].includes(definition.module)
      && canAccess(req, 'bills', 'canAdd');
    if (!canAccess(req, definition.module, 'canView') && !canUseInBillForm) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (useMockData) {
      return res.json(mockData[definition.collection]);
    }
    try {
      const result = await (await connectDatabase()).request()
        .query(`SELECT * FROM dbo.[${definition.table}] ORDER BY [${definition.nameColumn}]`);
      return res.json(result.recordset);
    } catch (error) {
      return sendMasterDatabaseError(error, res, 'load', definition.resource);
    }
  });

  app.post(route, authRequired, async (req, res) => {
    if (!canAccess(req, definition.module, 'canAdd')) {
      return res.status(403).json({ message: 'Add not allowed.' });
    }
    const { values, error } = validateMasterInput(definition, req.body);
    if (error) return res.status(400).json({ message: error });

    if (useMockData) {
      const record = {
        ...values,
        [definition.idColumn]: `${definition.resource[0]}${Date.now()}`,
        IsActive: true,
      };
      mockData[definition.collection].unshift(record);
      return res.status(201).json(record);
    }

    try {
      const request = (await connectDatabase()).request();
      request.input('Id', sql.UniqueIdentifier, randomUUID());
      definition.fields.forEach((field) => request.input(field.name, field.type, values[field.name]));
      const result = await request.query(`
        INSERT INTO dbo.[${definition.table}] ([${definition.idColumn}], ${columns}, IsActive, CreatedAt, ModifiedAt)
        OUTPUT inserted.*
        VALUES (@Id, ${parameters}, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
      `);
      return res.status(201).json(result.recordset[0]);
    } catch (databaseError) {
      return sendMasterDatabaseError(databaseError, res, 'create', definition.resource);
    }
  });

  app.put(`${route}/:id`, authRequired, async (req, res) => {
    if (!canAccess(req, definition.module, 'canEdit')) {
      return res.status(403).json({ message: 'Edit not allowed.' });
    }
    const { values, error } = validateMasterInput(definition, req.body);
    if (error) return res.status(400).json({ message: error });

    if (useMockData) {
      const record = mockData[definition.collection].find((item) => item[definition.idColumn] === req.params.id && item.IsActive);
      if (!record) return res.status(404).json({ message: `${definition.resource} record not found.` });
      Object.assign(record, values);
      return res.json(record);
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid record ID.' });
    }

    try {
      const request = (await connectDatabase()).request()
        .input('Id', sql.UniqueIdentifier, req.params.id);
      definition.fields.forEach((field) => request.input(field.name, field.type, values[field.name]));
      const result = await request.query(`
        UPDATE dbo.[${definition.table}]
        SET ${updates}, ModifiedAt = SYSUTCDATETIME()
        OUTPUT inserted.*
        WHERE [${definition.idColumn}] = @Id AND IsActive = 1
      `);
      if (!result.recordset.length) return res.status(404).json({ message: `${definition.resource} record not found.` });
      return res.json(result.recordset[0]);
    } catch (databaseError) {
      return sendMasterDatabaseError(databaseError, res, 'update', definition.resource);
    }
  });

  app.patch(`${route}/:id/activate`, authRequired, async (req, res) => {
    if (!canAccess(req, definition.module, 'canEdit')) {
      return res.status(403).json({ message: 'Reactivation not allowed.' });
    }
    if (useMockData) {
      const record = mockData[definition.collection].find((item) => item[definition.idColumn] === req.params.id);
      if (!record) return res.status(404).json({ message: `${definition.resource} record not found.` });
      record.IsActive = true;
      return res.json(record);
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid record ID.' });
    }
    try {
      const result = await (await connectDatabase()).request()
        .input('Id', sql.UniqueIdentifier, req.params.id)
        .query(`
          UPDATE dbo.[${definition.table}]
          SET IsActive = 1, ModifiedAt = SYSUTCDATETIME()
          OUTPUT inserted.*
          WHERE [${definition.idColumn}] = @Id AND IsActive = 0
        `);
      if (!result.recordset.length) return res.status(404).json({ message: `${definition.resource} record not found.` });
      return res.json(result.recordset[0]);
    } catch (databaseError) {
      return sendMasterDatabaseError(databaseError, res, 'reactivate', definition.resource);
    }
  });

  app.delete(`${route}/:id`, authRequired, async (req, res) => {
    if (!canAccess(req, definition.module, 'canDelete')) {
      return res.status(403).json({ message: 'Delete not allowed.' });
    }
    if (useMockData) {
      const record = mockData[definition.collection].find((item) => item[definition.idColumn] === req.params.id && item.IsActive);
      if (!record) return res.status(404).json({ message: `${definition.resource} record not found.` });
      record.IsActive = false;
      return res.json({ message: 'Record deactivated.' });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid record ID.' });
    }

    try {
      const result = await (await connectDatabase()).request()
        .input('Id', sql.UniqueIdentifier, req.params.id)
        .query(`
          UPDATE dbo.[${definition.table}]
          SET IsActive = 0, ModifiedAt = SYSUTCDATETIME()
          OUTPUT inserted.[${definition.idColumn}]
          WHERE [${definition.idColumn}] = @Id AND IsActive = 1
        `);
      if (!result.recordset.length) return res.status(404).json({ message: `${definition.resource} record not found.` });
      return res.json({ message: 'Record deactivated.' });
    } catch (databaseError) {
      return sendMasterDatabaseError(databaseError, res, 'deactivate', definition.resource);
    }
  });
}

masterDefinitions.forEach(registerMasterRoutes);

app.get('/api/clients/lookup', authRequired, async (req, res) => {
  if (!canAccess(req, 'bills', 'canAdd')) {
    return res.status(403).json({ message: 'Client lookup is not allowed.' });
  }

  const contactNo = String(req.query.contactNo || '').trim();
  const contactNoDigits = normalizeContactNo(contactNo);
  if (!contactNo || contactNo.length > 30) {
    return res.status(400).json({ message: 'Enter a valid contact number.' });
  }

  if (useMockData) {
    const client = mockData.clients.find((item) => (
      item.IsActive !== false && normalizeContactNo(item.ContactNo) === contactNoDigits
    ));
    if (!client) return res.json(null);
    const previousBalance = getMockClientOutstanding(client.ClientId);
    return res.json({
      ClientName: client.ClientName,
      Address: client.Address,
      Email: client.Email || '',
      PreviousBalance: Math.round((previousBalance + Number.EPSILON) * 100) / 100,
    });
  }

  try {
    const result = await (await connectDatabase()).request()
      .input('ContactNo', sql.NVarChar(30), contactNo)
      .input('ContactNoDigits', sql.NVarChar(30), contactNoDigits)
      .query(`
        DECLARE @PaymentBillColumn sysname = CASE
          WHEN COL_LENGTH(N'dbo.Payments', N'BillId') IS NOT NULL THEN N'BillId'
          WHEN COL_LENGTH(N'dbo.Payments', N'SaleBillId') IS NOT NULL THEN N'SaleBillId'
        END;
        IF @PaymentBillColumn IS NULL THROW 51002, 'Payments table is missing a bill ID column.', 1;
        DECLARE @LookupSql nvarchar(max) = N'
          SELECT TOP (1) c.ClientName, c.Address, c.Email,
            COALESCE((
              SELECT CASE WHEN MAX(CASE WHEN balance.RowNumber = 1 AND balance.PreviousBalance > 0 THEN 1 ELSE 0 END) = 1
                THEN MAX(CASE WHEN balance.RowNumber = 1 THEN CASE WHEN balance.AmountDue > 0 THEN balance.AmountDue ELSE 0 END END)
                ELSE SUM(CASE WHEN balance.AmountDue > 0 THEN balance.AmountDue ELSE 0 END) END
              FROM (
                SELECT sb.PreviousBalance,
                  sb.GrandTotal - COALESCE((SELECT SUM(p.Amount) FROM dbo.Payments p WHERE p.' + QUOTENAME(@PaymentBillColumn) + N' = sb.BillId), 0) AS AmountDue,
                  ROW_NUMBER() OVER (ORDER BY sb.CreatedAt DESC, sb.BillDate DESC) AS RowNumber
                FROM dbo.SaleBills sb
                WHERE sb.Status <> N''VOID''
                  AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(sb.CustomerMobile)), N'' '', N''''), N''-'', N''''), N''+'', N''''), N''('', N''''), N'')'', N''''), N''.'', N''''), N''/'', N'''') = @ContactNoDigits
              ) balance
            ), 0) AS PreviousBalance
          FROM dbo.Clients c
          WHERE c.IsActive = 1
            AND (c.ContactNo = @ContactNo
              OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(c.ContactNo)), N'' '', N''''), N''-'', N''''), N''+'', N''''), N''('', N''''), N'')'', N''''), N''.'', N''''), N''/'', N'''') = @ContactNoDigits)
          ORDER BY CASE WHEN c.ContactNo = @ContactNo THEN 0 ELSE 1 END, c.CreatedAt DESC, c.ClientName';
        EXEC sys.sp_executesql @LookupSql,
          N'@ContactNo nvarchar(30), @ContactNoDigits nvarchar(30)',
          @ContactNo = @ContactNo, @ContactNoDigits = @ContactNoDigits;
      `);
    return res.json(result.recordset[0] || null);
  } catch (error) {
    console.error('Failed looking up client by contact number in SQL Server:', error.message);
    return res.status(503).json({ message: 'Could not look up client details.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: useMockData ? 'mock' : 'sql' });
});

app.post('/api/auth/login', async (req, res) => {
  const rawUsername = (req.body?.username || '').trim();
  const rawPassword = (req.body?.password || '').trim();

  if (!rawUsername || !rawPassword) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const normalizedUsername = rawUsername.toLowerCase();

  let user = null;

  if (useMockData) {
    user = mockData.users.find((item) => item.Username.toLowerCase() === normalizedUsername) || null;
  } else {
    try {
      const pool = await connectDatabase();
      const record = await pool.request()
        .input('username', sql.NVarChar(80), normalizedUsername)
        .query(`
          SELECT u.UserId, u.Username, u.PasswordHash, u.Name AS FullName, u.Email, u.Mobile,
                 u.Role AS RoleCode, r.RoleId, r.RoleName, u.BranchId, b.BranchName
          FROM dbo.Users AS u
          INNER JOIN dbo.Roles AS r ON r.RoleCode = u.Role
          LEFT JOIN dbo.Branches AS b ON b.BranchId = u.BranchId
          WHERE u.Username = @username
            AND u.IsActive = 1
            AND r.IsActive = 1
        `);

      if (record.recordset.length > 0) {
        user = record.recordset[0];
      }
    } catch (error) {
      console.error('SQL login failed:', error.message);
      return res.status(503).json({
        message: process.env.NODE_ENV === 'production'
          ? 'Database unavailable. Check the server database configuration.'
          : `Database unavailable: ${error.code || error.message}`,
      });
    }
  }

  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  const passwordMatches = Boolean(user.PasswordHash)
    && await bcrypt.compare(rawPassword, user.PasswordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  let permissionsMap;
  try {
    permissionsMap = useMockData
      ? getRolePermissionsMap(user.RoleName || 'User')
      : await getSqlRolePermissionsMap(user.RoleId, user.RoleName);
  } catch (error) {
    console.error('Failed loading role permissions:', error.message);
    return res.status(503).json({ message: 'Could not load permissions for this account.' });
  }
  const userPayload = {
    UserId: user.UserId,
    Username: user.Username,
    FullName: user.FullName,
    Email: user.Email,
    Mobile: user.Mobile,
    RoleId: user.RoleId,
    RoleName: user.RoleName,
    RoleCode: user.RoleCode || getRoleCode(user.RoleName),
    BranchId: user.BranchId,
    BranchName: user.BranchName,
  };

  const token = buildToken(userPayload, permissionsMap);

  return res.json({
    token,
    user: userPayload,
    permissions: permissionsMap,
  });
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  const user = useMockData
    ? mockData.users.find((item) => item.Username.toLowerCase() === (req.user.username || '').toLowerCase())
    : null;
  const permissions = req.user.permissions
    || getRolePermissionsMap(user?.RoleName || req.user.role || 'User');

  res.json({
    user: {
      UserId: user?.UserId || req.user.userId,
      Username: user?.Username || req.user.username,
      FullName: user?.FullName || req.user.username,
      Email: user?.Email || req.user.email,
      RoleName: user?.RoleName || req.user.role,
      RoleCode: req.user.roleCode || getRoleCode(user?.RoleName || req.user.role),
      BranchId: user?.BranchId || req.user.branchId,
      BranchName: user?.BranchName || req.user.branchName || 'Head Office',
    },
    permissions,
  });
});

app.get('/api/dashboard/stats', authRequired, async (req, res) => {
  if (!canAccess(req, 'dashboard', 'canView')) {
    return res.status(403).json({ message: 'Access denied for dashboard.' });
  }
  if (useMockData) {
    const scopedBills = filterBranchRecords(req, mockData.bills, 'BillDate');
    const scopedPayments = filterBranchRecords(req, mockData.payments, 'PaymentDate');
    const monthlyBills = scopedBills.filter((bill) => isCurrentMonthDate(bill.BillDate));
    const scopedUsers = mockData.users.filter((user) => (
      user.IsActive && (isSuperAdmin(req) || user.BranchId === req.user.branchId)
    ));
    const pendingCollection = scopedBills.reduce((total, bill) => {
      const billId = bill.SaleBillId || bill.BillId;
      const paidAmount = scopedPayments
        .filter((payment) => (payment.SaleBillId || payment.BillId) === billId)
        .reduce((sum, payment) => sum + Number(payment.Amount || 0), 0);
      return total + Math.max(0, Number(bill.NetAmount || 0) - paidAmount);
    }, 0);
    return res.json({
      totalBranches: mockData.branches.filter((branch) => (
        branch.IsActive && (isSuperAdmin(req) || branch.BranchId === req.user.branchId)
      )).length,
      totalUsers: scopedUsers.length,
      totalBills: scopedBills.length,
      totalPayments: scopedPayments.length,
      monthlyRevenue: monthlyBills.reduce((total, bill) => total + Number(bill.NetAmount || 0), 0),
      pendingCollection,
    });
  }
  try {
    const pool = await connectDatabase();
    const { monthStart, nextMonthStart } = getCurrentMonthRange();
    const result = await pool.request()
      .input('IsSuperAdmin', sql.Bit, isSuperAdmin(req))
      .input('BranchId', sql.UniqueIdentifier, req.user.branchId || null)
      .input('CurrentMonthOnly', sql.Bit, isCurrentMonthUser(req))
      .input('MonthStart', sql.Date, monthStart)
      .input('NextMonthStart', sql.Date, nextMonthStart)
      .query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.Branches
         WHERE IsActive = 1 AND (@IsSuperAdmin = 1 OR BranchId = @BranchId)) AS totalBranches,
        (SELECT COUNT(*) FROM dbo.Users
         WHERE IsActive = 1 AND (@IsSuperAdmin = 1 OR BranchId = @BranchId)) AS totalUsers,
        (SELECT COUNT(*) FROM dbo.SaleBills
         WHERE (@IsSuperAdmin = 1 OR BranchId = @BranchId)
           AND (@CurrentMonthOnly = 0 OR (BillDate >= @MonthStart AND BillDate < @NextMonthStart))) AS totalBills,
        (SELECT COUNT(*) FROM dbo.Payments
         WHERE (@IsSuperAdmin = 1 OR BranchId = @BranchId)
           AND (@CurrentMonthOnly = 0 OR (PaymentDate >= @MonthStart AND PaymentDate < @NextMonthStart))) AS totalPayments,
        (SELECT COALESCE(SUM(GrandTotal), 0) FROM dbo.SaleBills
         WHERE (@IsSuperAdmin = 1 OR BranchId = @BranchId)
           AND BillDate >= @MonthStart AND BillDate < @NextMonthStart) AS monthlyRevenue,
        (SELECT COALESCE(SUM(b.GrandTotal - COALESCE(p.PaidAmount, 0)), 0)
         FROM dbo.SaleBills b
         OUTER APPLY (SELECT SUM(Amount) AS PaidAmount FROM dbo.Payments p WHERE p.BillId = b.BillId) p
         WHERE b.GrandTotal > COALESCE(p.PaidAmount, 0)
           AND (@IsSuperAdmin = 1 OR b.BranchId = @BranchId)
           AND (@CurrentMonthOnly = 0 OR (b.BillDate >= @MonthStart AND b.BillDate < @NextMonthStart))) AS pendingCollection
    `);
    return res.json(result.recordset[0]);
  } catch (error) {
    console.error('Failed loading dashboard from SQL Server:', error.message);
    return res.status(503).json({ message: 'Could not load dashboard data from the database.' });
  }
});

app.get('/api/branches', authRequired, (req, res) => {
  const isBranchPickerRequest = req.query.activeOnly === 'true' && Boolean(req.user.branchId);
  if (!canAccess(req, 'branches', 'canView') && !isBranchPickerRequest) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const search = (req.query.search || '').toLowerCase();
  const activeOnly = req.query.activeOnly === 'true';

  if (!useMockData) {
    connectDatabase()
      .then((pool) => pool.request()
        .input('search', sql.NVarChar(240), `%${search}%`)
        .input('activeOnly', sql.Bit, activeOnly)
        .input('IsSuperAdmin', sql.Bit, isSuperAdmin(req))
        .input('BranchId', sql.UniqueIdentifier, req.user.branchId || null)
        .query(`
          SELECT b.BranchId, b.BranchCode, b.BranchName, b.Address, b.BillPrefix AS InvoicePrefix,
                 b.IsActive, t.TermId, t.TermText, t.DisplayOrder
          FROM dbo.Branches AS b
          LEFT JOIN dbo.BranchTermsConditions AS t
            ON t.BranchId = b.BranchId AND t.IsActive = 1
          WHERE (@search = N'%%'
                 OR b.BranchCode LIKE @search
                 OR b.BranchName LIKE @search
                 OR b.Address LIKE @search)
            AND (@activeOnly = 0 OR b.IsActive = 1)
            AND (@IsSuperAdmin = 1 OR b.BranchId = @BranchId)
          ORDER BY b.BranchName, t.DisplayOrder
        `))
      .then((result) => {
        const branchesById = new Map();
        result.recordset.forEach((row) => {
          if (!branchesById.has(row.BranchId)) {
            branchesById.set(row.BranchId, {
              BranchId: row.BranchId,
              BranchCode: row.BranchCode,
              BranchName: row.BranchName,
              Address: row.Address,
              InvoicePrefix: row.InvoicePrefix,
              IsActive: row.IsActive,
              Terms: [],
            });
          }
          if (row.TermId) {
            branchesById.get(row.BranchId).Terms.push({
              TermId: row.TermId,
              TermText: row.TermText,
              DisplayOrder: row.DisplayOrder,
            });
          }
        });
        res.json(Array.from(branchesById.values()));
      })
      .catch((error) => {
        console.error('Failed loading branches from SQL Server:', error.message);
        res.status(503).json({ message: 'Could not load branches from the database.' });
      });
    return;
  }

  const data = mockData.branches.filter((branch) => {
    const matchesSearch = !search || [branch.BranchCode, branch.BranchName, branch.Address].join(' ').toLowerCase().includes(search);
    const matchesActive = !activeOnly || branch.IsActive;
    const matchesBranch = isSuperAdmin(req) || branch.BranchId === req.user.branchId;
    return matchesSearch && matchesActive && matchesBranch;
  });

  res.json(data);
});

app.post('/api/branches', authRequired, async (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ message: 'Only a Super Admin can create branches.' });
  }
  if (!canAccess(req, 'branches', 'canAdd')) {
    return res.status(403).json({ message: 'Add branch not allowed.' });
  }

  const branch = {
    BranchCode: String(req.body?.BranchCode || '').trim(),
    BranchName: String(req.body?.BranchName || '').trim(),
    Address: String(req.body?.Address || '').trim(),
    Terms: Array.isArray(req.body?.Terms)
      ? req.body.Terms.map((term) => String(term || '').trim()).filter(Boolean)
      : [],
  };

  if (!branch.BranchCode || !branch.BranchName || !branch.Address || branch.Terms.length === 0) {
    return res.status(400).json({ message: 'Branch code, name, address, and at least one term are required.' });
  }

  if (branch.BranchCode.length > 20 || branch.BranchName.length > 120 || branch.Address.length > 300
      || branch.Terms.some((term) => term.length > 1000)) {
    return res.status(400).json({ message: 'One or more branch fields exceed the allowed length.' });
  }

  if (useMockData) {
    const item = {
      ...branch,
      InvoicePrefix: branch.BranchCode.slice(0, 10),
      BranchId: `b${Date.now()}`,
      IsActive: true,
      Terms: branch.Terms.map((TermText, index) => ({ TermText, DisplayOrder: index + 1 })),
    };
    mockData.branches.unshift(item);
    return res.status(201).json(item);
  }

  let transaction;
  let transactionStarted = false;
  try {
    transaction = new sql.Transaction(await connectDatabase());
    await transaction.begin();
    transactionStarted = true;
    const inserted = await transaction.request()
      .input('BranchCode', sql.NVarChar(20), branch.BranchCode)
      .input('BranchName', sql.NVarChar(120), branch.BranchName)
      .input('BillPrefix', sql.NVarChar(10), branch.BranchCode.slice(0, 10))
      .input('Address', sql.NVarChar(300), branch.Address)
      .query(`
        INSERT INTO dbo.Branches
          (BranchId, BranchCode, BranchName, Address, City, State, Pincode, Phone, Email,
           GSTNumber, PANNumber, ContactPerson, BillPrefix, NextBillNumber, IsActive, CreatedAt, ModifiedAt)
        OUTPUT inserted.BranchId, inserted.BranchCode, inserted.BranchName,
               inserted.Address, inserted.BillPrefix AS InvoicePrefix, inserted.IsActive
        VALUES (NEWID(), @BranchCode, @BranchName, @Address, N'', N'', N'', N'', N'',
                N'', N'', N'', @BillPrefix, 1, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
      `);
    const createdBranch = inserted.recordset[0];
    for (let index = 0; index < branch.Terms.length; index += 1) {
      await transaction.request()
        .input('BranchId', sql.UniqueIdentifier, createdBranch.BranchId)
        .input('TermText', sql.NVarChar(1000), branch.Terms[index])
        .input('DisplayOrder', sql.Int, index + 1)
        .query(`
          INSERT INTO dbo.BranchTermsConditions
            (TermId, BranchId, TermText, DisplayOrder, IsActive, CreatedAt, ModifiedAt)
          VALUES
            (NEWID(), @BranchId, @TermText, @DisplayOrder, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
        `);
    }
    await transaction.commit();
    transactionStarted = false;
    return res.status(201).json({
      ...createdBranch,
      Terms: branch.Terms.map((TermText, index) => ({ TermText, DisplayOrder: index + 1 })),
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Failed rolling back branch creation:', rollbackError.message);
      }
    }
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({ message: 'Branch code or bill prefix already exists.' });
    }
    console.error('Failed creating branch in SQL Server:', error.message);
    return res.status(500).json({ message: 'Could not create branch.' });
  }
});

app.put('/api/branches/:id', authRequired, async (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ message: 'Only a Super Admin can edit branches.' });
  }
  if (!canAccess(req, 'branches', 'canEdit')) {
    return res.status(403).json({ message: 'Edit branch not allowed.' });
  }

  const branch = {
    BranchCode: String(req.body?.BranchCode || '').trim(),
    BranchName: String(req.body?.BranchName || '').trim(),
    Address: String(req.body?.Address || '').trim(),
    Terms: Array.isArray(req.body?.Terms)
      ? req.body.Terms.map((term) => String(term || '').trim()).filter(Boolean)
      : [],
  };
  if (!branch.BranchCode || !branch.BranchName || !branch.Address || branch.Terms.length === 0) {
    return res.status(400).json({ message: 'Branch code, name, address, and at least one term are required.' });
  }
  if (branch.BranchCode.length > 20 || branch.BranchName.length > 120 || branch.Address.length > 300
      || branch.Terms.some((term) => term.length > 1000)) {
    return res.status(400).json({ message: 'One or more branch fields exceed the allowed length.' });
  }

  if (useMockData) {
    const found = mockData.branches.find((item) => item.BranchId === req.params.id && item.IsActive);
    if (!found) return res.status(404).json({ message: 'Branch not found.' });
    Object.assign(found, branch, {
      InvoicePrefix: branch.BranchCode.slice(0, 10),
      Terms: branch.Terms.map((TermText, index) => ({ TermText, DisplayOrder: index + 1 })),
    });
    return res.json(found);
  }

  let transaction;
  let transactionStarted = false;
  try {
    transaction = new sql.Transaction(await connectDatabase());
    await transaction.begin();
    transactionStarted = true;
    const updated = await transaction.request()
      .input('BranchId', sql.UniqueIdentifier, req.params.id)
      .input('BranchCode', sql.NVarChar(20), branch.BranchCode)
      .input('BranchName', sql.NVarChar(120), branch.BranchName)
      .input('BillPrefix', sql.NVarChar(10), branch.BranchCode.slice(0, 10))
      .input('Address', sql.NVarChar(300), branch.Address)
      .query(`
        UPDATE dbo.Branches
        SET BranchCode = @BranchCode, BranchName = @BranchName, BillPrefix = @BillPrefix,
            Address = @Address, ModifiedAt = SYSUTCDATETIME()
        OUTPUT inserted.BranchId, inserted.BranchCode, inserted.BranchName,
               inserted.Address, inserted.BillPrefix AS InvoicePrefix, inserted.IsActive
        WHERE BranchId = @BranchId AND IsActive = 1
      `);
    if (!updated.recordset.length) {
      await transaction.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: 'Branch not found.' });
    }
    await transaction.request()
      .input('BranchId', sql.UniqueIdentifier, req.params.id)
      .query('UPDATE dbo.BranchTermsConditions SET IsActive = 0, ModifiedAt = SYSUTCDATETIME() WHERE BranchId = @BranchId AND IsActive = 1');
    for (let index = 0; index < branch.Terms.length; index += 1) {
      await transaction.request()
        .input('BranchId', sql.UniqueIdentifier, req.params.id)
        .input('TermText', sql.NVarChar(1000), branch.Terms[index])
        .input('DisplayOrder', sql.Int, index + 1)
        .query(`
          INSERT INTO dbo.BranchTermsConditions
            (TermId, BranchId, TermText, DisplayOrder, IsActive, CreatedAt, ModifiedAt)
          VALUES
            (NEWID(), @BranchId, @TermText, @DisplayOrder, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
        `);
    }
    await transaction.commit();
    transactionStarted = false;
    return res.json({
      ...updated.recordset[0],
      Terms: branch.Terms.map((TermText, index) => ({ TermText, DisplayOrder: index + 1 })),
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Failed rolling back branch update:', rollbackError.message);
      }
    }
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({ message: 'Branch code or bill prefix already exists.' });
    }
    console.error('Failed updating branch in SQL Server:', error.message);
    return res.status(500).json({ message: 'Could not update branch.' });
  }
});

app.delete('/api/branches/:id', authRequired, async (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ message: 'Only a Super Admin can deactivate branches.' });
  }
  if (!canAccess(req, 'branches', 'canDelete')) {
    return res.status(403).json({ message: 'Delete branch not allowed.' });
  }

  if (useMockData) {
    const found = mockData.branches.find((branch) => branch.BranchId === req.params.id && branch.IsActive);
    if (!found) return res.status(404).json({ message: 'Branch not found.' });
    found.IsActive = false;
    return res.json({ message: 'Branch deactivated.' });
  }

  try {
    const result = await (await connectDatabase()).request()
      .input('BranchId', sql.UniqueIdentifier, req.params.id)
      .query(`
        UPDATE dbo.Branches
        SET IsActive = 0, ModifiedAt = SYSUTCDATETIME()
        OUTPUT inserted.BranchId
        WHERE BranchId = @BranchId AND IsActive = 1
      `);
    if (!result.recordset.length) return res.status(404).json({ message: 'Branch not found.' });
    return res.json({ message: 'Branch deactivated.' });
  } catch (error) {
    console.error('Failed deactivating branch in SQL Server:', error.message);
    return res.status(500).json({ message: 'Could not deactivate branch.' });
  }
});

app.patch('/api/branches/:id/activate', authRequired, async (req, res) => {
  if (!isSuperAdmin(req) || !canAccess(req, 'branches', 'canEdit')) {
    return res.status(403).json({ message: 'Branch reactivation not allowed.' });
  }
  if (useMockData) {
    const branch = mockData.branches.find((item) => item.BranchId === req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found.' });
    branch.IsActive = true;
    return res.json(branch);
  }
  try {
    const result = await (await connectDatabase()).request()
      .input('BranchId', sql.UniqueIdentifier, req.params.id)
      .query(`
        UPDATE dbo.Branches
        SET IsActive = 1, ModifiedAt = SYSUTCDATETIME()
        OUTPUT inserted.BranchId
        WHERE BranchId = @BranchId AND IsActive = 0
      `);
    if (!result.recordset.length) return res.status(404).json({ message: 'Branch not found.' });
    return res.json({ message: 'Branch activated.' });
  } catch (error) {
    console.error('Failed reactivating branch in SQL Server:', error.message);
    return res.status(500).json({ message: 'Could not activate branch.' });
  }
});

app.get('/api/roles', authRequired, async (req, res) => {
  if (!canAccess(req, 'roles', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  if (useMockData) {
    return res.json(mockData.roles.filter((role) => role.IsActive).map((role) => ({
      ...role,
      permissions: getRolePermissionsMap(role.RoleName),
    })));
  }
  try {
    const result = await (await connectDatabase()).request().query(`
      SELECT r.RoleId, r.RoleCode, r.RoleName, r.Description, r.IsSystem, r.IsActive,
             rp.ModuleKey, rp.CanAccess
      FROM dbo.Roles r
      LEFT JOIN dbo.RolePermissions rp ON rp.RoleId = r.RoleId
      WHERE r.IsActive = 1
      ORDER BY r.RoleName, rp.ModuleKey
    `);
    const rolesById = new Map();
    result.recordset.forEach((row) => {
      if (!rolesById.has(row.RoleId)) {
        rolesById.set(row.RoleId, {
          RoleId: row.RoleId,
          RoleCode: row.RoleCode,
          RoleName: row.RoleName,
          Description: row.Description,
          IsActive: row.IsActive,
          permissions: {},
        });
      }
      if (row.ModuleKey) {
        rolesById.get(row.RoleId).permissions[row.ModuleKey] = {
          canView: Boolean(row.CanAccess),
          canAdd: Boolean(row.CanAccess),
          canEdit: Boolean(row.CanAccess),
          canDelete: Boolean(row.CanAccess),
          canExport: Boolean(row.CanAccess),
        };
      }
    });
    return res.json(Array.from(rolesById.values()));
  } catch (error) {
    console.error('Failed loading roles from SQL Server:', error.message);
    return res.status(503).json({ message: 'Could not load roles from the database.' });
  }
});

app.post('/api/roles', authRequired, async (req, res) => {
  if (!canAccess(req, 'roles', 'canAdd')) {
    return res.status(403).json({ message: 'Adding roles is not allowed.' });
  }
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ message: 'Only a Super Admin can create roles.' });
  }

  const roleName = String(req.body?.RoleName || '').trim();
  const description = String(req.body?.Description || '').trim();
  const roleCode = getRoleCode(roleName);
  const selectedModules = req.body?.Modules;
  const reservedRoleCodes = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'USER'];

  if (!roleName || roleName.length > 80 || !roleCode || roleCode.length > 40
    || reservedRoleCodes.includes(roleCode)) {
    return res.status(400).json({ message: 'Enter a valid, unique role name (up to 80 characters).' });
  }
  if (description.length > 300) {
    return res.status(400).json({ message: 'Description cannot exceed 300 characters.' });
  }
  if (!Array.isArray(selectedModules)
    || selectedModules.some((module) => !ROLE_MODULE_KEYS.includes(module))) {
    return res.status(400).json({ message: 'Select valid modules for this role.' });
  }

  const selectedModuleSet = new Set(selectedModules);
  if (useMockData) {
    const duplicate = mockData.roles.some((role) => (
      (role.RoleCode || getRoleCode(role.RoleName)) === roleCode
      || role.RoleName.toLowerCase() === roleName.toLowerCase()
    ));
    if (duplicate) {
      return res.status(409).json({ message: 'A role with this name already exists.' });
    }

    const role = {
      RoleId: randomUUID(),
      RoleCode: roleCode,
      RoleName: roleName,
      Description: description,
      IsSystem: false,
      IsActive: true,
    };
    mockData.roles.push(role);
    mockData.permissions[roleName] = ROLE_MODULE_KEYS.map((module) => {
      const canAccessModule = selectedModuleSet.has(module);
      return {
        module,
        canView: canAccessModule,
        canAdd: canAccessModule,
        canEdit: canAccessModule,
        canDelete: canAccessModule,
        canExport: canAccessModule,
      };
    });

    return res.status(201).json({
      ...role,
      permissions: getRolePermissionsMap(roleName),
    });
  }

  let transaction;
  let transactionStarted = false;
  let transactionCommitted = false;
  try {
    const pool = await connectDatabase();
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    transactionStarted = true;

    const roleResult = await transaction.request()
      .input('RoleId', sql.UniqueIdentifier, randomUUID())
      .input('RoleCode', sql.NVarChar(40), roleCode)
      .input('RoleName', sql.NVarChar(80), roleName)
      .input('Description', sql.NVarChar(300), description)
      .query(`
        INSERT INTO dbo.Roles
          (RoleId, RoleCode, RoleName, Description, IsSystem, IsActive, CreatedAt, ModifiedAt)
        OUTPUT inserted.RoleId, inserted.RoleCode, inserted.RoleName, inserted.Description,
               inserted.IsSystem, inserted.IsActive
        VALUES (@RoleId, @RoleCode, @RoleName, @Description, 0, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
      `);
    const role = roleResult.recordset[0];

    for (const module of ROLE_MODULE_KEYS) {
      const canAccessModule = selectedModuleSet.has(module);
      await transaction.request()
        .input('RoleId', sql.UniqueIdentifier, role.RoleId)
        .input('ModuleKey', sql.NVarChar(40), module)
        .input('CanAccess', sql.Bit, canAccessModule)
        .query(`
          INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanAccess, CreatedAt)
          VALUES (@RoleId, @ModuleKey, @CanAccess, SYSUTCDATETIME())
        `);
    }

    await transaction.commit();
    transactionCommitted = true;
    return res.status(201).json({
      ...role,
      permissions: ROLE_MODULE_KEYS.reduce((permissions, module) => {
        const canAccessModule = selectedModuleSet.has(module);
        permissions[module] = {
          canView: canAccessModule,
          canAdd: canAccessModule,
          canEdit: canAccessModule,
          canDelete: canAccessModule,
          canExport: canAccessModule,
        };
        return permissions;
      }, {}),
    });
  } catch (error) {
    if (transactionStarted && !transactionCommitted) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Failed rolling back role creation:', rollbackError.message);
      }
    }
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({ message: 'A role with this name already exists.' });
    }
    console.error('Failed creating role in SQL Server:', error.message);
    return res.status(500).json({ message: 'Could not create role.' });
  }
});

app.put('/api/roles/:id', authRequired, async (req, res) => {
    if (!canAccess(req, 'roles', 'canEdit')) {
      return res.status(403).json({ message: 'Editing roles is not allowed.' });
    }
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ message: 'Only a Super Admin can edit roles.' });
    }

    const roleId = String(req.params.id || '');
    const roleName = String(req.body?.RoleName || '').trim();
    const description = String(req.body?.Description || '').trim();
    const selectedModules = req.body?.Modules;
    const roleCodeFromName = getRoleCode(roleName);

    if (!roleName || roleName.length > 80 || !roleCodeFromName || roleCodeFromName.length > 40
      || ['SUPER_ADMIN', 'BRANCH_ADMIN', 'USER'].includes(roleCodeFromName)) {
      return res.status(400).json({ message: 'Enter a valid role name (up to 80 characters).' });
    }
    if (description.length > 300) {
      return res.status(400).json({ message: 'Description cannot exceed 300 characters.' });
    }
    if (!Array.isArray(selectedModules)
      || selectedModules.some((module) => !ROLE_MODULE_KEYS.includes(module))) {
      return res.status(400).json({ message: 'Select valid modules for this role.' });
    }

    const selectedModuleSet = new Set(selectedModules);
    if (useMockData) {
      const role = mockData.roles.find((item) => item.RoleId === roleId && item.IsActive);
      if (!role) return res.status(404).json({ message: 'Role not found.' });
      if (isProtectedRole(role)) {
        return res.status(400).json({ message: 'Built-in roles cannot be edited.' });
      }
      const duplicate = mockData.roles.some((item) => (
        item.RoleId !== roleId
        && item.IsActive
        && item.RoleName.toLowerCase() === roleName.toLowerCase()
      ));
      if (duplicate) {
        return res.status(409).json({ message: 'A role with this name already exists.' });
      }

      const oldRoleName = role.RoleName;
      const roleCode = role.RoleCode || getRoleCode(oldRoleName);
      delete mockData.permissions[oldRoleName];
      role.RoleName = roleName;
      role.RoleCode = roleCode;
      role.Description = description;
      mockData.permissions[roleName] = ROLE_MODULE_KEYS.map((module) => {
        const canAccessModule = selectedModuleSet.has(module);
        return {
          module,
          canView: canAccessModule,
          canAdd: canAccessModule,
          canEdit: canAccessModule,
          canDelete: canAccessModule,
          canExport: canAccessModule,
        };
      });
      mockData.users
        .filter((user) => user.RoleId === role.RoleId)
        .forEach((user) => {
          user.RoleName = roleName;
          user.RoleCode = roleCode;
        });

      return res.json({
        ...role,
        permissions: getRolePermissionsMap(roleName),
      });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleId)) {
      return res.status(400).json({ message: 'Invalid role ID.' });
    }

    let transaction;
    let transactionStarted = false;
    let transactionCommitted = false;
    try {
      transaction = new sql.Transaction(await connectDatabase());
      await transaction.begin();
      transactionStarted = true;

      const currentResult = await transaction.request()
        .input('RoleId', sql.UniqueIdentifier, roleId)
        .query(`
          SELECT RoleId, RoleCode, RoleName, IsSystem, IsActive
          FROM dbo.Roles WITH (UPDLOCK, ROWLOCK)
          WHERE RoleId = @RoleId AND IsActive = 1
        `);
      const currentRole = currentResult.recordset[0];
      if (!currentRole) {
        await transaction.rollback();
        transactionStarted = false;
        return res.status(404).json({ message: 'Role not found.' });
      }
      if (isProtectedRole(currentRole)) {
        await transaction.rollback();
        transactionStarted = false;
        return res.status(400).json({ message: 'Built-in roles cannot be edited.' });
      }

      const updatedRole = await transaction.request()
        .input('RoleId', sql.UniqueIdentifier, roleId)
        .input('RoleName', sql.NVarChar(80), roleName)
        .input('Description', sql.NVarChar(300), description)
        .query(`
          UPDATE dbo.Roles
          SET RoleName = @RoleName, Description = @Description, ModifiedAt = SYSUTCDATETIME()
          OUTPUT inserted.RoleId, inserted.RoleCode, inserted.RoleName, inserted.Description,
                 inserted.IsSystem, inserted.IsActive
          WHERE RoleId = @RoleId
        `);

      for (const module of ROLE_MODULE_KEYS) {
        await transaction.request()
          .input('RoleId', sql.UniqueIdentifier, roleId)
          .input('ModuleKey', sql.NVarChar(40), module)
          .input('CanAccess', sql.Bit, selectedModuleSet.has(module))
          .query(`
            IF EXISTS (
              SELECT 1 FROM dbo.RolePermissions
              WHERE RoleId = @RoleId AND ModuleKey = @ModuleKey
            )
              UPDATE dbo.RolePermissions SET CanAccess = @CanAccess
              WHERE RoleId = @RoleId AND ModuleKey = @ModuleKey;
            ELSE
              INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanAccess, CreatedAt)
              VALUES (@RoleId, @ModuleKey, @CanAccess, SYSUTCDATETIME());
          `);
      }

      await transaction.commit();
      transactionCommitted = true;
      const updated = updatedRole.recordset[0];
      return res.json({
        ...updated,
        permissions: ROLE_MODULE_KEYS.reduce((permissions, module) => {
          const canAccessModule = selectedModuleSet.has(module);
          permissions[module] = {
            canView: canAccessModule,
            canAdd: canAccessModule,
            canEdit: canAccessModule,
            canDelete: canAccessModule,
            canExport: canAccessModule,
          };
          return permissions;
        }, {}),
      });
    } catch (error) {
      if (transactionStarted && !transactionCommitted) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('Failed rolling back role update:', rollbackError.message);
        }
      }
      if (error.number === 2601 || error.number === 2627) {
        return res.status(409).json({ message: 'A role with this name already exists.' });
      }
      console.error('Failed updating role in SQL Server:', error.message);
      return res.status(500).json({ message: 'Could not update role.' });
    }
});

app.delete('/api/roles/:id', authRequired, async (req, res) => {
    if (!canAccess(req, 'roles', 'canDelete')) {
      return res.status(403).json({ message: 'Deleting roles is not allowed.' });
    }
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ message: 'Only a Super Admin can delete roles.' });
    }

    const roleId = String(req.params.id || '');
    if (useMockData) {
      const role = mockData.roles.find((item) => item.RoleId === roleId && item.IsActive);
      if (!role) return res.status(404).json({ message: 'Role not found.' });
      if (isProtectedRole(role)) {
        return res.status(400).json({ message: 'Built-in roles cannot be deleted.' });
      }
      const roleCode = role.RoleCode || getRoleCode(role.RoleName);
      const isAssigned = mockData.users.some((user) => (
        user.IsActive
        && (user.RoleId === role.RoleId || (user.RoleCode || getRoleCode(user.RoleName)) === roleCode)
      ));
      if (isAssigned) {
        return res.status(409).json({ message: 'This role is assigned to active users and cannot be deleted.' });
      }
      role.IsActive = false;
      return res.json({ message: 'Role deactivated.' });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleId)) {
      return res.status(400).json({ message: 'Invalid role ID.' });
    }

    try {
      const pool = await connectDatabase();
      const roleResult = await pool.request()
        .input('RoleId', sql.UniqueIdentifier, roleId)
        .query(`
          SELECT RoleId, RoleCode, RoleName, IsSystem
          FROM dbo.Roles
          WHERE RoleId = @RoleId AND IsActive = 1
        `);
      const role = roleResult.recordset[0];
      if (!role) return res.status(404).json({ message: 'Role not found.' });
      if (isProtectedRole(role)) {
        return res.status(400).json({ message: 'Built-in roles cannot be deleted.' });
      }

      const assignedUserResult = await pool.request()
        .input('RoleCode', sql.NVarChar(40), role.RoleCode)
        .query('SELECT TOP 1 UserId FROM dbo.Users WHERE [Role] = @RoleCode AND IsActive = 1');
      if (assignedUserResult.recordset.length) {
        return res.status(409).json({ message: 'This role is assigned to active users and cannot be deleted.' });
      }

      await pool.request()
        .input('RoleId', sql.UniqueIdentifier, roleId)
        .query('UPDATE dbo.Roles SET IsActive = 0, ModifiedAt = SYSUTCDATETIME() WHERE RoleId = @RoleId AND IsActive = 1');
      return res.json({ message: 'Role deactivated.' });
    } catch (error) {
      console.error('Failed deactivating role in SQL Server:', error.message);
      return res.status(500).json({ message: 'Could not delete role.' });
    }
});

app.get('/api/user-roles', authRequired, async (req, res) => {
  if (!canAccess(req, 'users', 'canAdd')) {
    return res.status(403).json({ message: 'Adding users is not allowed.' });
  }

  if (useMockData) {
    const roles = mockData.roles.filter((role) => (
      isSuperAdmin(req)
      || (isBranchAdmin(req)
        ? (role.RoleCode || getRoleCode(role.RoleName)) === 'USER'
        : ['USER', 'BRANCH_ADMIN'].includes(role.RoleCode || getRoleCode(role.RoleName)))
    ));
    return res.json(roles);
  }

  try {
    const result = await (await connectDatabase()).request()
      .input('IsSuperAdmin', sql.Bit, isSuperAdmin(req))
      .input('IsBranchAdmin', sql.Bit, isBranchAdmin(req))
      .query(`
        SELECT RoleId, RoleCode, RoleName
        FROM dbo.Roles
        WHERE IsActive = 1
          AND (@IsSuperAdmin = 1 OR RoleCode = 'USER' OR (@IsBranchAdmin = 0 AND RoleCode = 'BRANCH_ADMIN'))
        ORDER BY RoleName
      `);
    return res.json(result.recordset);
  } catch (error) {
    console.error('Failed loading assignable roles from SQL Server:', error.message);
    return res.status(503).json({ message: 'Could not load roles for user assignment.' });
  }
});

app.get('/api/users', authRequired, (req, res) => {
  if (!canAccess(req, 'users', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  if (!useMockData) {
    connectDatabase()
      .then((pool) => pool.request()
        .input('IsSuperAdmin', sql.Bit, isSuperAdmin(req))
        .input('BranchId', sql.UniqueIdentifier, req.user.branchId || null)
        .query(`
        SELECT u.UserId, u.Name AS FullName, u.Username, u.Email, u.Mobile,
               u.Role AS RoleCode, r.RoleName, u.BranchId, b.BranchName,
               u.IsActive, u.MustChangePassword, u.CreatedAt
        FROM dbo.Users AS u
        INNER JOIN dbo.Roles AS r ON r.RoleCode = u.Role AND r.IsActive = 1
        LEFT JOIN dbo.Branches AS b ON b.BranchId = u.BranchId
        WHERE u.IsActive = 1
          AND (@IsSuperAdmin = 1 OR u.BranchId = @BranchId)
        ORDER BY u.Name, u.Username
      `))
      .then((result) => res.json(result.recordset))
      .catch((error) => {
        console.error('Failed loading users from SQL Server:', error.message);
        res.status(503).json({ message: 'Could not load users from the database.' });
      });
    return;
  }

  res.json(mockData.users
    .filter((user) => user.IsActive && (isSuperAdmin(req) || user.BranchId === req.user.branchId))
    .map(({ PasswordHash, ...user }) => user));
});

app.post('/api/users', authRequired, (req, res) => {
  if (!canAccess(req, 'users', 'canAdd')) {
    return res.status(403).json({ message: 'Add user not allowed.' });
  }

  const fullName = String(req.body?.FullName || '').trim();
  const username = String(req.body?.Username || '').trim();
  const password = String(req.body?.Password || '');
  const email = String(req.body?.Email || '').trim();
  const mobile = String(req.body?.Mobile || '').replace(/\D/g, '');
  const roleCode = String(req.body?.RoleCode || getRoleCode(req.body?.RoleName) || '').toUpperCase();

  if (!fullName || !username || !password || !email || !mobile || !roleCode) {
    return res.status(400).json({ message: 'Name, username, password, email, mobile, and a valid role are required.' });
  }

  if (fullName.length > 240 || username.length > 160 || email.length > 508 || mobile.length > 60) {
    return res.status(400).json({ message: 'One or more user fields exceed the allowed length.' });
  }
  if (isBranchAdmin(req) && roleCode !== 'USER') {
    return res.status(403).json({ message: 'Branch Admins can create only users in their own branch.' });
  }
  if (!isSuperAdmin(req) && !['USER', 'BRANCH_ADMIN'].includes(roleCode)) {
    return res.status(403).json({ message: 'You cannot assign this role.' });
  }

  if (!useMockData) {
    const branchId = roleCode === 'SUPER_ADMIN' ? null : String(req.body?.BranchId || '').trim();
    if (roleCode !== 'SUPER_ADMIN' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId)) {
      return res.status(400).json({ message: 'Select a valid branch for this role.' });
    }
    if (!isSuperAdmin(req) && branchId.toLowerCase() !== String(req.user.branchId || '').toLowerCase()) {
      return res.status(403).json({ message: 'You can create users only for your assigned branch.' });
    }

    connectDatabase()
      .then(async (pool) => {
        const mobileKey = mobile.replace(/\D/g, '');
        const duplicateResult = await pool.request()
          .input('UsernameKey', sql.NVarChar(160), username.toLowerCase())
          .input('EmailKey', sql.NVarChar(508), email.toLowerCase())
          .input('MobileKey', sql.NVarChar(60), mobileKey)
          .query(`
            SELECT TOP (1)
              CASE
                WHEN LOWER(LTRIM(RTRIM(Username))) = @UsernameKey THEN N'username'
                WHEN LOWER(LTRIM(RTRIM(Email))) = @EmailKey THEN N'email'
                ELSE N'mobile'
              END AS DuplicateField
            FROM dbo.Users WITH (UPDLOCK, HOLDLOCK)
            WHERE LOWER(LTRIM(RTRIM(Username))) = @UsernameKey
               OR LOWER(LTRIM(RTRIM(Email))) = @EmailKey
               OR (@MobileKey <> N'' AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(Mobile, N' ', N''), N'-', N''), N'+', N''), N'(', N''), N')', N''), N'.', N'') = @MobileKey)
          `);
        if (duplicateResult.recordset.length) {
          const duplicateField = duplicateResult.recordset[0].DuplicateField;
          return res.status(409).json({ message: `This ${duplicateField} is already used by another user.` });
        }

        const roleResult = await pool.request()
          .input('RoleCode', sql.NVarChar(40), roleCode)
          .query('SELECT RoleCode, RoleName FROM dbo.Roles WHERE RoleCode = @RoleCode AND IsActive = 1');
        const role = roleResult.recordset[0];
        if (!role) {
          return res.status(400).json({ message: 'The selected role is not active in the database.' });
        }

        let branchName = null;
        if (branchId) {
          const branchResult = await pool.request()
            .input('BranchId', sql.UniqueIdentifier, branchId)
            .query('SELECT BranchName FROM dbo.Branches WHERE BranchId = @BranchId AND IsActive = 1');
          branchName = branchResult.recordset[0]?.BranchName;
          if (!branchName) {
            return res.status(400).json({ message: 'The selected branch does not exist or is inactive.' });
          }
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.request()
          .input('Name', sql.NVarChar(240), fullName)
          .input('Email', sql.NVarChar(508), email)
          .input('Mobile', sql.NVarChar(60), mobile)
          .input('Username', sql.NVarChar(160), username)
          .input('PasswordHash', sql.NVarChar(510), passwordHash)
          .input('RoleCode', sql.NVarChar(40), roleCode)
          .input('BranchId', sql.UniqueIdentifier, branchId)
          .query(`
            INSERT INTO dbo.Users (Name, Email, Mobile, Username, PasswordHash, [Role], BranchId)
            OUTPUT inserted.UserId, inserted.Name AS FullName, inserted.Email, inserted.Mobile,
                   inserted.Username, inserted.[Role] AS RoleCode, inserted.BranchId,
                   inserted.IsActive, inserted.MustChangePassword, inserted.CreatedAt
            VALUES (@Name, @Email, @Mobile, @Username, @PasswordHash, @RoleCode, @BranchId)
          `);

        return res.status(201).json({
          ...result.recordset[0],
          RoleName: role.RoleName,
          BranchName: branchName,
        });
      })
      .catch((error) => {
        if (error.number === 2601 || error.number === 2627) {
          return res.status(409).json({ message: 'Username, email, or mobile number already exists.' });
        }
        if (error.number === 547) {
          return res.status(400).json({ message: 'The selected role or branch is not valid for this user.' });
        }
        console.error('Failed creating user in SQL Server:', error.message);
        res.status(500).json({ message: 'Could not create user.' });
      });
    return;
  }

  const selectedRole = mockData.roles.find((role) => (
    (role.RoleCode || getRoleCode(role.RoleName)) === roleCode
  ));
  if (!selectedRole) {
    return res.status(400).json({ message: 'The selected role is not available.' });
  }
  const mobileKey = mobile.replace(/\D/g, '');
  const duplicateUser = mockData.users.find((item) => (
    item.Username.trim().toLowerCase() === username.toLowerCase()
    || item.Email.trim().toLowerCase() === email.toLowerCase()
    || (mobileKey && String(item.Mobile || '').replace(/\D/g, '') === mobileKey)
  ));
  if (duplicateUser) {
    const duplicateField = duplicateUser.Username.trim().toLowerCase() === username.toLowerCase()
      ? 'username'
      : duplicateUser.Email.trim().toLowerCase() === email.toLowerCase() ? 'email' : 'mobile';
    return res.status(409).json({ message: `This ${duplicateField} is already used by another user.` });
  }
  const selectedBranch = roleCode === 'SUPER_ADMIN'
    ? null
    : mockData.branches.find((branch) => branch.BranchId === req.body?.BranchId && branch.IsActive);
  if (roleCode !== 'SUPER_ADMIN' && !selectedBranch) {
    return res.status(400).json({ message: 'Select a valid branch for this role.' });
  }
  if (!isSuperAdmin(req) && selectedBranch?.BranchId !== req.user.branchId) {
    return res.status(403).json({ message: 'You can create users only for your assigned branch.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = {
    UserId: `u${Date.now()}`,
    Username: username,
    PasswordHash: passwordHash,
    FullName: fullName,
    Email: email,
    Mobile: mobile,
    RoleId: selectedRole.RoleId,
    RoleCode: selectedRole.RoleCode || roleCode,
    RoleName: selectedRole.RoleName,
    BranchId: selectedBranch?.BranchId || null,
    BranchName: selectedBranch?.BranchName || 'Head Office',
    IsActive: true,
    MustChangePassword: false,
  };
  mockData.users.push(user);
  const { PasswordHash, ...safeUser } = user;
  res.status(201).json(safeUser);
});

app.put('/api/users/:id', authRequired, (req, res) => {
  if (!canAccess(req, 'users', 'canEdit')) {
    return res.status(403).json({ message: 'Edit user not allowed.' });
  }

  const fullName = String(req.body?.FullName || '').trim();
  const email = String(req.body?.Email || '').trim();
  const mobile = String(req.body?.Mobile || '').replace(/\D/g, '');
  const password = String(req.body?.Password || '');
  const roleCode = String(req.body?.RoleCode || getRoleCode(req.body?.RoleName) || '').toUpperCase();

  if (!fullName || !email || !mobile || !roleCode) {
    return res.status(400).json({ message: 'Name, email, mobile, and a valid role are required.' });
  }

  if (fullName.length > 240 || email.length > 508 || mobile.length > 60) {
    return res.status(400).json({ message: 'One or more user fields exceed the allowed length.' });
  }
  if (isBranchAdmin(req) && roleCode !== 'USER') {
    return res.status(403).json({ message: 'Branch Admins can assign only the User role in their own branch.' });
  }
  if (!isSuperAdmin(req) && !['USER', 'BRANCH_ADMIN'].includes(roleCode)) {
    return res.status(403).json({ message: 'You cannot assign this role.' });
  }

  if (!useMockData) {
    const userId = String(req.params.id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    const branchId = roleCode === 'SUPER_ADMIN' ? null : String(req.body?.BranchId || '').trim();
    if (roleCode !== 'SUPER_ADMIN' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId)) {
      return res.status(400).json({ message: 'Select a valid branch for this role.' });
    }
    if (!isSuperAdmin(req) && branchId.toLowerCase() !== String(req.user.branchId || '').toLowerCase()) {
      return res.status(403).json({ message: 'You can assign users only to your branch.' });
    }

    connectDatabase()
      .then(async (pool) => {
        const targetResult = await pool.request()
          .input('UserId', sql.UniqueIdentifier, userId)
          .query('SELECT Username, [Role], BranchId FROM dbo.Users WHERE UserId = @UserId AND IsActive = 1');
        const target = targetResult.recordset[0];
        if (!target) {
          return res.status(404).json({ message: 'User not found.' });
        }
        const mobileKey = mobile.replace(/\D/g, '');
        const duplicateResult = await pool.request()
          .input('UserId', sql.UniqueIdentifier, userId)
          .input('UsernameKey', sql.NVarChar(160), target.Username.toLowerCase())
          .input('EmailKey', sql.NVarChar(508), email.toLowerCase())
          .input('MobileKey', sql.NVarChar(60), mobileKey)
          .query(`
            SELECT TOP (1)
              CASE
                WHEN LOWER(LTRIM(RTRIM(u.Email))) = @EmailKey THEN N'email'
                ELSE N'mobile'
              END AS DuplicateField
            FROM dbo.Users u WITH (UPDLOCK, HOLDLOCK)
            WHERE u.UserId <> @UserId
              AND (LOWER(LTRIM(RTRIM(u.Email))) = @EmailKey
                OR (@MobileKey <> N'' AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(u.Mobile, N' ', N''), N'-', N''), N'+', N''), N'(', N''), N')', N''), N'.', N'') = @MobileKey))
          `);
        if (duplicateResult.recordset.length) {
          const duplicateField = duplicateResult.recordset[0].DuplicateField;
          return res.status(409).json({ message: `This ${duplicateField} is already used by another user.` });
        }
        if (!isSuperAdmin(req)
          && String(target.BranchId || '').toLowerCase() !== String(req.user.branchId || '').toLowerCase()) {
          return res.status(403).json({ message: 'You can edit users only from your assigned branch.' });
        }
        if (target.Username.toLowerCase() === String(req.user.username || '').toLowerCase()
          && roleCode !== 'SUPER_ADMIN') {
          return res.status(400).json({ message: 'You cannot remove your own Super Admin access.' });
        }

        const roleResult = await pool.request()
          .input('RoleCode', sql.NVarChar(40), roleCode)
          .query('SELECT RoleCode, RoleName FROM dbo.Roles WHERE RoleCode = @RoleCode AND IsActive = 1');
        const role = roleResult.recordset[0];
        if (!role) {
          return res.status(400).json({ message: 'The selected role is not active in the database.' });
        }
        let branchName = null;
        if (branchId) {
          const branchResult = await pool.request()
            .input('BranchId', sql.UniqueIdentifier, branchId)
            .query('SELECT BranchName FROM dbo.Branches WHERE BranchId = @BranchId AND IsActive = 1');
          branchName = branchResult.recordset[0]?.BranchName;
          if (!branchName) {
            return res.status(400).json({ message: 'The selected branch does not exist or is inactive.' });
          }
        }

        const passwordHash = password ? await bcrypt.hash(password, 10) : null;
        const result = await pool.request()
          .input('UserId', sql.UniqueIdentifier, userId)
          .input('Name', sql.NVarChar(240), fullName)
          .input('Email', sql.NVarChar(508), email)
          .input('Mobile', sql.NVarChar(60), mobile)
          .input('PasswordHash', sql.NVarChar(510), passwordHash)
          .input('RoleCode', sql.NVarChar(40), roleCode)
          .input('BranchId', sql.UniqueIdentifier, branchId)
          .query(`
            UPDATE dbo.Users
            SET Name = @Name,
                Email = @Email,
                Mobile = @Mobile,
                PasswordHash = COALESCE(@PasswordHash, PasswordHash),
                [Role] = @RoleCode,
                BranchId = @BranchId,
                ModifiedAt = SYSUTCDATETIME()
            OUTPUT inserted.UserId, inserted.Name AS FullName, inserted.Email, inserted.Mobile,
                   inserted.Username, inserted.[Role] AS RoleCode, inserted.BranchId,
                   inserted.IsActive, inserted.MustChangePassword, inserted.CreatedAt
            WHERE UserId = @UserId AND IsActive = 1
          `);

        return res.json({
          ...result.recordset[0],
          RoleName: role.RoleName,
          BranchName: branchName,
        });
      })
      .catch((error) => {
        if (error.number === 2601 || error.number === 2627) {
          return res.status(409).json({ message: 'Email or mobile number already belongs to another user.' });
        }
        if (error.number === 547) {
          return res.status(400).json({ message: 'The selected role or branch is not valid for this user.' });
        }
        console.error('Failed updating user in SQL Server:', error.message);
        res.status(500).json({ message: 'Could not update user.' });
      });
    return;
  }

  const user = mockData.users.find((item) => item.UserId === req.params.id && item.IsActive);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  const mobileKey = mobile.replace(/\D/g, '');
  const duplicateUser = mockData.users.find((item) => (
    item.UserId !== user.UserId
    && (item.Email.trim().toLowerCase() === email.toLowerCase()
      || (mobileKey && String(item.Mobile || '').replace(/\D/g, '') === mobileKey))
  ));
  if (duplicateUser) {
    const duplicateField = duplicateUser.Email.trim().toLowerCase() === email.toLowerCase() ? 'email' : 'mobile';
    return res.status(409).json({ message: `This ${duplicateField} is already used by another user.` });
  }
  if (user.Username.toLowerCase() === String(req.user.username || '').toLowerCase()
    && roleCode !== 'SUPER_ADMIN') {
    return res.status(400).json({ message: 'You cannot remove your own Super Admin access.' });
  }

  const selectedRole = mockData.roles.find((role) => (
    (role.RoleCode || getRoleCode(role.RoleName)) === roleCode
  ));
  if (!selectedRole) {
    return res.status(400).json({ message: 'The selected role is not available.' });
  }
  const selectedBranch = roleCode === 'SUPER_ADMIN'
    ? null
    : mockData.branches.find((branch) => branch.BranchId === req.body?.BranchId && branch.IsActive);
  if (roleCode !== 'SUPER_ADMIN' && !selectedBranch) {
    return res.status(400).json({ message: 'Select a valid branch for this role.' });
  }
  if (!isSuperAdmin(req) && selectedBranch?.BranchId !== req.user.branchId) {
    return res.status(403).json({ message: 'You can assign users only to your branch.' });
  }

  user.FullName = fullName;
  user.Email = email;
  user.Mobile = mobile;
  user.RoleId = selectedRole.RoleId;
  user.RoleCode = selectedRole.RoleCode || roleCode;
  user.RoleName = selectedRole.RoleName;
  user.BranchId = selectedBranch?.BranchId || null;
  user.BranchName = selectedBranch?.BranchName || '';
  if (password) {
    user.PasswordHash = bcrypt.hashSync(password, 10);
  }

  const { PasswordHash, ...safeUser } = user;
  res.json(safeUser);
});

app.delete('/api/users/:id', authRequired, (req, res) => {
  if (!canAccess(req, 'users', 'canDelete')) {
    return res.status(403).json({ message: 'Delete user not allowed.' });
  }

  if (!useMockData) {
    const userId = String(req.params.id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    connectDatabase()
      .then(async (pool) => {
        const targetResult = await pool.request()
          .input('UserId', sql.UniqueIdentifier, userId)
          .query('SELECT Username, BranchId FROM dbo.Users WHERE UserId = @UserId AND IsActive = 1');
        const target = targetResult.recordset[0];
        if (!target) {
          return res.status(404).json({ message: 'User not found.' });
        }
        if (!isSuperAdmin(req)
          && String(target.BranchId || '').toLowerCase() !== String(req.user.branchId || '').toLowerCase()) {
          return res.status(403).json({ message: 'You can deactivate users only from your assigned branch.' });
        }
        if (target.Username.toLowerCase() === String(req.user.username || '').toLowerCase()) {
          return res.status(400).json({ message: 'You cannot deactivate your own account.' });
        }

        await pool.request()
          .input('UserId', sql.UniqueIdentifier, userId)
          .query(`
            UPDATE dbo.Users
            SET IsActive = 0, ModifiedAt = SYSUTCDATETIME()
            WHERE UserId = @UserId AND IsActive = 1
          `);
        return res.json({ message: 'User deactivated.' });
      })
      .catch((error) => {
        console.error('Failed deactivating user in SQL Server:', error.message);
        res.status(500).json({ message: 'Could not delete user.' });
      });
    return;
  }

  const user = mockData.users.find((item) => item.UserId === req.params.id && item.IsActive);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  if (!isSuperAdmin(req) && user.BranchId !== req.user.branchId) {
    return res.status(403).json({ message: 'You can deactivate users only from your assigned branch.' });
  }
  if (user.Username.toLowerCase() === String(req.user.username || '').toLowerCase()) {
    return res.status(400).json({ message: 'You cannot deactivate your own account.' });
  }
  user.IsActive = false;
  res.json({ message: 'User deactivated.' });
});

app.get('/api/bills', authRequired, async (req, res) => {
  if (!canAccess(req, 'bills', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const fromDate = String(req.query?.fromDate || '').trim();
  const toDate = String(req.query?.toDate || '').trim();
  const paymentMode = String(req.query?.paymentMode || '').trim();
  if ((fromDate && !isValidBillDate(fromDate)) || (toDate && !isValidBillDate(toDate))) {
    return res.status(400).json({ message: 'Enter valid From and To dates.' });
  }
  if (fromDate && toDate && fromDate > toDate) {
    return res.status(400).json({ message: 'From date must be on or before To date.' });
  }
  if (useMockData) {
    let results = filterBranchRecords(req, mockData.bills, 'BillDate')
      .filter((bill) => bill.Status !== 'VOID')
      .filter((bill) => !fromDate || String(bill.BillDate).slice(0, 10) >= fromDate)
      .filter((bill) => !toDate || String(bill.BillDate).slice(0, 10) <= toDate)
      .filter((bill) => !paymentMode || bill.PaymentMode === paymentMode);
    results = results.map((bill) => {
      const billId = bill.SaleBillId || bill.BillId;
      const relatedPayments = mockData.payments.filter((payment) => payment.SaleBillId === billId);
      const paidAmount = relatedPayments.reduce((total, payment) => total + Number(payment.Amount || 0), 0);
      const latestPayment = relatedPayments[0];
      const paymentDetails = latestPayment
        ? [latestPayment.PaymentMode, latestPayment.ReferenceNumber, latestPayment.Notes].filter(Boolean).join(' · ')
        : bill.PaymentMode || '';
      return { ...bill, PaidAmount: paidAmount, PaymentCount: relatedPayments.length, PaymentDetails: paymentDetails };
    });
    return res.json(results);
  }
  try {
    const { monthStart, nextMonthStart } = getCurrentMonthRange();
    const result = await (await connectDatabase()).request()
      .input('IsSuperAdmin', sql.Bit, isSuperAdmin(req))
      .input('BranchId', sql.UniqueIdentifier, req.user.branchId || null)
      .input('CurrentMonthOnly', sql.Bit, isCurrentMonthUser(req))
      .input('MonthStart', sql.Date, monthStart)
      .input('NextMonthStart', sql.Date, nextMonthStart)
      .input('FromDate', sql.Date, fromDate || null)
      .input('ToDate', sql.Date, toDate || null)
      .input('PaymentMode', sql.NVarChar(60), paymentMode || null)
      .query(`
      SELECT b.BillId AS SaleBillId, b.BranchId, b.BillNumber, b.CustomerName, b.CustomerMobile,
             b.CustomerAddress, b.CustomerEmail, b.NextServiceDate, b.BillDate,
             b.GrandTotal AS NetAmount, b.PaymentMode, b.Status, br.BranchName,
             COALESCE(NULLIF(lp.PaymentDetails, N''), b.PaymentMode) AS PaymentDetails,
             COALESCE(p.PaidAmount, 0) AS PaidAmount, COALESCE(p.PaymentCount, 0) AS PaymentCount
      FROM dbo.SaleBills AS b
      INNER JOIN dbo.Branches AS br ON br.BranchId = b.BranchId
      OUTER APPLY (
        SELECT SUM(Amount) AS PaidAmount, COUNT(*) AS PaymentCount
        FROM dbo.Payments WHERE BillId = b.BillId
      ) AS p
      OUTER APPLY (
        SELECT TOP (1) CONCAT(PaymentMode, N' | ', ReferenceNumber, N' | ', Remarks) AS PaymentDetails
        FROM dbo.Payments WHERE BillId = b.BillId
        ORDER BY PaymentDate DESC, CreatedAt DESC
      ) AS lp
      WHERE (@IsSuperAdmin = 1 OR b.BranchId = @BranchId)
        AND (@CurrentMonthOnly = 0 OR (b.BillDate >= @MonthStart AND b.BillDate < @NextMonthStart))
        AND b.Status <> N'VOID'
        AND (@FromDate IS NULL OR b.BillDate >= @FromDate)
        AND (@ToDate IS NULL OR b.BillDate < DATEADD(DAY, 1, @ToDate))
        AND (@PaymentMode IS NULL OR b.PaymentMode = @PaymentMode)
      ORDER BY b.CreatedAt DESC
    `);
    return res.json(result.recordset);
  } catch (error) {
    console.error('Failed loading sale bills from SQL Server:', error.message);
    return res.status(503).json({ message: 'Could not load sale bills from the database.' });
  }
});

app.get('/api/bills/number-preview', authRequired, async (req, res) => {
  if (!canAccess(req, 'bills', 'canAdd')) {
    return res.status(403).json({ message: 'Bill number preview is not allowed.' });
  }

  const branchId = String(req.query?.branchId || '').trim();
  const billDate = String(req.query?.billDate || '').trim();
  if (!isValidBillDate(billDate)
      || (!useMockData && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId))) {
    return res.status(400).json({ message: 'Select a valid branch and bill date.' });
  }
  if (getRoleCode(req.user.role) !== 'SUPER_ADMIN'
      && (!req.user.branchId || String(req.user.branchId).toLowerCase() !== branchId.toLowerCase())) {
    return res.status(403).json({ message: 'You can preview bill numbers only for your assigned branch.' });
  }
  if (isCurrentMonthUser(req) && !isCurrentMonthDate(billDate)) {
    return res.status(403).json({ message: 'Users can create bills only for the current month.' });
  }

  if (useMockData) {
    const branch = mockData.branches.find((item) => item.BranchId === branchId && item.IsActive);
    if (!branch) return res.status(404).json({ message: 'The selected branch does not exist or is inactive.' });
    const sequence = getNextMockBillSequence(branch.BranchCode, billDate);
    return res.json({ BillNumber: formatBillNumber(branch.BranchCode, billDate, sequence) });
  }

  try {
    const pool = await connectDatabase();
    const branchResult = await pool.request()
      .input('BranchId', sql.UniqueIdentifier, branchId)
      .query('SELECT BranchCode FROM dbo.Branches WHERE BranchId = @BranchId AND IsActive = 1');
    const branch = branchResult.recordset[0];
    if (!branch) return res.status(404).json({ message: 'The selected branch does not exist or is inactive.' });

    const numberPrefix = getBillNumberPrefix(branch.BranchCode, billDate);
    const sequenceResult = await pool.request()
      .input('NumberPrefix', sql.NVarChar(30), numberPrefix)
      .query(`
        SELECT COALESCE(MAX(TRY_CONVERT(int, SUBSTRING(BillNumber, LEN(@NumberPrefix) + 2, 20))), 0) + 1 AS BillSequence
        FROM dbo.SaleBills
        WHERE LEFT(BillNumber, LEN(@NumberPrefix) + 1) = @NumberPrefix + N'-'
      `);
    return res.json({
      BillNumber: formatBillNumber(branch.BranchCode, billDate, sequenceResult.recordset[0].BillSequence),
    });
  } catch (error) {
    console.error('Failed loading bill number preview from SQL Server:', error.message);
    return res.status(503).json({ message: 'Could not load the bill number preview.' });
  }
});

app.get('/api/bills/:id', authRequired, async (req, res) => {
  if (!canAccess(req, 'bills', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const billId = String(req.params.id || '').trim();
  if (!useMockData && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(billId)) {
    return res.status(400).json({ message: 'Invalid bill ID.' });
  }
  if (useMockData) {
    const bill = mockData.bills.find((item) => (item.SaleBillId || item.BillId) === billId && item.Status !== 'VOID');
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    if (!isSuperAdmin(req) && bill.BranchId !== req.user.branchId) return res.status(403).json({ message: 'Access denied.' });
    const branch = mockData.branches.find((item) => item.BranchId === bill.BranchId);
    const terms = bill.Terms?.length ? bill.Terms : branch?.Terms || [];
    const payments = mockData.payments
      .filter((payment) => (payment.SaleBillId || payment.BillId) === billId)
      .map(({ PaymentId, PaymentMode, Amount }) => ({ PaymentId, PaymentMode, Amount }));
    const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.Amount || 0), 0);
    return res.json({ ...bill, PaidAmount: paidAmount, Treatments: bill.Treatments || [], Items: bill.Items || [], Payments: payments, Terms: terms });
  }
  try {
    const pool = await connectDatabase();
    const result = await pool.request()
      .input('BillId', sql.UniqueIdentifier, billId)
      .input('IsSuperAdmin', sql.Bit, isSuperAdmin(req))
      .input('BranchId', sql.UniqueIdentifier, req.user.branchId || null)
      .query(`
        SELECT b.BillId AS SaleBillId, b.BranchId, br.BranchName, b.BillNumber,
               b.BillDate, b.CustomerName, b.CustomerMobile, b.CustomerAddress,
               b.CustomerEmail, b.CustomerGSTNumber, b.NextServiceDate, b.PreviousBalance, b.PaymentMode,
               b.Subtotal, b.DiscountTotal, b.TaxableAmount, b.CGST, b.SGST, b.IGST,
               b.GrandTotal AS NetAmount, b.Status
        FROM dbo.SaleBills b
        INNER JOIN dbo.Branches br ON br.BranchId = b.BranchId
        WHERE b.BillId = @BillId AND b.Status <> N'VOID'
          AND (@IsSuperAdmin = 1 OR b.BranchId = @BranchId)
      `);
    const bill = result.recordset[0];
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    const [treatments, items, payments, terms] = await Promise.all([
      pool.request().input('BillId', sql.UniqueIdentifier, billId)
        .query('SELECT TreatmentId, TreatmentName, StaffName, TaxRate, GSTAmount, Price, IsPrinted FROM dbo.SaleBillTreatments WHERE BillId = @BillId ORDER BY SrNo'),
      pool.request().input('BillId', sql.UniqueIdentifier, billId)
        .query('SELECT ItemId, ItemName, Description AS Remarks, Quantity, Unit, Rate, TaxPercent AS TaxRate, TaxAmount, LineTotal FROM dbo.SaleBillItems WHERE BillId = @BillId ORDER BY SrNo'),
      pool.request().input('BillId', sql.UniqueIdentifier, billId)
        .query(`
          DECLARE @BillColumn sysname = CASE
            WHEN COL_LENGTH(N'dbo.Payments', N'BillId') IS NOT NULL THEN N'BillId'
            WHEN COL_LENGTH(N'dbo.Payments', N'SaleBillId') IS NOT NULL THEN N'SaleBillId'
          END;
          IF @BillColumn IS NULL THROW 51002, 'Payments table is missing a bill ID column.', 1;
          DECLARE @PaymentSql nvarchar(max) = N'SELECT PaymentId, PaymentMode, Amount FROM dbo.Payments WHERE '
            + QUOTENAME(@BillColumn) + N' = @BillId ORDER BY PaymentDate, CreatedAt, PaymentId';
          EXEC sys.sp_executesql @PaymentSql, N'@BillId uniqueidentifier', @BillId = @BillId;
        `),
      pool.request().input('BillId', sql.UniqueIdentifier, billId)
        .query(`
          IF OBJECT_ID(N'dbo.SaleBillTerms', N'U') IS NOT NULL
          BEGIN
            EXEC sys.sp_executesql
              N'SELECT DisplayOrder, TermText FROM dbo.SaleBillTerms WHERE BillId = @BillId ORDER BY DisplayOrder',
              N'@BillId uniqueidentifier', @BillId = @BillId;
          END
          ELSE
          BEGIN
            SELECT CAST(NULL AS int) AS DisplayOrder, CAST(NULL AS nvarchar(1000)) AS TermText
            WHERE 1 = 0;
          END
        `),
    ]);
    let billTerms = terms.recordset;
    if (!billTerms.length) {
      const branchTerms = await pool.request()
        .input('BranchId', sql.UniqueIdentifier, bill.BranchId)
        .query('SELECT DisplayOrder, TermText FROM dbo.BranchTermsConditions WHERE BranchId = @BranchId AND IsActive = 1 ORDER BY DisplayOrder, TermId');
      billTerms = branchTerms.recordset;
    }
    const paidAmount = payments.recordset.reduce((sum, payment) => sum + Number(payment.Amount || 0), 0);
    return res.json({ ...bill, PaidAmount: paidAmount, Treatments: treatments.recordset, Items: items.recordset, Payments: payments.recordset, Terms: billTerms });
  } catch (error) {
    console.error('Failed loading bill details:', error);
    return res.status(503).json({
      message: process.env.NODE_ENV === 'production'
        ? 'Could not load bill details.'
        : `Could not load bill details: ${error.message}`,
    });
  }
});

app.put('/api/bills/:id', authRequired, async (req, res) => {
  if (!canAccess(req, 'bills', 'canEdit')) {
    return res.status(403).json({ message: 'Edit bill not allowed.' });
  }
  const billId = String(req.params.id || '').trim();
  const customerName = String(req.body?.CustomerName || '').trim();
  const customerMobile = String(req.body?.CustomerMobile || '').trim();
  const customerAddress = String(req.body?.CustomerAddress || '').trim();
  const customerEmail = req.body?.CustomerEmail == null ? '' : String(req.body.CustomerEmail).trim();
  const billDate = String(req.body?.BillDate || '').trim();
  const nextServiceDate = String(req.body?.NextServiceDate || '').trim();
  const paymentMode = String(req.body?.PaymentMode || '').trim();
  const paymentInputs = Array.isArray(req.body?.Payments) ? req.body.Payments : [];
  const treatmentInputs = Array.isArray(req.body?.Treatments) ? req.body.Treatments.filter((row) => String(row?.TreatmentId || '').trim()) : [];
  const itemInputs = Array.isArray(req.body?.Items) ? req.body.Items.filter((row) => String(row?.ItemId || '').trim()) : [];
  const isGuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const isValidId = (value) => (useMockData ? Boolean(String(value || '').trim()) : isGuid(value));
  const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  const inclusiveTax = (amount, rate) => (rate > 0 ? roundMoney(amount * rate / (100 + rate)) : 0);
  if (!useMockData && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(billId)) {
    return res.status(400).json({ message: 'Invalid bill ID.' });
  }
  if (!customerName || !customerMobile || !normalizeContactNo(customerMobile) || !customerAddress || !isValidBillDate(billDate)
      || (nextServiceDate && !isValidBillDate(nextServiceDate)) || !paymentMode) {
    return res.status(400).json({ message: 'Enter valid customer, date, and payment details.' });
  }
  if (customerName.length > 160 || customerMobile.length > 30 || customerAddress.length > 400
      || customerEmail.length > 254 || paymentMode.length > 30) {
    return res.status(400).json({ message: 'One or more bill fields exceed the allowed length.' });
  }
  if (paymentInputs.length > 3 || paymentInputs.some((row) => !['Cash', 'UPI', 'Online', 'Card', 'Bank Transfer'].includes(String(row?.PaymentMode || ''))
      || !Number.isFinite(Number(row?.Amount)) || Number(row.Amount) <= 0)) {
    return res.status(400).json({ message: 'Enter a valid amount for each payment method.' });
  }
  if (!treatmentInputs.length && !itemInputs.length) return res.status(400).json({ message: 'Add at least one treatment or row item to the bill.' });
  if (treatmentInputs.length > 100 || itemInputs.length > 100
      || treatmentInputs.some((row) => !isValidId(String(row.TreatmentId || '').trim())
        || String(row.StaffName || '').length > 120
        || !Number.isFinite(Number(row.Price)) || Number(row.Price) < 0
        || !Number.isFinite(Number(row.GSTAmount)) || Number(row.GSTAmount) < 0)
      || itemInputs.some((row) => !isValidId(String(row.ItemId || '').trim())
        || !Number.isFinite(Number(row.Quantity)) || Number(row.Quantity) <= 0
        || !Number.isFinite(Number(row.Rate)) || Number(row.Rate) < 0
        || String(row.Remarks || '').length > 300)) {
    return res.status(400).json({ message: 'Check the treatment, item, quantity, price, and remark values.' });
  }
  if (isCurrentMonthUser(req) && !isCurrentMonthDate(billDate)) {
    return res.status(403).json({ message: 'Users can edit bills only within the current month.' });
  }
  if (useMockData) {
    const bill = mockData.bills.find((item) => (item.SaleBillId || item.BillId) === billId && item.Status !== 'VOID');
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    if (!isSuperAdmin(req) && bill.BranchId !== req.user.branchId) return res.status(403).json({ message: 'Access denied.' });
    const treatments = treatmentInputs.map((row) => ({ ...row, TreatmentName: row.TreatmentName || mockData.treatments.find((item) => String(item.TreatmentId) === String(row.TreatmentId))?.TreatmentName || '', Price: Number(row.Price), GSTAmount: Number(row.GSTAmount) }));
    const items = itemInputs.map((row) => ({ ...row, ItemName: row.ItemName || mockData.items.find((item) => String(item.ItemId) === String(row.ItemId))?.ItemName || '', Quantity: Number(row.Quantity), Rate: Number(row.Rate), LineTotal: roundMoney(Number(row.Quantity) * Number(row.Rate)) }));
    const total = roundMoney(treatments.reduce((sum, row) => sum + row.Price, 0)
      + items.reduce((sum, row) => sum + row.LineTotal, 0) + Number(bill.PreviousBalance || 0));
    const paid = paymentInputs.reduce((sum, row) => sum + Number(row.Amount), 0);
    if (total < paid) return res.status(409).json({ message: 'Bill total cannot be lower than payments already recorded.' });
    for (let index = mockData.payments.length - 1; index >= 0; index -= 1) {
      if ((mockData.payments[index].SaleBillId || mockData.payments[index].BillId) === billId) mockData.payments.splice(index, 1);
    }
    paymentInputs.forEach((payment, index) => mockData.payments.unshift({
      PaymentId: `p${Date.now()}-${index}`,
      SaleBillId: billId,
      BillNumber: bill.BillNumber,
      BranchId: bill.BranchId,
      PaymentDate: billDate,
      Amount: Number(payment.Amount),
      PaymentMode: String(payment.PaymentMode),
      ReferenceNumber: '',
      Notes: 'Payment recorded with bill update',
    }));
    const clientId = syncMockBillClient({ customerName, customerMobile, customerAddress, customerEmail });
    Object.assign(bill, { ClientId: clientId, CustomerName: customerName, CustomerMobile: customerMobile, CustomerAddress: customerAddress, CustomerEmail: customerEmail, BillDate: billDate, NextServiceDate: nextServiceDate, PaymentMode: paymentMode, Treatments: treatments, Items: items, NetAmount: total, GrandTotal: total });
    return res.json(bill);
  }
  let transaction;
  let transactionStarted = false;
  try {
    transaction = new sql.Transaction(await connectDatabase());
    await transaction.begin();
    transactionStarted = true;
    const existingResult = await transaction.request()
      .input('BillId', sql.UniqueIdentifier, billId)
      .input('IsSuperAdmin', sql.Bit, isSuperAdmin(req))
      .input('BranchId', sql.UniqueIdentifier, req.user.branchId || null)
      .query(`SELECT BillId, BranchId, BillNumber, PreviousBalance FROM dbo.SaleBills WITH (UPDLOCK, ROWLOCK) WHERE BillId = @BillId AND Status <> N'VOID' AND (@IsSuperAdmin = 1 OR BranchId = @BranchId)`);
    const existing = existingResult.recordset[0];
    if (!existing) {
      await transaction.rollback(); transactionStarted = false;
      return res.status(404).json({ message: 'Bill not found.' });
    }
    const editedPaidTotal = paymentInputs.reduce((sum, row) => sum + Number(row.Amount), 0);
    const treatments = [];
    for (const row of treatmentInputs) {
      const selectedResult = await transaction.request().input('TreatmentId', sql.UniqueIdentifier, String(row.TreatmentId).trim())
        .query('SELECT TreatmentId, TreatmentName, TaxRate, TotalPrice FROM dbo.Treatments WHERE TreatmentId = @TreatmentId AND IsActive = 1');
      const selected = selectedResult.recordset[0];
      if (!selected) { await transaction.rollback(); transactionStarted = false; return res.status(400).json({ message: 'A selected treatment does not exist or is inactive.' }); }
      const price = roundMoney(Number(row.Price));
      const gstAmount = roundMoney(Number(row.GSTAmount));
      if (gstAmount > price) { await transaction.rollback(); transactionStarted = false; return res.status(400).json({ message: 'GST amount cannot be greater than the treatment price.' }); }
      treatments.push({ TreatmentId: selected.TreatmentId, TreatmentName: selected.TreatmentName, StaffName: String(row.StaffName || '').trim(), TaxRate: Number(selected.TaxRate), GSTAmount: gstAmount, Price: price, IsPrinted: row.IsPrinted === true });
    }
    const items = [];
    for (const row of itemInputs) {
      const selectedResult = await transaction.request().input('ItemId', sql.UniqueIdentifier, String(row.ItemId).trim())
        .query('SELECT ItemId, ItemName, Unit, TaxRate, TotalPrice FROM dbo.Items WHERE ItemId = @ItemId AND IsActive = 1');
      const selected = selectedResult.recordset[0];
      if (!selected) { await transaction.rollback(); transactionStarted = false; return res.status(400).json({ message: 'A selected item does not exist or is inactive.' }); }
      const quantity = Number(row.Quantity);
      const rate = roundMoney(Number(row.Rate));
      const lineTotal = roundMoney(rate * quantity);
      const taxRate = Number(selected.TaxRate);
      const taxAmount = inclusiveTax(lineTotal, taxRate);
      items.push({ ItemId: selected.ItemId, ItemName: selected.ItemName, Unit: selected.Unit, Quantity: quantity, Remarks: String(row.Remarks || '').trim(), Rate: rate, TaxRate: taxRate, TaxAmount: taxAmount, LineTotal: lineTotal, Amount: roundMoney(lineTotal - taxAmount) });
    }
    const serviceGross = roundMoney(treatments.reduce((sum, row) => sum + row.Price, 0)
      + items.reduce((sum, row) => sum + row.LineTotal, 0));
    const gross = roundMoney(serviceGross + Number(existing.PreviousBalance || 0));
    const totalTax = roundMoney(treatments.reduce((sum, row) => sum + row.GSTAmount, 0) + items.reduce((sum, row) => sum + row.TaxAmount, 0));
    if (gross < editedPaidTotal) {
      await transaction.rollback(); transactionStarted = false;
      return res.status(409).json({ message: 'Bill total cannot be lower than payments already recorded.' });
    }
    const clientId = await syncBillClient(transaction, { customerName, customerMobile, customerAddress, customerEmail });
    const taxable = roundMoney(serviceGross - totalTax);
    const cgst = roundMoney(totalTax / 2);
    const sgst = roundMoney(totalTax - cgst);
    const result = await transaction.request()
      .input('BillId', sql.UniqueIdentifier, billId)
      .input('CustomerName', sql.NVarChar(160), customerName)
      .input('CustomerMobile', sql.NVarChar(30), customerMobile)
      .input('CustomerAddress', sql.NVarChar(400), customerAddress)
      .input('CustomerEmail', sql.NVarChar(254), customerEmail)
      .input('BillDate', sql.Date, new Date(`${billDate}T00:00:00Z`))
      .input('NextServiceDate', sql.Date, nextServiceDate ? new Date(`${nextServiceDate}T00:00:00Z`) : null)
      .input('PaymentMode', sql.NVarChar(30), paymentMode)
      .input('Subtotal', sql.Decimal(18, 2), taxable)
      .input('TaxableAmount', sql.Decimal(18, 2), taxable)
      .input('CGST', sql.Decimal(18, 2), cgst)
      .input('SGST', sql.Decimal(18, 2), sgst)
      .input('IGST', sql.Decimal(18, 2), 0)
      .input('GrandTotal', sql.Decimal(18, 2), gross)
      .query(`
        UPDATE dbo.SaleBills
        SET CustomerName = @CustomerName, CustomerMobile = @CustomerMobile,
            CustomerAddress = @CustomerAddress, CustomerEmail = @CustomerEmail,
            BillDate = @BillDate, NextServiceDate = @NextServiceDate,
            PaymentMode = @PaymentMode, Subtotal = @Subtotal, TaxableAmount = @TaxableAmount,
            CGST = @CGST, SGST = @SGST, IGST = @IGST, GrandTotal = @GrandTotal,
            ModifiedAt = SYSUTCDATETIME()
        OUTPUT inserted.BillId AS SaleBillId, inserted.BillNumber, inserted.CustomerName,
               inserted.CustomerMobile, inserted.CustomerAddress, inserted.CustomerEmail,
               inserted.BillDate, inserted.NextServiceDate, inserted.PaymentMode,
               inserted.GrandTotal AS NetAmount
        WHERE BillId = @BillId AND Status <> N'VOID'
      `);
    await transaction.request().input('BillId', sql.UniqueIdentifier, billId)
      .query(`
        DECLARE @BillColumn sysname = CASE
          WHEN COL_LENGTH(N'dbo.Payments', N'BillId') IS NOT NULL THEN N'BillId'
          WHEN COL_LENGTH(N'dbo.Payments', N'SaleBillId') IS NOT NULL THEN N'SaleBillId'
        END;
        IF @BillColumn IS NULL THROW 51002, 'Payments table is missing a bill ID column.', 1;
        DECLARE @DeleteSql nvarchar(max) = N'DELETE FROM dbo.Payments WHERE ' + QUOTENAME(@BillColumn) + N' = @BillId';
        EXEC sys.sp_executesql @DeleteSql, N'@BillId uniqueidentifier', @BillId = @BillId;
      `);
    for (const payment of paymentInputs) {
      await transaction.request()
        .input('BillId', sql.UniqueIdentifier, billId)
        .input('BranchId', sql.UniqueIdentifier, existing.BranchId)
        .input('PaymentDate', sql.Date, new Date(`${billDate}T00:00:00Z`))
        .input('Amount', sql.Decimal(18, 2), roundMoney(Number(payment.Amount)))
        .input('PaymentMode', sql.NVarChar(30), String(payment.PaymentMode))
        .input('ReferenceNumber', sql.NVarChar(100), '')
        .input('PaymentNote', sql.NVarChar(250), 'Payment recorded with bill update')
        .input('CreatedBy', sql.UniqueIdentifier, req.user.userId)
        .query(`
          DECLARE @BillColumn sysname = CASE
            WHEN COL_LENGTH(N'dbo.Payments', N'BillId') IS NOT NULL THEN N'BillId'
            WHEN COL_LENGTH(N'dbo.Payments', N'SaleBillId') IS NOT NULL THEN N'SaleBillId'
          END;
          DECLARE @NoteColumn sysname = CASE
            WHEN COL_LENGTH(N'dbo.Payments', N'Remarks') IS NOT NULL THEN N'Remarks'
            WHEN COL_LENGTH(N'dbo.Payments', N'Notes') IS NOT NULL THEN N'Notes'
          END;
          DECLARE @InsertSql nvarchar(max);
          IF @BillColumn IS NULL OR @NoteColumn IS NULL
            THROW 51002, 'Payments table is missing a bill ID or notes column.', 1;
          SET @InsertSql = N'INSERT INTO dbo.Payments ('
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'PaymentId') IS NOT NULL THEN N'PaymentId, ' ELSE N'' END
            + QUOTENAME(@BillColumn)
            + N', BranchId, PaymentDate, Amount, PaymentMode, ReferenceNumber, '
            + QUOTENAME(@NoteColumn)
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'CreatedBy') IS NOT NULL THEN N', CreatedBy' ELSE N'' END
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'CreatedAt') IS NOT NULL THEN N', CreatedAt' ELSE N'' END
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'ModifiedAt') IS NOT NULL THEN N', ModifiedAt' ELSE N'' END
            + N') VALUES ('
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'PaymentId') IS NOT NULL THEN N'NEWID(), ' ELSE N'' END
            + N'@BillId, @BranchId, @PaymentDate, @Amount, @PaymentMode, @ReferenceNumber, @PaymentNote'
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'CreatedBy') IS NOT NULL THEN N', @CreatedBy' ELSE N'' END
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'CreatedAt') IS NOT NULL THEN N', SYSUTCDATETIME()' ELSE N'' END
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'ModifiedAt') IS NOT NULL THEN N', SYSUTCDATETIME()' ELSE N'' END
            + N')';
          EXEC sys.sp_executesql @InsertSql,
            N'@BillId uniqueidentifier, @BranchId uniqueidentifier, @PaymentDate date, @Amount decimal(18,2), @PaymentMode nvarchar(30), @ReferenceNumber nvarchar(100), @PaymentNote nvarchar(250), @CreatedBy uniqueidentifier',
            @BillId = @BillId, @BranchId = @BranchId, @PaymentDate = @PaymentDate,
            @Amount = @Amount, @PaymentMode = @PaymentMode, @ReferenceNumber = @ReferenceNumber,
            @PaymentNote = @PaymentNote, @CreatedBy = @CreatedBy;
        `);
    }
    await transaction.request().input('BillId', sql.UniqueIdentifier, billId).query('DELETE FROM dbo.SaleBillTreatments WHERE BillId = @BillId; DELETE FROM dbo.SaleBillItems WHERE BillId = @BillId;');
    for (let index = 0; index < treatments.length; index += 1) {
      const row = treatments[index];
      await transaction.request().input('BillId', sql.UniqueIdentifier, billId).input('SrNo', sql.Int, index + 1)
        .input('TreatmentId', sql.UniqueIdentifier, row.TreatmentId).input('TreatmentName', sql.NVarChar(180), row.TreatmentName)
        .input('StaffName', sql.NVarChar(120), row.StaffName).input('TaxRate', sql.Decimal(5, 2), row.TaxRate)
        .input('GSTAmount', sql.Decimal(18, 2), row.GSTAmount).input('Price', sql.Decimal(18, 2), row.Price).input('IsPrinted', sql.Bit, row.IsPrinted)
        .query(`INSERT INTO dbo.SaleBillTreatments (TreatmentLineId, BillId, SrNo, TreatmentId, TreatmentName, StaffName, TaxRate, GSTAmount, Price, IsPrinted, CreatedAt) VALUES (NEWID(), @BillId, @SrNo, @TreatmentId, @TreatmentName, @StaffName, @TaxRate, @GSTAmount, @Price, @IsPrinted, SYSUTCDATETIME())`);
    }
    for (let index = 0; index < items.length; index += 1) {
      const row = items[index];
      await transaction.request().input('BillId', sql.UniqueIdentifier, billId).input('SrNo', sql.Int, index + 1)
        .input('ItemId', sql.UniqueIdentifier, row.ItemId).input('ItemName', sql.NVarChar(160), row.ItemName)
        .input('Description', sql.NVarChar(300), row.Remarks).input('Quantity', sql.Decimal(18, 3), row.Quantity)
        .input('Unit', sql.NVarChar(30), row.Unit).input('Rate', sql.Decimal(18, 2), row.Rate)
        .input('Discount', sql.Decimal(18, 2), 0).input('TaxPercent', sql.Decimal(5, 2), row.TaxRate)
        .input('TaxAmount', sql.Decimal(18, 2), row.TaxAmount).input('Amount', sql.Decimal(18, 2), row.Amount)
        .input('LineTotal', sql.Decimal(18, 2), row.LineTotal)
        .query(`INSERT INTO dbo.SaleBillItems (BillId, SrNo, ItemId, ItemName, Description, Quantity, Unit, Rate, Discount, TaxPercent, TaxAmount, Amount, LineTotal) VALUES (@BillId, @SrNo, @ItemId, @ItemName, @Description, @Quantity, @Unit, @Rate, @Discount, @TaxPercent, @TaxAmount, @Amount, @LineTotal)`);
    }
    await transaction.commit();
    transactionStarted = false;
    return res.json({ ...result.recordset[0], ClientId: clientId });
  } catch (error) {
    if (transactionStarted) { try { await transaction.rollback(); } catch (rollbackError) { console.error('Failed rolling back bill update:', rollbackError.message); } }
    console.error('Failed updating bill:', error.message);
    return res.status(500).json({ message: 'Could not update bill.' });
  }
});

app.delete('/api/bills/:id', authRequired, async (req, res) => {
  if (!canAccess(req, 'bills', 'canDelete')) {
    return res.status(403).json({ message: 'Delete bill not allowed.' });
  }
  const billId = String(req.params.id || '').trim();
  if (!useMockData && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(billId)) {
    return res.status(400).json({ message: 'Invalid bill ID.' });
  }
  if (useMockData) {
    const bill = mockData.bills.find((item) => (item.SaleBillId || item.BillId) === billId && item.Status !== 'VOID');
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    if (!isSuperAdmin(req) && bill.BranchId !== req.user.branchId) return res.status(403).json({ message: 'Access denied.' });
    if (mockData.payments.some((payment) => payment.SaleBillId === billId)) return res.status(409).json({ message: 'A bill with payments cannot be deleted.' });
    bill.Status = 'VOID';
    return res.json({ message: 'Bill cancelled.' });
  }
  try {
    const pool = await connectDatabase();
    const result = await pool.request()
      .input('BillId', sql.UniqueIdentifier, billId)
      .input('IsSuperAdmin', sql.Bit, isSuperAdmin(req))
      .input('BranchId', sql.UniqueIdentifier, req.user.branchId || null)
      .query(`
        UPDATE b SET Status = N'VOID', CancelledAt = SYSUTCDATETIME(), ModifiedAt = SYSUTCDATETIME()
        FROM dbo.SaleBills b
        WHERE b.BillId = @BillId AND b.Status <> N'VOID'
          AND (@IsSuperAdmin = 1 OR b.BranchId = @BranchId)
          AND NOT EXISTS (SELECT 1 FROM dbo.Payments p WHERE p.BillId = b.BillId)
      `);
    if (!result.rowsAffected[0]) return res.status(409).json({ message: 'Bill not found, already cancelled, or has payments.' });
    return res.json({ message: 'Bill cancelled.' });
  } catch (error) {
    console.error('Failed cancelling bill:', error.message);
    return res.status(500).json({ message: 'Could not cancel bill.' });
  }
});

app.post('/api/bills', authRequired, async (req, res) => {
  if (!canAccess(req, 'bills', 'canAdd')) {
    return res.status(403).json({ message: 'Add bill not allowed.' });
  }

  const branchId = String(req.body?.BranchId || '').trim();
  const customerName = String(req.body?.CustomerName || '').trim();
  const customerMobile = String(req.body?.CustomerMobile || '').trim();
  const customerAddress = String(req.body?.CustomerAddress || '').trim();
  const customerEmail = req.body?.CustomerEmail == null ? '' : String(req.body.CustomerEmail).trim();
  const billDate = String(req.body?.BillDate || '').trim();
  const nextServiceDate = String(req.body?.NextServiceDate || '').trim();
  const paymentMode = String(req.body?.PaymentMode || '').trim();
  const outerState = false;
  const paymentInputs = Array.isArray(req.body?.Payments) ? req.body.Payments : [];
  const treatmentInputs = Array.isArray(req.body?.Treatments)
    ? req.body.Treatments.filter((row) => String(row?.TreatmentId || '').trim())
    : [];
  const itemInputs = Array.isArray(req.body?.Items)
    ? req.body.Items.filter((row) => String(row?.ItemId || '').trim())
    : [];
  const isGuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const isValidId = (value) => (useMockData ? Boolean(String(value || '').trim()) : isGuid(value));
  const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  const inclusiveTax = (amount, rate) => (rate > 0 ? roundMoney(amount * rate / (100 + rate)) : 0);

  if (!isValidId(branchId) || !isValidId(String(req.user.userId || ''))) {
    return res.status(400).json({ message: 'Select a valid branch and sign in with a valid user account.' });
  }
  if (getRoleCode(req.user.role) !== 'SUPER_ADMIN'
      && (!req.user.branchId || String(req.user.branchId).toLowerCase() !== branchId.toLowerCase())) {
    return res.status(403).json({ message: 'You can create sale bills only for your assigned branch.' });
  }
  if (!customerName || !customerMobile || !normalizeContactNo(customerMobile) || !customerAddress || !billDate || !isValidBillDate(billDate)
      || (nextServiceDate && !isValidBillDate(nextServiceDate))) {
    return res.status(400).json({ message: 'Client name, contact, address, and a valid bill date are required.' });
  }
  if (isCurrentMonthUser(req) && !isCurrentMonthDate(billDate)) {
    return res.status(403).json({ message: 'Users can create bills only for the current month.' });
  }
  if (customerName.length > 160 || customerMobile.length > 30 || customerAddress.length > 400
      || customerEmail.length > 254 || !paymentMode || paymentMode.length > 30) {
    return res.status(400).json({ message: 'One or more sale fields exceed the allowed length or are invalid.' });
  }
  if (treatmentInputs.length + itemInputs.length === 0 || treatmentInputs.length > 100 || itemInputs.length > 100) {
    return res.status(400).json({ message: 'Add at least one treatment or row item to the sale.' });
  }
  if (paymentInputs.length > 3 || paymentInputs.some((row) => !['Cash', 'UPI', 'Online', 'Card', 'Bank Transfer'].includes(String(row?.PaymentMode || ''))
      || !Number.isFinite(Number(row?.Amount)) || Number(row.Amount) <= 0)) {
    return res.status(400).json({ message: 'Enter a valid amount for each payment method.' });
  }
  if (treatmentInputs.some((row) => !isValidId(String(row.TreatmentId || '').trim())
      || String(row.StaffName || '').length > 120
      || (row.Price !== undefined && (!Number.isFinite(Number(row.Price)) || Number(row.Price) < 0))
      || (row.GSTAmount !== undefined && (!Number.isFinite(Number(row.GSTAmount)) || Number(row.GSTAmount) < 0)))) {
    return res.status(400).json({ message: 'A treatment selection, price, or staff name is invalid.' });
  }
  if (itemInputs.some((row) => !isValidId(String(row.ItemId || '').trim())
      || !Number.isFinite(Number(row.Quantity)) || Number(row.Quantity) <= 0
      || Number(row.Quantity) > 999999999999999
      || String(row.Remarks || '').length > 300)) {
    return res.status(400).json({ message: 'An item selection, quantity, or remark is invalid.' });
  }

  if (useMockData) {
    const branch = mockData.branches.find((item) => item.BranchId === branchId && item.IsActive);
    if (!branch) {
      return res.status(400).json({ message: 'The selected branch does not exist or is inactive.' });
    }
    const mockClient = mockData.clients.find((client) => normalizeContactNo(client.ContactNo) === normalizeContactNo(customerMobile));
    const previousBalance = mockClient ? getMockClientOutstanding(mockClient.ClientId) : 0;
    const mockBillTotal = treatmentInputs.reduce((sum, row) => sum + Number(row.Price || 0), 0)
      + itemInputs.reduce((sum, row) => sum + Number(row.Rate || 0) * Number(row.Quantity || 0), 0);
    const mockTotalWithBalance = Math.round((mockBillTotal + previousBalance + Number.EPSILON) * 100) / 100;
    if (paymentInputs.reduce((sum, row) => sum + Number(row.Amount), 0) > mockTotalWithBalance + 0.01) {
      return res.status(400).json({ message: 'Payment amounts cannot exceed the bill total.' });
    }
    const clientId = syncMockBillClient({ customerName, customerMobile, customerAddress, customerEmail });
    const item = {
      ...req.body,
      SaleBillId: `s${Date.now()}`,
      BillNumber: formatBillNumber(
        branch.BranchCode,
        billDate,
        getNextMockBillSequence(branch.BranchCode, billDate),
      ),
      OuterState: false,
      BranchName: branch.BranchName,
      ClientId: clientId,
      PreviousBalance: previousBalance,
      NetAmount: mockTotalWithBalance,
      GrandTotal: mockTotalWithBalance,
      BillDate: billDate,
    };
    mockData.bills.unshift(item);
    paymentInputs.forEach((payment, index) => mockData.payments.unshift({
      PaymentId: `p${Date.now()}-${index}`,
      SaleBillId: item.SaleBillId,
      BillNumber: item.BillNumber,
      BranchId: branchId,
      PaymentDate: billDate,
      Amount: Number(payment.Amount),
      PaymentMode: String(payment.PaymentMode),
      ReferenceNumber: '',
      Notes: 'Payment collected with bill',
    }));
    return res.status(201).json(item);
  }

  let transaction;
  let transactionStarted = false;
  try {
    transaction = new sql.Transaction(await connectDatabase());
    await transaction.begin();
    transactionStarted = true;

    const branchResult = await transaction.request()
      .input('BranchId', sql.UniqueIdentifier, branchId)
      .query(`
        SELECT BranchCode, BranchName
        FROM dbo.Branches WITH (UPDLOCK, HOLDLOCK)
        WHERE BranchId = @BranchId AND IsActive = 1
      `);
    const branch = branchResult.recordset[0];
    if (!branch) {
      await transaction.rollback();
      transactionStarted = false;
      return res.status(400).json({ message: 'The selected branch does not exist or is inactive.' });
    }

    const treatments = [];
    for (const row of treatmentInputs) {
      const selectedResult = await transaction.request()
        .input('TreatmentId', sql.UniqueIdentifier, String(row.TreatmentId).trim())
        .query(`
          SELECT TreatmentId, TreatmentName, TaxRate, TotalPrice
          FROM dbo.Treatments
          WHERE TreatmentId = @TreatmentId AND IsActive = 1
        `);
      const selected = selectedResult.recordset[0];
      if (!selected) {
        await transaction.rollback();
        transactionStarted = false;
        return res.status(400).json({ message: 'A selected treatment does not exist or is inactive.' });
      }
      const taxRate = Number(selected.TaxRate);
      const price = row.Price === undefined ? Number(selected.TotalPrice) : Number(row.Price);
      const gstAmount = row.GSTAmount === undefined
        ? inclusiveTax(price, taxRate)
        : roundMoney(Number(row.GSTAmount));
      if (gstAmount > roundMoney(price)) {
        await transaction.rollback();
        transactionStarted = false;
        return res.status(400).json({ message: 'GST amount cannot be greater than the treatment price.' });
      }
      treatments.push({
        TreatmentId: selected.TreatmentId,
        TreatmentName: selected.TreatmentName,
        StaffName: String(row.StaffName || '').trim(),
        TaxRate: taxRate,
        GSTAmount: gstAmount,
        Price: roundMoney(price),
        IsPrinted: row.IsPrinted === true,
      });
    }

    const items = [];
    for (const row of itemInputs) {
      const selectedResult = await transaction.request()
        .input('ItemId', sql.UniqueIdentifier, String(row.ItemId).trim())
        .query(`
          SELECT ItemId, ItemName, Unit, TaxRate, TotalPrice
          FROM dbo.Items
          WHERE ItemId = @ItemId AND IsActive = 1
        `);
      const selected = selectedResult.recordset[0];
      if (!selected) {
        await transaction.rollback();
        transactionStarted = false;
        return res.status(400).json({ message: 'A selected item does not exist or is inactive.' });
      }
      const quantity = Number(row.Quantity);
      const price = Number(selected.TotalPrice);
      const lineTotal = roundMoney(price * quantity);
      const taxRate = Number(selected.TaxRate);
      const taxAmount = inclusiveTax(lineTotal, taxRate);
      items.push({
        ItemId: selected.ItemId,
        ItemName: selected.ItemName,
        Unit: selected.Unit,
        Quantity: quantity,
        Remarks: String(row.Remarks || '').trim(),
        Rate: price,
        TaxRate: taxRate,
        TaxAmount: taxAmount,
        LineTotal: lineTotal,
        Amount: roundMoney(lineTotal - taxAmount),
      });
    }

    const treatmentGross = treatments.reduce((total, row) => total + row.Price, 0);
    const itemGross = items.reduce((total, row) => total + row.LineTotal, 0);
    const totalGross = roundMoney(treatmentGross + itemGross);
    const totalTax = roundMoney(
      treatments.reduce((total, row) => total + row.GSTAmount, 0)
      + items.reduce((total, row) => total + row.TaxAmount, 0),
    );
    const taxableAmount = roundMoney(totalGross - totalTax);
    const cgst = outerState ? 0 : roundMoney(totalTax / 2);
    const sgst = outerState ? 0 : roundMoney(totalTax - cgst);
    const igst = outerState ? totalTax : 0;
    const clientId = await syncBillClient(transaction, { customerName, customerMobile, customerAddress, customerEmail });
    const previousBalanceResult = await transaction.request()
      .input('ContactNoDigits', sql.NVarChar(30), normalizeContactNo(customerMobile))
      .query(`
        DECLARE @PaymentBillColumn sysname = CASE
          WHEN COL_LENGTH(N'dbo.Payments', N'BillId') IS NOT NULL THEN N'BillId'
          WHEN COL_LENGTH(N'dbo.Payments', N'SaleBillId') IS NOT NULL THEN N'SaleBillId'
        END;
        IF @PaymentBillColumn IS NULL THROW 51002, 'Payments table is missing a bill ID column.', 1;
        DECLARE @BalanceSql nvarchar(max) = N'
          SELECT CASE WHEN MAX(CASE WHEN balance.RowNumber = 1 AND balance.PreviousBalance > 0 THEN 1 ELSE 0 END) = 1
            THEN MAX(CASE WHEN balance.RowNumber = 1 THEN CASE WHEN balance.AmountDue > 0 THEN balance.AmountDue ELSE 0 END END)
            ELSE SUM(CASE WHEN balance.AmountDue > 0 THEN balance.AmountDue ELSE 0 END) END AS PreviousBalance
          FROM (
            SELECT sb.PreviousBalance,
              sb.GrandTotal - COALESCE((SELECT SUM(p.Amount) FROM dbo.Payments p WHERE p.' + QUOTENAME(@PaymentBillColumn) + N' = sb.BillId), 0) AS AmountDue,
              ROW_NUMBER() OVER (ORDER BY sb.CreatedAt DESC, sb.BillDate DESC) AS RowNumber
            FROM dbo.SaleBills sb
            WHERE sb.Status <> N''VOID''
              AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(sb.CustomerMobile)), N'' '', N''''), N''-'', N''''), N''+'', N''''), N''('', N''''), N'')'', N''''), N''.'', N''''), N''/'', N'''') = @ContactNoDigits
          ) balance';
        EXEC sys.sp_executesql @BalanceSql,
          N'@ContactNoDigits nvarchar(30)', @ContactNoDigits = @ContactNoDigits;
      `);
    const previousBalance = roundMoney(Number(previousBalanceResult.recordset[0]?.PreviousBalance || 0));
    const totalWithBalance = roundMoney(totalGross + previousBalance);
    if (paymentInputs.reduce((sum, row) => sum + Number(row.Amount), 0) > totalWithBalance + 0.01) {
      await transaction.rollback();
      transactionStarted = false;
      return res.status(400).json({ message: 'Payment amounts cannot exceed the bill total.' });
    }
    const billNumberPrefix = getBillNumberPrefix(branch.BranchCode, billDate);
    const lockResult = await transaction.request()
      .input('LockResource', sql.NVarChar(255), `SaleBillNumber:${billNumberPrefix}`)
      .query(`
        DECLARE @LockResult int;
        EXEC @LockResult = sys.sp_getapplock
          @Resource = @LockResource,
          @LockMode = 'Exclusive',
          @LockOwner = 'Transaction',
          @LockTimeout = 15000;
        SELECT @LockResult AS LockResult;
      `);
    if (!lockResult.recordset.length || lockResult.recordset[0].LockResult < 0) {
      throw new Error('Could not acquire the bill-number lock.');
    }

    const sequenceResult = await transaction.request()
      .input('NumberPrefix', sql.NVarChar(30), billNumberPrefix)
      .query(`
        SELECT COALESCE(MAX(TRY_CONVERT(int, SUBSTRING(BillNumber, LEN(@NumberPrefix) + 2, 20))), 0) + 1 AS BillSequence
        FROM dbo.SaleBills
        WHERE LEFT(BillNumber, LEN(@NumberPrefix) + 1) = @NumberPrefix + N'-'
      `);
    const billNumber = formatBillNumber(branch.BranchCode, billDate, sequenceResult.recordset[0].BillSequence);

    const billResult = await transaction.request()
      .input('BranchId', sql.UniqueIdentifier, branchId)
      .input('BillNumber', sql.NVarChar(40), billNumber)
      .input('BillDate', sql.Date, new Date(`${billDate}T00:00:00Z`))
      .input('CustomerName', sql.NVarChar(160), customerName)
      .input('CustomerMobile', sql.NVarChar(30), customerMobile)
      .input('CustomerAddress', sql.NVarChar(400), customerAddress)
      .input('CustomerGSTNumber', sql.NVarChar(20), '')
      .input('CustomerEmail', sql.NVarChar(254), customerEmail)
      .input('NextServiceDate', sql.Date, nextServiceDate ? new Date(`${nextServiceDate}T00:00:00Z`) : null)
      .input('OuterState', sql.Bit, outerState)
      .input('PaymentMode', sql.NVarChar(30), paymentMode)
      .input('Subtotal', sql.Decimal(18, 2), taxableAmount)
      .input('DiscountTotal', sql.Decimal(18, 2), 0)
      .input('TaxableAmount', sql.Decimal(18, 2), taxableAmount)
      .input('CGST', sql.Decimal(18, 2), cgst)
      .input('SGST', sql.Decimal(18, 2), sgst)
      .input('IGST', sql.Decimal(18, 2), igst)
      .input('GrandTotal', sql.Decimal(18, 2), totalWithBalance)
      .input('PreviousBalance', sql.Decimal(18, 2), previousBalance)
      .input('CreatedBy', sql.UniqueIdentifier, req.user.userId)
      .query(`
        INSERT INTO dbo.SaleBills
          (BranchId, BillNumber, BillDate, CustomerName, CustomerMobile, CustomerAddress,
           CustomerGSTNumber, CustomerEmail, NextServiceDate, OuterState, PaymentMode,
           Subtotal, DiscountTotal, TaxableAmount, CGST, SGST, IGST, GrandTotal, PreviousBalance,
           BillId, Status, CreatedBy, CreatedAt, ModifiedAt)
        OUTPUT inserted.BillId
        VALUES
          (@BranchId, @BillNumber, @BillDate, @CustomerName, @CustomerMobile, @CustomerAddress,
           @CustomerGSTNumber, @CustomerEmail, @NextServiceDate, @OuterState, @PaymentMode,
           @Subtotal, @DiscountTotal, @TaxableAmount, @CGST, @SGST, @IGST, @GrandTotal, @PreviousBalance,
           NEWID(), N'PENDING', @CreatedBy, SYSUTCDATETIME(), SYSUTCDATETIME())
      `);
    const billId = billResult.recordset[0].BillId;

    for (const payment of paymentInputs) {
      await transaction.request()
        .input('BillId', sql.UniqueIdentifier, billId)
        .input('BranchId', sql.UniqueIdentifier, branchId)
        .input('PaymentDate', sql.Date, new Date(`${billDate}T00:00:00Z`))
        .input('Amount', sql.Decimal(18, 2), roundMoney(Number(payment.Amount)))
        .input('PaymentMode', sql.NVarChar(30), String(payment.PaymentMode))
        .input('ReferenceNumber', sql.NVarChar(100), '')
        .input('PaymentNote', sql.NVarChar(250), 'Payment collected with bill')
        .input('CreatedBy', sql.UniqueIdentifier, req.user.userId)
        .query(`
          DECLARE @BillColumn sysname = CASE
            WHEN COL_LENGTH(N'dbo.Payments', N'BillId') IS NOT NULL THEN N'BillId'
            WHEN COL_LENGTH(N'dbo.Payments', N'SaleBillId') IS NOT NULL THEN N'SaleBillId'
          END;
          DECLARE @NoteColumn sysname = CASE
            WHEN COL_LENGTH(N'dbo.Payments', N'Remarks') IS NOT NULL THEN N'Remarks'
            WHEN COL_LENGTH(N'dbo.Payments', N'Notes') IS NOT NULL THEN N'Notes'
          END;
          DECLARE @InsertSql nvarchar(max);
          IF @BillColumn IS NULL OR @NoteColumn IS NULL
            THROW 51002, 'Payments table is missing a bill ID or notes column.', 1;
          SET @InsertSql = N'INSERT INTO dbo.Payments ('
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'PaymentId') IS NOT NULL THEN N'PaymentId, ' ELSE N'' END
            + QUOTENAME(@BillColumn)
            + N', BranchId, PaymentDate, Amount, PaymentMode, ReferenceNumber, '
            + QUOTENAME(@NoteColumn)
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'CreatedBy') IS NOT NULL THEN N', CreatedBy' ELSE N'' END
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'CreatedAt') IS NOT NULL THEN N', CreatedAt' ELSE N'' END
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'ModifiedAt') IS NOT NULL THEN N', ModifiedAt' ELSE N'' END
            + N') VALUES ('
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'PaymentId') IS NOT NULL THEN N'NEWID(), ' ELSE N'' END
            + N'@BillId, @BranchId, @PaymentDate, @Amount, @PaymentMode, @ReferenceNumber, @PaymentNote'
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'CreatedBy') IS NOT NULL THEN N', @CreatedBy' ELSE N'' END
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'CreatedAt') IS NOT NULL THEN N', SYSUTCDATETIME()' ELSE N'' END
            + CASE WHEN COL_LENGTH(N'dbo.Payments', N'ModifiedAt') IS NOT NULL THEN N', SYSUTCDATETIME()' ELSE N'' END
            + N')';
          EXEC sys.sp_executesql @InsertSql,
            N'@BillId uniqueidentifier, @BranchId uniqueidentifier, @PaymentDate date, @Amount decimal(18,2), @PaymentMode nvarchar(30), @ReferenceNumber nvarchar(100), @PaymentNote nvarchar(250), @CreatedBy uniqueidentifier',
            @BillId = @BillId, @BranchId = @BranchId, @PaymentDate = @PaymentDate,
            @Amount = @Amount, @PaymentMode = @PaymentMode, @ReferenceNumber = @ReferenceNumber,
            @PaymentNote = @PaymentNote, @CreatedBy = @CreatedBy;
        `);
    }

    for (let index = 0; index < treatments.length; index += 1) {
      const row = treatments[index];
      await transaction.request()
        .input('BillId', sql.UniqueIdentifier, billId)
        .input('SrNo', sql.Int, index + 1)
        .input('TreatmentId', sql.UniqueIdentifier, row.TreatmentId)
        .input('TreatmentName', sql.NVarChar(180), row.TreatmentName)
        .input('StaffName', sql.NVarChar(120), row.StaffName)
        .input('TaxRate', sql.Decimal(5, 2), row.TaxRate)
        .input('GSTAmount', sql.Decimal(18, 2), row.GSTAmount)
        .input('Price', sql.Decimal(18, 2), row.Price)
        .input('IsPrinted', sql.Bit, row.IsPrinted)
        .query(`
          INSERT INTO dbo.SaleBillTreatments
            (TreatmentLineId, BillId, SrNo, TreatmentId, TreatmentName, StaffName, TaxRate, GSTAmount, Price, IsPrinted, CreatedAt)
          VALUES
            (NEWID(), @BillId, @SrNo, @TreatmentId, @TreatmentName, @StaffName, @TaxRate, @GSTAmount, @Price, @IsPrinted, SYSUTCDATETIME())
        `);
    }

    for (let index = 0; index < items.length; index += 1) {
      const row = items[index];
      await transaction.request()
        .input('BillId', sql.UniqueIdentifier, billId)
        .input('SrNo', sql.Int, index + 1)
        .input('ItemId', sql.UniqueIdentifier, row.ItemId)
        .input('ItemName', sql.NVarChar(160), row.ItemName)
        .input('Description', sql.NVarChar(300), row.Remarks)
        .input('Quantity', sql.Decimal(18, 3), row.Quantity)
        .input('Unit', sql.NVarChar(30), row.Unit)
        .input('Rate', sql.Decimal(18, 2), row.Rate)
        .input('Discount', sql.Decimal(18, 2), 0)
        .input('TaxPercent', sql.Decimal(5, 2), row.TaxRate)
        .input('TaxAmount', sql.Decimal(18, 2), row.TaxAmount)
        .input('Amount', sql.Decimal(18, 2), row.Amount)
        .input('LineTotal', sql.Decimal(18, 2), row.LineTotal)
        .query(`
          INSERT INTO dbo.SaleBillItems
            (BillId, SrNo, ItemId, ItemName, Description, Quantity, Unit, Rate, Discount, TaxPercent, TaxAmount, Amount, LineTotal)
          VALUES
            (@BillId, @SrNo, @ItemId, @ItemName, @Description, @Quantity, @Unit, @Rate, @Discount, @TaxPercent, @TaxAmount, @Amount, @LineTotal)
        `);
    }

    await transaction.request()
      .input('BillId', sql.UniqueIdentifier, billId)
      .input('BranchId', sql.UniqueIdentifier, branchId)
      .query(`
        INSERT INTO dbo.SaleBillTerms (BillId, DisplayOrder, TermText)
        SELECT @BillId, ROW_NUMBER() OVER (ORDER BY DisplayOrder, TermId), TermText
        FROM dbo.BranchTermsConditions
        WHERE BranchId = @BranchId AND IsActive = 1
      `);

    await transaction.commit();
    transactionStarted = false;
    return res.status(201).json({
      SaleBillId: billId,
      BillNumber: billNumber,
      BranchId: branchId,
      BranchName: branch.BranchName,
      ClientId: clientId,
      CustomerName: customerName,
      CustomerMobile: customerMobile,
      BillDate: billDate,
      PreviousBalance: previousBalance,
      NetAmount: totalWithBalance,
      PaymentMode: paymentMode,
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Failed rolling back sale bill creation:', rollbackError.message);
      }
    }
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({ message: 'The generated bill number already exists. Try saving again.' });
    }
    if (error.number === 547) {
      return res.status(400).json({ message: 'A selected branch, treatment, item, or user is no longer available.' });
    }
    console.error('Failed creating sale bill in SQL Server:', error.message);
    return res.status(500).json({
      message: process.env.NODE_ENV === 'production'
        ? 'Could not save sale bill.'
        : `Could not save sale bill: ${error.message}`,
    });
  }
});

app.get('/api/payments', authRequired, async (req, res) => {
  if (!canAccess(req, 'payments', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  if (useMockData) {
    const payments = filterBranchRecords(req, mockData.payments, 'PaymentDate');
    return res.json(payments.map((payment) => {
      const bill = mockData.bills.find((item) => (item.SaleBillId || item.BillId) === payment.SaleBillId);
      return { ...payment, BillNumber: bill?.BillNumber || '', BillDate: bill?.BillDate || '', CustomerName: bill?.CustomerName || '' };
    }));
  }
  try {
    const { monthStart, nextMonthStart } = getCurrentMonthRange();
    const result = await (await connectDatabase()).request()
      .input('IsSuperAdmin', sql.Bit, isSuperAdmin(req))
      .input('BranchId', sql.UniqueIdentifier, req.user.branchId || null)
      .input('CurrentMonthOnly', sql.Bit, isCurrentMonthUser(req))
      .input('MonthStart', sql.Date, monthStart)
      .input('NextMonthStart', sql.Date, nextMonthStart)
      .query(`
      SELECT p.PaymentId, p.BillId AS SaleBillId, p.BranchId, p.PaymentDate,
             p.Amount, p.PaymentMode, p.ReferenceNumber, p.Remarks AS Notes,
             b.BranchName, sb.BillNumber, sb.BillDate, sb.CustomerName
      FROM dbo.Payments p
      LEFT JOIN dbo.Branches b ON b.BranchId = p.BranchId
      LEFT JOIN dbo.SaleBills sb ON sb.BillId = p.BillId
      WHERE (@IsSuperAdmin = 1 OR p.BranchId = @BranchId)
        AND (@CurrentMonthOnly = 0 OR (p.PaymentDate >= @MonthStart AND p.PaymentDate < @NextMonthStart))
      ORDER BY p.PaymentDate DESC, p.CreatedAt DESC
    `);
    return res.json(result.recordset);
  } catch (error) {
    console.error('Failed loading payments from SQL Server:', error.message);
    return res.status(503).json({ message: 'Could not load payments from the database.' });
  }
});

app.post('/api/payments', authRequired, async (req, res) => {
  if (!canAccess(req, 'payments', 'canAdd')) {
    return res.status(403).json({ message: 'Add payment not allowed.' });
  }
  if (useMockData) {
    const paymentDate = String(req.body?.PaymentDate || new Date().toISOString().slice(0, 10));
    const branchId = String(req.body?.BranchId || '');
    const billId = String(req.body?.SaleBillId || '');
    const amount = Number(req.body?.Amount);
    const bill = mockData.bills.find((item) => (item.SaleBillId || item.BillId) === billId);
    if (!bill) return res.status(400).json({ message: 'The selected bill does not exist.' });
    if (branchId !== bill.BranchId) {
      return res.status(400).json({ message: 'The payment branch must match the bill branch.' });
    }
    if (!isSuperAdmin(req) && branchId !== req.user.branchId) {
      return res.status(403).json({ message: 'You can create payments only for your assigned branch.' });
    }
    if (!isValidBillDate(paymentDate)) {
      return res.status(400).json({ message: 'Enter a valid payment date.' });
    }
    if (isCurrentMonthUser(req)
      && (!isCurrentMonthDate(paymentDate) || !isCurrentMonthDate(bill.BillDate))) {
      return res.status(403).json({ message: 'Users can create payments only for current-month bills.' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero.' });
    }
    const alreadyPaid = mockData.payments
      .filter((payment) => payment.SaleBillId === billId)
      .reduce((total, payment) => total + Number(payment.Amount || 0), 0);
    if (alreadyPaid + amount > Number(bill.NetAmount || bill.GrandTotal || 0) + 0.01) {
      return res.status(400).json({ message: 'Payment amount cannot exceed the bill balance.' });
    }
    const item = {
      PaymentId: `p${Date.now()}`,
      ...req.body,
      PaymentDate: paymentDate,
    };
    mockData.payments.unshift(item);
    return res.status(201).json(item);
  }
  try {
    const billId = String(req.body?.SaleBillId || '').trim();
    const branchId = String(req.body?.BranchId || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(billId)
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId)) {
      return res.status(400).json({ message: 'A valid bill ID and branch ID are required.' });
    }
    const amount = Number(req.body?.Amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero.' });
    }
    const paymentDate = req.body?.PaymentDate || new Date().toISOString().slice(0, 10);
    if (!isValidBillDate(paymentDate)) {
      return res.status(400).json({ message: 'Enter a valid payment date.' });
    }
    if (isCurrentMonthUser(req) && !isCurrentMonthDate(paymentDate)) {
      return res.status(403).json({ message: 'Users can create payments only in the current month.' });
    }
    const paymentMode = String(req.body?.PaymentMode || '').trim();
    const referenceNumber = String(req.body?.ReferenceNumber || '').trim();
    const remarks = String(req.body?.Notes || '').trim();
    const pool = await connectDatabase();
    const billResult = await pool.request()
      .input('BillId', sql.UniqueIdentifier, billId)
      .query(`
        SELECT b.BranchId, b.BillDate, b.GrandTotal,
               COALESCE(SUM(p.Amount), 0) AS PaidAmount
        FROM dbo.SaleBills b
        LEFT JOIN dbo.Payments p ON p.BillId = b.BillId
        WHERE b.BillId = @BillId
        GROUP BY b.BranchId, b.BillDate, b.GrandTotal
      `);
    const bill = billResult.recordset[0];
    if (!bill) return res.status(400).json({ message: 'The selected bill does not exist.' });
    if (Number(bill.PaidAmount || 0) + amount > Number(bill.GrandTotal || 0) + 0.01) {
      return res.status(400).json({ message: 'Payment amount cannot exceed the bill balance.' });
    }
    if (String(bill.BranchId).toLowerCase() !== branchId.toLowerCase()) {
      return res.status(400).json({ message: 'The payment branch must match the bill branch.' });
    }
    if (!isSuperAdmin(req)
      && String(bill.BranchId).toLowerCase() !== String(req.user.branchId || '').toLowerCase()) {
      return res.status(403).json({ message: 'You can create payments only for your assigned branch.' });
    }
    if (isCurrentMonthUser(req) && !isCurrentMonthDate(bill.BillDate)) {
      return res.status(403).json({ message: 'Users can create payments only for current-month bills.' });
    }
    const result = await pool.request()
      .input('BillId', sql.UniqueIdentifier, billId)
      .input('BranchId', sql.UniqueIdentifier, branchId)
      .input('PaymentDate', sql.Date, paymentDate)
      .input('Amount', sql.Decimal(18, 2), amount)
      .input('PaymentMode', sql.NVarChar(30), paymentMode)
      .input('ReferenceNumber', sql.NVarChar(100), referenceNumber)
      .input('Remarks', sql.NVarChar(250), remarks)
      .input('CreatedBy', sql.UniqueIdentifier, req.user.userId)
      .query(`
        INSERT INTO dbo.Payments
          (BillId, BranchId, PaymentDate, Amount, PaymentMode, ReferenceNumber, Remarks, CreatedBy)
        OUTPUT inserted.*
        VALUES
          (@BillId, @BranchId, @PaymentDate, @Amount, @PaymentMode, @ReferenceNumber, @Remarks, @CreatedBy)
      `);
    return res.status(201).json(result.recordset[0]);
  } catch (error) {
    if (error.number === 547) {
      return res.status(400).json({ message: 'The selected bill or branch is not valid.' });
    }
    console.error('Failed creating payment in SQL Server:', error.message);
    return res.status(500).json({ message: 'Could not save payment.' });
  }
});

app.get('/api/reports', authRequired, async (req, res) => {
  if (!canAccess(req, 'reports', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const fromDate = String(req.query?.fromDate || '').trim();
  const toDate = String(req.query?.toDate || '').trim();
  if ((fromDate && !isValidBillDate(fromDate)) || (toDate && !isValidBillDate(toDate))) {
    return res.status(400).json({ message: 'Enter valid report start and end dates.' });
  }
  if (fromDate && toDate && fromDate > toDate) {
    return res.status(400).json({ message: 'Report start date must be on or before its end date.' });
  }
  if (useMockData) {
    const scopedBranches = mockData.branches.filter((branch) => (
      branch.IsActive && (isSuperAdmin(req) || branch.BranchId === req.user.branchId)
    ));
    const scopedBills = filterBranchRecords(req, mockData.bills, 'BillDate')
      .filter((bill) => (!fromDate || String(bill.BillDate).slice(0, 10) >= fromDate)
        && (!toDate || String(bill.BillDate).slice(0, 10) <= toDate));
    const scopedPayments = filterBranchRecords(req, mockData.payments, 'PaymentDate')
      .filter((payment) => (!fromDate || String(payment.PaymentDate).slice(0, 10) >= fromDate)
        && (!toDate || String(payment.PaymentDate).slice(0, 10) <= toDate));
    const branchSummary = scopedBranches.map((branch) => ({
      BranchName: branch.BranchName,
      TotalBills: scopedBills.filter((bill) => bill.BranchId === branch.BranchId).length,
      TotalRevenue: scopedBills.filter((bill) => bill.BranchId === branch.BranchId)
        .reduce((sum, bill) => sum + Number(bill.NetAmount || 0), 0),
    }));
    const paymentModes = ['Cash', 'UPI', 'Bank Transfer', 'Card'];
    const paymentSummary = paymentModes.map((mode) => ({
      mode,
      amount: scopedPayments.filter((payment) => payment.PaymentMode === mode)
        .reduce((sum, payment) => sum + Number(payment.Amount || 0), 0),
    }));
    return res.json({
      branchSummary,
      paymentSummary,
      totalRevenue: scopedBills.reduce((sum, bill) => sum + Number(bill.NetAmount || 0), 0),
    });
  }
  try {
    const pool = await connectDatabase();
    const { monthStart, nextMonthStart } = getCurrentMonthRange();
    const addReportScope = (request) => request
      .input('IsSuperAdmin', sql.Bit, isSuperAdmin(req))
      .input('BranchId', sql.UniqueIdentifier, req.user.branchId || null)
      .input('CurrentMonthOnly', sql.Bit, isCurrentMonthUser(req))
      .input('MonthStart', sql.Date, monthStart)
      .input('NextMonthStart', sql.Date, nextMonthStart)
      .input('FromDate', sql.Date, fromDate || null)
      .input('ToDate', sql.Date, toDate || null);
    const branchResult = await addReportScope(pool.request()).query(`
      SELECT br.BranchName,
             COUNT(sb.BillId) AS TotalBills,
             COALESCE(SUM(sb.GrandTotal), 0) AS TotalRevenue
      FROM dbo.Branches br
      LEFT JOIN dbo.SaleBills sb
        ON sb.BranchId = br.BranchId
       AND (@CurrentMonthOnly = 0 OR (sb.BillDate >= @MonthStart AND sb.BillDate < @NextMonthStart))
       AND (@FromDate IS NULL OR sb.BillDate >= @FromDate)
       AND (@ToDate IS NULL OR sb.BillDate < DATEADD(DAY, 1, @ToDate))
      WHERE br.IsActive = 1
        AND (@IsSuperAdmin = 1 OR br.BranchId = @BranchId)
      GROUP BY br.BranchName
      ORDER BY br.BranchName
    `);
    const paymentResult = await addReportScope(pool.request()).query(`
      SELECT PaymentMode AS mode, COALESCE(SUM(Amount), 0) AS amount
      FROM dbo.Payments
      WHERE (@IsSuperAdmin = 1 OR BranchId = @BranchId)
        AND (@CurrentMonthOnly = 0 OR (PaymentDate >= @MonthStart AND PaymentDate < @NextMonthStart))
        AND (@FromDate IS NULL OR PaymentDate >= @FromDate)
        AND (@ToDate IS NULL OR PaymentDate < DATEADD(DAY, 1, @ToDate))
      GROUP BY PaymentMode
      ORDER BY PaymentMode
    `);
    const totalResult = await addReportScope(pool.request()).query(`
      SELECT COALESCE(SUM(GrandTotal), 0) AS totalRevenue
      FROM dbo.SaleBills
      WHERE (@IsSuperAdmin = 1 OR BranchId = @BranchId)
        AND (@CurrentMonthOnly = 0 OR (BillDate >= @MonthStart AND BillDate < @NextMonthStart))
        AND (@FromDate IS NULL OR BillDate >= @FromDate)
        AND (@ToDate IS NULL OR BillDate < DATEADD(DAY, 1, @ToDate))
    `);
    return res.json({
      branchSummary: branchResult.recordset,
      paymentSummary: paymentResult.recordset,
      totalRevenue: totalResult.recordset[0].totalRevenue,
    });
  } catch (error) {
    console.error('Failed loading reports from SQL Server:', error.message);
    return res.status(503).json({ message: 'Could not load reports from the database.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: 'API route not found.' });
});

app.listen(PORT, () => {
  console.log(`HairWigHouse backend running on http://localhost:${PORT}`);
});
