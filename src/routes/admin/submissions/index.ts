import { FastifyInstance } from "fastify";
import SubmissionsGet from "./submissions.get";
import SubmissionsPatch from "./submissions.patch";

export default async function AdminSubmissionsRoutes(fastify: FastifyInstance) {
  await fastify.register(SubmissionsGet);
  await fastify.register(SubmissionsPatch);
}
