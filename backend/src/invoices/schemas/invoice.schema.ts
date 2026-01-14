import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Order } from '../../orders/schemas/order.schema';
import { Customer } from '../../customers/entities/customer.entity';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
    DRAFT = 'draft',
    SENT = 'sent',
    PAID = 'paid',
}

@Schema({ timestamps: true })
export class Invoice {
    @Prop({ required: true, unique: true })
    invoiceNumber: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true })
    order: Order;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', required: true })
    customer: Customer;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true, enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
    status: InvoiceStatus;

    @Prop({ required: true, default: () => new Date() })
    issuedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
