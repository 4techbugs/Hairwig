USE [HairWigHouseDb];
GO

IF OBJECT_ID(N'dbo.BranchTermsConditions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BranchTermsConditions
    (
        TermId uniqueidentifier NOT NULL CONSTRAINT DF_BranchTermsConditions_TermId DEFAULT NEWSEQUENTIALID(),
        BranchId uniqueidentifier NOT NULL,
        TermText nvarchar(1000) NOT NULL,
        DisplayOrder int NOT NULL CONSTRAINT DF_BranchTermsConditions_DisplayOrder DEFAULT 1,
        IsActive bit NOT NULL CONSTRAINT DF_BranchTermsConditions_IsActive DEFAULT 1,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_BranchTermsConditions_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_BranchTermsConditions_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_BranchTermsConditions PRIMARY KEY (TermId),
        CONSTRAINT FK_BranchTermsConditions_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId)
    );
END;
GO

IF OBJECT_ID(N'dbo.Clients', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Clients
    (
        ClientId uniqueidentifier NOT NULL CONSTRAINT DF_Clients_ClientId DEFAULT NEWSEQUENTIALID(),
        ClientName nvarchar(180) NOT NULL,
        Address nvarchar(500) NOT NULL,
        ContactNo nvarchar(30) NOT NULL,
        Email nvarchar(254) NOT NULL CONSTRAINT DF_Clients_Email DEFAULT N'',
        ClientPan nvarchar(20) NOT NULL CONSTRAINT DF_Clients_ClientPan DEFAULT N'',
        ClientCst nvarchar(30) NOT NULL CONSTRAINT DF_Clients_ClientCst DEFAULT N'',
        IsActive bit NOT NULL CONSTRAINT DF_Clients_IsActive DEFAULT 1,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Clients_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Clients_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Clients PRIMARY KEY (ClientId)
    );
END;
GO

IF OBJECT_ID(N'dbo.Brands', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Brands
    (
        BrandId uniqueidentifier NOT NULL CONSTRAINT DF_Brands_BrandId DEFAULT NEWSEQUENTIALID(),
        BrandName nvarchar(120) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Brands_IsActive DEFAULT 1,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Brands_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Brands_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Brands PRIMARY KEY (BrandId),
        CONSTRAINT UQ_Brands_BrandName UNIQUE (BrandName)
    );
END;
GO

IF OBJECT_ID(N'dbo.Units', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Units
    (
        UnitId uniqueidentifier NOT NULL CONSTRAINT DF_Units_UnitId DEFAULT NEWSEQUENTIALID(),
        UnitName nvarchar(30) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Units_IsActive DEFAULT 1,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Units_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Units_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Units PRIMARY KEY (UnitId),
        CONSTRAINT UQ_Units_UnitName UNIQUE (UnitName)
    );
END;
GO

IF OBJECT_ID(N'dbo.ItemGroups', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ItemGroups
    (
        GroupId uniqueidentifier NOT NULL CONSTRAINT DF_ItemGroups_GroupId DEFAULT NEWSEQUENTIALID(),
        GroupName nvarchar(120) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_ItemGroups_IsActive DEFAULT 1,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_ItemGroups_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_ItemGroups_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ItemGroups PRIMARY KEY (GroupId),
        CONSTRAINT UQ_ItemGroups_GroupName UNIQUE (GroupName)
    );
END;
GO

IF OBJECT_ID(N'dbo.Treatments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Treatments
    (
        TreatmentId uniqueidentifier NOT NULL CONSTRAINT DF_Treatments_TreatmentId DEFAULT NEWSEQUENTIALID(),
        TreatmentName nvarchar(180) NOT NULL,
        AliasName nvarchar(180) NOT NULL,
        TaxRate decimal(5,2) NOT NULL,
        TotalPrice decimal(18,2) NOT NULL,
        TreatmentType nvarchar(80) NOT NULL,
        ProductType nvarchar(80) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Treatments_IsActive DEFAULT 1,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Treatments_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Treatments_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Treatments PRIMARY KEY (TreatmentId),
        CONSTRAINT CK_Treatments_TaxRate CHECK (TaxRate >= 0),
        CONSTRAINT CK_Treatments_TotalPrice CHECK (TotalPrice >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Items
    (
        ItemId uniqueidentifier NOT NULL CONSTRAINT DF_Items_ItemId DEFAULT NEWSEQUENTIALID(),
        ItemName nvarchar(180) NOT NULL,
        Brand nvarchar(120) NOT NULL,
        GroupName nvarchar(120) NOT NULL,
        Unit nvarchar(30) NOT NULL,
        TotalPrice decimal(18,2) NOT NULL,
        OpeningStock decimal(18,3) NOT NULL,
        TaxRate decimal(5,2) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Items_IsActive DEFAULT 1,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Items_CreatedAt DEFAULT SYSUTCDATETIME(),
        ModifiedAt datetime2(0) NOT NULL CONSTRAINT DF_Items_ModifiedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Items PRIMARY KEY (ItemId),
        CONSTRAINT CK_Items_TotalPrice CHECK (TotalPrice >= 0),
        CONSTRAINT CK_Items_OpeningStock CHECK (OpeningStock >= 0),
        CONSTRAINT CK_Items_TaxRate CHECK (TaxRate >= 0)
    );
END;
GO

INSERT INTO dbo.Brands (BrandName)
SELECT DISTINCT LTRIM(RTRIM(Item.Brand))
FROM dbo.Items AS Item
WHERE NULLIF(LTRIM(RTRIM(Item.Brand)), N'') IS NOT NULL
  AND NOT EXISTS
  (
      SELECT 1
      FROM dbo.Brands AS Brand
      WHERE Brand.BrandName = LTRIM(RTRIM(Item.Brand))
  );
GO

INSERT INTO dbo.Units (UnitName)
SELECT DISTINCT LTRIM(RTRIM(Item.Unit))
FROM dbo.Items AS Item
WHERE NULLIF(LTRIM(RTRIM(Item.Unit)), N'') IS NOT NULL
  AND NOT EXISTS
  (
      SELECT 1
      FROM dbo.Units AS Unit
      WHERE Unit.UnitName = LTRIM(RTRIM(Item.Unit))
  );
GO

INSERT INTO dbo.ItemGroups (GroupName)
SELECT DISTINCT LTRIM(RTRIM(Item.GroupName))
FROM dbo.Items AS Item
WHERE NULLIF(LTRIM(RTRIM(Item.GroupName)), N'') IS NOT NULL
  AND NOT EXISTS
  (
      SELECT 1
      FROM dbo.ItemGroups AS ItemGroup
      WHERE ItemGroup.GroupName = LTRIM(RTRIM(Item.GroupName))
  );
GO

-- Starter master data. These inserts are idempotent and can be safely re-run.
IF NOT EXISTS (SELECT 1 FROM dbo.Brands WHERE BrandName = N'Natural Hair')
    INSERT INTO dbo.Brands (BrandName) VALUES (N'Natural Hair');
IF NOT EXISTS (SELECT 1 FROM dbo.Brands WHERE BrandName = N'Synthetic')
    INSERT INTO dbo.Brands (BrandName) VALUES (N'Synthetic');
IF NOT EXISTS (SELECT 1 FROM dbo.Brands WHERE BrandName = N'Premium Lace')
    INSERT INTO dbo.Brands (BrandName) VALUES (N'Premium Lace');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Units WHERE UnitName = N'Piece')
    INSERT INTO dbo.Units (UnitName) VALUES (N'Piece');
IF NOT EXISTS (SELECT 1 FROM dbo.Units WHERE UnitName = N'Pack')
    INSERT INTO dbo.Units (UnitName) VALUES (N'Pack');
IF NOT EXISTS (SELECT 1 FROM dbo.Units WHERE UnitName = N'Set')
    INSERT INTO dbo.Units (UnitName) VALUES (N'Set');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ItemGroups WHERE GroupName = N'Wigs')
    INSERT INTO dbo.ItemGroups (GroupName) VALUES (N'Wigs');
IF NOT EXISTS (SELECT 1 FROM dbo.ItemGroups WHERE GroupName = N'Accessories')
    INSERT INTO dbo.ItemGroups (GroupName) VALUES (N'Accessories');
IF NOT EXISTS (SELECT 1 FROM dbo.ItemGroups WHERE GroupName = N'Hair Care')
    INSERT INTO dbo.ItemGroups (GroupName) VALUES (N'Hair Care');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Treatments WHERE TreatmentName = N'Wig Consultation')
    INSERT INTO dbo.Treatments
        (TreatmentName, AliasName, TaxRate, TotalPrice, TreatmentType, ProductType)
    VALUES
        (N'Wig Consultation', N'Consultation', 18.00, 500.00, N'Bill', N'Service');

IF NOT EXISTS (SELECT 1 FROM dbo.Treatments WHERE TreatmentName = N'Wig Fitting')
    INSERT INTO dbo.Treatments
        (TreatmentName, AliasName, TaxRate, TotalPrice, TreatmentType, ProductType)
    VALUES
        (N'Wig Fitting', N'Fitting', 18.00, 1500.00, N'Bill', N'Service');

IF NOT EXISTS (SELECT 1 FROM dbo.Treatments WHERE TreatmentName = N'Wig Styling')
    INSERT INTO dbo.Treatments
        (TreatmentName, AliasName, TaxRate, TotalPrice, TreatmentType, ProductType)
    VALUES
        (N'Wig Styling', N'Styling', 18.00, 800.00, N'Bill', N'Service');

IF NOT EXISTS (SELECT 1 FROM dbo.Treatments WHERE TreatmentName = N'Wig Repair')
    INSERT INTO dbo.Treatments
        (TreatmentName, AliasName, TaxRate, TotalPrice, TreatmentType, ProductType)
    VALUES
        (N'Wig Repair', N'Repair', 18.00, 1200.00, N'Bill', N'Service');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Items WHERE ItemName = N'Standard Wig')
    INSERT INTO dbo.Items
        (ItemName, Brand, GroupName, Unit, TotalPrice, OpeningStock, TaxRate)
    VALUES
        (N'Standard Wig', N'Synthetic', N'Wigs', N'Piece', 2500.00, 0, 18.00);

IF NOT EXISTS (SELECT 1 FROM dbo.Items WHERE ItemName = N'Premium Lace Wig')
    INSERT INTO dbo.Items
        (ItemName, Brand, GroupName, Unit, TotalPrice, OpeningStock, TaxRate)
    VALUES
        (N'Premium Lace Wig', N'Premium Lace', N'Wigs', N'Piece', 7500.00, 0, 18.00);

IF NOT EXISTS (SELECT 1 FROM dbo.Items WHERE ItemName = N'Wig Care Kit')
    INSERT INTO dbo.Items
        (ItemName, Brand, GroupName, Unit, TotalPrice, OpeningStock, TaxRate)
    VALUES
        (N'Wig Care Kit', N'Natural Hair', N'Hair Care', N'Set', 900.00, 0, 18.00);
GO
