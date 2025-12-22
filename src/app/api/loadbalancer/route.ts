import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let config = await db.loadBalancerConfig.findFirst({
      include: { nodes: true },
    });

    if (!config) {
      config = await db.loadBalancerConfig.create({
        data: {
          algorithm: "round-robin",
          nodes: {
            create: [
              {
                nodeId: "node-1",
                host: "192.168.1.10",
                port: 4444,
                weight: 1,
              },
              {
                nodeId: "node-2",
                host: "192.168.1.11",
                port: 4444,
                weight: 1,
              },
              {
                nodeId: "node-3",
                host: "192.168.1.12",
                port: 4444,
                weight: 2,
              },
            ],
          },
        },
        include: { nodes: true },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to get load balancer config:", error);
    return NextResponse.json(
      { error: "Failed to get load balancer config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, algorithm, nodes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const config = await db.loadBalancerConfig.update({
      where: { id },
      data: {
        algorithm,
        nodes: nodes
          ? {
              deleteMany: {},
              create: nodes.map((node: any) => ({
                nodeId: node.nodeId,
                host: node.host,
                port: node.port,
                weight: node.weight || 1,
              })),
            }
          : undefined,
      },
      include: { nodes: true },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to update load balancer config:", error);
    return NextResponse.json(
      { error: "Failed to update load balancer config" },
      { status: 500 }
    );
  }
}
