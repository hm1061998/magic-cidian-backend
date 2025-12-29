/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { IdiomsService } from './idioms.service';
import { CreateIdiomDto } from './dto/create-idiom.dto';

export type SearchMode = 'database' | 'ai';

@Controller('idioms')
export class IdiomsController {
  constructor(private readonly idiomsService: IdiomsService) {}

  @Get('search')
  async search(@Query('query') query: string, @Query('mode') mode: SearchMode) {
    return this.idiomsService.findOne(query, mode);
  }

  @Post()
  async create(@Body() createIdiomDto: CreateIdiomDto) {
    return this.idiomsService.create(createIdiomDto);
  }
}
