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

import express from 'express';
import { LoggerService } from '@backstage/backend-plugin-api';
import { HttpAuthService } from '@backstage/backend-plugin-api';
import { AuthenticationError } from '@backstage/errors';

// Static test users for authentication
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

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
}

export async function createRouter({
  logger,
  httpAuth: _httpAuth,
}: RouterOptions): Promise<express.Router> {
  const router = express.Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  // Custom authentication endpoint
  router.post('/authenticate', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        throw new AuthenticationError('Username and password are required');
      }

      // Find user in static list
      const user = STATIC_USERS.find(
        u => u.username === username && u.password === password,
      );

      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      logger.info(`Authentication successful for user: ${user.username}`);

      // Return user information for frontend to create identity
      res.json({
        success: true,
        user: {
          username: user.username,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      logger.error(`Authentication failed: ${error.message}`);
      res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}
