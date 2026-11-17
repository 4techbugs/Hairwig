USE [master];
GO

IF DB_ID(N'BranchSalesManagementDB') IS NULL
BEGIN
    CREATE DATABASE [BranchSalesManagementDB];
END;
GO

USE [BranchSalesManagementDB];
GO

IF OBJECT_ID(N'dbo.Branches', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Branches
    (
        BranchId uniqueidentifier NOT NULL CONSTRAINT DF_Branches_BranchId DEFAULT NEWSEQUENTIALID(),
        BranchCode nvarchar(30) NOT NULL,
        BranchName nvarchar(160) NOT NULL,
        Address nvarchar(400) NOT NULL CONSTRAINT DF_Branches_Address DEFAULT N'',
        City nvarchar(80) NOT NULL CONSTRAINT DF_Branches_City DEFAULT N'',
        State nvarchar(80) NOT NULL CONSTRAINT DF_Branches_State DEFAULT N'',
        Pincode nvarchar(12) NOT NULL CONSTRAINT DF_Branches_Pincode DEFAULT N'',
        Phone nvarchar(30) NOT NULL CONSTRAINT DF_Branches_Phone DEFAULT N'',
        Email nvarchar(254) NOT NULL CONSTRAINT DF_Branches_Email DEFAULT N'',
        GSTNumber nvarchar(30) NOT NULL CONSTRAINT DF_Branches_GSTNumber DEFAULT N'',
        PANNumber nvarchar(30) NOT NULL CONSTRAINT DF_Branches_PANNumber DEFAULT N'',
        InvoicePrefix nvarchar(10) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Branches_IsActive DEFAULT 1,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Branches_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Branches_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Branches PRIMARY KEY (BranchId),
        CONSTRAINT UQ_Branches_BranchCode UNIQUE (BranchCode),
        CONSTRAINT UQ_Branches_InvoicePrefix UNIQUE (InvoicePrefix)
    );
END;
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles
    (
        RoleId uniqueidentifier NOT NULL CONSTRAINT DF_Roles_RoleId DEFAULT NEWSEQUENTIALID(),
        RoleName nvarchar(60) NOT NULL,
        Description nvarchar(300) NOT NULL CONSTRAINT DF_Roles_Description DEFAULT N'',
        IsActive bit NOT NULL CONSTRAINT DF_Roles_IsActive DEFAULT 1,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Roles_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Roles PRIMARY KEY (RoleId),
        CONSTRAINT UQ_Roles_RoleName UNIQUE (RoleName)
    );
END;
GO

IF OBJECT_ID(N'dbo.RolePermissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RolePermissions
    (
        RolePermissionId uniqueidentifier NOT NULL CONSTRAINT DF_RolePermissions_RolePermissionId DEFAULT NEWSEQUENTIALID(),
        RoleId uniqueidentifier NOT NULL,
        ModuleKey nvarchar(80) NOT NULL,
        CanView bit NOT NULL CONSTRAINT DF_RolePermissions_CanView DEFAULT 0,
        CanAdd bit NOT NULL CONSTRAINT DF_RolePermissions_CanAdd DEFAULT 0,
        CanEdit bit NOT NULL CONSTRAINT DF_RolePermissions_CanEdit DEFAULT 0,
        CanDelete bit NOT NULL CONSTRAINT DF_RolePermissions_CanDelete DEFAULT 0,
        CanExport bit NOT NULL CONSTRAINT DF_RolePermissions_CanExport DEFAULT 0,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_RolePermissions_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_RolePermissions PRIMARY KEY (RolePermissionId),
        CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId),
        CONSTRAINT UQ_RolePermissions_RoleModule UNIQUE (RoleId, ModuleKey)
    );
END;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        UserId uniqueidentifier NOT NULL CONSTRAINT DF_Users_UserId DEFAULT NEWSEQUENTIALID(),
        Username nvarchar(80) NOT NULL,
        PasswordHash nvarchar(255) NOT NULL,
        FullName nvarchar(160) NOT NULL,
        Email nvarchar(254) NOT NULL,
        Mobile nvarchar(30) NOT NULL,
        RoleId uniqueidentifier NOT NULL,
        BranchId uniqueidentifier NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
        MustChangePassword bit NOT NULL CONSTRAINT DF_Users_MustChangePassword DEFAULT 0,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Users_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Users PRIMARY KEY (UserId),
        CONSTRAINT UQ_Users_Username UNIQUE (Username),
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId),
        CONSTRAINT FK_Users_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId)
    );
END;
GO

