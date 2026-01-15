export default {
  providers: [
    {
      domain: process.env.COGNITO_DOMAIN!,
      applicationID: process.env.COGNITO_CLIENT_ID!,
    },
  ],
};
