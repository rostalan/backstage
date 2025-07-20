/*
 * Copyright 2025 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { BasicStrategy as ProviderStrategy } from 'passport-http';
import { Request, Response } from 'express';
import {
  AuthProviderFactory,
  AuthProviderRouteHandlers,
  PassportHelpers,
} from '@backstage/plugin-auth-node';

// Static user database for testing
const STATIC_USERS = [
  {
    username: 'test',
    password: 'test',
    name: 'Test User',
    email: 'test@example.com',
  },
  {
    username: 'admin',
    password: 'admin',
    name: 'Admin User',
    email: 'admin@example.com',
  },
  {
    username: 'user1',
    password: 'password1',
    name: 'User One',
    email: 'user1@example.com',
  },
];

interface UserProfile {
  username: string;
  name: string;
  email: string;
}

/**
 * Find user in static user list by username and password
 */
function findStaticUser(
  username: string,
  password: string,
): UserProfile | null {
  const staticUser = STATIC_USERS.find(
    u => u.username === username && u.password === password,
  );

  if (!staticUser) {
    return null;
  }

  return {
    username: staticUser.username,
    name: staticUser.name,
    email: staticUser.email,
  };
}

/**
 * Try to authenticate user using Basic Auth headers
 */
async function tryBasicAuth(
  req: Request,
  strategy: ProviderStrategy,
): Promise<UserProfile | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const { result } = await PassportHelpers.executeFrameHandlerStrategy(
      req,
      strategy,
    );
    return result as UserProfile;
  } catch (error) {
    return null;
  }
}

/**
 * Try to authenticate user using JSON body credentials
 */
function tryBodyCredentials(req: Request): UserProfile | null {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return null;
  }
  return findStaticUser(username, password);
}

/**
 * Try to authenticate user using URL query parameters
 */
function tryQueryCredentials(req: Request): UserProfile | null {
  const { username, password } = req.query;
  if (!username || !password) {
    return null;
  }
  return findStaticUser(username as string, password as string);
}

/**
 * Attempt authentication using multiple methods in order
 */
async function authenticateUser(
  req: Request,
  strategy: ProviderStrategy,
  includeQuery = false,
): Promise<UserProfile | null> {
  // Try Basic Auth first
  let user = await tryBasicAuth(req, strategy);

  // Try JSON body credentials
  if (!user) {
    user = tryBodyCredentials(req);
  }

  // Try URL query parameters (optional, only for start handler)
  if (!user && includeQuery) {
    user = tryQueryCredentials(req);
  }

  return user;
}

/**
 * Sign in user with Backstage and return the result
 */
async function signInUser(user: UserProfile, resolverContext: any) {
  return await resolverContext.signInWithCatalogUser(
    {
      entityRef: {
        kind: 'User',
        namespace: 'default',
        name: user.username,
      },
    },
    {
      dangerousEntityRefFallback: {
        entityRef: `user:default/${user.username}`,
      },
    },
  );
}

/**
 * Create standard authentication response object
 */
function createAuthResponse(user: UserProfile, signInResult: any) {
  return {
    providerInfo: {
      accessToken: signInResult.token,
      expiresInSeconds: 3600,
      scope: 'user',
    },
    profile: {
      email: user.email,
      displayName: user.name,
    },
    backstageIdentity: {
      identity: signInResult.identity,
      token: signInResult.token,
      expiresInSeconds: 3600,
    },
  };
}

/**
 * Custom auth provider factory that implements form-based authentication
 * with static user credentials for testing purposes.
 *
 * @public
 */
export const customAuthProvider: AuthProviderFactory = options => {
  const { resolverContext, logger } = options;

  // Create passport strategy for Basic Authentication
  const strategy = new ProviderStrategy((username, password, done) => {
    const user = findStaticUser(username, password);
    return done(null, user || false);
  });

  const handlers: AuthProviderRouteHandlers = {
    async start(req: Request, res: Response): Promise<void> {
      const user = await authenticateUser(req, strategy, true);

      // If no credentials provided at all, request Basic Authentication
      if (
        !user &&
        !req.headers.authorization &&
        !req.body?.username &&
        !req.query?.username
      ) {
        res.setHeader(
          'WWW-Authenticate',
          'Basic realm="Backstage Custom Auth"',
        );
        res.status(401).json({
          error: 'Authentication required',
          message:
            'Please provide username and password using Basic Authentication, JSON, or URL parameters',
        });
        return;
      }

      // If we have invalid credentials
      if (!user) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials provided',
        });
        return;
      }

      // If we have valid user, authenticate and create session
      try {
        logger.info(`Authentication successful for user: ${user.username}`);

        const signInResult = await signInUser(user, resolverContext);

        // Set authentication cookie/session
        if (signInResult && signInResult.token) {
          res.cookie('token', signInResult.token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 3600000, // 1 hour
          });
        }

        // Redirect to home page after successful authentication
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(frontendUrl);
      } catch (error) {
        logger.error('Authentication failed in start endpoint', error);
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Unable to create user session',
        });
      }
    },

    async frameHandler(_req: Request, res: Response): Promise<void> {
      // Redirect to a login form instead of handling auth directly
      const loginFormUrl = 'http://localhost:3000/custom-auth-plugin/login';
      res.redirect(loginFormUrl);
    },

    async refresh(req: Request, res: Response): Promise<void> {
      try {
        const user = await authenticateUser(req, strategy);

        if (!user) {
          res.status(401).json({
            error: 'Authentication failed',
            message: 'Invalid credentials provided',
          });
          return;
        }

        const signInResult = await signInUser(user, resolverContext);
        const authResponse = createAuthResponse(user, signInResult);

        res.json(authResponse);
      } catch (error) {
        logger.error('Refresh authentication failed', error);
        res.status(500).json({
          error: 'Authentication failed',
          message: 'Unable to refresh authentication',
        });
      }
    },

    async logout(_req: Request, res: Response): Promise<void> {
      // For Basic Auth, there's no server-side session to clear
      // Just return success
      res.json({ message: 'Logged out successfully' });
    },
  };

  return handlers;
};
