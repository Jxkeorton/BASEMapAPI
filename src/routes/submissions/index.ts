import { FastifyInstance } from "fastify";
import SubmissionLimitsGet from "./submission-limits.get";
import SubmissionsDelete from "./submissions.delete";
import SubmissionsGet from "./submissions.get";
import SubmissionsPatch from "./submissions.patch";
import SubmissionsPost from "./submissions.post";

export default async function SubmissionRoutes(fastify: FastifyInstance) {
  await fastify.register(SubmissionLimitsGet);
  await fastify.register(SubmissionsDelete);
  await fastify.register(SubmissionsGet);
  await fastify.register(SubmissionsPatch);
  await fastify.register(SubmissionsPost);
}
