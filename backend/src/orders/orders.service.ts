import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, ProductType, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CustomersService } from '../customers/customers.service';
import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class OrdersService {
  private readonly prices = {
    [ProductType.ONE_LITER]: 50,
    [ProductType.FIVE_LITER]: 200,
    [ProductType.EIGHTEEN_LITER]: 180,
  };

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private customersService: CustomersService,
    @Inject(forwardRef(() => InvoicesService)) private invoicesService: InvoicesService,
  ) { }

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const customer = await this.customersService.findByUserId(userId);
    if (!customer) {
      throw new BadRequestException('Customer profile not found. Please complete your profile first.');
    }

    let totalAmount = 0;
    const itemsWithPrices = createOrderDto.items.map((item) => {
      const unitPrice = this.prices[item.productType];
      if (!unitPrice) {
        throw new BadRequestException(`Invalid product type: ${item.productType}`);
      }
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      return {
        ...item,
        unitPrice,
        totalPrice,
      };
    });

    const newOrder = new this.orderModel({
      customer: (customer as any)._id,
      items: itemsWithPrices,
      totalAmount,
    });

    return newOrder.save();
  }

  async findAll(role: string, userId: string): Promise<Order[]> {
    if (role === 'admin' || role === 'secretary') {
      return this.orderModel
        .find()
        .populate('customer')
        .sort({ createdAt: -1 })
        .exec();
    }

    // For customers, first find their customer profile ID
    const customer = await this.customersService.findByUserId(userId);
    if (!customer) {
      return [];
    }

    return this.orderModel
      .find({ customer: (customer as any)._id })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string, role: string): Promise<Order> {
    const order = await this.orderModel.findById(id).populate('customer').exec();
    if (!order) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    // Access control
    if (role !== 'admin' && role !== 'secretary') {
      const customer = await this.customersService.findByUserId(userId);
      if (!customer || String(order.customer['_id']) !== String(customer['_id'])) {
        throw new NotFoundException(`Order #${id} not found`);
      }
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const existingOrder = await this.orderModel.findById(id).exec();
    if (!existingOrder) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    const previousStatus = existingOrder.status;

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(id, updateOrderDto, { new: true })
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    // Auto-create invoice when status changes to 'paid'
    if (updateOrderDto.status === OrderStatus.PAID && previousStatus !== OrderStatus.PAID) {
      try {
        await this.invoicesService.createForOrder(id);
      } catch (error) {
        console.error('Failed to auto-create invoice:', error);
        // Don't fail the update if invoice creation fails
      }
    }

    return updatedOrder;
  }
}
