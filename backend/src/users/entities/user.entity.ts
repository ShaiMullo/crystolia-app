import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
    ADMIN = 'admin',
    SECRETARY = 'secretary',
    CUSTOMER = 'customer',
}

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true, select: false }) // select: false hides password by default
    password: string;

    @Prop({ required: true, enum: UserRole, default: UserRole.CUSTOMER })
    role: UserRole;

    @Prop({ required: true })
    firstName: string;

    @Prop({ required: true })
    lastName: string;

    @Prop()
    phone?: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
