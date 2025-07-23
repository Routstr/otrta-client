import api, { HTTPMethod } from '@/lib/api/services/api';
import { z } from 'zod';

// Schema for conversation/group
export const ConversationSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// API functions
export const createConversation = api<Record<string, never>, Conversation>({
  method: HTTPMethod.POST,
  path: '/api/search/groups',
  requestSchema: z.object({}),
  responseSchema: ConversationSchema,
});

export const deleteConversation = api<{ id: string }, { success: boolean }>({
  method: HTTPMethod.POST,
  path: '/api/search/groups/delete',
  requestSchema: z.object({ id: z.string() }),
  responseSchema: z.object({ success: z.boolean() }),
});
