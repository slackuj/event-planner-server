export const httpCodes = {
    REQUEST_SUCCESSFUL: {
        statusCode: 200,
        message: "Request has succeeded",
        code: "SUCCESS"
    },
    RESOURCE_CREATED: {
        statusCode: 201,
        message: "Resource created successfully",
        code: "CREATED"
    },
    BAD_REQUEST: {
        statusCode: 400,
        message: "Bad request parameters",
        code: "BAD_REQUEST"
    },
    UNAUTHORIZED: {
        statusCode: 401,
        message: "Unauthorized access",
        code: "UNAUTHORIZED"
    },
    FORBIDDEN: {
        statusCode: 403,
        message: "Permission denied",
        code: "FORBIDDEN"
    },
    NOT_FOUND: {
        statusCode: 404,
        message: "Requested resource not found",
        code: "NOT_FOUND"
    },
    INTERNAL_SERVER_ERROR: {
        statusCode: 500,
        message: "Internal server error",
        code: "INTERNAL_SERVER_ERROR"
    },
    NO_CONTENT: {
        statusCode: 204,
        message: null,
        code: "NO_CONTENT"
    },
    CONFLICT: {
        statusCode: 409,
        message: "Conflict",
        code: "CONFLICT"
    }
};