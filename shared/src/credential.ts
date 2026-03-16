export interface Credential {
  id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface CredentialWithData extends Credential {
  data: Record<string, unknown>;
}

export type CredentialType =
  | 'smtp'
  | 'googleOAuth2'
  | 'slackApi'
  | 'twitterOAuth2'
  | 'httpBasicAuth'
  | 'httpHeaderAuth'
  | 'httpBearerAuth';

export const CREDENTIAL_TYPE_CONFIGS: Record<string, { displayName: string; fields: Array<{ key: string; label: string; type: 'string' | 'password'; required: boolean }> }> = {
  smtp: {
    displayName: 'SMTP',
    fields: [
      { key: 'host', label: 'SMTP Host', type: 'string', required: true },
      { key: 'port', label: 'Port', type: 'string', required: true },
      { key: 'user', label: 'Username', type: 'string', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'secure', label: 'Use TLS', type: 'string', required: false },
    ],
  },
  googleOAuth2: {
    displayName: 'Google OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
    ],
  },
  slackApi: {
    displayName: 'Slack API',
    fields: [
      { key: 'accessToken', label: 'Bot Token', type: 'password', required: true },
    ],
  },
  twitterOAuth2: {
    displayName: 'Twitter OAuth2',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', required: true },
    ],
  },
  httpBasicAuth: {
    displayName: 'HTTP Basic Auth',
    fields: [
      { key: 'user', label: 'Username', type: 'string', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  httpHeaderAuth: {
    displayName: 'HTTP Header Auth',
    fields: [
      { key: 'name', label: 'Header Name', type: 'string', required: true },
      { key: 'value', label: 'Header Value', type: 'password', required: true },
    ],
  },
  httpBearerAuth: {
    displayName: 'HTTP Bearer Auth',
    fields: [
      { key: 'token', label: 'Bearer Token', type: 'password', required: true },
    ],
  },
};
