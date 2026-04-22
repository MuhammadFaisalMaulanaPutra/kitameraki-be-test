export const successResponse = (
  data: any = null,
  message: string = "Success",
  meta: any = {}
) => {
  return {
    success: true,
    message,
    data,
    meta,
  };
};

export const errorResponse = (
  message: string = "Error",
  errors: any = null
) => {
  return {
    success: false,
    message,
    errors,
  };
};