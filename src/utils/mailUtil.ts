import sgMail from '@sendgrid/mail';
import {config} from "../config";


sgMail.setApiKey(config.SENDGRID_API_KEY);
export const sendMail = async( to: string, subject: string, html: string, text: string ) => {
    const message = {
        to,
        from: config.GOOGLE_APP_EMAIL,
        subject,
        text,
        html,
    };
    try {
        await sgMail.send(message);
        console.log('Email sent!');
    } catch (error) {
        console.error('Error sending email');
    }
};