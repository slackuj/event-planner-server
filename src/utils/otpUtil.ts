import crypto from "crypto";

export const generateOTP = () => {
    return crypto.randomInt(100000, 1000000).toString();
}

export const otpExpiryDate = () => (new Date(Date.now() + 5 * 60 * 1000));// 5 minutes);