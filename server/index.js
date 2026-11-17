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
    { BranchId: 'b1', BranchCode: 'HO', BranchName: 'Head Office', Address: '1 Main Road', City: 'Delhi', State: 'Delhi', Pincode: '110001', Phone: '9999999999', Email: 'admin@hairwighouse.com', GSTNumber: '07ABCDE1234F1Z2', PANNumber: 'ABCDE1234F', InvoicePrefix: 'HO', IsActive: true },
    { BranchId: 'b2', BranchCode: 'ND', BranchName: 'New Delhi Branch', Address: '22 Sector Road', City: 'New Delhi', State: 'Delhi', Pincode: '110045', Phone: '9898989898', Email: 'nd@hairwighouse.com', GSTNumber: '09ABCDE1234F1Z2', PANNumber: 'ABCDF1234F', InvoicePrefix: 'ND', IsActive: true },
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
      { module: 'users', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'roles', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'terms', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'bills', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'payments', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
      { module: 'reports', canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
    ],
    BranchAdmin: [
      { module: 'dashboard', canView: true, canAdd: true, canEdit: false, canDelete: false, canExport: true },
      { module: 'branches', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: true },
      { module: 'users', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'roles', canView: false, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'terms', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'bills', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'payments', canView: true, canAdd: true, canEdit: true, canDelete: false, canExport: true },
      { module: 'reports', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: true },
    ],
    User: [
      { module: 'dashboard', canView: true, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'branches', canView: false, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'users', canView: false, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'roles', canView: false, canAdd: false, canEdit: false, canDelete: false, canExport: false },
      { module: 'terms', canView: false, canAdd: false, canEdit: false, canDelete: false, canExport: false },
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
  terms: [
    { TermId: 't1', BranchId: 'b1', BranchName: 'Head Office', Title: 'General Terms', TermText: 'All payments must be cleared before delivery.', DisplayOrder: 1, IsActive: true },
    { TermId: 't2', BranchId: 'b2', BranchName: 'New Delhi Branch', Title: 'Return Policy', TermText: 'Returns accepted within 7 days in original condition.', DisplayOrder: 2, IsActive: true },
  ],
  bills: [
    { SaleBillId: 's1', BillNumber: 'HO-1001', BranchId: 'b1', BranchName: 'Head Office', CustomerName: 'Anand Kumar', BillDate: '2026-11-01', TotalAmount: 12500, DiscountAmount: 500, GSTAmount: 950, NetAmount: 12950 },
    { SaleBillId: 's2', BillNumber: 'ND-2001', BranchId: 'b2', BranchName: 'New Delhi Branch', CustomerName: 'Rohit Sharma', BillDate: '2026-11-05', TotalAmount: 14300, DiscountAmount: 250, GSTAmount: 1200, NetAmount: 15250 },
  ],
  payments: [
    { PaymentId: 'p1', SaleBillId: 's1', BranchId: 'b1', BranchName: 'Head Office', PaymentDate: '2026-11-01', PaymentMode: 'Cash', Amount: 12950, ReferenceNumber: 'CASH-001', Notes: 'Paid in full' },
    { PaymentId: 'p2', SaleBillId: 's2', BranchId: 'b2', BranchName: 'New Delhi Branch', PaymentDate: '2026-11-05', PaymentMode: 'UPI', Amount: 15250, ReferenceNumber: 'UPI-456', Notes: 'Online payment' },
  ],
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

app.get('/api/dashboard/stats', authRequired, (req, res) => {
  if (!canAccess(req, 'dashboard', 'canView')) {
    return res.status(403).json({ message: 'Access denied for dashboard.' });
  }

  res.json({
    totalBranches: mockData.branches.length,
    totalUsers: mockData.users.length,
    totalBills: mockData.bills.length,
    totalPayments: mockData.payments.length,
    monthlyRevenue: 126540,
    pendingCollection: 18450,
  });
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
          SELECT BranchId, BranchCode, BranchName, Address, City, State, Pincode, Phone,
                 Email, GSTNumber, PANNumber, BillPrefix AS InvoicePrefix, IsActive
          FROM dbo.Branches
          WHERE (@search = N'%%'
                 OR BranchCode LIKE @search
                 OR BranchName LIKE @search
                 OR City LIKE @search
                 OR Phone LIKE @search)
            AND (@activeOnly = 0 OR IsActive = 1)
          ORDER BY BranchName
        `))
      .then((result) => res.json(result.recordset))
      .catch((error) => {
        console.error('Failed loading branches from SQL Server:', error.message);
        res.status(503).json({ message: 'Could not load branches from the database.' });
      });
    return;
  }

  const data = mockData.branches.filter((branch) => {
    const matchesSearch = !search || [branch.BranchCode, branch.BranchName, branch.City, branch.Phone].join(' ').toLowerCase().includes(search);
    const matchesActive = !activeOnly || branch.IsActive;
    return matchesSearch && matchesActive;
  });

  res.json(data);
});

app.post('/api/branches', authRequired, (req, res) => {
  if (!canAccess(req, 'branches', 'canAdd')) {
    return res.status(403).json({ message: 'Add branch not allowed.' });
  }

  const branch = {
    BranchCode: String(req.body?.BranchCode || '').trim(),
    BranchName: String(req.body?.BranchName || '').trim(),
    Address: String(req.body?.Address || '').trim(),
    City: String(req.body?.City || '').trim(),
    State: String(req.body?.State || '').trim(),
    Pincode: String(req.body?.Pincode || '').trim(),
    Phone: String(req.body?.Phone || '').trim(),
    Email: String(req.body?.Email || '').trim(),
    GSTNumber: String(req.body?.GSTNumber || '').trim(),
    PANNumber: String(req.body?.PANNumber || '').trim(),
    InvoicePrefix: String(req.body?.InvoicePrefix || '').trim(),
  };

  if (!branch.BranchCode || !branch.BranchName || !branch.InvoicePrefix) {
    return res.status(400).json({ message: 'Branch code, name, and invoice prefix are required.' });
  }

  if (branch.BranchCode.length > 40 || branch.BranchName.length > 240 || branch.InvoicePrefix.length > 20) {
    return res.status(400).json({ message: 'Branch code, name, or invoice prefix exceeds the allowed length.' });
  }

  if (!useMockData) {
    connectDatabase()
      .then((pool) => pool.request()
        .input('BranchCode', sql.NVarChar(40), branch.BranchCode)
        .input('BranchName', sql.NVarChar(240), branch.BranchName)
        .input('BillPrefix', sql.NVarChar(20), branch.InvoicePrefix)
        .input('Address', sql.NVarChar(600), branch.Address)
        .input('City', sql.NVarChar(160), branch.City)
        .input('State', sql.NVarChar(160), branch.State)
        .input('Pincode', sql.NVarChar(24), branch.Pincode)
        .input('Phone', sql.NVarChar(60), branch.Phone)
        .input('Email', sql.NVarChar(508), branch.Email)
        .input('GSTNumber', sql.NVarChar(40), branch.GSTNumber)
        .input('PANNumber', sql.NVarChar(40), branch.PANNumber)
        .query(`
          INSERT INTO dbo.Branches
            (BranchCode, BranchName, BillPrefix, Address, City, State, Pincode, Phone, Email, GSTNumber, PANNumber)
          OUTPUT inserted.BranchId, inserted.BranchCode, inserted.BranchName,
                 inserted.Address, inserted.City, inserted.State, inserted.Pincode,
                 inserted.Phone, inserted.Email, inserted.GSTNumber, inserted.PANNumber,
                 inserted.BillPrefix AS InvoicePrefix, inserted.IsActive
          VALUES
            (@BranchCode, @BranchName, @BillPrefix, @Address, @City, @State, @Pincode,
             @Phone, @Email, @GSTNumber, @PANNumber)
        `))
      .then((result) => res.status(201).json(result.recordset[0]))
      .catch((error) => {
        if (error.number === 2601 || error.number === 2627) {
          return res.status(409).json({ message: 'Branch code or invoice prefix already exists.' });
        }
        console.error('Failed creating branch in SQL Server:', error.message);
        res.status(500).json({ message: 'Could not create branch.' });
      });
    return;
  }

  const item = {
    ...branch,
    BranchId: `b${Date.now()}`,
    IsActive: true,
  };
  mockData.branches.unshift(item);
  res.status(201).json(item);
});

app.put('/api/branches/:id', authRequired, (req, res) => {
  if (!canAccess(req, 'branches', 'canEdit')) {
    return res.status(403).json({ message: 'Edit branch not allowed.' });
  }

  const found = mockData.branches.find((branch) => branch.BranchId === req.params.id);
  if (!found) return res.status(404).json({ message: 'Branch not found.' });

  Object.assign(found, req.body);
  res.json(found);
});

app.delete('/api/branches/:id', authRequired, (req, res) => {
  if (!canAccess(req, 'branches', 'canDelete')) {
    return res.status(403).json({ message: 'Delete branch not allowed.' });
  }

  const index = mockData.branches.findIndex((branch) => branch.BranchId === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Branch not found.' });

  mockData.branches.splice(index, 1);
  res.json({ message: 'Branch deleted.' });
});

app.get('/api/roles', authRequired, (req, res) => {
  if (!canAccess(req, 'roles', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  res.json(mockData.roles.map((role) => ({
    ...role,
    permissions: getRolePermissionsMap(role.RoleName),
  })));
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

app.get('/api/terms', authRequired, (req, res) => {
  if (!canAccess(req, 'terms', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  res.json(mockData.terms);
});

app.post('/api/terms', authRequired, (req, res) => {
  if (!canAccess(req, 'terms', 'canAdd')) {
    return res.status(403).json({ message: 'Add terms not allowed.' });
  }

  const item = {
    TermId: `t${Date.now()}`,
    ...req.body,
    IsActive: true,
  };
  mockData.terms.push(item);
  res.status(201).json(item);
});

app.get('/api/bills', authRequired, (req, res) => {
  if (!canAccess(req, 'bills', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  res.json(mockData.bills);
});

app.post('/api/bills', authRequired, (req, res) => {
  if (!canAccess(req, 'bills', 'canAdd')) {
    return res.status(403).json({ message: 'Add bill not allowed.' });
  }

  const item = {
    SaleBillId: `s${Date.now()}`,
    ...req.body,
    BillDate: req.body.BillDate || new Date().toISOString().slice(0, 10),
  };
  mockData.bills.unshift(item);
  res.status(201).json(item);
});

app.get('/api/payments', authRequired, (req, res) => {
  if (!canAccess(req, 'payments', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  res.json(mockData.payments);
});

app.post('/api/payments', authRequired, (req, res) => {
  if (!canAccess(req, 'payments', 'canAdd')) {
    return res.status(403).json({ message: 'Add payment not allowed.' });
  }

  const item = {
    PaymentId: `p${Date.now()}`,
    ...req.body,
    PaymentDate: req.body.PaymentDate || new Date().toISOString().slice(0, 10),
  };
  mockData.payments.unshift(item);
  res.status(201).json(item);
});

app.get('/api/reports', authRequired, (req, res) => {
  if (!canAccess(req, 'reports', 'canView')) {
    return res.status(403).json({ message: 'Access denied.' });
  }

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

  res.json({ branchSummary, paymentSummary, totalRevenue: mockData.bills.reduce((sum, bill) => sum + Number(bill.NetAmount || 0), 0) });
});

app.use((req, res) => {
  res.status(404).json({ message: 'API route not found.' });
});

app.listen(PORT, () => {
  console.log(`HairWigHouse backend running on http://localhost:${PORT}`);
});
