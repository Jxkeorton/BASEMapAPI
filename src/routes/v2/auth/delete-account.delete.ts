import { AuthError, User } from "@supabase/supabase-js";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthenticatedRequest, authenticateUser } from "../../../middleware/auth";
import {
  DeleteAccountBody,
  deleteAccountFastifySchema,
} from "../../../schemas/auth/delete";
import { supabaseAdmin } from "../../../services/supabase";

/**
 * Verify user identity based on their authentication method
 */
async function verifyUserIdentity(
  user: User,
  password?: string,
  method?: string
): Promise<{ success: boolean; error?: AuthError | Error; method?: string }> {
  try {
    // Get user's authentication identities
    const { data: identities, error: identitiesError } =
      await supabaseAdmin.auth.admin.getUserById(user.id);

    if (identitiesError || !identities.user) {
      return { success: false, error: identitiesError || undefined };
    }

    const userIdentities = identities.user.identities || [];
    const hasEmailPassword = userIdentities.some(
      (identity) => identity.provider === "email"
    );
    const hasOAuthOnly = userIdentities.length > 0 && !hasEmailPassword;

    // Method 1: Password verification (for email/password users)
    if (hasEmailPassword && password) {
      const { error: passwordError } =
        await supabaseAdmin.auth.signInWithPassword({
          email: user.email!,
          password: password,
        });

      if (!passwordError) {
        return { success: true, method: "password" };
      } else {
        return { success: false, error: passwordError };
      }
    }

    // Method 2: Trusted session verification (for OAuth users)
    if (hasOAuthOnly && !password) {
      // For OAuth users, we rely on the fact that they have a valid, recent session
      return { success: true, method: "trusted_session" };
    }

    // Method 3: Handle mixed cases
    if (hasEmailPassword && !password) {
      return {
        success: false,
        error: new Error("Password is required for account deletion"),
      };
    }

    if (hasOAuthOnly && password) {
      return {
        success: false,
        error: new Error(
          "This account uses OAuth authentication (Google/Apple). Password not required."
        ),
      };
    }

    // Fallback
    return {
      success: false,
      error: new Error("Unable to verify user identity"),
    };
  } catch (error) {
    return { success: false, error: new Error("Identity verification failed") };
  }
}

async function deleteAccount(
  request: FastifyRequest<{ Body: DeleteAccountBody }>,
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const userId = authenticatedRequest.user.id;

    const { confirmation, password, verification_method } = request.body;

    // Check confirmation text
    if (confirmation.toUpperCase() !== "DELETE") {
      throw new Error(
        'Confirmation must be "DELETE" to proceed with account deletion'
      );
    }

    // Verify user identity based on their authentication method
    const identityVerified = await verifyUserIdentity(
      authenticatedRequest.user,
      password,
      verification_method
    );

    if (!identityVerified.success) {
      throw identityVerified.error;
    }

    // Get user profile for logging purposes
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, email, name")
      .eq("id", userId)
      .single();

    // Delete user profile (this will cascade to related data due to foreign keys)
    // Service role bypasses RLS policies automatically
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      throw profileDeleteError;
    }

    // Delete from Supabase Auth (final step)
    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      throw authDeleteError;
    }

    return reply.send({
      success: true,
      message:
        "Account has been permanently deleted. All your data has been removed.",
    });
  } catch (error) {
    request.log.error("Error in account deletion endpoint:", error);
    throw error;
  }
}

export default async function ProfileDelete(fastify: FastifyInstance) {
  fastify.delete("/delete-account", {
    schema: deleteAccountFastifySchema,
    preHandler: authenticateUser,
    handler: deleteAccount,
  });
}
