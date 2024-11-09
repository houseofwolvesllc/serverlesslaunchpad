import React from 'react';
import { Button, Group } from '@mantine/core';
import { IconBrandGoogle, IconBrandFacebook, IconBrandApple } from '@tabler/icons-react';
import { signInWithRedirect } from 'aws-amplify/auth';

export const SocialLoginButtons: React.FC = () => {
    const handleSocialLogin = async (provider: 'Google' | 'Facebook' | 'Apple') => {
        try {
            await signInWithRedirect({ provider });
            console.log(`${provider} login initiated`);
        } catch (error) {
            console.error(`${provider} login failed:`, error);
        }
    };

    return (
        <Group grow mb="md" mt="md">
            <Button
                onClick={() => handleSocialLogin('Google')}
                leftSection={<IconBrandGoogle stroke={1} fill="white" />}
            >
                Google
            </Button>
            <Button
                onClick={() => handleSocialLogin('Facebook')}
                leftSection={<IconBrandFacebook stroke={1} fill="white" />}
            >
                Facebook
            </Button>
            <Button onClick={() => handleSocialLogin('Apple')} leftSection={<IconBrandApple stroke={1} fill="white" />}>
                Apple
            </Button>
        </Group>
    );
};
