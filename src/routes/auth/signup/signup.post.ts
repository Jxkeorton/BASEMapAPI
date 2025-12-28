import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SignUpBody, signUpFastifySchema } from "../../../schemas/auth/signUp";
import { supabaseAdmin, supabaseClient } from "../../../services/supabase";

async function prod(
  request: FastifyRequest<{ Body: SignUpBody }>,
  reply: FastifyReply
) {
  try {
    const { email, password, name } = request.body;

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (userExists) {
      return reply.code(409).send({
        success: false,
        message: "An account with this email already exists",
      });
    }

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
