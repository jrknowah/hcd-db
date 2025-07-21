const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getDbConnection } = require('../config/database');
const { logUserAction } = require('../middleware/logging');

// ===== UTILITY FUNCTIONS =====

const formatBioSocialData = (rows) => {
    if (!rows || rows.length === 0) return null;
    
    const bioSocial = rows[0];
    return {
        bioSocialID: bioSocial.bioSocialID,
        clientID: bioSocial.clientID,
        assessmentID: bioSocial.assessmentID,
        
        // Financial Information
        clientCalWorks: bioSocial.clientCalWorks || "0.00",
        clientEmployment: bioSocial.clientEmployment || "0.00",
        clientFoodStamps: bioSocial.clientFoodStamps || "0.00",
        clientWidowBen: bioSocial.clientWidowBen || "0.00",
        clientCS: bioSocial.clientCS || "0.00",
        clientGenRelief: bioSocial.clientGenRelief || "0.00",
        clientSSI: bioSocial.clientSSI || "0.00",
        clientSSDI: bioSocial.clientSSDI || "0.00",
        clientTANF: bioSocial.clientTANF || "0.00",
        clientWorkComp: bioSocial.clientWorkComp || "0.00",
        clientUnEmp: bioSocial.clientUnEmp || "0.00",
        clientVetBen: bioSocial.clientVetBen || "0.00",
        clientStDis: bioSocial.clientStDis || "0.00",
        clientInherit: bioSocial.clientInherit || "0.00",
        clientOtherInc: bioSocial.clientOtherInc || "0.00",
        totalMonthlyIncome: bioSocial.totalMonthlyIncome || 0.00,
        
        // Payee Information
        payeeChoice: bioSocial.payeeChoice,
        payeeName: bioSocial.payeeName,
        payeePhone: bioSocial.payeePhone,
        payeeRelationship: bioSocial.payeeRelationship,
        
        // Employment History
        clientBeenEmployed: bioSocial.clientBeenEmployed,
        clientEmpIntr: bioSocial.clientEmpIntr,
        clientEmployed: bioSocial.clientEmployed,
        clientEmployer: bioSocial.clientEmployer,
        lastEmploymentDate: bioSocial.lastEmploymentDate,
        employmentBarriers: bioSocial.employmentBarriers,
        
        // Debt Information
        clientDebt: bioSocial.clientDebt,
        clientDebtAmount: bioSocial.clientDebtAmount,
        clientBankrupt: bioSocial.clientBankrupt,
        bankruptcyDate: bioSocial.bankruptcyDate,
        
        // Housing Information
        clientGovHousingApp: bioSocial.clientGovHousingApp,
        clientGovHousingLive: bioSocial.clientGovHousingLive,
        clientPastRenter: bioSocial.clientPastRenter,
        clientPastRenterLate: bioSocial.clientPastRenterLate,
        clientEvicted: bioSocial.clientEvicted,
        clientLandlordProb: bioSocial.clientLandlordProb,
        clientUtilityBill: bioSocial.clientUtilityBill,
        clientCreditRating: bioSocial.clientCreditRating,
        clientHousingSummary: bioSocial.clientHousingSummary,
        housingStability: bioSocial.housingStability,
        
        // Functional Assessment
        clientAmbulatory: bioSocial.clientAmbulatory,
        clientAmbulatorySummary: bioSocial.clientAmbulatorySummary,
        
        // Activities of Daily Living
        clientEating: bioSocial.clientEating,
        clientBathing: bioSocial.clientBathing,
        clientBrushing: bioSocial.clientBrushing,
        clientToileting: bioSocial.clientToileting,
        clientCooking: bioSocial.clientCooking,
        clientCleaning: bioSocial.clientCleaning,
        clientLaundry: bioSocial.clientLaundry,
        clientTakingMeds: bioSocial.clientTakingMeds,
        clientFunctionalAssist: bioSocial.clientFunctionalAssist,
        adlScore: bioSocial.adlScore || 0,
        adlPercentage: bioSocial.adlPercentage || 0,
        
        // Communication & Language
        clientCommunication: bioSocial.clientCommunication,
        primaryLanguage: bioSocial.primaryLanguage,
        interpreterNeeded: bioSocial.interpreterNeeded || false,
        communicationBarriers: bioSocial.communicationBarriers,
        
        // Assessment Summary
        clientBioSocialNotes: bioSocial.clientBioSocialNotes,
        riskFactors: bioSocial.riskFactors,
        strengths: bioSocial.strengths,
        recommendedServices: bioSocial.recommendedServices,
        
        // Completion Status
        completionStatus: bioSocial.completionStatus || 'Not Started',
        completionPercentage: bioSocial.completionPercentage || 0,
        timeSpent: bioSocial.timeSpent || 0,
        
        // Audit fields
        createdBy: bioSocial.createdBy,
        createdAt: bioSocial.createdAt,
        updatedBy: bioSocial.updatedBy,
        updatedAt: bioSocial.updatedAt,
        completedBy: bioSocial.completedBy,
        completedAt: bioSocial.completedAt
    };
};

const calculateTotalIncome = (bioSocialData) => {
    const incomeFields = [
        'clientCalWorks', 'clientEmployment', 'clientFoodStamps', 'clientWidowBen',
        'clientCS', 'clientGenRelief', 'clientSSI', 'clientSSDI', 'clientTANF',
        'clientWorkComp', 'clientUnEmp', 'clientVetBen', 'clientStDis',
        'clientInherit', 'clientOtherInc'
    ];
    
    return incomeFields.reduce((total, field) => {
        const value = parseFloat(bioSocialData[field]) || 0;
        return total + value;
    }, 0);
};

