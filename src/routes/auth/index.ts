import { FastifyInstance } from 'fastify';

import SignInPost from './signin.post';
import SignUpPost from './signup/signup.post';
import SignOutPost from './signout.post';
import RefreshPost from './refresh.post';
import ResetPasswordPost from './reset-password/reset-password.post';
import ResetPasswordConfirmPost from './reset-password/reset-passoword-confirm.post';
import DeleteAccountDelete from './delete-account.delete';
import ConfirmEmailPost from './signup/confirm-email.post';
import ResendConfirmationPost from './signup/resend-confirmation.post';

export default async function AuthRoutes(fastify: FastifyInstance) {
  // Public auth routes (no authentication required)
  await fastify.register(SignInPost);
  await fastify.register(SignUpPost);
  await fastify.register(ResetPasswordPost);
  await fastify.register(ResetPasswordConfirmPost);
  await fastify.register(ConfirmEmailPost);
  await fastify.register(ResendConfirmationPost);
  
  // Protected auth routes (authentication required)
  await fastify.register(SignOutPost);
  await fastify.register(DeleteAccountDelete);
  await fastify.register(RefreshPost);
}