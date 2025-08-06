// Response data schema for GET /api/v1/locations/submissions

export const SubmissionsResponseData = {
  type: 'object',
  properties: {
    submissions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user_id: { type: 'string' },
          name: { type: 'string' },
          country: { type: 'string', nullable: true },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          rock_drop_ft: { type: 'integer', nullable: true },
          total_height_ft: { type: 'integer', nullable: true },
          cliff_aspect: { type: 'string', nullable: true },
          anchor_info: { type: 'string', nullable: true },
          access_info: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          opened_by_name: { type: 'string', nullable: true },
          opened_date: { type: 'string', nullable: true },
          video_link: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          submission_type: { type: 'string', enum: ['new', 'update'] },
          existing_location_id: { type: 'integer', nullable: true },
          admin_notes: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          reviewed_at: { type: 'string', format: 'date-time', nullable: true },
          reviewed_by: { type: 'string', nullable: true },
          // Transformed fields added by your handler
          images: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of image URLs sorted by image_order'
          },
          existing_location_name: {
            type: 'string',
            nullable: true,
            description: 'Name of existing location for updates'
          }
        },
        required: [
          'id', 'user_id', 'name', 'latitude', 'longitude', 
          'status', 'submission_type', 'created_at', 'updated_at',
          'images', 'existing_location_name'
        ]
      }
    },
    total_count: { type: 'integer' },
    has_more: { type: 'boolean' }
  },
  required: ['submissions', 'total_count', 'has_more']
};