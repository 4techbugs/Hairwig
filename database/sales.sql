USE [HairWigHouseDb];
GO

IF OBJECT_ID(N'dbo.SaleBillTerms', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SaleBillTerms
    (
        BillId uniqueidentifier NOT NULL,
        DisplayOrder int NOT NULL,
        TermText nvarchar(1000) NOT NULL,
        CONSTRAINT PK_SaleBillTerms PRIMARY KEY (BillId, DisplayOrder),
        CONSTRAINT FK_SaleBillTerms_SaleBills FOREIGN KEY (BillId) REFERENCES dbo.SaleBills(BillId)
    );
END;
GO

IF COL_LENGTH(N'dbo.SaleBills', N'CustomerEmail') IS NULL
BEGIN
    ALTER TABLE dbo.SaleBills
    ADD CustomerEmail nvarchar(254) NOT NULL
        CONSTRAINT DF_SaleBills_CustomerEmail DEFAULT N'';
END;
GO

IF COL_LENGTH(N'dbo.SaleBills', N'NextServiceDate') IS NULL
BEGIN
    ALTER TABLE dbo.SaleBills
    ADD NextServiceDate date NULL;
END;
GO

IF COL_LENGTH(N'dbo.SaleBills', N'OuterState') IS NULL
BEGIN
    ALTER TABLE dbo.SaleBills
    ADD OuterState bit NOT NULL
        CONSTRAINT DF_SaleBills_OuterState DEFAULT 0;
END;
GO

IF COL_LENGTH(N'dbo.SaleBills', N'PreviousBalance') IS NULL
BEGIN
    ALTER TABLE dbo.SaleBills
    ADD PreviousBalance decimal(18,2) NOT NULL
        CONSTRAINT DF_SaleBills_PreviousBalance DEFAULT 0;
END;
GO

IF OBJECT_ID(N'dbo.SaleBillTreatments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SaleBillTreatments
    (
        TreatmentLineId uniqueidentifier NOT NULL CONSTRAINT DF_SaleBillTreatments_Id DEFAULT NEWSEQUENTIALID(),
        BillId uniqueidentifier NOT NULL,
        SrNo int NOT NULL,
        TreatmentId uniqueidentifier NOT NULL,
        TreatmentName nvarchar(180) NOT NULL,
        StaffName nvarchar(120) NOT NULL CONSTRAINT DF_SaleBillTreatments_Staff DEFAULT N'',
        TaxRate decimal(5,2) NOT NULL,
        GSTAmount decimal(18,2) NOT NULL,
        Price decimal(18,2) NOT NULL,
        IsPrinted bit NOT NULL CONSTRAINT DF_SaleBillTreatments_IsPrinted DEFAULT 0,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_SaleBillTreatments_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_SaleBillTreatments PRIMARY KEY (TreatmentLineId),
        CONSTRAINT FK_SaleBillTreatments_SaleBills FOREIGN KEY (BillId) REFERENCES dbo.SaleBills(BillId),
        CONSTRAINT FK_SaleBillTreatments_Treatments FOREIGN KEY (TreatmentId) REFERENCES dbo.Treatments(TreatmentId),
        CONSTRAINT UQ_SaleBillTreatments_BillSrNo UNIQUE (BillId, SrNo),
        CONSTRAINT CK_SaleBillTreatments_Amounts CHECK (TaxRate >= 0 AND GSTAmount >= 0 AND Price >= 0)
    );
END;
GO

-- SaleBillItems rows are bill lines. ItemId references the reusable item
-- master and must not be unique across bills; each bill line is identified
-- by its bill and line number instead.
IF OBJECT_ID(N'dbo.SaleBillItems', N'U') IS NOT NULL
AND NOT EXISTS
(
    SELECT 1
    FROM sys.key_constraints AS pk
    WHERE pk.parent_object_id = OBJECT_ID(N'dbo.SaleBillItems')
      AND pk.type = N'PK'
      AND (SELECT COUNT(*) FROM sys.index_columns AS ic
           WHERE ic.object_id = pk.parent_object_id
             AND ic.index_id = pk.unique_index_id
             AND ic.key_ordinal > 0) = 2
      AND EXISTS (SELECT 1 FROM sys.index_columns AS ic JOIN sys.columns AS c
                  ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                  WHERE ic.object_id = pk.parent_object_id AND ic.index_id = pk.unique_index_id
                    AND ic.key_ordinal = 1 AND c.name = N'BillId')
      AND EXISTS (SELECT 1 FROM sys.index_columns AS ic JOIN sys.columns AS c
                  ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                  WHERE ic.object_id = pk.parent_object_id AND ic.index_id = pk.unique_index_id
                    AND ic.key_ordinal = 2 AND c.name = N'SrNo')
)
BEGIN
    IF EXISTS
    (
        SELECT BillId, SrNo
        FROM dbo.SaleBillItems
        GROUP BY BillId, SrNo
        HAVING COUNT(*) > 1
    )
    BEGIN
        ;THROW 51001, 'SaleBillItems contains duplicate bill line numbers; resolve them before changing its primary key.', 1;
    END

    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @SaleBillItemsPrimaryKey sysname;
        SELECT @SaleBillItemsPrimaryKey = name
        FROM sys.key_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.SaleBillItems') AND type = N'PK';

        IF @SaleBillItemsPrimaryKey IS NOT NULL
            EXEC(N'ALTER TABLE dbo.SaleBillItems DROP CONSTRAINT ' + QUOTENAME(@SaleBillItemsPrimaryKey));

        ALTER TABLE dbo.SaleBillItems
            ADD CONSTRAINT PK_SaleBillItems PRIMARY KEY CLUSTERED (BillId, SrNo);
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
