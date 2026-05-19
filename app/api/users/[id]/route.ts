import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { withAdminAuth } from '@/middleware/auth';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const { id } = await params;
      const auth = (req as any).user;
      const body = await request.json();
      const { name, role } = updateUserSchema.parse(body);

      const user = await User.findOne({ _id: id, tenantId: auth?.tenantId });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (name) {
        user.name = name;
      }

      if (role) {
        user.role = role;
      }

      await user.save();

      return NextResponse.json(
        {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        { status: 200 }
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to update user' },
        { status: 500 }
      );
    }
  })(request);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const { id } = await params;
      const auth = (req as any).user;

      const user = await User.findOne({ _id: id, tenantId: auth?.tenantId });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user._id.toString() === auth?.userId) {
        return NextResponse.json(
          { error: 'Cannot delete your own account' },
          { status: 400 }
        );
      }

      await User.deleteOne({ _id: id, tenantId: auth?.tenantId });

      return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to delete user' },
        { status: 500 }
      );
    }
  })(request);
}
