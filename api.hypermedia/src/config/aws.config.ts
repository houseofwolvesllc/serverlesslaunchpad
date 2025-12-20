import { Environment } from '@houseofwolves/serverlesslaunchpad.core';

export interface MotoConfig {
  endpoint: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  forcePathStyle?: boolean;
}

export interface AWSConfig {
  region: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  forcePathStyle?: boolean;
}

export function getMotoConfig(): MotoConfig | undefined {
  if (process.env.NODE_ENV !== Environment.Development) {
    return undefined;
  }

  return {
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:5555',
    region: process.env.AWS_DEFAULT_REGION || 'us-west-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'testing',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'testing'
    },
    forcePathStyle: true // Required for S3 Moto compatibility
  };
}

export function getAWSConfig(additionalConfig?: any): AWSConfig {
  const motoConfig = getMotoConfig();
  
  const config: AWSConfig = {
    region: motoConfig?.region || process.env.AWS_DEFAULT_REGION || 'us-west-2',
    ...additionalConfig
  };

  if (motoConfig) {
    config.endpoint = motoConfig.endpoint;
    config.credentials = motoConfig.credentials;
    config.forcePathStyle = motoConfig.forcePathStyle;
  }

  return config;
}

export function createAWSClient<T>(
  ClientClass: new (config: any) => T,
  additionalConfig?: any
): T {
  const config = getAWSConfig(additionalConfig);
  return new ClientClass(config);
}

export function isMoto(): boolean {
  return getMotoConfig() !== undefined;
}

export function getServiceEndpoint(_service: string): string | undefined {
  const motoConfig = getMotoConfig();
  if (motoConfig) {
    return motoConfig.endpoint;
  }
  return undefined;
}