import {sendMail} from "../utils/mailUtil";
import {mailMessages} from "../constants/mailMessages";
import {generateOTP} from "../utils/otpUtil";
import { logger } from "../utils/logger";

export const sendNewAccountConfirmationEmail = async (userEmail: string) => {
    const generatedOTP = generateOTP();
    const { subject, html, text } = mailMessages.CONFIRM_NEW_ACCOUNT;
    const HTML = html(generatedOTP);
    const TEXT = text(generatedOTP);
    await sendMail(userEmail, subject, HTML, TEXT);
    logger.info(`[MAIL-SERVICES] [ACCOUNT CONFIRMATION] user: ${userEmail}, subject: ${subject}`);
    return generatedOTP;
};