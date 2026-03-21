import { vi } from "vitest";

/**
 * Creates a mock session object that mimics iron-session behavior.
 * Use with vi.hoisted() in test files to make it available to vi.mock factories.
 */
export function createMockSession(data: Partial<{
  userId: number;
  email: string;
  displayName: string;
}> = {}) {
  const sessionData = {
    userId: data.userId as number | undefined,
    email: data.email as string | undefined,
    displayName: data.displayName as string | undefined,
    save: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  };

  return sessionData;
}
