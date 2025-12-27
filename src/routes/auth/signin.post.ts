import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  SignInBody,
  SignInResponse,
  signInFastifySchema,
} from "../../schemas/auth/signIn";
import { supabaseClient } from "../../services/supabase";

async function prod(
  request: FastifyRequest<{ Body: SignInBody }>,
  reply: FastifyReply
) {
  const { email, password } = request.body;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const response: SignInResponse = {
    success: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email!,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at!,
      },
    },
  };

  return reply.send(response);
}

export default async function SignInPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: SignInBody;
    Reply: SignInResponse;
  }>("/signin", {
    schema: signInFastifySchema,
    handler: prod,
  });
}
