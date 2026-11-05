import type { Request } from 'express';
import type { AuthenticatedUser } from './authenticated-user.interface.js';

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
