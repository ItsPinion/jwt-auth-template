import type { LoginInput, RegisterInput } from "@repo/shared";
import { api, clearAccessToken, setAccessToken } from "@/lib/api";
import type { ApiResponse, AuthPayload, CurrentUserPayload, User } from "@/types";

async function authenticate(
  path: "/auth/login" | "/auth/register",
  input: LoginInput | RegisterInput,
): Promise<void> {
  const { data } = await api.post<ApiResponse<AuthPayload>>(path, input);

  const token = data.data?.accessToken;

  if (!token) {
    throw new Error(data.message);
  }

  setAccessToken(token);
}

export async function login(input: LoginInput): Promise<void> {
  return authenticate("/auth/login", input);
}

export async function register(input: RegisterInput): Promise<void> {
  return authenticate("/auth/register", input);
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // The session is cleared locally even if the server call fails.
  } finally {
    clearAccessToken();
  }
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<ApiResponse<CurrentUserPayload>>("/auth/me");

  const user = data.data?.user;

  if (!user) {
    throw new Error(data.message);
  }

  return user;
}
