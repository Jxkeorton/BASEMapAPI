import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SignUpBody, signUpFastifySchema } from "../../../schemas/auth/signUp";
import { supabaseClient } from "../../../services/supabase";

// Handler function - same pattern as signin
async function prod(
  request: FastifyRequest<{ Body: SignUpBody }>,
  reply: FastifyReply
) {
  try {
    const { email, password, name } = request.body;

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: "base.map://",
      },
    });

    if (error) {
      request.log.error("Error signing up:", error);
      throw error;
    }

    if (!data.user) {
      throw new Error("User data is missing after signup");
    }

    // Check if email confirmation is required
    const requiresConfirmation = !data.session;

    // Return simple response
    return reply.send({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
        },
        session: data.session,
        requiresEmailConfirmation: requiresConfirmation,
        message: requiresConfirmation
          ? "Account created! Please check your email to confirm your account before signing in."
          : "Account created successfully!",
      },
    });
  } catch (error) {
    request.log.error("Error in signup endpoint:", error);
    throw error;
  }
}

export default async function SignUpPost(fastify: FastifyInstance) {
  fastify.post("/signup", {
    schema: signUpFastifySchema,
    handler: prod,
  });
}
