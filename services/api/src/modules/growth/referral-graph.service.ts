import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReferralStatus } from '@prisma/client';

export interface GraphNode {
  telegramUserId: string;
  depth: number;
  qualifiedCount: number;
  payingCount: number;
  children: GraphNode[];
}

export interface GraphEdge {
  referrerId: string;
  refereeId: string;
  status: ReferralStatus;
  createdAt: Date;
}

@Injectable()
export class ReferralGraphService {
  private readonly logger = new Logger(ReferralGraphService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getReferralTree(telegramUserId: bigint, maxDepth = 5): Promise<GraphNode> {
    const buildNode = async (userId: bigint, depth: number, visited: Set<string>): Promise<GraphNode> => {
      if (depth > maxDepth || visited.has(userId.toString())) {
        return {
          telegramUserId: userId.toString(),
          depth,
          qualifiedCount: 0,
          payingCount: 0,
          children: [],
        };
      }

      visited.add(userId.toString());

      const relationships = await this.prisma.referralRelationship.findMany({
        where: { referrerId: userId },
        select: {
          refereeId: true,
          status: true,
          createdAt: true,
        },
      });

      const qualifiedCount = relationships.filter(
        (r) => r.status === ReferralStatus.QUALIFIED || r.status === ReferralStatus.PAYING || r.status === ReferralStatus.REWARDED,
      ).length;

      const payingCount = relationships.filter(
        (r) => r.status === ReferralStatus.PAYING || r.status === ReferralStatus.REWARDED,
      ).length;

      const children = await Promise.all(
        relationships.map((r) => buildNode(r.refereeId, depth + 1, visited)),
      );

      return {
        telegramUserId: userId.toString(),
        depth,
        qualifiedCount,
        payingCount,
        children,
      };
    };

    return buildNode(telegramUserId, 0, new Set());
  }

  async getReferralChain(telegramUserId: bigint): Promise<GraphEdge[]> {
    const edges: GraphEdge[] = [];
    let currentId: bigint | null = telegramUserId;

    for (let i = 0; i < 20; i++) {
      if (currentId === null) break;

      const relationship: { referrerId: bigint; refereeId: bigint; status: ReferralStatus; createdAt: Date } | null =
        await this.prisma.referralRelationship.findUnique({
          where: { refereeId: currentId },
          select: {
            referrerId: true,
            refereeId: true,
            status: true,
            createdAt: true,
          },
        });

      if (!relationship) break;

      edges.push({
        referrerId: relationship.referrerId.toString(),
        refereeId: relationship.refereeId.toString(),
        status: relationship.status,
        createdAt: relationship.createdAt,
      });

      currentId = relationship.referrerId;
      const currentStr = currentId?.toString();
      if (currentStr && edges.some((e) => e.referrerId === currentStr)) break;
    }

    return edges;
  }

  async detectCycles(): Promise<string[][]> {
    const allRelationships = await this.prisma.referralRelationship.findMany({
      select: {
        referrerId: true,
        refereeId: true,
      },
    });

    const adjacency = new Map<string, string[]>();
    for (const rel of allRelationships) {
      const ref = rel.referrerId.toString();
      const fee = rel.refereeId.toString();
      if (!adjacency.has(ref)) adjacency.set(ref, []);
      adjacency.get(ref)!.push(fee);
    }

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = adjacency.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart));
          }
        }
      }

      path.pop();
      recStack.delete(node);
    };

    for (const node of adjacency.keys()) {
      if (!visited.has(node)) dfs(node);
    }

    return cycles;
  }

  async getDownstreamCount(telegramUserId: bigint): Promise<{ total: number; qualified: number; paying: number }> {
    const countDownstream = async (userId: bigint, visited: Set<string>): Promise<{ total: number; qualified: number; paying: number }> => {
      if (visited.has(userId.toString())) return { total: 0, qualified: 0, paying: 0 };
      visited.add(userId.toString());

      const relationships = await this.prisma.referralRelationship.findMany({
        where: { referrerId: userId },
        select: { refereeId: true, status: true },
      });

      let total = relationships.length;
      let qualified = relationships.filter(
        (r) => r.status === ReferralStatus.QUALIFIED || r.status === ReferralStatus.PAYING || r.status === ReferralStatus.REWARDED,
      ).length;
      let paying = relationships.filter(
        (r) => r.status === ReferralStatus.PAYING || r.status === ReferralStatus.REWARDED,
      ).length;

      for (const rel of relationships) {
        const downstream = await countDownstream(rel.refereeId, visited);
        total += downstream.total;
        qualified += downstream.qualified;
        paying += downstream.paying;
      }

      return { total, qualified, paying };
    };

    return countDownstream(telegramUserId, new Set());
  }
}
