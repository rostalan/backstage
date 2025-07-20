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

import { SignInResolver } from '@backstage/plugin-auth-node';

/**
 * Custom sign-in resolver that creates user tokens for authenticated users
 */
export const customSignInResolver: SignInResolver<{
  username: string;
  name: string;
  email: string;
}> = async ({ result }, ctx) => {
  const userEntityRef = `user:default:${result.username}`;
  const ownershipRefs = [userEntityRef];

  // Issue token directly instead of trying to find user in catalog
  return await ctx.issueToken({
    claims: {
      sub: userEntityRef,
      ent: ownershipRefs,
    },
  });
};
