const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
}

interface AuthResult<T> {
  data?: T;
  error?: { message?: string; code?: string };
}

async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const body = await res.json();
  if (!res.ok) {
    return { error: { message: body.message || 'Request failed', code: body.statusCode } };
  }
  return { data: body };
}

export const auth = {
  async signInEmail({ email, password }: { email: string; password: string }): Promise<AuthResult<{ token: string }>> {
    try {
      const result = await apiFetch('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (result.error) return result;
      return { data: { token: result.data.token } };
    } catch {
      return { error: { message: 'Could not connect to the server' } };
    }
  },

  async signUpEmail({ email, password, name }: { email: string; password: string; name: string }): Promise<AuthResult<{ token: string }>> {
    try {
      const result = await apiFetch('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      if (result.error) return result;
      return { data: { token: result.data.token } };
    } catch {
      return { error: { message: 'Could not connect to the server' } };
    }
  },

  async getSession(token: string | undefined): Promise<AuthResult<{ user: SessionUser }>> {
    if (!token) return {};
    try {
      // /auth/session only checks the token is valid — unlike /auth/me, it
      // doesn't 404 for a user who hasn't picked a role yet, so it won't
      // bounce a freshly-registered user back to /login before they ever
      // see the role-selection step.
      const result = await apiFetch('/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' as const,
      });
      if (!result.data) return {};
      const session = result.data;
      return { data: { user: { id: session.id, email: session.email, name: session.email } } };
    } catch {
      return {};
    }
  },
};
