const awsConfig = {
    Auth: {
        Cognito: {
            region: 'us-west-2',
            userPoolId: 'us-west-2_VOxm70rRW',
            userPoolWebClientId: '23p1ea97ackt7kfni4buirgmao',
            loginWith: {
                oauth: {
                    domain: 'https://gcommerce.auth.us-west-2.amazoncognito.com',
                    scope: ['email', 'openid', 'profile'],
                    redirectSignIn: 'http://localhost:5174/',
                    redirectSignOut: 'http://localhost:5174/',
                    responseType: 'code',
                },
                username: 'true',
                email: 'false',
                phone: 'false',
            },
        },
    },
};

export default awsConfig;