IF OBJECT_ID(N'dbo.TermsAndConditions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TermsAndConditions
    (
        TermId uniqueidentifier NOT NULL CONSTRAINT DF_Terms_TermId DEFAULT NEWSEQUENTIALID(),
        BranchId uniqueidentifier NOT NULL,
        Title nvarchar(120) NOT NULL,
        TermText nvarchar(2000) NOT NULL,
        DisplayOrder int NOT NULL CONSTRAINT DF_Terms_DisplayOrder DEFAULT 1,
        IsActive bit NOT NULL CONSTRAINT DF_Terms_IsActive DEFAULT 1,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Terms_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Terms_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_TermsAndConditions PRIMARY KEY (TermId),
        CONSTRAINT FK_TermsAndConditions_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId)
    );
END;
GO

IF OBJECT_ID(N'dbo.Customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customers
    (
        CustomerId uniqueidentifier NOT NULL CONSTRAINT DF_Customers_CustomerId DEFAULT NEWSEQUENTIALID(),
        BranchId uniqueidentifier NOT NULL,
        Name nvarchar(180) NOT NULL,
        Mobile nvarchar(30) NOT NULL,
        Address nvarchar(500) NOT NULL CONSTRAINT DF_Customers_Address DEFAULT N'',
        GSTNumber nvarchar(30) NOT NULL CONSTRAINT DF_Customers_GSTNumber DEFAULT N'',
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Customers_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Customers_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Customers PRIMARY KEY (CustomerId),
        CONSTRAINT FK_Customers_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId),
        CONSTRAINT UQ_Customers_BranchMobile UNIQUE (BranchId, Mobile)
    );
END;
GO

IF OBJECT_ID(N'dbo.SaleBills', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SaleBills
    (
        SaleBillId uniqueidentifier NOT NULL CONSTRAINT DF_SaleBills_SaleBillId DEFAULT NEWSEQUENTIALID(),
        BillNumber nvarchar(40) NOT NULL,
        BranchId uniqueidentifier NOT NULL,
        CustomerId uniqueidentifier NULL,
        BillDate datetime2(0) NOT NULL,
        TotalAmount decimal(18,2) NOT NULL CONSTRAINT DF_SaleBills_TotalAmount DEFAULT 0,
        DiscountAmount decimal(18,2) NOT NULL CONSTRAINT DF_SaleBills_DiscountAmount DEFAULT 0,
        GSTAmount decimal(18,2) NOT NULL CONSTRAINT DF_SaleBills_GSTAmount DEFAULT 0,
        NetAmount decimal(18,2) NOT NULL CONSTRAINT DF_SaleBills_NetAmount DEFAULT 0,
        Notes nvarchar(500) NOT NULL CONSTRAINT DF_SaleBills_Notes DEFAULT N'',
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_SaleBills_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_SaleBills_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_SaleBills PRIMARY KEY (SaleBillId),
        CONSTRAINT FK_SaleBills_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId),
        CONSTRAINT FK_SaleBills_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(CustomerId),
        CONSTRAINT UQ_SaleBills_BillNumber UNIQUE (BillNumber)
    );
END;
GO

IF OBJECT_ID(N'dbo.Payments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Payments
    (
        PaymentId uniqueidentifier NOT NULL CONSTRAINT DF_Payments_PaymentId DEFAULT NEWSEQUENTIALID(),
        SaleBillId uniqueidentifier NULL,
        BranchId uniqueidentifier NOT NULL,
        CustomerId uniqueidentifier NULL,
        PaymentDate datetime2(0) NOT NULL,
        PaymentMode nvarchar(30) NOT NULL,
        Amount decimal(18,2) NOT NULL,
        ReferenceNumber nvarchar(80) NOT NULL CONSTRAINT DF_Payments_ReferenceNumber DEFAULT N'',
        Notes nvarchar(250) NOT NULL CONSTRAINT DF_Payments_Notes DEFAULT N'',
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Payments_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Payments PRIMARY KEY (PaymentId),
        CONSTRAINT FK_Payments_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId),
        CONSTRAINT FK_Payments_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(CustomerId),
        CONSTRAINT FK_Payments_SaleBills FOREIGN KEY (SaleBillId) REFERENCES dbo.SaleBills(SaleBillId)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchCode = N'HO')
BEGIN
    INSERT INTO dbo.Branches (BranchCode, BranchName, Address, City, State, Pincode, Phone, Email, GSTNumber, PANNumber, InvoicePrefix)
    VALUES (N'HO', N'Head Office', N'1 Main Road', N'Delhi', N'Delhi', N'110001', N'9999999999', N'admin@hairwighouse.com', N'07ABCDE1234F1Z2', N'ABCDE1234F', N'HO');
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'SuperAdmin')
BEGIN
    INSERT INTO dbo.Roles (RoleName, Description)
    VALUES (N'SuperAdmin', N'Full system access across all branches');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'BranchAdmin')
