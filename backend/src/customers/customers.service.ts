import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer, CustomerDocument } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) { }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const { userId, ...rest } = createCustomerDto;
    const createdCustomer = new this.customerModel({
      ...rest,
      user: userId,
    });
    return createdCustomer.save();
  }

  async findAll(): Promise<Customer[]> {
    return this.customerModel.find().populate('user', 'email firstName lastName').exec();
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerModel.findById(id).populate('user', 'email firstName lastName').exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async findByUserId(userId: string): Promise<Customer | null> {
    return this.customerModel.findOne({ user: userId } as any).exec();
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    const updatedCustomer = await this.customerModel
      .findByIdAndUpdate(id, updateCustomerDto, { new: true })
      .exec();

    if (!updatedCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return updatedCustomer;
  }

  async remove(id: string): Promise<Customer> {
    const deletedCustomer = await this.customerModel.findByIdAndDelete(id).exec();
    if (!deletedCustomer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return deletedCustomer;
  }
}
