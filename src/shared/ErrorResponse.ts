// DO NOT CHANGE - shared type for use within the UI
export type ErrorResponse = {
  success: false;
  message: string;
  details?: string | any[];
};