BEGIN
    INSERT INTO dbo.Roles (RoleName, Description)
    VALUES (N'BranchAdmin', N'Manages assigned branch operations');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'User')
BEGIN
    INSERT INTO dbo.Roles (RoleName, Description)
    VALUES (N'User', N'Limited user access');
END;
GO

DECLARE @SuperAdminRoleId uniqueidentifier = (SELECT TOP 1 RoleId FROM dbo.Roles WHERE RoleName = N'SuperAdmin');
DECLARE @BranchAdminRoleId uniqueidentifier = (SELECT TOP 1 RoleId FROM dbo.Roles WHERE RoleName = N'BranchAdmin');
DECLARE @UserRoleId uniqueidentifier = (SELECT TOP 1 RoleId FROM dbo.Roles WHERE RoleName = N'User');
DECLARE @HeadOfficeId uniqueidentifier = (SELECT TOP 1 BranchId FROM dbo.Branches WHERE BranchCode = N'HO');

IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @SuperAdminRoleId AND ModuleKey = N'dashboard')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@SuperAdminRoleId, N'dashboard', 1, 1, 1, 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @SuperAdminRoleId AND ModuleKey = N'branches')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@SuperAdminRoleId, N'branches', 1, 1, 1, 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @SuperAdminRoleId AND ModuleKey = N'users')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@SuperAdminRoleId, N'users', 1, 1, 1, 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @SuperAdminRoleId AND ModuleKey = N'roles')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@SuperAdminRoleId, N'roles', 1, 1, 1, 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @SuperAdminRoleId AND ModuleKey = N'terms')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@SuperAdminRoleId, N'terms', 1, 1, 1, 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @SuperAdminRoleId AND ModuleKey = N'bills')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@SuperAdminRoleId, N'bills', 1, 1, 1, 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @SuperAdminRoleId AND ModuleKey = N'payments')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@SuperAdminRoleId, N'payments', 1, 1, 1, 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @SuperAdminRoleId AND ModuleKey = N'reports')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@SuperAdminRoleId, N'reports', 1, 1, 1, 1, 1);

IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @BranchAdminRoleId AND ModuleKey = N'dashboard')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@BranchAdminRoleId, N'dashboard', 1, 1, 0, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @BranchAdminRoleId AND ModuleKey = N'branches')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@BranchAdminRoleId, N'branches', 1, 0, 0, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @BranchAdminRoleId AND ModuleKey = N'users')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@BranchAdminRoleId, N'users', 1, 1, 1, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @BranchAdminRoleId AND ModuleKey = N'roles')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@BranchAdminRoleId, N'roles', 0, 0, 0, 0, 0);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @BranchAdminRoleId AND ModuleKey = N'terms')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@BranchAdminRoleId, N'terms', 1, 1, 1, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @BranchAdminRoleId AND ModuleKey = N'bills')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@BranchAdminRoleId, N'bills', 1, 1, 1, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @BranchAdminRoleId AND ModuleKey = N'payments')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@BranchAdminRoleId, N'payments', 1, 1, 1, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @BranchAdminRoleId AND ModuleKey = N'reports')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@BranchAdminRoleId, N'reports', 1, 0, 0, 0, 1);

IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @UserRoleId AND ModuleKey = N'dashboard')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@UserRoleId, N'dashboard', 1, 0, 0, 0, 0);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @UserRoleId AND ModuleKey = N'bills')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@UserRoleId, N'bills', 1, 1, 0, 0, 0);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @UserRoleId AND ModuleKey = N'payments')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@UserRoleId, N'payments', 1, 1, 0, 0, 0);
IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @UserRoleId AND ModuleKey = N'reports')
    INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanView, CanAdd, CanEdit, CanDelete, CanExport) VALUES (@UserRoleId, N'reports', 1, 0, 0, 0, 0);
GO

-- Set this to a bcrypt hash generated locally to create the initial administrator.
DECLARE @InitialAdminPasswordHash nvarchar(255) = NULL;
DECLARE @SuperAdminRoleId uniqueidentifier = (SELECT TOP 1 RoleId FROM dbo.Roles WHERE RoleName = N'SuperAdmin');
DECLARE @HeadOfficeId uniqueidentifier = (SELECT TOP 1 BranchId FROM dbo.Branches WHERE BranchCode = N'HO');

IF @InitialAdminPasswordHash IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'Admin')
BEGIN
    INSERT INTO dbo.Users (Username, PasswordHash, FullName, Email, Mobile, RoleId, BranchId, MustChangePassword)
    VALUES (N'Admin', @InitialAdminPasswordHash, N'System Administrator', N'admin@hairwighouse.com', N'9876543210', @SuperAdminRoleId, @HeadOfficeId, 0);
END;
GO
