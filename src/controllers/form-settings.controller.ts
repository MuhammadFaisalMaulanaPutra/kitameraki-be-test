import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { FormSettingsService } from '../services/form-settings.service';
import { errorResponse, jsonResponse, readJsonBody } from '../shared/http';

export class FormSettingsController {
  constructor(private readonly service: FormSettingsService) {}

  async get(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      return jsonResponse(200, await this.service.get());
    } catch (error) {
      return errorResponse(error, context);
    }
  }

  async save(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
      return jsonResponse(200, await this.service.save(await readJsonBody(request)));
    } catch (error) {
      return errorResponse(error, context);
    }
  }
}
