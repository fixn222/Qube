interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResult {
  data: AuthUser | null;
  error: string | null;
}

export class QubeAuth {
  private currentUser: AuthUser | null = null;

  constructor(private projectUrl: string) {}

  private authUrl(path: string): string {
    // projectUrl is the dashboard's /api/projects/:slug URL; auth is mounted
    // beside projects at /api/auth.
    const apiUrl = this.projectUrl.replace(/\/projects\/[^/]+\/?$/, "");
    return `${apiUrl}/auth/${path}`;
  }

  private async loadUser(): Promise<AuthUser> {
    const res = await fetch(this.authUrl("me"), { credentials: "include" });
    if (!res.ok) throw new Error(`Unable to load user (HTTP ${res.status})`);
    const payload = (await res.json()) as { sub: string; email: string };
    const user = { id: payload.sub, email: payload.email };
    this.currentUser = user;
    return user;
  }

  async signUp(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResult> {
    try {
      const res = await fetch(this.authUrl("register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };

        return { data: null, error: err.message ?? "signUp failed" };
      }

      return { data: await this.loadUser(), error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nework Error";

      return { error: message, data: null };
    }
  }

  async signIn(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResult> {
    try {
      const res = await fetch(this.authUrl("login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };

        return { data: null, error: err.message ?? "signIn failed" };
      }

      return { data: await this.loadUser(), error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network Error";

      return { data: null, error: message };
    }
  }

  async sendMagickLink(_email: string): Promise<{ error: string | null }> {
    return { error: "Magic link authentication is not supported by this API." };
  }

  signInWithGoogle(): void {
    window.location.href = this.authUrl("google");
  }

  signInWithGithub(): void {
    window.location.href = this.authUrl("github");
  }

  async signOut(): Promise<{ error: string | null }> {
    try {
      const res = await fetch(this.authUrl("logout"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return { error: `Sign out failed (HTTP ${res.status})` };
      this.currentUser = null;
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : "Network Error" };
    }
  }

  getUser(): AuthUser | null {
    return this.currentUser;
  }

  getAccessToken(): string | null {
    return null;
  }
}
