import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  private templatesDir: string;
  private cache = new Map<string, Handlebars.TemplateDelegate>();

  constructor() {
    const projectRoot = process.cwd();
    this.templatesDir = path.join(projectRoot, 'mail_templates');
  }

  public async render(templateName: string, context: Record<string, unknown> = {}) {
    const tpl = await this.getTemplate(templateName);
    return tpl(context as any);
  }

  private async getTemplate(name: string) {
    if (this.cache.has(name)) return this.cache.get(name)!;
    const filePath = path.join(this.templatesDir, `${name}.hbs`);
    const content = await fs.readFile(filePath, 'utf8');
    const compiled = Handlebars.compile(content);
    this.cache.set(name, compiled);
    return compiled;
  }
}
