import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Controller('initiatives')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getAll() {
    return this.appService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Prisma.InitiativeUpdateInput) {
    return this.appService.update(id, body);
  }

  @Get('export')
  async export(@Res() res: Response) {
    const buffer = await this.appService.exportData();
    const today = new Date().toISOString().slice(0, 10); // Formato YYYY-MM-DD
    const filename = `planning_data_${today}.xlsx`;

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.end(buffer);
  }

  @Post('reset')
  reset() {
    return this.appService.resetData();
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file: Express.Multer.File) {
    return this.appService.importData(file);
  }
}
