import { IsMongoId } from 'class-validator';

export class CreateInvoiceDto {
    @IsMongoId()
    orderId: string;
}
