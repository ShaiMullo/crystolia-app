import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Customer } from '../../customers/entities/customer.entity';

export type OrderDocument = Order & Document;

export enum OrderStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    PAID = 'paid',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

export enum ProductType {
    ONE_LITER = '1L',
    FIVE_LITER = '5L',
    EIGHTEEN_LITER = '18L',
}

@Schema()
export class OrderItem {
    @Prop({ required: true, enum: ProductType })
    productType: ProductType;

    @Prop({ required: true, min: 1 })
    quantity: number;

    @Prop({ required: true })
    unitPrice: number;

    @Prop({ required: true })
    totalPrice: number;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', required: true })
    customer: Customer;

    @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Prop({ type: [OrderItemSchema], required: true })
    items: OrderItem[];

    @Prop({ required: true })
    totalAmount: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
