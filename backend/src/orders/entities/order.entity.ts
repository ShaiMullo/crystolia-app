import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/entities/user.entity';

export type OrderDocument = Order & Document;

export enum OrderStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

@Schema()
export class OrderItem {
    @Prop({ required: true })
    productName: string;

    @Prop({ required: true })
    quantity: number;

    @Prop({ required: true })
    unit: string;

    @Prop({ required: true })
    unitPrice: number;

    @Prop({ required: true })
    totalPrice: number;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    customer: User;

    @Prop({ type: [OrderItemSchema], required: true })
    items: OrderItem[];

    @Prop({ required: true })
    totalAmount: number;

    @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Prop()
    notes?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
