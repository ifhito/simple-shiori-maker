import type {
  DecryptApiRequest,
  DecryptApiResponse,
  EncryptApiRequest,
  EncryptApiResponse
} from '../../application/dto/shiori';
import type {
  LoadLinksApiRequest,
  LoadLinksApiResponse,
  SaveLinksApiRequest,
  SaveLinksApiResponse
} from '../../application/dto/userLinks';

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as { message?: string } & T;
  if (!response.ok) {
    throw new Error(body.message ?? 'API呼び出しに失敗しました');
  }
  return body;
}

export function createShioriApiClient(baseUrl = '') {
  return {
    async encrypt(request: EncryptApiRequest): Promise<EncryptApiResponse> {
      const response = await fetch(`${baseUrl}/api/encrypt`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      return parseResponse<EncryptApiResponse>(response);
    },

    async decrypt(request: DecryptApiRequest): Promise<DecryptApiResponse> {
      const response = await fetch(`${baseUrl}/api/decrypt`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      return parseResponse<DecryptApiResponse>(response);
    },

    async saveLinks(request: SaveLinksApiRequest): Promise<SaveLinksApiResponse> {
      const response = await fetch(`${baseUrl}/api/links/save`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      return parseResponse<SaveLinksApiResponse>(response);
    },

    async loadLinks(request: LoadLinksApiRequest): Promise<LoadLinksApiResponse> {
      const response = await fetch(`${baseUrl}/api/links/load`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      return parseResponse<LoadLinksApiResponse>(response);
    }
  };
}
