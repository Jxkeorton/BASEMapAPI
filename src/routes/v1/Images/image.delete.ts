import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const deleteImageSchema = {
  description: "Delete an image from Cloudinary",
  tags: ["images"],
  params: {
    type: "object",
    required: ["publicId"],
    properties: {
      publicId: { type: "string" },
    },
  },
};

// Handler function
async function prod(
  request: FastifyRequest<{ Params: { publicId: string } }>,
  reply: FastifyReply,
) {
  try {
    const { publicId } = request.params;

    // Replace URL encoding back to slashes for Cloudinary public_id
    const decodedPublicId = publicId.replace(/%2F/g, "/");

    const result =
      await request.server.cloudinary.uploader.destroy(decodedPublicId);

    if (result.result === "ok") {
      return reply.status(200).send({
        success: true,
        message: "Image deleted successfully",
      });
    } else {
      return reply.status(400).send({
        success: false,
        error: "Failed to delete image",
      });
    }
  } catch (error) {
    request.log.error(error);
    throw error;
  }
}

export default async function deleteImage(fastify: FastifyInstance) {
  fastify.delete<{ Params: { publicId: string } }>("/image/:publicId", {
    schema: deleteImageSchema,
    handler: prod,
  });
}
