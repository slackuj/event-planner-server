export const mailMessages = {
    CONFIRM_NEW_ACCOUNT: {
        subject: "OpenCourse Academy Confirmation Instructions",
        text: (otp: string) =>
            `Confirm your account\n\nPlease return to your browser window and enter this 6-digit code to confirm your account: ${otp}\n\nIf you did not make this change, please disregard this email.`,
        html: (otp: string) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h1 style="color: #333; font-size: 24px; text-align: center;">Confirm your account</h1>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #555; font-size: 16px; line-height: 1.5;">Please return to your browser window and enter this <strong>6-digit code</strong> to confirm your account.</p>
                <div style="background-color: #f4f4f9; padding: 15px; text-align: center; border-radius: 4px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2d5cf7;">${otp}</span>
                </div>
                <p style="font-size: 12px; color: #999; text-align: center;">If you did not make this change, please disregard this email.</p>
            </div>`,
    },
};