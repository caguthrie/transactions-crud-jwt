module.exports = {
    projectId: 'tix-accountant-2',
    keyFilename: './key.json',
    bucketName: '[your Google Cloud Storage bucket name]',
    cookieSecret: '[cookie signing key]',
    oauth2: {
        clientId: '[Client ID for web application credentials]',
        clientSecret: '[Client Secret for web application credentials]',
        redirectUrl: process.env.REDIRECT_URL || 'http://localhost:8080/oauth2callback'
    }
};
