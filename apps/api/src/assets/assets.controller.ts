import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ProtectedController } from '../common/base-controllers/protected.controller.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { UploadAssetDto } from '../common/dtos/assets.dto.js';
import { AssetsService, MAX_ASSET_BYTES } from './assets.service.js';

@ApiTags('assets')
@Controller('assets')
export class AssetsController extends ProtectedController {
  constructor(private readonly assetsService: AssetsService) {
    super();
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadAssetDto })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ASSET_BYTES, files: 1 } }))
  upload(@CurrentUser() auth: AuthUser, @UploadedFile() file: Express.Multer.File | undefined) {
    return this.assetsService.upload(auth, file);
  }

  @Get(':asset_id')
  get(@CurrentUser() auth: AuthUser, @Param('asset_id', ParseUUIDPipe) asset_id: string) {
    return this.assetsService.get(auth, asset_id);
  }

  @Delete(':asset_id')
  @HttpCode(204)
  remove(@CurrentUser() auth: AuthUser, @Param('asset_id', ParseUUIDPipe) asset_id: string) {
    return this.assetsService.remove(auth, asset_id);
  }
}
