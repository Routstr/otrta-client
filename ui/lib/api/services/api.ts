import axios from 'axios';
import type { z } from 'zod';

const PRODUCTION = 'production';

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
}

export enum HTTPStatusCode {
  OK = 200,
}

// Nostr interfaces are defined in nostr-auth.ts

export default function api<Request, Response>({
  method,
  path,
  requestSchema,
  responseSchema,
}: {
  method: HTTPMethod;
  path: string;
  requestSchema: z.ZodType<Request>;
  responseSchema: z.ZodType<Response>;
}): (data: Request) => Promise<Response> {
  return function (requestData: Request) {
    requestSchema.parse(requestData);

    async function apiCall() {
      const auth_event = await window.nostr!.signEvent({
        kind: 27235,
        created_at: Math.floor(new Date().getTime() / 1000),
        content: 'application/json',
        tags: [
          ['u', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}${path}`],
          ['method', method],
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const response = await axios({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333',
        headers: {
          authorization: `Nostr ${btoa(JSON.stringify(auth_event))}`,
          'Content-Type': 'application/json',
        },
        method,
        url: path,
        [method === HTTPMethod.GET ? 'params' : 'data']: requestData,
      });

      if (process.env.NODE_ENV === PRODUCTION) {
        responseSchema.safeParseAsync(response.data).then((result) => {
          if (!result.success) {
            console.log('failed to validate result', path);
            // TODO: Send error to sentry or other error reporting service
          }
        });

        return response.data as Response;
      }

      return responseSchema.parse(response.data);
    }

    return apiCall();
  };
}
