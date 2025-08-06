// Response data schema for GET /api/v1/locations

export const LocationsResponseData = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
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
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
      created_by: { type: 'string', nullable: true },
      updated_by: { type: 'string', nullable: true }
    },
    required: ['id', 'name', 'latitude', 'longitude', 'created_at', 'updated_at']
  }
};

// Response data schema for GET /api/v1/locations/saved

export const SavedLocationsResponseData = {
  type: 'object',
  properties: {
    saved_locations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          save_id: { type: 'string' },
          saved_at: { type: 'string', format: 'date-time' },
          location: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
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
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            },
            required: ['id', 'name', 'latitude', 'longitude', 'created_at', 'updated_at']
          }
        },
        required: ['save_id', 'saved_at', 'location']
      }
    },
    total_count: { type: 'integer' },
    has_more: { type: 'boolean' }
  },
  required: ['saved_locations', 'total_count', 'has_more']
};