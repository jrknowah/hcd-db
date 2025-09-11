// middleware/errorHandler.js
const handleError = (res, error, operation, clientID = null) => {
    console.error(`❌ Error in ${operation}:`, error);
    
    const errorResponse = {
        success: false,
        error: `Failed to ${operation}`,
        details: error.message,
        timestamp: new Date().toISOString(),
        operation
    };
    
    if (clientID) errorResponse.clientID = clientID;
    
    return res.status(500).json(errorResponse);
};

// Unified Success Response
const handleSuccess = (res, data, operation, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        operation,
        timestamp: new Date().toISOString()
    });
};