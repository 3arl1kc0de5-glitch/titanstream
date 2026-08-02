import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaService;

const DEFAULT_ASSETS = [
  { assetCode: 'USDT', name: 'Tether USD', symbol: 'USDT', decimals: 6 },
  { assetCode: 'USD', name: 'United States Dollar', symbol: '$', decimals: 2 },
  { assetCode: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX', decimals: 0 },
  { assetCode: 'TON', name: 'Toncoin', symbol: 'TON', decimals: 9 },
];

@Injectable()
export class AssetRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults() {
    for (const asset of DEFAULT_ASSETS) {
      await this.prisma.asset.upsert({
        where: { assetCode: asset.assetCode },
        create: { ...asset, enabled: true },
        update: { name: asset.name, symbol: asset.symbol, decimals: asset.decimals, enabled: true },
      });
    }
  }

  async getEnabled(assetCode: string, client: DbClient = this.prisma) {
    const asset = await client.asset.findUnique({ where: { assetCode } });
    if (!asset || !asset.enabled) throw new NotFoundException(`ASSET_NOT_FOUND:${assetCode}`);
    return asset;
  }
}
