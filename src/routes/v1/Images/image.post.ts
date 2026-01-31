import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuthenticatedRequest,
  authenticateUser,
} from "../../../middleware/auth";

interface CloudinaryUploadParams {
  preset:
    | "profile_images"
    | "logbook_images"
    | "location_images"
    | "location_submissions";
}

interface CloudinaryUploadResponse {
  success: boolean;
  uploads?: Array<{
    url: string;
    secureUrl: string;
    publicId: string;
  }>;
  error?: string;
}

const PRESET_CONFIG = {
  profile_images: {
    folder: "profile",
    uploadPreset: "profile_images",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },
  logbook_images: {
    folder: "logbook",
    uploadPreset: "logbook_images",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  location_images: {
    folder: "location_images",
    uploadPreset: "location_images",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  location_submissions: {
    folder: "location_submissions",
    uploadPreset: "location_submissions",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
};

const imageUploadSchema = {
  description: "Upload one or more images",
  tags: ["images"],
  consumes: ["multipart/form-data"],
  querystring: {
    type: "object",
    required: ["preset"],
    properties: {
      preset: {
        type: "string",
        enum: [
          "profile_images",
          "logbook_images",
          "location_images",
          "location_submissions",
        ],
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        uploads: {
          type: "array",
          items: {
            type: "object",
            properties: {
              url: { type: "string" },
              secureUrl: { type: "string" },
              publicId: { type: "string" },
            },
          },
        },
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

    // Get all uploaded files
    const files = await request.saveRequestFiles();

    if (!files || files.length === 0) {
      return reply.status(400).send({
        success: false,
        error: "No files uploaded",
      });
    }

    const isProfilePreset = preset === "profile_images";
    const isLogbookPreset = preset === "logbook_images";
    const userId = authenticatedRequest.user.id.toString();

    // Process all files
    const uploadResults = [];
    const errors = [];

    for (const file of files) {
      try {
        // Validate file type
        const fileExtension = file.filename.split(".").pop()?.toLowerCase();
        if (!fileExtension || !config.allowedFormats.includes(fileExtension)) {
          errors.push(
            `${file.filename}: Invalid file format. Allowed formats: ${config.allowedFormats.join(", ")}`,
          );
          continue;
        }

        // Read file buffer
        const fs = await import("fs/promises");
        const buffer = await fs.readFile(file.filepath);

        // Check file size
        if (buffer.length > config.maxFileSize) {
          errors.push(
            `${file.filename}: File size exceeds maximum allowed size of ${config.maxFileSize / (1024 * 1024)}MB`,
          );
          continue;
        }

        // Check if buffer is empty
        if (buffer.length === 0) {
          errors.push(`${file.filename}: File is empty`);
          continue;
        }

        // Upload to Cloudinary using buffer
        const uploadResult = await new Promise<any>((resolve, reject) => {
          request.server.cloudinary.uploader
            .upload_stream(
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
            )
            .end(buffer);
        });

        uploadResults.push({
          url: uploadResult.url,
          secureUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        });
      } catch (error) {
        request.log.error(error);
        errors.push(
          `${file.filename}: Upload failed - ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // If no successful uploads, return error
    if (uploadResults.length === 0) {
      return reply.status(400).send({
        success: false,
        error: errors.length > 0 ? errors.join("; ") : "All uploads failed",
      });
    }

    // Return successful uploads (with warnings if some failed)
    const response: CloudinaryUploadResponse = {
      success: true,
      uploads: uploadResults,
    };

    // Log warnings if some files failed
    if (errors.length > 0) {
      request.log.warn(`Some files failed to upload: ${errors.join("; ")}`);
    }

    return reply.status(200).send(response);
  } catch (error) {
    request.log.error(error);
    throw error;
  }
}

export default async function postImage(fastify: FastifyInstance) {
  fastify.post<{ Querystring: CloudinaryUploadParams }>("/image", {
    schema: imageUploadSchema,
    preHandler: [authenticateUser],
    handler: prod,
  });
}
