import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { taskService } from "../services/taskServices";
import { TaskSchema } from "../models/task";

export async function InsertTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    // ambil data dari field di frontend
    const body = await request.json();

    // validasi
    const validationResult = TaskSchema.safeParse(body);

    //logic validasi
    if (!validationResult.success) {
      context.warn("Validasi gagal: ", validationResult.error.format());
      return {
        status: 400, // http status code (bad request)
        jsonBody: {
          error: "Data yang dikirim tidak valid!",
          details: validationResult.error.format(),
        },
      };
    }

    // data yang sudah aman
    const newTask = await taskService.createTask(validationResult.data);

    return {
      status: 201,
      jsonBody: newTask,
    };
  } catch (error: any) {
    return {
      jsonBody: {
        error: "Terjadi kesalahan pada server",
      },
      status: 500,
    };
  }
}

app.http("InsertTask", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: InsertTask,
});
