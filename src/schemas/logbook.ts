// Response data schema for GET /api/v1/logbook

export const LogbookResponseData = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user_id: { type: 'string' },
          location_name: { type: 'string' },
          exit_type: { 
            type: 'string', 
            enum: ['Building', 'Antenna', 'Span', 'Earth'], 
            nullable: true 
          },
          delay_seconds: { type: 'integer', nullable: true },
          jump_date: { type: 'string', format: 'date', nullable: true },
          details: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'user_id', 'location_name', 'created_at', 'updated_at']
      }
    },
    total_count: { type: 'integer' },
    has_more: { type: 'boolean' }
  },
  required: ['entries', 'total_count', 'has_more']
};