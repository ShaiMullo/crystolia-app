import { IsString, IsNotEmpty, IsMongoId, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
    @IsString()
    @IsNotEmpty()
    street: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsOptional()
    zip?: string;
}

export class CreateCustomerDto {
    @IsMongoId()
    @IsOptional()
    userId: string;

    @IsString()
    @IsNotEmpty()
    businessName: string;

    @IsString()
    @IsNotEmpty()
    contactPerson: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsObject()
    @ValidateNested()
    @Type(() => AddressDto)
    address: AddressDto;

    @IsString()
    @IsOptional()
    pricingTier?: string;
}
