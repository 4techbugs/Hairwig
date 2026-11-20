const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const useMockData = (process.env.USE_MOCK_DATA || 'false').toLowerCase() === 'true';
const dbAuthType = (process.env.DB_AUTH_TYPE || 'windows').toLowerCase();
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}
if (useMockData && !process.env.MOCK_ADMIN_PASSWORD) {
  throw new Error('MOCK_ADMIN_PASSWORD is required when USE_MOCK_DATA=true.');
}
if (!['windows', 'sql'].includes(dbAuthType)) {
  throw new Error('DB_AUTH_TYPE must be either "windows" or "sql".');
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
    { RoleId: 'r1', RoleName: 'SuperAdmin', Description: 'Full system access across all branches', IsActive: true },
    { RoleId: 'r2', RoleName: 'BranchAdmin', Description: 'Manage assigned branch operations', IsActive: true },
    { RoleId: 'r3', RoleName: 'User', Description: 'Limited user access', IsActive: true },
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

function getRolePermissionsMap(roleName) {
  const normalizedRole = String(roleName || '').replace(/[^a-z]/gi, '').toLowerCase();
  const permissionRole = {
    superadmin: 'SuperAdmin',
    branchadmin: 'BranchAdmin',
    user: 'User',
  }[normalizedRole];

  return (mockData.permissions[permissionRole] || []).reduce((acc, permission) => {
    acc[permission.module] = permission;
    return acc;
  }, {});
}

function getRoleCode(roleName) {
  const normalizedRole = String(roleName || '').replace(/[^a-z]/gi, '').toLowerCase();
  return {
    superadmin: 'SUPER_ADMIN',
    branchadmin: 'BRANCH_ADMIN',
    user: 'USER',
  }[normalizedRole] || null;
}

function buildToken(user) {
  return jwt.sign(
    {
      userId: user.UserId || user.userId,
      username: user.Username || user.username,
      role: user.RoleName || user.role,
      branchId: user.BranchId || user.branchId,
      email: user.Email || user.email,
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
  req.permissions = getRolePermissionsMap(user.role || 'User');
  next();
}

function canAccess(req, moduleName, action) {
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
    if (!canAccess(req, definition.module, 'canView')) {
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
      definition.fields.forEach((field) => request.input(field.name, field.type, values[field.name]));
      const result = await request.query(`
        INSERT INTO dbo.[${definition.table}] (${columns})
        OUTPUT inserted.*
        VALUES (${parameters})
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
  if (!contactNo || contactNo.length > 30) {
    return res.status(400).json({ message: 'Enter a valid contact number.' });
  }

  if (useMockData) {
    const matches = mockData.clients.filter((client) => (
      client.IsActive !== false && String(client.ContactNo || '').trim() === contactNo
    ));
    if (matches.length > 1) {
      return res.status(409).json({ message: 'More than one client uses this contact number.' });
    }
    const [client] = matches;
    return res.json(client ? {
      ClientName: client.ClientName,
      Address: client.Address,
      Email: client.Email || '',
    } : null);
  }

  try {
    const result = await (await connectDatabase()).request()
      .input('ContactNo', sql.NVarChar(30), contactNo)
      .query(`
        SELECT TOP (2) ClientName, Address, Email
        FROM dbo.Clients
        WHERE ContactNo = @ContactNo AND IsActive = 1
        ORDER BY ClientName
      `);
    if (result.recordset.length > 1) {
      return res.status(409).json({ message: 'More than one client uses this contact number.' });
    }
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
      return res.status(503).json({ message: 'Database unavailable. Check the server database configuration.' });
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

  const permissionsMap = getRolePermissionsMap(user.RoleName || 'User');
  const userPayload = {
    UserId: user.UserId,
    Username: user.Username,
    FullName: user.FullName,
    Email: user.Email,
    Mobile: user.Mobile,
    RoleId: user.RoleId,
    RoleName: user.RoleName,
    BranchId: user.BranchId,
    BranchName: user.BranchName,
  };

  const token = buildToken(userPayload);

  return res.json({
    token,
    user: userPayload,
    permissions: permissionsMap,
  });
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  const user = mockData.users.find((item) => item.Username.toLowerCase() === (req.user.username || '').toLowerCase());
  const permissions = getRolePermissionsMap(user?.RoleName || req.user.role || 'User');

  res.json({
    user: {
      UserId: user?.UserId || req.user.userId,
      Username: user?.Username || req.user.username,
      FullName: user?.FullName || req.user.username,
      Email: user?.Email || req.user.email,
      RoleName: user?.RoleName || req.user.role,
      BranchId: user?.BranchId || req.user.branchId,
      BranchName: user?.BranchName || 'Head Office',
    },
    permissions,
  });
});

app.get('/api/dashboard/stats', authRequired, async (req, res) => {
  if (!canAccess(req, 'dashboard', 'canView')) {
    return res.status(403).json({ message: 'Access denied for dashboard.' });
  }
  if (useMockData) {
    return res.json({
      totalBranches: mockData.branches.length,
      totalUsers: mockData.users.length,
      totalBills: mockData.bills.length,
      totalPayments: mockData.payments.length,
      monthlyRevenue: 126540,
      pendingCollection: 18450,
    });
  }
  try {
    const pool = await connectDatabase();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.Branches WHERE IsActive = 1) AS totalBranches,
        (SELECT COUNT(*) FROM dbo.Users WHERE IsActive = 1) AS totalUsers,
        (SELECT COUNT(*) FROM dbo.SaleBills) AS totalBills,
        (SELECT COUNT(*) FROM dbo.Payments) AS totalPayments,
        (SELECT COALESCE(SUM(GrandTotal), 0) FROM dbo.SaleBills
         WHERE BillDate >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AS monthlyRevenue,
        (SELECT COALESCE(SUM(b.GrandTotal - COALESCE(p.PaidAmount, 0)), 0)
         FROM dbo.SaleBills b
         OUTER APPLY (SELECT SUM(Amount) AS PaidAmount FROM dbo.Payments p WHERE p.BillId = b.BillId) p
         WHERE b.GrandTotal > COALESCE(p.PaidAmount, 0)) AS pendingCollection
    `);
    return res.json(result.recordset[0]);
  } catch (error) {
    console.error('Failed loading dashboard from SQL Server:', error.message);
    return res.status(503).json({ message: 'Could not load dashboard data from the database.' });
  }
});

app.get('/api/branches', authRequired, (req, res) => {
  if (!canAccess(req, 'branches', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const search = (req.query.search || '').toLowerCase();
  const activeOnly = req.query.activeOnly === 'true';

  if (!useMockData) {
    connectDatabase()
      .then((pool) => pool.request()
        .input('search', sql.NVarChar(240), `%${search}%`)
        .input('activeOnly', sql.Bit, activeOnly)
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
    return matchesSearch && matchesActive;
  });

  res.json(data);
});

app.post('/api/branches', authRequired, async (req, res) => {
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
        INSERT INTO dbo.Branches (BranchCode, BranchName, BillPrefix, Address)
        OUTPUT inserted.BranchId, inserted.BranchCode, inserted.BranchName,
               inserted.Address, inserted.BillPrefix AS InvoicePrefix, inserted.IsActive
        VALUES (@BranchCode, @BranchName, @BillPrefix, @Address)
      `);
    const createdBranch = inserted.recordset[0];
    for (let index = 0; index < branch.Terms.length; index += 1) {
      await transaction.request()
        .input('BranchId', sql.UniqueIdentifier, createdBranch.BranchId)
        .input('TermText', sql.NVarChar(1000), branch.Terms[index])
        .input('DisplayOrder', sql.Int, index + 1)
        .query(`
          INSERT INTO dbo.BranchTermsConditions (BranchId, TermText, DisplayOrder)
          VALUES (@BranchId, @TermText, @DisplayOrder)
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
          INSERT INTO dbo.BranchTermsConditions (BranchId, TermText, DisplayOrder)
          VALUES (@BranchId, @TermText, @DisplayOrder)
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

app.get('/api/roles', authRequired, async (req, res) => {
  if (!canAccess(req, 'roles', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  if (useMockData) {
    return res.json(mockData.roles.map((role) => ({
      ...role,
      permissions: getRolePermissionsMap(role.RoleName),
    })));
  }
  try {
    const result = await (await connectDatabase()).request().query(`
      SELECT r.RoleId, r.RoleCode, r.RoleName, r.Description, r.IsActive,
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

app.get('/api/users', authRequired, (req, res) => {
  if (!canAccess(req, 'users', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  if (!useMockData) {
    connectDatabase()
      .then((pool) => pool.request().query(`
        SELECT u.UserId, u.Name AS FullName, u.Username, u.Email, u.Mobile,
               u.Role AS RoleCode, r.RoleName, u.BranchId, b.BranchName,
               u.IsActive, u.MustChangePassword, u.CreatedAt
        FROM dbo.Users AS u
        INNER JOIN dbo.Roles AS r ON r.RoleCode = u.Role
        LEFT JOIN dbo.Branches AS b ON b.BranchId = u.BranchId
        WHERE u.IsActive = 1
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
    .filter((user) => user.IsActive)
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
  const mobile = String(req.body?.Mobile || '').trim();
  const roleCode = getRoleCode(req.body?.RoleName);

  if (!fullName || !username || !password || !email || !roleCode) {
    return res.status(400).json({ message: 'Name, username, password, email, and a valid role are required.' });
  }

  if (fullName.length > 240 || username.length > 160 || email.length > 508 || mobile.length > 60) {
    return res.status(400).json({ message: 'One or more user fields exceed the allowed length.' });
  }

  if (!useMockData) {
    const branchId = roleCode === 'SUPER_ADMIN' ? null : String(req.body?.BranchId || '').trim();
    if (roleCode !== 'SUPER_ADMIN' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId)) {
      return res.status(400).json({ message: 'Select a valid branch for this role.' });
    }

    connectDatabase()
      .then(async (pool) => {
        const roleResult = await pool.request()
          .input('RoleCode', sql.NVarChar(80), roleCode)
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
          .input('RoleCode', sql.NVarChar(80), roleCode)
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
          return res.status(409).json({ message: 'Username or email already exists.' });
        }
        if (error.number === 547) {
          return res.status(400).json({ message: 'The selected role or branch is not valid for this user.' });
        }
        console.error('Failed creating user in SQL Server:', error.message);
        res.status(500).json({ message: 'Could not create user.' });
      });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = {
    UserId: `u${Date.now()}`,
    Username: username,
    PasswordHash: passwordHash,
    FullName: fullName,
    Email: email,
    Mobile: mobile,
    RoleId: req.body.RoleId,
    RoleName: req.body.RoleName,
    BranchId: req.body.BranchId,
    BranchName: req.body.BranchName || 'Head Office',
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
  const mobile = String(req.body?.Mobile || '').trim();
  const password = String(req.body?.Password || '');
  const roleCode = getRoleCode(req.body?.RoleName);

  if (!fullName || !email || !roleCode) {
    return res.status(400).json({ message: 'Name, email, and a valid role are required.' });
  }

  if (fullName.length > 240 || email.length > 508 || mobile.length > 60) {
    return res.status(400).json({ message: 'One or more user fields exceed the allowed length.' });
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

    connectDatabase()
      .then(async (pool) => {
        const targetResult = await pool.request()
          .input('UserId', sql.UniqueIdentifier, userId)
          .query('SELECT Username, [Role] FROM dbo.Users WHERE UserId = @UserId AND IsActive = 1');
        const target = targetResult.recordset[0];
        if (!target) {
          return res.status(404).json({ message: 'User not found.' });
        }
        if (target.Username.toLowerCase() === String(req.user.username || '').toLowerCase()
          && roleCode !== 'SUPER_ADMIN') {
          return res.status(400).json({ message: 'You cannot remove your own Super Admin access.' });
        }

        const roleResult = await pool.request()
          .input('RoleCode', sql.NVarChar(80), roleCode)
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
          .input('RoleCode', sql.NVarChar(80), roleCode)
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
          return res.status(409).json({ message: 'Email already belongs to another user.' });
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
  if (user.Username.toLowerCase() === String(req.user.username || '').toLowerCase()
    && roleCode !== 'SUPER_ADMIN') {
    return res.status(400).json({ message: 'You cannot remove your own Super Admin access.' });
  }

  const selectedRole = mockData.roles.find((role) => getRoleCode(role.RoleName) === roleCode);
  if (!selectedRole) {
    return res.status(400).json({ message: 'The selected role is not available.' });
  }
  const selectedBranch = roleCode === 'SUPER_ADMIN'
    ? null
    : mockData.branches.find((branch) => branch.BranchId === req.body?.BranchId && branch.IsActive);
  if (roleCode !== 'SUPER_ADMIN' && !selectedBranch) {
    return res.status(400).json({ message: 'Select a valid branch for this role.' });
  }

  user.FullName = fullName;
  user.Email = email;
  user.Mobile = mobile;
  user.RoleId = selectedRole.RoleId;
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
          .query('SELECT Username FROM dbo.Users WHERE UserId = @UserId AND IsActive = 1');
        const target = targetResult.recordset[0];
        if (!target) {
          return res.status(404).json({ message: 'User not found.' });
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
  if (useMockData) return res.json(mockData.bills);
  try {
    const result = await (await connectDatabase()).request().query(`
      SELECT b.BillId AS SaleBillId, b.BillNumber, b.CustomerName, b.CustomerMobile,
             b.BillDate, b.GrandTotal AS NetAmount, b.PaymentMode, br.BranchName
      FROM dbo.SaleBills AS b
      INNER JOIN dbo.Branches AS br ON br.BranchId = b.BranchId
      ORDER BY b.CreatedAt DESC
    `);
    return res.json(result.recordset);
  } catch (error) {
    console.error('Failed loading sale bills from SQL Server:', error.message);
    return res.status(503).json({ message: 'Could not load sale bills from the database.' });
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
  const customerEmail = String(req.body?.CustomerEmail || '').trim();
  const billDate = String(req.body?.BillDate || '').trim();
  const nextServiceDate = String(req.body?.NextServiceDate || '').trim();
  const paymentMode = String(req.body?.PaymentMode || '').trim();
  const outerState = false;
  const treatmentInputs = Array.isArray(req.body?.Treatments)
    ? req.body.Treatments.filter((row) => String(row?.TreatmentId || '').trim())
    : [];
  const itemInputs = Array.isArray(req.body?.Items)
    ? req.body.Items.filter((row) => String(row?.ItemId || '').trim())
    : [];
  const isGuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const isValidId = (value) => (useMockData ? Boolean(String(value || '').trim()) : isGuid(value));
  const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  const inclusiveTax = (amount, rate) => (rate > 0 ? roundMoney(amount * rate / (100 + rate)) : 0);

  if (!isValidId(branchId) || !isValidId(String(req.user.userId || ''))) {
    return res.status(400).json({ message: 'Select a valid branch and sign in with a valid user account.' });
  }
  if (getRoleCode(req.user.role) !== 'SUPER_ADMIN'
      && (!req.user.branchId || String(req.user.branchId).toLowerCase() !== branchId.toLowerCase())) {
    return res.status(403).json({ message: 'You can create sale bills only for your assigned branch.' });
  }
  if (!customerName || !customerMobile || !customerAddress || !billDate || !isDate(billDate)
      || (nextServiceDate && !isDate(nextServiceDate))) {
    return res.status(400).json({ message: 'Client name, contact, address, and a valid bill date are required.' });
  }
  if (customerName.length > 160 || customerMobile.length > 30 || customerAddress.length > 400
      || customerEmail.length > 254 || !paymentMode || paymentMode.length > 30) {
    return res.status(400).json({ message: 'One or more sale fields exceed the allowed length or are invalid.' });
  }
  if (treatmentInputs.length + itemInputs.length === 0 || treatmentInputs.length > 100 || itemInputs.length > 100) {
    return res.status(400).json({ message: 'Add at least one treatment or row item to the sale.' });
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
    const item = {
      SaleBillId: `s${Date.now()}`,
      BillNumber: `MOCK-${Date.now()}`,
      ...req.body,
      OuterState: false,
      BranchName: mockData.branches.find((branch) => branch.BranchId === branchId)?.BranchName || '',
      NetAmount: 0,
      BillDate: billDate,
    };
    mockData.bills.unshift(item);
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
        UPDATE dbo.Branches
        SET NextBillNumber = NextBillNumber + 1
        OUTPUT inserted.BillPrefix, inserted.BranchName, deleted.NextBillNumber AS BillSequence
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
    const billNumber = `${branch.BillPrefix}-${String(branch.BillSequence).padStart(6, '0')}`;

    const billResult = await transaction.request()
      .input('BranchId', sql.UniqueIdentifier, branchId)
      .input('BillNumber', sql.NVarChar(30), billNumber)
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
      .input('GrandTotal', sql.Decimal(18, 2), totalGross)
      .input('CreatedBy', sql.UniqueIdentifier, req.user.userId)
      .query(`
        INSERT INTO dbo.SaleBills
          (BranchId, BillNumber, BillDate, CustomerName, CustomerMobile, CustomerAddress,
           CustomerGSTNumber, CustomerEmail, NextServiceDate, OuterState, PaymentMode,
           Subtotal, DiscountTotal, TaxableAmount, CGST, SGST, IGST, GrandTotal, CreatedBy)
        OUTPUT inserted.BillId
        VALUES
          (@BranchId, @BillNumber, @BillDate, @CustomerName, @CustomerMobile, @CustomerAddress,
           @CustomerGSTNumber, @CustomerEmail, @NextServiceDate, @OuterState, @PaymentMode,
           @Subtotal, @DiscountTotal, @TaxableAmount, @CGST, @SGST, @IGST, @GrandTotal, @CreatedBy)
      `);
    const billId = billResult.recordset[0].BillId;

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
            (BillId, SrNo, TreatmentId, TreatmentName, StaffName, TaxRate, GSTAmount, Price, IsPrinted)
          VALUES
            (@BillId, @SrNo, @TreatmentId, @TreatmentName, @StaffName, @TaxRate, @GSTAmount, @Price, @IsPrinted)
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
      CustomerName: customerName,
      CustomerMobile: customerMobile,
      BillDate: billDate,
      NetAmount: totalGross,
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
    return res.status(500).json({ message: 'Could not save sale bill.' });
  }
});

app.get('/api/payments', authRequired, async (req, res) => {
  if (!canAccess(req, 'payments', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  if (useMockData) return res.json(mockData.payments);
  try {
    const result = await (await connectDatabase()).request().query(`
      SELECT p.PaymentId, p.BillId AS SaleBillId, p.BranchId, p.PaymentDate,
             p.Amount, p.PaymentMode, p.ReferenceNumber, p.Remarks AS Notes,
             b.BranchName, sb.BillNumber
      FROM dbo.Payments p
      LEFT JOIN dbo.Branches b ON b.BranchId = p.BranchId
      LEFT JOIN dbo.SaleBills sb ON sb.BillId = p.BillId
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
    const item = {
      PaymentId: `p${Date.now()}`,
      ...req.body,
      PaymentDate: req.body.PaymentDate || new Date().toISOString().slice(0, 10),
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
    const paymentMode = String(req.body?.PaymentMode || '').trim();
    const referenceNumber = String(req.body?.ReferenceNumber || '').trim();
    const remarks = String(req.body?.Notes || '').trim();
    const result = await (await connectDatabase()).request()
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
  if (useMockData) {
    const branchSummary = mockData.branches.map((branch) => ({
      BranchName: branch.BranchName,
      TotalBills: mockData.bills.filter((bill) => bill.BranchId === branch.BranchId).length,
      TotalRevenue: mockData.bills.filter((bill) => bill.BranchId === branch.BranchId).reduce((sum, bill) => sum + Number(bill.NetAmount || 0), 0),
    }));
    const paymentModes = ['Cash', 'UPI', 'Bank Transfer', 'Card'];
    const paymentSummary = paymentModes.map((mode) => ({
      mode,
      amount: mockData.payments.filter((payment) => payment.PaymentMode === mode).reduce((sum, payment) => sum + Number(payment.Amount || 0), 0),
    }));
    return res.json({ branchSummary, paymentSummary, totalRevenue: mockData.bills.reduce((sum, bill) => sum + Number(bill.NetAmount || 0), 0) });
  }
  try {
    const pool = await connectDatabase();
    const branchResult = await pool.request().query(`
      SELECT br.BranchName,
             COUNT(sb.BillId) AS TotalBills,
             COALESCE(SUM(sb.GrandTotal), 0) AS TotalRevenue
      FROM dbo.Branches br
      LEFT JOIN dbo.SaleBills sb ON sb.BranchId = br.BranchId
      WHERE br.IsActive = 1
      GROUP BY br.BranchName
      ORDER BY br.BranchName
    `);
    const paymentResult = await pool.request().query(`
      SELECT PaymentMode AS mode, COALESCE(SUM(Amount), 0) AS amount
      FROM dbo.Payments
      GROUP BY PaymentMode
      ORDER BY PaymentMode
    `);
    const totalResult = await pool.request().query('SELECT COALESCE(SUM(GrandTotal), 0) AS totalRevenue FROM dbo.SaleBills');
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
