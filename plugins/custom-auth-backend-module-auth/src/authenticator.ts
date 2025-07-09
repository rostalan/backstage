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
import {
  createProxyAuthenticator,
  PassportHelpers,
} from '@backstage/plugin-auth-node';

/** @public */
export const providerAuthenticator = createProxyAuthenticator({
  defaultProfileTransform: async (result: any) => ({
    profile: {
      email: result.username,
      displayName: result.username,
    },
  }),
  initialize({ config }) {
    return new ProviderStrategy(
      (username: string, password: string, done: any) => {
        // Basic validation - replace with your authentication logic
        if (username === 'admin' && password === 'admin') {
          done(null, { username });
        } else {
          done(null, false);
        }
      },
    );
  },

  async authenticate(input, strategy) {
    const { result } = await PassportHelpers.executeFrameHandlerStrategy(
      input.req,
      strategy,
    );
    return { result };
  },
});
