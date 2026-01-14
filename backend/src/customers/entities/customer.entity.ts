import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/entities/user.entity';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ required: true })
    businessName: string;

    @Prop({ required: true })
    contactPerson: string;

    @Prop({ required: true })
    phone: string;

    @Prop({ type: Object })
    address: {
        street: string;
        city: string;
        zip?: string;
    };

    @Prop({ default: 'default' })
    pricingTier: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
