import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";

interface CloudinaryUploadParams {
  preset: "profile" | "logbook" | "locations" | "location_submissions";
}

interface CloudinaryUploadResponse {
  success: boolean;
  url?: string;
  secureUrl?: string;
  publicId?: string;
  error?: string;
}

const PRESET_CONFIG = {
  profile: {
    folder: "profile",
    uploadPreset: "profile_preset",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },
  logbook: {
    folder: "logbook",
    uploadPreset: "logbook_preset",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  locations: {
    folder: "locations",
    uploadPreset: "locations_preset",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  location_submissions: {
    folder: "location_submissions",
    uploadPreset: "location_submissions_preset",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
};

const imageUploadSchema = {
  description: "Upload an image",
  tags: ["images"],
  consumes: ["multipart/form-data"],
  querystring: {
    type: "object",
    required: ["preset"],
    properties: {
      preset: {
        type: "string",
        enum: ["profile", "logbook", "locations", "location_submissions"],
      },
    },
  },
  body: {
    type: "object",
    properties: {
      file: {
        type: "string",
        format: "binary",
        description: "Image file to upload",
      },
    },
    required: ["file"],
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        url: { type: "string" },
        secureUrl: { type: "string" },
        publicId: { type: "string" },
      },
    },
    400: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        error: { type: "string" },
      },
    },
  },
};

// Handler function
async function prod(
  request: FastifyRequest<{ Querystring: CloudinaryUploadParams }>,
  reply: FastifyReply,
) {
  try {
    const { preset } = request.query;
    const authenticatedRequest = request as AuthenticatedRequest;

    // Validate preset
    if (!PRESET_CONFIG[preset]) {
      return reply.status(400).send({
        success: false,
        error: "Invalid preset specified",
      });
    }

    const config = PRESET_CONFIG[preset];

    // Get the uploaded file
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        success: false,
        error: "No file uploaded",
      });
    }

    // Validate file type
    const fileExtension = data.filename.split(".").pop()?.toLowerCase();
    if (!fileExtension || !config.allowedFormats.includes(fileExtension)) {
      return reply.status(400).send({
        success: false,
        error: `Invalid file format. Allowed formats: ${config.allowedFormats.join(", ")}`,
      });
    }

    // Check file size
    const buffer = await data.toBuffer();
    if (buffer.length > config.maxFileSize) {
      return reply.status(400).send({
        success: false,
        error: `File size exceeds maximum allowed size of ${config.maxFileSize / (1024 * 1024)}MB`,
      });
    }

    const isProfilePreset = preset === "profile";
    const isLogbookPreset = preset === "logbook";
    const userId = authenticatedRequest.user.id.toString();

    // Upload to Cloudinary using a Promise wrapper for the callback
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = request.server.cloudinary.uploader.upload_stream(
        {
          folder:
            isLogbookPreset || isProfilePreset
              ? `${config.folder}/${userId}`
              : config.folder,
          upload_preset: config.uploadPreset,
          resource_type: "image",
          public_id: isProfilePreset ? userId : undefined,
        },
        (error: any, result: any) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      data.file.pipe(uploadStream);
    });

    const response: CloudinaryUploadResponse = {
      success: true,
      url: uploadResult.url,
      secureUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };

    return reply.status(200).send(response);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload image",
    });
  }
}

export default async function postImage(fastify: FastifyInstance) {
  fastify.post<{ Querystring: CloudinaryUploadParams }>("/image", {
    schema: imageUploadSchema,
    preHandler: [authenticateUser],
    handler: prod,
  });
}
