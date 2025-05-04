import { Response } from "express";

export const sendResponse = {
  success: (
    res: Response,
    data: any,
    message = "Success",
    statusCode = 200
  ) => {
    if (
      data &&
      typeof data === "object" &&
      "data" in data &&
      "pagination" in data
    ) {
      const { data: items, pagination } = data;
      return res.status(statusCode).json({
        success: true,
        message,
        data: items,
        pagination,
      });
    }
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  },
  error: (
    res: Response,
    message = "Something went wrong!",
    statusCode = 500,
    error: any = null
  ) => {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(error && { error }),
    });
  },
};
