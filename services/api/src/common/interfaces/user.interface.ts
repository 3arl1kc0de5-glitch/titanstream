export interface AuthenticatedUser {
  id: bigint;
  role: string;
  state: string;
  sessionId: string;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