const calculateADLScore = (bioSocialData) => {
    const adlFields = [
        'clientEating', 'clientBathing', 'clientBrushing', 'clientToileting',
        'clientCooking', 'clientCleaning', 'clientLaundry', 'clientTakingMeds'
    ];

    const scoreMap = {
        'Self': 4,
        'Partial Assistance': 2,
        'Complete Assistance': 1
    };

    let totalScore = 0;
    adlFields.forEach(field => {
        const value = bioSocialData[field];
        totalScore += scoreMap[value] || 0;
    });

    const maxScore = 32; // 8 fields × 4 points each
    const percentage = Math.round((totalScore / maxScore) * 100);

    return {
        adlScore: totalScore,
        adlMaxScore: maxScore,
        adlPercentage: percentage,
        interpretation: percentage >= 90 ? 'Highly Independent' :
                       percentage >= 75 ? 'Mostly Independent' :
                       percentage >= 50 ? 'Partially Independent' : 'Needs Significant Support'
    };
};

const calculateCompletionPercentage = (bioSocialData) => {
    const requiredFields = [
        'clientCalWorks', 'clientEmployment', 'clientFoodStamps', 'clientGenRelief', 'clientSSI',
        'payeeChoice', 'clientBeenEmployed', 'clientEmpIntr', 'clientEmployed',
        'clientDebt', 'clientBankrupt', 'clientPastRenter', 'clientEvicted',
        'clientEating', 'clientBathing', 'clientToileting', 'clientCooking'
    ];

    const completedFields = requiredFields.filter(field => {
        const value = bioSocialData[field];
        return value !== "" && value !== null && value !== undefined;
    }).length;

    return Math.round((completedFields / requiredFields.length) * 100);
};

// ===== BIO-SOCIAL ROUTES =====

// 🔸 GET /api/bio-social/:clientID - Get bio-social data for client
router.get('/:clientID', async (req, res) => {
    const { clientID } = req.params;
    
    try {
        const pool = await getDbConnection();
        
        // Get latest bio-social assessment for client
        const bioSocialQuery = `
            SELECT TOP 1 bs.*
            FROM BioSocialAssessment bs
            WHERE bs.clientID = @clientID
            ORDER BY bs.createdAt DESC
        `;
        
        const result = await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .query(bioSocialQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'No bio-social assessment found for this client',
                clientID 
            });
        }

        const bioSocialData = formatBioSocialData(result.recordset);
        
        await logUserAction(req.user, 'GET_BIO_SOCIAL_DATA', {
            clientID,
            bioSocialID: bioSocialData.bioSocialID
        });

        res.json(bioSocialData);

    } catch (error) {
        console.error('Error fetching bio-social data:', error);
        await logUserAction(req.user, 'GET_BIO_SOCIAL_DATA_ERROR', {
            clientID,
            error: error.message
        });
        res.status(500).json({ 
            error: 'Failed to fetch bio-social data',
            details: error.message 
        });
    }
});

// 🔸 GET /api/bio-social/assessment/:assessmentID - Get bio-social data by assessment ID
router.get('/assessment/:assessmentID', async (req, res) => {
    const { assessmentID } = req.params;
    
    try {
        const pool = await getDbConnection();
        
        const bioSocialQuery = `
            SELECT bs.*
            FROM BioSocialAssessment bs
            WHERE bs.assessmentID = @assessmentID
        `;
        
        const result = await pool.request()
            .input('assessmentID', sql.VarChar, assessmentID)
            .query(bioSocialQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'No bio-social assessment found for this assessment ID',
                assessmentID 
            });
        }

        const bioSocialData = formatBioSocialData(result.recordset);
        
        await logUserAction(req.user, 'GET_BIO_SOCIAL_BY_ASSESSMENT', {
            assessmentID,
            bioSocialID: bioSocialData.bioSocialID
        });

        res.json(bioSocialData);

    } catch (error) {
        console.error('Error fetching bio-social data by assessment:', error);
        res.status(500).json({ 
            error: 'Failed to fetch bio-social data',
            details: error.message 
        });
    }
});

