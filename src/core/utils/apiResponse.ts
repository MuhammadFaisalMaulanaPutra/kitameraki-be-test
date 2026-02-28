import { HttpResponseInit } from "@azure/functions";
import { HTTP_STATUS } from "../constants/httpStatus";

export const apiResponse = {
  success: (data: any = null, status: number = HTTP_STATUS.OK): HttpResponseInit => ({
    status,
    jsonBody: data
  }),
  
  error: (message: string, status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, details: any = null): HttpResponseInit => ({
    status,
    jsonBody: {
      error: message,
      details
    }
  })
};
