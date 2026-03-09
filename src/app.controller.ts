import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { Prisma } from '@prisma/client';

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