// 🔸 POST /api/bio-social/:clientID - Create/Save bio-social data
router.post('/:clientID', async (req, res) => {
    const { clientID } = req.params;
    const bioSocialData = req.body;
    
    try {
        const pool = await getDbConnection();
        const userEmail = req.user?.email || 'system@example.com';
        
        // Calculate derived values
        const totalIncome = calculateTotalIncome(bioSocialData);
        const adlMetrics = calculateADLScore(bioSocialData);
        const completionPercentage = calculateCompletionPercentage(bioSocialData);
        
        // Check if bio-social assessment already exists for this client
        const existingQuery = `
            SELECT bioSocialID, assessmentID FROM BioSocialAssessment 
            WHERE clientID = @clientID
            ORDER BY createdAt DESC
        `;
        
        const existingResult = await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .query(existingQuery);

        let bioSocialID;
        let operation;

        if (existingResult.recordset.length > 0) {
            // Update existing bio-social assessment
            bioSocialID = existingResult.recordset[0].bioSocialID;
            operation = 'UPDATE';
            
            const updateQuery = `
                UPDATE BioSocialAssessment SET
                    -- Financial Information
                    clientCalWorks = @clientCalWorks,
                    clientEmployment = @clientEmployment,
                    clientFoodStamps = @clientFoodStamps,
                    clientWidowBen = @clientWidowBen,
                    clientCS = @clientCS,
                    clientGenRelief = @clientGenRelief,
                    clientSSI = @clientSSI,
                    clientSSDI = @clientSSDI,
                    clientTANF = @clientTANF,
                    clientWorkComp = @clientWorkComp,
                    clientUnEmp = @clientUnEmp,
                    clientVetBen = @clientVetBen,
                    clientStDis = @clientStDis,
                    clientInherit = @clientInherit,
                    clientOtherInc = @clientOtherInc,
                    totalMonthlyIncome = @totalMonthlyIncome,
                    
                    -- Payee Information
                    payeeChoice = @payeeChoice,
                    payeeName = @payeeName,
                    payeePhone = @payeePhone,
                    payeeRelationship = @payeeRelationship,
                    
                    -- Employment History
                    clientBeenEmployed = @clientBeenEmployed,
                    clientEmpIntr = @clientEmpIntr,
                    clientEmployed = @clientEmployed,
                    clientEmployer = @clientEmployer,
                    lastEmploymentDate = @lastEmploymentDate,
                    employmentBarriers = @employmentBarriers,
                    
                    -- Debt Information
                    clientDebt = @clientDebt,
                    clientDebtAmount = @clientDebtAmount,
                    clientBankrupt = @clientBankrupt,
                    bankruptcyDate = @bankruptcyDate,
                    
                    -- Housing Information
                    clientGovHousingApp = @clientGovHousingApp,
                    clientGovHousingLive = @clientGovHousingLive,
                    clientPastRenter = @clientPastRenter,
                    clientPastRenterLate = @clientPastRenterLate,
                    clientEvicted = @clientEvicted,
                    clientLandlordProb = @clientLandlordProb,
                    clientUtilityBill = @clientUtilityBill,
                    clientCreditRating = @clientCreditRating,
                    clientHousingSummary = @clientHousingSummary,
                    housingStability = @housingStability,
                    
                    -- Functional Assessment
                    clientAmbulatory = @clientAmbulatory,
                    clientAmbulatorySummary = @clientAmbulatorySummary,
                    
                    -- Activities of Daily Living
                    clientEating = @clientEating,
                    clientBathing = @clientBathing,
                    clientBrushing = @clientBrushing,
                    clientToileting = @clientToileting,
                    clientCooking = @clientCooking,
                    clientCleaning = @clientCleaning,
                    clientLaundry = @clientLaundry,
                    clientTakingMeds = @clientTakingMeds,
                    clientFunctionalAssist = @clientFunctionalAssist,
                    adlScore = @adlScore,
                    adlPercentage = @adlPercentage,
                    
                    -- Communication & Language
                    clientCommunication = @clientCommunication,
                    primaryLanguage = @primaryLanguage,
                    interpreterNeeded = @interpreterNeeded,
                    communicationBarriers = @communicationBarriers,
                    
                    -- Assessment Summary
                    clientBioSocialNotes = @clientBioSocialNotes,
                    riskFactors = @riskFactors,
                    strengths = @strengths,
                    recommendedServices = @recommendedServices,
                    
                    -- Completion Status
                    completionPercentage = @completionPercentage,
                    updatedBy = @updatedBy,
                    updatedAt = GETDATE()
                WHERE bioSocialID = @bioSocialID
            `;
            
            await pool.request()
                .input('bioSocialID', sql.VarChar, bioSocialID)
                // Financial inputs
                .input('clientCalWorks', sql.VarChar, bioSocialData.clientCalWorks || "0.00")
                .input('clientEmployment', sql.VarChar, bioSocialData.clientEmployment || "0.00")
                .input('clientFoodStamps', sql.VarChar, bioSocialData.clientFoodStamps || "0.00")
                .input('clientWidowBen', sql.VarChar, bioSocialData.clientWidowBen || "0.00")
                .input('clientCS', sql.VarChar, bioSocialData.clientCS || "0.00")
                .input('clientGenRelief', sql.VarChar, bioSocialData.clientGenRelief || "0.00")
                .input('clientSSI', sql.VarChar, bioSocialData.clientSSI || "0.00")
                .input('clientSSDI', sql.VarChar, bioSocialData.clientSSDI || "0.00")
                .input('clientTANF', sql.VarChar, bioSocialData.clientTANF || "0.00")
                .input('clientWorkComp', sql.VarChar, bioSocialData.clientWorkComp || "0.00")
                .input('clientUnEmp', sql.VarChar, bioSocialData.clientUnEmp || "0.00")
                .input('clientVetBen', sql.VarChar, bioSocialData.clientVetBen || "0.00")
                .input('clientStDis', sql.VarChar, bioSocialData.clientStDis || "0.00")
                .input('clientInherit', sql.VarChar, bioSocialData.clientInherit || "0.00")
                .input('clientOtherInc', sql.VarChar, bioSocialData.clientOtherInc || "0.00")
                .input('totalMonthlyIncome', sql.Decimal, totalIncome)
                // Payee inputs
                .input('payeeChoice', sql.VarChar, bioSocialData.payeeChoice)
                .input('payeeName', sql.VarChar, bioSocialData.payeeName)
                .input('payeePhone', sql.VarChar, bioSocialData.payeePhone)
                .input('payeeRelationship', sql.VarChar, bioSocialData.payeeRelationship)
                // Employment inputs
                .input('clientBeenEmployed', sql.VarChar, bioSocialData.clientBeenEmployed)
                .input('clientEmpIntr', sql.VarChar, bioSocialData.clientEmpIntr)
                .input('clientEmployed', sql.VarChar, bioSocialData.clientEmployed)
                .input('clientEmployer', sql.VarChar, bioSocialData.clientEmployer)
                .input('lastEmploymentDate', sql.DateTime, bioSocialData.lastEmploymentDate)
                .input('employmentBarriers', sql.NVarChar, bioSocialData.employmentBarriers)
                // Debt inputs
                .input('clientDebt', sql.VarChar, bioSocialData.clientDebt)
                .input('clientDebtAmount', sql.VarChar, bioSocialData.clientDebtAmount)
                .input('clientBankrupt', sql.VarChar, bioSocialData.clientBankrupt)
                .input('bankruptcyDate', sql.DateTime, bioSocialData.bankruptcyDate)
                // Housing inputs
                .input('clientGovHousingApp', sql.NVarChar, Array.isArray(bioSocialData.clientGovHousingApp) ? bioSocialData.clientGovHousingApp.join(', ') : bioSocialData.clientGovHousingApp)
                .input('clientGovHousingLive', sql.NVarChar, Array.isArray(bioSocialData.clientGovHousingLive) ? bioSocialData.clientGovHousingLive.join(', ') : bioSocialData.clientGovHousingLive)
                .input('clientPastRenter', sql.VarChar, bioSocialData.clientPastRenter)
                .input('clientPastRenterLate', sql.VarChar, bioSocialData.clientPastRenterLate)
                .input('clientEvicted', sql.VarChar, bioSocialData.clientEvicted)
                .input('clientLandlordProb', sql.VarChar, bioSocialData.clientLandlordProb)
                .input('clientUtilityBill', sql.VarChar, bioSocialData.clientUtilityBill)
                .input('clientCreditRating', sql.VarChar, bioSocialData.clientCreditRating)
                .input('clientHousingSummary', sql.NVarChar, bioSocialData.clientHousingSummary)
                .input('housingStability', sql.VarChar, bioSocialData.housingStability || 'Unknown')
                // Functional inputs
                .input('clientAmbulatory', sql.NVarChar, Array.isArray(bioSocialData.clientAmbulatory) ? bioSocialData.clientAmbulatory.join(', ') : bioSocialData.clientAmbulatory)
                .input('clientAmbulatorySummary', sql.NVarChar, bioSocialData.clientAmbulatorySummary)
                // ADL inputs
                .input('clientEating', sql.VarChar, bioSocialData.clientEating)
                .input('clientBathing', sql.VarChar, bioSocialData.clientBathing)
                .input('clientBrushing', sql.VarChar, bioSocialData.clientBrushing)
                .input('clientToileting', sql.VarChar, bioSocialData.clientToileting)
                .input('clientCooking', sql.VarChar, bioSocialData.clientCooking)
                .input('clientCleaning', sql.VarChar, bioSocialData.clientCleaning)
                .input('clientLaundry', sql.VarChar, bioSocialData.clientLaundry)
                .input('clientTakingMeds', sql.VarChar, bioSocialData.clientTakingMeds)
                .input('clientFunctionalAssist', sql.NVarChar, bioSocialData.clientFunctionalAssist)
                .input('adlScore', sql.Int, adlMetrics.adlScore)
                .input('adlPercentage', sql.Decimal, adlMetrics.adlPercentage)
                // Communication inputs
                .input('clientCommunication', sql.NVarChar, Array.isArray(bioSocialData.clientCommunication) ? bioSocialData.clientCommunication.join(', ') : bioSocialData.clientCommunication)
                .input('primaryLanguage', sql.VarChar, bioSocialData.primaryLanguage || 'English')
                .input('interpreterNeeded', sql.Bit, bioSocialData.interpreterNeeded || false)
                .input('communicationBarriers', sql.NVarChar, bioSocialData.communicationBarriers)
                // Summary inputs
                .input('clientBioSocialNotes', sql.NVarChar, bioSocialData.clientBioSocialNotes)
                .input('riskFactors', sql.NVarChar, bioSocialData.riskFactors)
                .input('strengths', sql.NVarChar, bioSocialData.strengths)
                .input('recommendedServices', sql.NVarChar, bioSocialData.recommendedServices)
                .input('completionPercentage', sql.Decimal, completionPercentage)
                .input('updatedBy', sql.VarChar, userEmail)
                .query(updateQuery);

        } else {
            // Create new bio-social assessment
            bioSocialID = `BS-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
            operation = 'INSERT';
            
            // Get or create assessment ID
            let assessmentID = bioSocialData.assessmentID;
            if (!assessmentID) {
                // Get latest assessment for this client
                const assessmentQuery = `
                    SELECT TOP 1 assessmentID FROM AssessmentCarePlans 
                    WHERE clientID = @clientID 
                    ORDER BY createdAt DESC
                `;
                const assessmentResult = await pool.request()
                    .input('clientID', sql.VarChar, clientID)
                    .query(assessmentQuery);
                
                assessmentID = assessmentResult.recordset[0]?.assessmentID;
            }
            
            const insertQuery = `
                INSERT INTO BioSocialAssessment (
                    bioSocialID, clientID, assessmentID,
                    clientCalWorks, clientEmployment, clientFoodStamps, clientWidowBen, clientCS,
                    clientGenRelief, clientSSI, clientSSDI, clientTANF, clientWorkComp, clientUnEmp,
                    clientVetBen, clientStDis, clientInherit, clientOtherInc, totalMonthlyIncome,
                    payeeChoice, payeeName, payeePhone, payeeRelationship,
                    clientBeenEmployed, clientEmpIntr, clientEmployed, clientEmployer,
                    lastEmploymentDate, employmentBarriers,
                    clientDebt, clientDebtAmount, clientBankrupt, bankruptcyDate,
                    clientGovHousingApp, clientGovHousingLive, clientPastRenter, clientPastRenterLate,
                    clientEvicted, clientLandlordProb, clientUtilityBill, clientCreditRating,
                    clientHousingSummary, housingStability,
                    clientAmbulatory, clientAmbulatorySummary,
                    clientEating, clientBathing, clientBrushing, clientToileting,
                    clientCooking, clientCleaning, clientLaundry, clientTakingMeds,
                    clientFunctionalAssist, adlScore, adlPercentage,
                    clientCommunication, primaryLanguage, interpreterNeeded, communicationBarriers,
                    clientBioSocialNotes, riskFactors, strengths, recommendedServices,
                    completionStatus, completionPercentage, createdBy, createdAt
                ) VALUES (
                    @bioSocialID, @clientID, @assessmentID,
                    @clientCalWorks, @clientEmployment, @clientFoodStamps, @clientWidowBen, @clientCS,
                    @clientGenRelief, @clientSSI, @clientSSDI, @clientTANF, @clientWorkComp, @clientUnEmp,
                    @clientVetBen, @clientStDis, @clientInherit, @clientOtherInc, @totalMonthlyIncome,
                    @payeeChoice, @payeeName, @payeePhone, @payeeRelationship,
                    @clientBeenEmployed, @clientEmpIntr, @clientEmployed, @clientEmployer,
                    @lastEmploymentDate, @employmentBarriers,
                    @clientDebt, @clientDebtAmount, @clientBankrupt, @bankruptcyDate,
                    @clientGovHousingApp, @clientGovHousingLive, @clientPastRenter, @clientPastRenterLate,
                    @clientEvicted, @clientLandlordProb, @clientUtilityBill, @clientCreditRating,
                    @clientHousingSummary, @housingStability,
                    @clientAmbulatory, @clientAmbulatorySummary,
                    @clientEating, @clientBathing, @clientBrushing, @clientToileting,
                    @clientCooking, @clientCleaning, @clientLaundry, @clientTakingMeds,
                    @clientFunctionalAssist, @adlScore, @adlPercentage,
                    @clientCommunication, @primaryLanguage, @interpreterNeeded, @communicationBarriers,
                    @clientBioSocialNotes, @riskFactors, @strengths, @recommendedServices,
                    @completionStatus, @completionPercentage, @createdBy, GETDATE()
                )
            `;
            
            await pool.request()
                .input('bioSocialID', sql.VarChar, bioSocialID)
                .input('clientID', sql.VarChar, clientID)
                .input('assessmentID', sql.VarChar, assessmentID)
                // Add all the same inputs as in the update query...
                // (I'll include the same inputs as above for brevity)
                .input('clientCalWorks', sql.VarChar, bioSocialData.clientCalWorks || "0.00")
                .input('clientEmployment', sql.VarChar, bioSocialData.clientEmployment || "0.00")
                .input('clientFoodStamps', sql.VarChar, bioSocialData.clientFoodStamps || "0.00")
                .input('clientWidowBen', sql.VarChar, bioSocialData.clientWidowBen || "0.00")
                .input('clientCS', sql.VarChar, bioSocialData.clientCS || "0.00")
                .input('clientGenRelief', sql.VarChar, bioSocialData.clientGenRelief || "0.00")
                .input('clientSSI', sql.VarChar, bioSocialData.clientSSI || "0.00")
                .input('clientSSDI', sql.VarChar, bioSocialData.clientSSDI || "0.00")
                .input('clientTANF', sql.VarChar, bioSocialData.clientTANF || "0.00")
                .input('clientWorkComp', sql.VarChar, bioSocialData.clientWorkComp || "0.00")
                .input('clientUnEmp', sql.VarChar, bioSocialData.clientUnEmp || "0.00")
                .input('clientVetBen', sql.VarChar, bioSocialData.clientVetBen || "0.00")
                .input('clientStDis', sql.VarChar, bioSocialData.clientStDis || "0.00")
                .input('clientInherit', sql.VarChar, bioSocialData.clientInherit || "0.00")
                .input('clientOtherInc', sql.VarChar, bioSocialData.clientOtherInc || "0.00")
                .input('totalMonthlyIncome', sql.Decimal, totalIncome)
                .input('payeeChoice', sql.VarChar, bioSocialData.payeeChoice)
                .input('payeeName', sql.VarChar, bioSocialData.payeeName)
                .input('payeePhone', sql.VarChar, bioSocialData.payeePhone)
                .input('payeeRelationship', sql.VarChar, bioSocialData.payeeRelationship)
                .input('clientBeenEmployed', sql.VarChar, bioSocialData.clientBeenEmployed)
                .input('clientEmpIntr', sql.VarChar, bioSocialData.clientEmpIntr)
                .input('clientEmployed', sql.VarChar, bioSocialData.clientEmployed)
                .input('clientEmployer', sql.VarChar, bioSocialData.clientEmployer)
                .input('lastEmploymentDate', sql.DateTime, bioSocialData.lastEmploymentDate)
                .input('employmentBarriers', sql.NVarChar, bioSocialData.employmentBarriers)
                .input('clientDebt', sql.VarChar, bioSocialData.clientDebt)
                .input('clientDebtAmount', sql.VarChar, bioSocialData.clientDebtAmount)
                .input('clientBankrupt', sql.VarChar, bioSocialData.clientBankrupt)
                .input('bankruptcyDate', sql.DateTime, bioSocialData.bankruptcyDate)
                .input('clientGovHousingApp', sql.NVarChar, Array.isArray(bioSocialData.clientGovHousingApp) ? bioSocialData.clientGovHousingApp.join(', ') : bioSocialData.clientGovHousingApp)
                .input('clientGovHousingLive', sql.NVarChar, Array.isArray(bioSocialData.clientGovHousingLive) ? bioSocialData.clientGovHousingLive.join(', ') : bioSocialData.clientGovHousingLive)
                .input('clientPastRenter', sql.VarChar, bioSocialData.clientPastRenter)
                .input('clientPastRenterLate', sql.VarChar, bioSocialData.clientPastRenterLate)
                .input('clientEvicted', sql.VarChar, bioSocialData.clientEvicted)
                .input('clientLandlordProb', sql.VarChar, bioSocialData.clientLandlordProb)
                .input('clientUtilityBill', sql.VarChar, bioSocialData.clientUtilityBill)
                .input('clientCreditRating', sql.VarChar, bioSocialData.clientCreditRating)
                .input('clientHousingSummary', sql.NVarChar, bioSocialData.clientHousingSummary)
                .input('housingStability', sql.VarChar, bioSocialData.housingStability || 'Unknown')
                .input('clientAmbulatory', sql.NVarChar, Array.isArray(bioSocialData.clientAmbulatory) ? bioSocialData.clientAmbulatory.join(', ') : bioSocialData.clientAmbulatory)
                .input('clientAmbulatorySummary', sql.NVarChar, bioSocialData.clientAmbulatorySummary)
                .input('clientEating', sql.VarChar, bioSocialData.clientEating)
                .input('clientBathing', sql.VarChar, bioSocialData.clientBathing)
                .input('clientBrushing', sql.VarChar, bioSocialData.clientBrushing)
                .input('clientToileting', sql.VarChar, bioSocialData.clientToileting)
                .input('clientCooking', sql.VarChar, bioSocialData.clientCooking)
                .input('clientCleaning', sql.VarChar, bioSocialData.clientCleaning)
                .input('clientLaundry', sql.VarChar, bioSocialData.clientLaundry)
                .input('clientTakingMeds', sql.VarChar, bioSocialData.clientTakingMeds)
                .input('clientFunctionalAssist', sql.NVarChar, bioSocialData.clientFunctionalAssist)
                .input('adlScore', sql.Int, adlMetrics.adlScore)
                .input('adlPercentage', sql.Decimal, adlMetrics.adlPercentage)
                .input('clientCommunication', sql.NVarChar, Array.isArray(bioSocialData.clientCommunication) ? bioSocialData.clientCommunication.join(', ') : bioSocialData.clientCommunication)
                .input('primaryLanguage', sql.VarChar, bioSocialData.primaryLanguage || 'English')
                .input('interpreterNeeded', sql.Bit, bioSocialData.interpreterNeeded || false)
                .input('communicationBarriers', sql.NVarChar, bioSocialData.communicationBarriers)
                .input('clientBioSocialNotes', sql.NVarChar, bioSocialData.clientBioSocialNotes)
                .input('riskFactors', sql.NVarChar, bioSocialData.riskFactors)
                .input('strengths', sql.NVarChar, bioSocialData.strengths)
                .input('recommendedServices', sql.NVarChar, bioSocialData.recommendedServices)
                .input('completionStatus', sql.VarChar, completionPercentage === 100 ? 'Complete' : 'In Progress')
                .input('completionPercentage', sql.Decimal, completionPercentage)
                .input('createdBy', sql.VarChar, userEmail)
                .query(insertQuery);
        }

        await logUserAction(req.user, `${operation}_BIO_SOCIAL_DATA`, {
            clientID,
            bioSocialID,
            operation,
            completionPercentage
        });

        res.json({ 
            success: true, 
            bioSocialID,
            operation,
            totalIncome,
            adlMetrics,
            completionPercentage,
            message: `Bio-Social assessment ${operation === 'INSERT' ? 'created' : 'updated'} successfully` 
        });

    } catch (error) {
        console.error('Error saving bio-social data:', error);
        await logUserAction(req.user, 'SAVE_BIO_SOCIAL_DATA_ERROR', {
            clientID,
            error: error.message
        });
        res.status(500).json({ 
            error: 'Failed to save bio-social data',
            details: error.message 
        });
    }
});

// 🔸 PUT /api/bio-social/:clientID/complete - Complete bio-social assessment
router.put('/:clientID/complete', async (req, res) => {
    const { clientID } = req.params;
    const { timeSpent, notes } = req.body;
    
    try {
        const pool = await getDbConnection();
        const userEmail = req.user?.email || 'system@example.com';
        
        const completeQuery = `
            UPDATE BioSocialAssessment SET
                completionStatus = 'Complete',
                completionPercentage = 100,
                timeSpent = @timeSpent,
                clientBioSocialNotes = COALESCE(@notes, clientBioSocialNotes),
                completedBy = @completedBy,
                completedAt = GETDATE(),
                updatedBy = @updatedBy,
                updatedAt = GETDATE()
            WHERE clientID = @clientID
        `;
        
        await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .input('timeSpent', sql.Decimal, timeSpent || 0)
            .input('notes', sql.NVarChar, notes)
            .input('completedBy', sql.VarChar, userEmail)
            .input('updatedBy', sql.VarChar, userEmail)
            .query(completeQuery);

        await logUserAction(req.user, 'COMPLETE_BIO_SOCIAL_ASSESSMENT', {
            clientID,
            timeSpent
        });

        res.json({ 
            success: true, 
            message: 'Bio-Social assessment completed successfully',
            completedAt: new Date().toISOString(),
            completedBy: userEmail
        });

    } catch (error) {
        console.error('Error completing bio-social assessment:', error);
        res.status(500).json({ 
            error: 'Failed to complete bio-social assessment',
            details: error.message 
        });
    }
});

// 🔸 GET /api/bio-social/:clientID/financial-summary - Get financial summary
router.get('/:clientID/financial-summary', async (req, res) => {
    const { clientID } = req.params;
    
    try {
        const pool = await getDbConnection();
        
        const summaryQuery = `
            SELECT 
                bs.totalMonthlyIncome,
                bs.clientCalWorks,
                bs.clientEmployment,
                bs.clientFoodStamps,
                bs.clientGenRelief,
                bs.clientSSI,
                bs.clientSSDI,
                bs.clientDebt,
                bs.clientDebtAmount,
                bs.clientBankrupt,
                bs.payeeChoice,
                bs.payeeName,
                -- Calculate income categories
                (CAST(bs.clientSSI AS DECIMAL) + CAST(bs.clientSSDI AS DECIMAL)) as disabilityIncome,
                (CAST(bs.clientCalWorks AS DECIMAL) + CAST(bs.clientTANF AS DECIMAL) + CAST(bs.clientGenRelief AS DECIMAL)) as assistanceIncome,
                (CAST(bs.clientEmployment AS DECIMAL) + CAST(bs.clientWorkComp AS DECIMAL) + CAST(bs.clientUnEmp AS DECIMAL)) as employmentIncome,
                (CAST(bs.clientFoodStamps AS DECIMAL)) as foodAssistance,
                -- Financial stability indicators
                CASE 
                    WHEN bs.totalMonthlyIncome < 1000 THEN 'High Risk'
                    WHEN bs.totalMonthlyIncome < 2000 THEN 'Moderate Risk'
                    ELSE 'Stable'
                END as financialStability,
                CASE 
                    WHEN bs.clientDebt = 'Yes' THEN 1 
                    ELSE 0 
                END as hasDebt,
                CASE 
                    WHEN bs.payeeChoice = 'Yes' THEN 1 
                    ELSE 0 
                END as hasPayee
            FROM BioSocialAssessment bs
            WHERE bs.clientID = @clientID
            ORDER BY bs.createdAt DESC
        `;
        
        const result = await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .query(summaryQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'No financial data found for this client' 
            });
        }

        const data = result.recordset[0];
        
        const financialSummary = {
            totalMonthlyIncome: data.totalMonthlyIncome || 0,
            incomeBreakdown: {
                disabilityIncome: data.disabilityIncome || 0,
                assistanceIncome: data.assistanceIncome || 0,
                employmentIncome: data.employmentIncome || 0,
                foodAssistance: data.foodAssistance || 0
            },
            riskFactors: {
                financialStability: data.financialStability,
                hasDebt: data.hasDebt === 1,
                debtAmount: data.clientDebtAmount || "0.00",
                hasPayee: data.hasPayee === 1,
                payeeName: data.payeeName
            },
            recommendations: [],
            lastUpdated: data.updatedAt || data.createdAt
        };

        // Generate recommendations based on financial status
        if (data.totalMonthlyIncome < 1000) {
            financialSummary.recommendations.push('Consider additional benefit applications');
            financialSummary.recommendations.push('Financial counseling recommended');
        }
        if (data.hasDebt === 1) {
            financialSummary.recommendations.push('Debt management counseling');
        }
        if (data.employmentIncome === 0) {
            financialSummary.recommendations.push('Vocational rehabilitation assessment');
        }

        res.json(financialSummary);

    } catch (error) {
        console.error('Error fetching financial summary:', error);
        res.status(500).json({ 
            error: 'Failed to fetch financial summary',
            details: error.message 
        });
    }
});

// 🔸 POST /api/bio-social/calculate-adl - Calculate ADL score
router.post('/calculate-adl', async (req, res) => {
    try {
        const adlData = req.body;
        const adlMetrics = calculateADLScore(adlData);

        await logUserAction(req.user, 'CALCULATE_ADL_SCORE', {
            adlScore: adlMetrics.adlScore,
            adlPercentage: adlMetrics.adlPercentage
        });

        res.json(adlMetrics);

    } catch (error) {
        console.error('Error calculating ADL score:', error);
        res.status(500).json({ 
            error: 'Failed to calculate ADL score',
            details: error.message 
        });
    }
});

// 🔸 GET /api/bio-social/:clientID/summary - Generate comprehensive summary
router.get('/:clientID/summary', async (req, res) => {
    const { clientID } = req.params;
    
    try {
        const pool = await getDbConnection();
        
        const summaryQuery = `
            SELECT 
                bs.*,
                -- Calculate derived metrics
                (CAST(bs.clientSSI AS DECIMAL) + CAST(bs.clientSSDI AS DECIMAL) + 
                 CAST(bs.clientCalWorks AS DECIMAL) + CAST(bs.clientGenRelief AS DECIMAL) + 
                 CAST(bs.clientEmployment AS DECIMAL)) as primaryIncome,
                
                CASE 
                    WHEN bs.clientEmployed = 'Yes' THEN 'Employed'
                    WHEN bs.clientEmpIntr = 'Yes' THEN 'Seeking Employment'
                    ELSE 'Not Seeking Employment'
                END as employmentStatus,
                
                CASE 
                    WHEN bs.clientEvicted = 'Yes' OR bs.clientLandlordProb = 'Yes' THEN 'Housing Risk'
                    WHEN bs.clientPastRenter = 'Yes' AND bs.clientPastRenterLate = 'No' THEN 'Stable Housing History'
                    ELSE 'Unknown Housing Risk'
                END as housingRisk
                
            FROM BioSocialAssessment bs
            WHERE bs.clientID = @clientID
            ORDER BY bs.createdAt DESC
        `;
        
        const result = await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .query(summaryQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'No bio-social assessment found for this client' 
            });
        }

        const data = result.recordset[0];
        
        const summary = {
            assessmentOverview: {
                completionStatus: data.completionStatus,
                completionPercentage: data.completionPercentage,
                timeSpent: data.timeSpent,
                assessedBy: data.createdBy,
                assessmentDate: data.createdAt
            },
            financialProfile: {
                totalMonthlyIncome: data.totalMonthlyIncome,
                primaryIncomeSource: data.primaryIncome > 0 ? 'Benefits' : 'Other',
                hasPayee: data.payeeChoice === 'Yes',
                hasDebt: data.clientDebt === 'Yes',
                financialStability: data.totalMonthlyIncome >= 2000 ? 'Stable' : 
                                  data.totalMonthlyIncome >= 1000 ? 'Moderate' : 'At Risk'
            },
            employmentProfile: {
                currentlyEmployed: data.clientEmployed === 'Yes',
                employmentInterest: data.clientEmpIntr === 'Yes',
                employmentHistory: data.clientBeenEmployed === 'Yes',
                lastEmployer: data.clientEmployer,
                status: data.employmentStatus
            },
            housingProfile: {
                hasRentalHistory: data.clientPastRenter === 'Yes',
                evictionHistory: data.clientEvicted === 'Yes',
                landlordProblems: data.clientLandlordProb === 'Yes',
                outstandingUtilities: data.clientUtilityBill === 'Yes',
                creditRating: data.clientCreditRating,
                riskLevel: data.housingRisk,
                stability: data.housingStability
            },
            functionalProfile: {
                adlScore: data.adlScore,
                adlPercentage: data.adlPercentage,
                independenceLevel: data.adlPercentage >= 90 ? 'Highly Independent' :
                                 data.adlPercentage >= 75 ? 'Mostly Independent' :
                                 data.adlPercentage >= 50 ? 'Partially Independent' : 'Needs Support',
                mobilityStatus: data.clientAmbulatory,
                assistanceNeeds: data.clientFunctionalAssist
            },
            communicationProfile: {
                primaryLanguage: data.primaryLanguage,
                communicationMethods: data.clientCommunication,
                interpreterNeeded: data.interpreterNeeded,
                barriers: data.communicationBarriers
            },
            riskFactors: data.riskFactors ? data.riskFactors.split(',').map(r => r.trim()) : [],
            strengths: data.strengths ? data.strengths.split(',').map(s => s.trim()) : [],
            recommendations: data.recommendedServices ? data.recommendedServices.split(',').map(r => r.trim()) : [],
            
            overallAssessment: {
                riskLevel: 'Medium', // Could be calculated based on multiple factors
                priorityAreas: [],
                nextSteps: [],
                followUpRecommended: true
            }
        };

        // Generate priority areas based on assessment
        if (summary.financialProfile.financialStability === 'At Risk') {
            summary.overallAssessment.priorityAreas.push('Financial Stability');
        }
        if (summary.housingProfile.riskLevel === 'Housing Risk') {
            summary.overallAssessment.priorityAreas.push('Housing Stability');
        }
        if (summary.functionalProfile.independenceLevel === 'Needs Support') {
            summary.overallAssessment.priorityAreas.push('Functional Support');
        }

        await logUserAction(req.user, 'GENERATE_BIO_SOCIAL_SUMMARY', {
            clientID,
            completionPercentage: data.completionPercentage
        });

        res.json(summary);

    } catch (error) {
        console.error('Error generating bio-social summary:', error);
        res.status(500).json({ 
            error: 'Failed to generate bio-social summary',
            details: error.message 
        });
    }
});

module.exports = router;