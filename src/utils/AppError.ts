interface HttpCodeConfig {
    statusCode: number;
    message: string | null;
    code: string;
}

export class AppError extends Error {
    public readonly status: number;
    public readonly code: string;
    public readonly details: any;

    constructor(message: string, httpCodeConfig: HttpCodeConfig, details: any = null) {
        super(message);
        this.status = httpCodeConfig.statusCode;
        this.code = httpCodeConfig.code;
        this.details = details;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}