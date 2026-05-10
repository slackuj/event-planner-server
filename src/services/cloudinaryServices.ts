import cloudinary from "../configurations/cloudinary";

const apiSecret = cloudinary.config().api_secret;

// generates signature for upload widget
export const signature = () => {
    const timestamp = Math.round((new Date).getTime()/1000);

    return cloudinary.utils.api_sign_request({
        folder: 'assets',
        source: 'uw',
        timestamp: timestamp,
    }, apiSecret!);
};